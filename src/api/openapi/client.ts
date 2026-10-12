/**
 * v2 fetch client on openapi-fetch (Task FRT-21b). The type-level authority is
 * schema.d.ts, generated from the backend's OpenAPI draft (codegen command in
 * openapi/README.md; the yaml and docs/api/api-design.md are read-only). One
 * function per operation the pages use; the stub functions in
 * src/api/client.ts keep their names and return types here, so the pages can
 * rewire later without reshaping their call sites. Consumed since the FRT-20
 * first slice: src/api/client.ts routes its season/status/counter calls here
 * when PUBLIC_API_BASE_URL is set (see base.ts and .env.example); the profile
 * and heartbeat resolvers stay on the mock layer. This module must compile and
 * be tested (tests/openapi.test.ts).
 *
 * Behavior rules:
 * - one createClient<paths> with baseUrl = API_BASE (src/api/openapi/base.ts;
 *   empty string = same origin), so request URLs stay relative;
 * - credentials: "include" on every request (reads need nothing, writes use
 *   the session cookie — the cookie is sent either way);
 * - every non-2xx answer throws ApiError {code, message, status}; openapi-fetch
 *   hands the parsed error body over and toApiError reads {code, message} from
 *   it (bodies of any other shape — gateway HTML, empty body — fall back to a
 *   status-derived code and the status text);
 * - GET /api/v2/heartbeats and GET /api/v2/seasons/current use an ETag cache:
 *   they send If-None-Match and return the cached data on 304 (the two
 *   endpoints the frontend polls — heartbeats every 5 s, leaderboard every 8 s);
 * - getFriendStatus unwraps the yaml 0.2.0 {status} wrapper to the page-facing
 *   union, and getPlayerSettings applies the 0.2.0 normalizations — both
 *   documented in openapi/README.md.
 */

import createClient from "openapi-fetch";
import type { Client } from "openapi-fetch";
import { API_BASE } from "./base";
import type { paths } from "./schema";
import type {
  AchievementCounters,
  Comment,
  CommentsFile,
  Equipment,
  EquipmentHistory,
  ErrorBody,
  FriendList,
  FriendStatus,
  GlobalCounters,
  HeartbeatsMap,
  LikeCommentResult,
  OnlineStatus,
  PlayerSettings,
  RaidBlob,
  RaidIndex,
  RawPlayerSettings,
  SeasonData,
  SeasonList,
  SendFriendRequestResult,
  Session,
  WeaponCounters,
} from "./types";

/** Thrown for every non-2xx API answer. `code`/`message` come from the error body. */
export class ApiError extends Error {
  /** Stable lower_snake_case machine code (not_found, unauthenticated, ...). */
  readonly code: string;
  /** HTTP status of the answer. */
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * The typed openapi-fetch client; "" = same origin, so request URLs stay
 * relative. Created lazily on the first call: createClient captures
 * globalThis.Request/fetch at creation time (see tests/openapi.test.ts), and
 * since the FRT-20 switch this module loads eagerly with src/api/client.ts —
 * possibly before the tests install their Request shim. Laziness moves the
 * capture to the first API call; in the browser nothing changes (same
 * globals, same baseUrl).
 */
let lazyClient: Client<paths> | undefined;
function getClient(): Client<paths> {
  return (lazyClient ??= createClient<paths>({ baseUrl: API_BASE }));
}

/** Request options shared by every call: the session cookie always rides along. */
const include = { credentials: "include" } as const;

/** ETag cache entries for the two polled GET endpoints, keyed by request path. */
const etagCache = new Map<string, { etag: string; data: unknown }>();

/** Clears the ETag cache (test isolation; the pollers never need it). */
export function resetEtagCache(): void {
  etagCache.clear();
}

/**
 * Throws ApiError for a non-2xx answer. openapi-fetch hands over the parsed
 * JSON body as `error` (of any shape); a {code, message} body fills the
 * ApiError, anything else (an HTML string, an empty body, other JSON) keeps
 * the status-derived fallbacks.
 */
function toApiError(response: Response, error: unknown): ApiError {
  let code = `http_${response.status}`;
  let message = response.statusText || `HTTP ${response.status}`;
  if (error !== null && typeof error === "object") {
    const body = error as Partial<ErrorBody>;
    if (typeof body.code === "string") code = body.code;
    if (typeof body.message === "string") message = body.message;
  }
  return new ApiError(code, message, response.status);
}

/**
 * Runs one openapi-fetch call and unwraps it to the page-facing contract:
 * every non-2xx throws ApiError, success resolves to the JSON-parsed body.
 * The parse boundary casts to the stub-compatible type — the generated schema
 * types are strictly wider than the domain types (openapi/README.md).
 */
async function unwrap<T>(
  call: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call;
  if (!response.ok) throw toApiError(response, error);
  return data as T;
}

/**
 * GET with the ETag cache: sends If-None-Match from the cached entry, returns
 * the cached data (same object reference) on 304, refreshes the cache on a
 * fresh 200 with an ETag.
 */
async function cachedGet<T>(path: "/api/v2/heartbeats" | "/api/v2/seasons/current"): Promise<T> {
  const cached = etagCache.get(path);
  const { data, error, response } = await getClient().GET(path, {
    ...include,
    headers: cached === undefined ? undefined : { "If-None-Match": cached.etag },
  });
  if (response.status === 304 && cached !== undefined) return cached.data as T;
  if (!response.ok) throw toApiError(response, error);
  const fresh = data as T;
  const etag = response.headers.get("ETag");
  if (etag !== null) etagCache.set(path, { etag, data: fresh });
  return fresh;
}

/**
 * The two 0.2.0 normalization helpers for getPlayerSettings (rules in
 * openapi/README.md). The yaml types both values `integer | string`: the
 * legacy writer passed the stored value through, so most profiles carry an
 * integer and a few carry a string.
 */

/** usePrestigeStyling -> boolean: 0, "0" and "false" are false, anything else true. */
function normalizeFlag(value: number | string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value !== 0 && value !== "0" && value !== "false";
}

/** catReward -> string: the integer form is stringified, the string form kept. */
function normalizeText(value: number | string | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

// ---------------------------------------------------------------------------
// seasons (public, cacheable) — priority 1
// ---------------------------------------------------------------------------

/** GET /api/v2/seasons — current season number + available numbers (replaces CURRENT_SEASON). */
export function getSeasons(): Promise<SeasonList> {
  return unwrap(getClient().GET("/api/v2/seasons", include));
}

/** GET /api/v2/seasons/current — the polled current-season leaderboard (ETag cache). */
export function getCurrentSeason(): Promise<SeasonData> {
  return cachedGet<SeasonData>("/api/v2/seasons/current");
}

/** GET /api/v2/seasons/{season} — one season leaderboard (previous = current - 1). */
export function getSeason(season: number): Promise<SeasonData> {
  return unwrap(
    getClient().GET("/api/v2/seasons/{season}", { ...include, params: { path: { season } } }),
  );
}

// ---------------------------------------------------------------------------
// shared counters — priority 1
// ---------------------------------------------------------------------------

/** GET /api/v2/counters/achievements. */
export function getAchievementCounters(): Promise<AchievementCounters> {
  return unwrap(getClient().GET("/api/v2/counters/achievements", include));
}

/** GET /api/v2/counters/weapons (7.9 MB; no ?weapon= slicing in this draft). */
export function getWeaponCounters(): Promise<WeaponCounters> {
  return unwrap(getClient().GET("/api/v2/counters/weapons", include));
}

/** GET /api/v2/counters/global. */
export function getGlobalCounters(): Promise<GlobalCounters> {
  return unwrap(getClient().GET("/api/v2/counters/global", include));
}

/** GET /api/v2/equipment-history (25 MB blob, served as-is; ?weapon= is 0.3.0, not built). */
export function getEquipmentHistory(): Promise<EquipmentHistory> {
  return unwrap(getClient().GET("/api/v2/equipment-history", include));
}

// ---------------------------------------------------------------------------
// player profile — priority 2
// ---------------------------------------------------------------------------

/** GET /api/v2/players/{permaLink}/raids — the raid index. */
export function getPlayerRaids(permaLink: string): Promise<RaidIndex> {
  return unwrap(
    getClient().GET("/api/v2/players/{permaLink}/raids", {
      ...include,
      params: { path: { permaLink } },
    }),
  );
}

/** GET /api/v2/players/{permaLink}/raids/blobs/{blob} — one raid blob. */
export function getPlayerRaidBlob(permaLink: string, blob: number): Promise<RaidBlob> {
  return unwrap(
    getClient().GET("/api/v2/players/{permaLink}/raids/blobs/{blob}", {
      ...include,
      params: { path: { permaLink, blob } },
    }),
  );
}

/**
 * GET /api/v2/players/{permaLink}/equipment. The stub took the profile id;
 * the v2 URL is keyed by permaLink (openapi/README.md deviation 1), so the
 * parameter is the permaLink now.
 */
export function getPlayerEquipment(permaLink: string): Promise<Equipment> {
  return unwrap(
    getClient().GET("/api/v2/players/{permaLink}/equipment", {
      ...include,
      params: { path: { permaLink } },
    }),
  );
}

/**
 * GET /api/v2/players/{permaLink}/settings — profile settings + showcase
 * (settings is GET now). Applies the 0.2.0 normalizations (openapi/README.md):
 * usePrestigeStyling -> boolean, catReward -> string, discord from
 * `discordUser` ?? the deprecated `discord_user` (those two raw keys are
 * dropped from the answer; every other yaml key passes through).
 */
export async function getPlayerSettings(permaLink: string): Promise<PlayerSettings> {
  const raw = await unwrap<RawPlayerSettings>(
    getClient().GET("/api/v2/players/{permaLink}/settings", {
      ...include,
      params: { path: { permaLink } },
    }),
  );
  // Field is marked @deprecated in the generated schema (legacy alias) but is
  // still the compat fallback until the backend drops it — route the access
  // through an index view so the deprecation hint doesn't fire.
  const legacySettings = raw.settings as Record<string, unknown>;
  const settings = {
    ...raw.settings,
    usePrestigeStyling: normalizeFlag(raw.settings.usePrestigeStyling),
    catReward: normalizeText(raw.settings.catReward),
    discord:
      raw.settings.discordUser ?? (legacySettings["discord_user"] as string | undefined),
  } as PlayerSettings["settings"];
  delete (settings as { discordUser?: unknown }).discordUser;
  delete (settings as { discord_user?: unknown }).discord_user;
  return { success: raw.success, settings, showcase: raw.showcase };
}

/**
 * GET /api/v2/players/{permaLink}/comments. The yaml Comment payload is a
 * superset of the stub contract's CommentsFile (openapi/README.md deviation 3),
 * so the parse boundary keeps the stub return type.
 */
export function getPlayerComments(permaLink: string): Promise<CommentsFile> {
  return unwrap(
    getClient().GET("/api/v2/players/{permaLink}/comments", {
      ...include,
      params: { path: { permaLink } },
    }),
  );
}

// ---------------------------------------------------------------------------
// session and status — priority 3
// ---------------------------------------------------------------------------

/** GET /api/v2/session — session probe (200 also with no session). */
export function getSession(): Promise<Session> {
  return unwrap(getClient().GET("/api/v2/session", include));
}

/** GET /api/v2/status — site status banner. */
export function getOnlineStatus(): Promise<OnlineStatus> {
  return unwrap(getClient().GET("/api/v2/status", include));
}

/** GET /api/v2/heartbeats — the polled live-raids map (ETag cache, 5 s poll). */
export function getHeartbeats(): Promise<HeartbeatsMap> {
  return cachedGet<HeartbeatsMap>("/api/v2/heartbeats");
}

// ---------------------------------------------------------------------------
// comments (writes) — priority 2; the receiver comes from the path, the author
// and liker from the session (the legacy bodies carried receiverId and
// liker_profile_id — openapi/README.md deviation 3). Rate limit: 3 comments
// per minute per author, over the limit 429 `rate_limited` with `Retry-After`
// (seconds) — see openapi/README.md; ApiError does not parse Retry-After yet.
// ---------------------------------------------------------------------------

/** POST /api/v2/comments/{commentId}/like — toggles the session player's like. */
export function likeComment(commentId: string): Promise<LikeCommentResult> {
  return unwrap(
    getClient().POST("/api/v2/comments/{commentId}/like", {
      ...include,
      params: { path: { commentId } },
    }),
  );
}

/** POST /api/v2/comments/{commentId}/replies — answers 201 with the new reply. */
export function replyToComment(commentId: string, comment: string): Promise<Comment> {
  return unwrap(
    getClient().POST("/api/v2/comments/{commentId}/replies", {
      ...include,
      params: { path: { commentId } },
      body: { comment },
    }),
  );
}

/** DELETE /api/v2/comments/{commentId} — answers 204. */
export async function deleteComment(commentId: string): Promise<void> {
  await unwrap<void>(
    getClient().DELETE("/api/v2/comments/{commentId}", {
      ...include,
      params: { path: { commentId } },
    }),
  );
}

// ---------------------------------------------------------------------------
// friends — priority 4 (session). Rate limits on POST /api/v2/friend-requests:
// duplicates answer 409 `already_friends` / `request_already_sent`; see
// openapi/README.md.
// ---------------------------------------------------------------------------

/**
 * GET /api/v2/players/{permaLink}/friend-status. The yaml 0.2.0 wires the four
 * values wrapped as `{status}`; the page-facing contract is the bare union,
 * so the client unwraps that one key (openapi/README.md, deviation 6).
 */
export async function getFriendStatus(permaLink: string): Promise<FriendStatus> {
  const wrapped = await unwrap<{ status: FriendStatus }>(
    getClient().GET("/api/v2/players/{permaLink}/friend-status", {
      ...include,
      params: { path: { permaLink } },
    }),
  );
  return wrapped.status;
}

/** POST /api/v2/friend-requests — the target comes from the body, the sender from the session. */
export function sendFriendRequest(permaLink: string): Promise<SendFriendRequestResult> {
  return unwrap(getClient().POST("/api/v2/friend-requests", { ...include, body: { permaLink } }));
}

/** GET /api/v2/players/{permaLink}/friends. */
export function getPlayerFriends(permaLink: string): Promise<FriendList> {
  return unwrap(
    getClient().GET("/api/v2/players/{permaLink}/friends", {
      ...include,
      params: { path: { permaLink } },
    }),
  );
}

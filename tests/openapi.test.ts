/**
 * Unit tests for the v2 fetch client (src/api/openapi/client.ts) — Tasks
 * FRT-21/21b. The client runs on openapi-fetch, which builds every call as
 * `new Request(url, init)` and hands the Request to globalThis.fetch. fetch is
 * stubbed at the global level (no server): these tests pin the built URLs, the
 * typed ApiError on a {code, message} body, and the ETag cache behavior of the
 * two polled GET endpoints (heartbeats, seasons/current).
 *
 * The stubs are installed BEFORE importing the client module, because
 * createClient captures globalThis.Request and globalThis.fetch when the
 * module loads:
 * - fetch: a recording stub whose serve behavior each test swaps in;
 * - Request: a runtime like Bun has no document base URL, so `new
 *   Request("/api/v2/...")` fails to parse; the shim resolves request URLs
 *   against a synthetic origin. In the browser the client's URLs stay
 *   relative (API_BASE = "" = same origin); only the test-environment URL
 *   parsing changes.
 */

import { expect, test } from "bun:test";

let serve: () => Response = () => new Response("{}", { headers: { "Content-Type": "application/json" } });

const calls: Request[] = [];

globalThis.fetch = (async (input: RequestInfo | URL) => {
  calls.push(input instanceof Request ? input : new Request(input));
  return serve();
}) as typeof fetch;

class SyntheticOriginRequest extends Request {
  constructor(input: string | URL | Request, init?: RequestInit) {
    super(new URL(String(input), "http://localhost"), init);
  }
}
globalThis.Request = SyntheticOriginRequest as unknown as typeof Request;

const {
  ApiError,
  deleteComment,
  getCurrentSeason,
  getHeartbeats,
  getOnlineStatus,
  getPlayerComments,
  getPlayerEquipment,
  getPlayerRaidBlob,
  getPlayerRaids,
  getSeason,
  getSeasons,
  resetEtagCache,
  sendFriendRequest,
} = await import("../src/api/openapi/client");

/** The class type behind the dynamically imported ApiError value. */
type ApiErrorInstance = InstanceType<typeof ApiError>;

const PERMALINK = "9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0";

/** Swaps the serve behavior, clears the recording, returns the live recording. */
function useFetchStub(next: () => Response): Request[] {
  serve = next;
  calls.length = 0;
  return calls;
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function notModified(etag: string): Response {
  return new Response(null, { status: 304, headers: { ETag: etag } });
}

/** Path (+ query) of the recorded request. openapi-fetch builds it from the yaml path. */
function pathOf(request: Request): string {
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
}

function header(request: Request, name: string): string | null {
  return request.headers.get(name);
}

/**
 * Credentials are not part of the standard Request attributes (lib.dom); the
 * value arrives either from the runtime's own getter or from openapi-fetch
 * copying the RequestInit keys onto the request.
 */
function credentialsOf(request: Request): string | undefined {
  return (request as unknown as { credentials?: string }).credentials;
}

test("builds the yaml paths as same-origin URLs on every GET", async () => {
  const recorded = useFetchStub(() => jsonResponse({}));
  await getOnlineStatus();
  await getSeasons();
  await getSeason(12);
  await getPlayerRaids(PERMALINK);
  await getPlayerRaidBlob(PERMALINK, 0);
  await getPlayerEquipment(PERMALINK);
  await getPlayerComments(PERMALINK);
  expect(recorded.map(pathOf)).toEqual([
    "/api/v2/status",
    "/api/v2/seasons",
    "/api/v2/seasons/12",
    `/api/v2/players/${PERMALINK}/raids`,
    `/api/v2/players/${PERMALINK}/raids/blobs/0`,
    `/api/v2/players/${PERMALINK}/equipment`,
    `/api/v2/players/${PERMALINK}/comments`,
  ]);
  expect(recorded.every((request) => credentialsOf(request) === "include")).toBe(true);
});

test("throws ApiError parsed from the {code, message} body on a 404", async () => {
  useFetchStub(() => jsonResponse({ code: "not_found", message: "Season not found." }, 404));
  let caught: unknown;
  try {
    await getSeason(99);
  } catch (error) {
    caught = error;
  }
  expect(caught instanceof ApiError).toBe(true);
  expect(caught instanceof Error).toBe(true);
  const apiError = caught as ApiErrorInstance;
  expect(apiError.code).toBe("not_found");
  expect(apiError.message).toBe("Season not found.");
  expect(apiError.status).toBe(404);
});

test("falls back to a status-derived ApiError when the error body is not {code, message}", async () => {
  useFetchStub(() => new Response("<html>gateway error</html>", { status: 502, statusText: "" }));
  let caught: unknown;
  try {
    await getOnlineStatus();
  } catch (error) {
    caught = error;
  }
  expect(caught instanceof ApiError).toBe(true);
  const apiError = caught as ApiErrorInstance;
  expect(apiError.code).toBe("http_502");
  expect(apiError.status).toBe(502);
});

test("heartbeats ETag cache: sends If-None-Match and returns the cached data on 304", async () => {
  resetEtagCache();
  const v1 = { p1: { id: "p1", timestamp: 1, type: "online" } };
  let status = 200;
  let body: unknown = v1;
  let etag = '"hb-1"';
  const recorded = useFetchStub(() =>
    status === 304 ? notModified(etag) : jsonResponse(body, status, { ETag: etag }),
  );

  const first = await getHeartbeats();
  expect(first).toEqual(v1);
  expect(header(recorded[0], "If-None-Match")).toBe(null);

  // Same ETag upstream: 304, no body — the cached object comes back verbatim.
  status = 304;
  body = null;
  const second = await getHeartbeats();
  expect(second).toBe(first);
  expect(header(recorded[1], "If-None-Match")).toBe('"hb-1"');
  expect(credentialsOf(recorded[1])).toBe("include");

  // Upstream changed: a 200 with a new ETag refreshes the cache.
  status = 200;
  const v2 = { p1: { id: "p1", timestamp: 2, type: "raid" } };
  body = v2;
  etag = '"hb-2"';
  const third = await getHeartbeats();
  expect(third).toEqual(v2);
  expect(header(recorded[2], "If-None-Match")).toBe('"hb-1"');

  status = 304;
  body = null;
  const fourth = await getHeartbeats();
  expect(fourth).toBe(third);
  expect(header(recorded[3], "If-None-Match")).toBe('"hb-2"');
});

test("seasons/current ETag cache: no If-None-Match on the first call, cached data on 304", async () => {
  resetEtagCache();
  const board = { leaderboard: [{ id: "p1", name: "Pilot" }] };
  let status = 200;
  let body: unknown = board;
  let etag = '"season-1"';
  const recorded = useFetchStub(() =>
    status === 304 ? notModified(etag) : jsonResponse(body, status, { ETag: etag }),
  );

  const first = await getCurrentSeason();
  expect(first).toEqual(board);
  expect(header(recorded[0], "If-None-Match")).toBe(null);

  status = 304;
  body = null;
  const second = await getCurrentSeason();
  expect(second).toBe(first);
  expect(header(recorded[1], "If-None-Match")).toBe('"season-1"');
});

test("POST /api/v2/friend-requests sends the permaLink as a JSON body", async () => {
  const recorded = useFetchStub(() =>
    jsonResponse({ success: true, message: "Friend request sent successfully" }, 201),
  );
  const result = await sendFriendRequest(PERMALINK);
  expect(result.success).toBe(true);
  const request = recorded[0];
  expect(pathOf(request)).toBe("/api/v2/friend-requests");
  expect(request.method).toBe("POST");
  expect(await request.clone().text()).toBe(JSON.stringify({ permaLink: PERMALINK }));
  expect(header(request, "Content-Type")).toBe("application/json");
  expect(credentialsOf(request)).toBe("include");
});

test("DELETE /api/v2/comments/{commentId} answers 204 and resolves", async () => {
  const recorded = useFetchStub(() => new Response(null, { status: 204 }));
  await deleteComment("7f3a2b1c9d4e5f60");
  const request = recorded[0];
  expect(pathOf(request)).toBe("/api/v2/comments/7f3a2b1c9d4e5f60");
  expect(request.method).toBe("DELETE");
});

/**
 * Page-facing types for the v2 website API (Task FRT-21b).
 *
 * The generated types live in schema.d.ts (openapi-typescript codegen from the
 * backend's OpenAPI draft — command in openapi/README.md; the yaml is the
 * read-only authority). This module keeps only what the client's
 * stub-compatible signatures export:
 *
 * - re-exports of the matching domain types in src/api/types.ts, where the
 *   client keeps the stub return types (the generated schema types are
 *   strictly wider than the domain types; the client casts at the parse
 *   boundary — openapi/README.md);
 * - aliases derived from schema.d.ts where the yaml matches the page contract;
 * - the two page-facing shapes the generated schema does not cover: the
 *   normalized `PlayerSettings` view and the bare `FriendStatus` union.
 */

import type { components, operations } from "./schema";

type Schemas = components["schemas"];

// ---------------------------------------------------------------------------
// yaml schemas kept as the stub return types — re-exported from ../types.
// The per-type caveat (where the yaml schema is wider than the domain type)
// is in openapi/README.md.
// ---------------------------------------------------------------------------

/** yaml `Leaderboard` (GET /api/v2/seasons/current, GET /api/v2/seasons/{season}). */
export type { SeasonData } from "../types";

/** yaml `RaidIndex` (GET /api/v2/players/{permaLink}/raids; yaml deprecates `player_id`). */
export type { RaidIndex } from "../types";

/** yaml `RaidBlob` (GET /api/v2/players/{permaLink}/raids/blobs/{blob}). */
export type { RaidBlob } from "../types";

/** yaml `Equipment` (GET /api/v2/players/{permaLink}/equipment). */
export type { Equipment } from "../types";

/**
 * yaml `CommentList` (GET /api/v2/players/{permaLink}/comments). The stub
 * contract's trimmed `PlayerComment[]` stays the getPlayerComments() return
 * type; the yaml `Comment` (see below) is a superset of it (openapi/README.md,
 * deviation 3).
 */
export type { CommentsFile } from "../types";

/** yaml `GlobalCounters` (GET /api/v2/counters/global). */
export type { GlobalCounters } from "../types";

/** yaml `AchievementCounters` (GET /api/v2/counters/achievements). */
export type { AchievementCounters } from "../types";

/** yaml `WeaponCounters` (GET /api/v2/counters/weapons). */
export type { WeaponCounters } from "../types";

/** yaml `Status` (GET /api/v2/status). */
export type { OnlineStatus } from "../types";

/** yaml `Heartbeats` (GET /api/v2/heartbeats; yaml `gameTime` is a number, see README). */
export type { HeartbeatsMap } from "../types";

// ---------------------------------------------------------------------------
// aliases derived from schema.d.ts.
// ---------------------------------------------------------------------------

/** yaml schema `Error`: body of every non-2xx answer (api-design.md rule 6). */
export type ErrorBody = Schemas["Error"];

/** yaml schema `SeasonList`: GET /api/v2/seasons (replaces the CURRENT_SEASON constant). */
export type SeasonList = Schemas["SeasonList"];

/**
 * yaml schema `Comment`: one comment as stored in the player's comment list.
 * 0.2.0: the frontend-visible keys `{id, text, author, avatar, sent_to_id,
 * date, timestamp}` are required; `likes` is an optional like COUNT (number),
 * not the legacy liker array.
 */
export type Comment = Schemas["Comment"];

/** yaml schema `CommentList`: the comments on one player's profile (last 100). */
export type CommentList = Schemas["CommentList"];

/** yaml schema `Session`: GET /api/v2/session (200 also with no session). */
export type Session = Schemas["Session"];

/** yaml schema `FriendList`: GET /api/v2/players/{permaLink}/friends. */
export type FriendList = Schemas["FriendList"];

/** One entry of yaml schema `FriendList`. */
export type FriendEntry = Schemas["FriendList"]["friends"][number];

/** One showcase slot of yaml schema `Showcase`. Slots without an inventory item are dropped. */
export type ShowcaseItem = Schemas["Showcase"]["additionalProperties"];

/** yaml inline 200 response of POST /api/v2/comments/{commentId}/like. */
export type LikeCommentResult =
  operations["likeComment"]["responses"][200]["content"]["application/json"];

/** yaml inline 201 response of POST /api/v2/friend-requests. */
export type SendFriendRequestResult =
  operations["sendFriendRequest"]["responses"][201]["content"]["application/json"];

/**
 * GET /api/v2/equipment-history: the whole blob, served as-is (yaml loose
 * object). The yaml documents the `?weapon=` query parameter (planned for
 * 0.3.0, not built); the client does not expose it — without it the whole
 * file is served, which stays the current behavior.
 */
export type EquipmentHistory =
  operations["getEquipmentHistory"]["responses"][200]["content"]["application/json"];

/** yaml schema `PlayerSettings`, before the client's normalization (see PlayerSettings). */
export type RawPlayerSettings = Schemas["PlayerSettings"];

/**
 * yaml schema `PlayerSettings` (GET /api/v2/players/{permaLink}/settings)
 * after the client's 0.2.0 normalization (rules in openapi/README.md):
 *
 * - `usePrestigeStyling` arrives `integer | string` (0/1 on most profiles, a
 *   string on a few) and is normalized to a boolean (0, "0" and "false" are
 *   false; any other present value true);
 * - `catReward` arrives `integer | string` and is normalized to a string;
 * - `discord` collapses the new `discordUser` spelling and the deprecated
 *   `discord_user` (present on ~2/3 of real profiles): discordUser first,
 *   then discord_user; the two raw keys are dropped from the answer.
 *
 * The normalized object spreads the raw settings, so undocumented
 * additionalProperties keys survive at runtime (they are just untyped here).
 * team_user is present on every profile and not read by the frontend.
 */
export interface PlayerSettings {
  /** Always true on a match; the legacy success:false answers are 404 here. */
  success: boolean;
  settings: {
    profileTheme?: string;
    usePrestigeStyling?: boolean;
    prestigeBackground?: string;
    backgroundReward?: string;
    mainBackgroundReward?: string;
    catReward?: string;
    pfpStyle?: unknown;
    pfpBorder?: string;
    decal?: string;
    about_me?: string;
    /** Normalized: yaml `discordUser`, falling back to the deprecated `discord_user`. */
    discord?: string;
    /** Present on every profile; not read by the frontend. */
    team_user?: string;
    profilePicture?: string;
    name?: string;
    forbidNameChange?: boolean;
  };
  /** Map of showcase slot to the item shown in it. */
  showcase: Record<string, ShowcaseItem>;
}

/**
 * The four values of yaml schema `FriendStatus`, as the page-facing bare union
 * (the same values the community mock's union has). The yaml 0.2.0 wires them
 * wrapped as `{status}`; getFriendStatus() unwraps that one key
 * (openapi/README.md, deviation 6).
 */
export type FriendStatus = "canAdd" | "isFriend" | "requestPending" | "cannotAdd";

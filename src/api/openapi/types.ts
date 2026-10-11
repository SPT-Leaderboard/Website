/**
 * Hand-written types for the v2 website API, derived strictly from the
 * backend OpenAPI draft 0.1.0 (backend repo, docs/api/openapi.yaml — read-only
 * authority; rules in docs/api/api-design.md).
 *
 * Where a yaml schema matches an existing domain type in src/api/types.ts,
 * that type is re-exported instead of duplicated (the mapping is commented at
 * each re-export). Everything else is written here from the yaml, with yaml
 * optionality: a field is optional exactly when the yaml leaves it out of
 * `required`. Fields the yaml marks `deprecated: true` carry a deprecation
 * note; they stay in the responses for now (api-design.md rule 9).
 */

// ---------------------------------------------------------------------------
// yaml schemas matched 1:1 by existing src/api/types.ts types — re-exported.
// The per-type caveat (where the yaml is looser than the domain type) is in
// src/api/openapi/README.md.
// ---------------------------------------------------------------------------

/** yaml `Leaderboard` (GET /api/v2/seasons/current, GET /api/v2/seasons/{season}). */
export type { SeasonData } from "../types";

/** yaml `Player` — one leaderboard entry. */
export type { PlayerEntry } from "../types";

/** yaml `RaidIndex` (GET /api/v2/players/{permaLink}/raids; yaml deprecates `player_id`). */
export type { RaidIndex } from "../types";

/** yaml `RaidBlob` (GET /api/v2/players/{permaLink}/raids/blobs/{blob}). */
export type { RaidBlob } from "../types";

/** yaml `Equipment` (GET /api/v2/players/{permaLink}/equipment). */
export type { Equipment } from "../types";

/**
 * yaml `CommentList` (GET /api/v2/players/{permaLink}/comments). The yaml
 * `Comment` payload is a superset of the legacy trimmed `PlayerComment` this
 * alias builds on (see `Comment` below); the client keeps this stub-contract
 * return type until the pages rewire (openapi/README.md, deviation 3).
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
// yaml-only schemas (no matching domain type in src/api/types.ts).
// ---------------------------------------------------------------------------

/** yaml schema `Error`: body of every non-2xx answer (api-design.md rule 6). */
export interface ErrorBody {
  /** Stable lower_snake_case machine code (not_found, unauthenticated, ...). */
  code: string;
  /** Short text for people. */
  message: string;
}

/** yaml schema `SeasonList`: GET /api/v2/seasons (replaces the CURRENT_SEASON constant). */
export interface SeasonList {
  /** The current season number (minimum 2). */
  current: number;
  /** Every season number that has a published leaderboard, ascending. */
  available: number[];
}

/** yaml inline 201 response of POST /api/v2/comments/{commentId}/like. */
export interface LikeCommentResult {
  success: boolean;
  /** Like count after the toggle. */
  likes: number;
  /** Whether the session player likes the comment after the toggle. */
  liked: boolean;
}

/** yaml inline 201 response of POST /api/v2/friend-requests. */
export interface SendFriendRequestResult {
  success: boolean;
  message: string;
}

/**
 * yaml schema `Comment`: one comment as stored in the player's comment list.
 * Stored replies are the same shape minus `sent_to_id`, `replies` and
 * `parent_id` (the parent is only implied by position). This is a superset of
 * the legacy trimmed `PlayerComment` in src/api/types.ts (which lacks
 * `permaLink`, `author_id`, `likes`, `is_deleted`).
 */
export interface Comment {
  /** Id of the comment (the `{commentId}` path parameter). */
  id: string;
  /** permaLink of the receiver (the profile the comment was written on). */
  permaLink: string;
  /** Comment text (legacy rule: 3 to 500 characters). */
  text: string;
  /** Display name of the author (from the session on writes). */
  author: string;
  /** Author key used by the legacy author check. */
  author_id: string;
  /** Receiver key. Top-level comments only; stored replies omit it. */
  sent_to_id?: string;
  /** Avatar of the author. */
  avatar: string;
  /** Legacy display date (format not stated in the yaml). */
  date: string;
  /** Unix seconds. */
  timestamp: number;
  /** The likers (the count is the array length). */
  likes: string[];
  /** Replies to this comment (top-level comments only). */
  replies?: Comment[];
  /** Id of the parent comment. Present on top-level comments; stored replies omit it. */
  parent_id?: string;
  /** Soft-delete marker set by DELETE /api/v2/comments/{commentId}. */
  is_deleted: boolean;
  /** Unix seconds. Added when the comment is deleted. */
  deleted_at?: number;
}

/** yaml schema `CommentList`: the comments on one player's profile (last 100). */
export type CommentList = Comment[];

/**
 * yaml schema `PlayerSettings`: GET /api/v2/players/{permaLink}/settings
 * (replaces POST network/functions/get_player_customization.php — settings is
 * GET now; the legacy success:false answers are 404 here).
 */
export interface PlayerSettings {
  /** Always true on a match; the legacy success:false answers are 404 here. */
  success: boolean;
  /**
   * The profile's profileSettings. Exact key casing is an open question in the
   * yaml (the inventory says "name, about, discord, profile picture").
   */
  settings: {
    name?: string;
    about?: string;
    discord?: string;
    profilePicture?: string;
  };
  /** Map of showcase slot to the item shown in it. */
  showcase: Record<string, ShowcaseItem>;
}

/** One showcase slot of yaml schema `Showcase`. Slots without an inventory item are dropped. */
export interface ShowcaseItem {
  item_id: string;
  name: string;
  icon_path: string;
  rarity: string;
  base_price: number;
  slot: string;
}

/**
 * yaml schema `Session`: GET /api/v2/session. With a session the other four
 * fields are present; without one the answer is 200 with
 * `{"authenticated": false}` only. (The mock in src/api/auth.ts types the
 * fields as nullable instead of optional.)
 */
export interface Session {
  authenticated: boolean;
  username?: string;
  profilePicture?: string;
  /** Unread notification count of the session account. */
  unreadCount?: number;
  maintenance?: boolean;
}

/** yaml schema `FriendStatus` (same four values as the community mock's union). */
export type FriendStatus = "canAdd" | "isFriend" | "requestPending" | "cannotAdd";

/** One entry of yaml schema `FriendList`. */
export interface FriendEntry {
  /** Public player key of the friend. */
  permaLink: string;
  /** Profile id of the friend. */
  id: string;
  name: string;
  profilePicture: string;
  /** Unix seconds. */
  added_at: number;
  /** Friendship status of the entry, as stored by the legacy writer. */
  status: string;
}

/** yaml schema `FriendList`: GET /api/v2/players/{permaLink}/friends. */
export interface FriendList {
  friends: FriendEntry[];
}

/**
 * GET /api/v2/equipment-history (yaml inline response schema): the same JSON
 * as data/pmc_equipment_blob/equipment_history_blob.json. Loose object — the
 * yaml does not model the inner shape in this draft.
 */
export type EquipmentHistory = Record<string, unknown>;

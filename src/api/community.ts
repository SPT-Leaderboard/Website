/**
 * Community feature data + pure logic (FRT-14).
 *
 * Legacy behavior source (docs/port/feature-inventory.md, js/user-community.js):
 *   FriendManager   — friend status from `is_friend.php` (data-dependency-map
 *                     #17: canAdd | isFriend | requestPending | cannotAdd),
 *                     requests via `send_friend_request.php` (#18), the friend
 *                     list merged from server friends and same-tag locals (#19,
 *                     legacy `checkFriends()`), heartbeat-driven online dots.
 *                     Unfriending was a client-side stub with no API call.
 *   CommentsManager — like (#14), reply (#15) and delete (#16) actions. Delete
 *                     was allowed for the comment author or a role above 5.
 *
 * Mock mode: every action resolver succeeds after the usual 0-300 ms delay and
 * persists nothing; the resolvers serve the synthesized fixtures in
 * src/mocks/community/ (provenance in src/mocks/README.md). The real fetch
 * client replaces this module later without changing these signatures.
 */

import friendsFixture from "../mocks/community/friends.json";
import friendStatusFixture from "../mocks/community/friend-status.json";
import type { PlayerComment } from "./types";

/** Random 0-300 ms latency, mirroring src/api/client.ts. */
function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 300));
}

/** One row of the merged friend list (legacy get_friends.php + local friends). */
export interface FriendRow {
  id: string;
  permaLink: string;
  name: string;
  /** Empty string when the friend plays without a team tag. */
  teamTag: string;
  /** Last leaderboard activity, unix seconds (legacy absoluteLastTime). */
  lastSeen: number;
}

/** The four legacy is_friend.php statuses. */
export type FriendStatus = "canAdd" | "isFriend" | "requestPending" | "cannotAdd";

/** `send_friend_request.php` response shape. */
export interface FriendRequestResult {
  success: boolean;
  message: string;
}

/** Like/reply/delete response shape (mock actions always succeed). */
export interface CommentActionResult {
  success: boolean;
}

/**
 * Resolves the merged friend list. Mock-mode stand-in: the same synthesized
 * list is served for every viewed profile — legacy merged per-viewer server
 * friends with same-tag locals from the leaderboard, and the fixture rows are
 * picked so both halves of that merge are represented (see
 * src/mocks/README.md).
 */
export async function getFriends(): Promise<FriendRow[]> {
  await delay();
  return friendsFixture as FriendRow[];
}

/**
 * Resolves the friend button status towards a player (legacy `is_friend.php`,
 * keyed by the viewed profile). Mock-mode stand-in: the single fixture status
 * is served regardless of `permaLink`; all four legacy statuses are valid
 * fixture values (src/mocks/README.md).
 */
export async function getFriendStatus(permaLink: string): Promise<FriendStatus> {
  await delay();
  void permaLink;
  return (friendStatusFixture as { status: string }).status as FriendStatus;
}

/**
 * Sends a friend request (legacy `send_friend_request.php`). Mock mode:
 * resolves after the delay, persists nothing.
 */
export async function sendFriendRequest(permaLink: string): Promise<FriendRequestResult> {
  await delay();
  void permaLink;
  return { success: true, message: "Request sent (mock)" };
}

/** Likes a comment (legacy `like_comment.php`). Mock mode: no persistence. */
export async function likeComment(commentId: string, permaLink: string): Promise<CommentActionResult> {
  await delay();
  void commentId;
  void permaLink;
  return { success: true };
}

/** Replies to a comment (legacy `reply_comment.php`). Mock mode: no persistence. */
export async function replyComment(
  parentCommentId: string,
  permaLink: string,
  text: string,
): Promise<CommentActionResult> {
  await delay();
  void parentCommentId;
  void permaLink;
  void text;
  return { success: true };
}

/** Deletes a comment (legacy `delete_comment.php`). Mock mode: no persistence. */
export async function deleteComment(
  commentId: string,
  permaLink: string,
): Promise<CommentActionResult> {
  await delay();
  void commentId;
  void permaLink;
  return { success: true };
}

/**
 * Friend action button state derived from the legacy is_friend status
 * (FriendManager.renderFriendButton variants). "remove" and "send" carry an
 * action; "pending" and "cannot" are disabled with an explanation.
 */
export type FriendButtonState = "remove" | "send" | "pending" | "cannot";

export function friendButtonState(status: FriendStatus): FriendButtonState {
  switch (status) {
    case "isFriend":
      return "remove";
    case "canAdd":
      return "send";
    case "requestPending":
      return "pending";
    case "cannotAdd":
      return "cannot";
  }
}

/** UI copy for each button state (legacy button labels + disabled reasons). */
export interface FriendButtonView {
  label: string;
  disabled: boolean;
  /** Explanation shown with disabled buttons; empty for actionable ones. */
  hint: string;
}

export const FRIEND_BUTTON_VIEWS: Record<FriendButtonState, FriendButtonView> = {
  remove: { label: "Remove friend", disabled: false, hint: "" },
  send: { label: "Send friend request", disabled: false, hint: "" },
  pending: {
    label: "Friend request pending",
    disabled: true,
    hint: "Your friend request is waiting for approval.",
  },
  cannot: {
    label: "Cannot add friend",
    disabled: true,
    hint: "This player cannot receive friend requests.",
  },
};

/**
 * Legacy CommentsManager.canDeleteComment: the comment author may delete their
 * own comment, and a role above 5 (moderation) may delete any. Mock
 * simplification: sessions carry no account id or role (src/api/auth.ts), so
 * the rule reduces to "is the mock logged-in username the comment author",
 * matched by display-name string (documented in src/mocks/README.md).
 */
export function canDeleteComment(comment: PlayerComment, username: string | null): boolean {
  return username !== null && comment.author === username;
}

/**
 * Like count for a comment row. Legacy comment rows carry `likes` (array of
 * liker ids) but the trimmed fixture predates that field; `extraLikes` carries
 * the local (unpersisted) optimistic likes keyed by comment id.
 */
export function commentLikeCount(
  comment: PlayerComment,
  extraLikes: ReadonlySet<string> = new Set<string>(),
): number {
  const legacy = (comment as { likes?: unknown[] }).likes;
  const base = Array.isArray(legacy) ? legacy.length : 0;
  return base + (extraLikes.has(comment.id) ? 1 : 0);
}

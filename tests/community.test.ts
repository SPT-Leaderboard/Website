// FRT-14 community logic tests. Pure helpers and mock resolvers from
// src/api/community.ts, no DOM: the friend-status → button-state mapping
// (legacy FriendManager.renderFriendButton), the mock delete-visibility rule
// (legacy CommentsManager.canDeleteComment simplified to author-name match),
// the like-count helper, and the fixture-backed resolvers.
import { expect, test } from "bun:test";
import {
  FRIEND_BUTTON_VIEWS,
  canDeleteComment,
  commentLikeCount,
  friendButtonState,
  getFriendStatus,
  getFriends,
  sendFriendRequest,
  type FriendStatus,
} from "../src/api/community";
import type { PlayerComment } from "../src/api/types";

/** Builds a PlayerComment carrying the fields the community helpers read. */
function makeComment(author: string, id = "69554253635bc"): PlayerComment {
  return {
    id,
    text: "gng check ur mail",
    author,
    sent_to_id: "6952de5893e1750730bc3130",
    avatar: "",
    date: "2025-12-31 12:33:39",
    timestamp: 1767195219,
  } as PlayerComment;
}

test("friend status button state mapping covers all four legacy statuses", () => {
  // Legacy is_friend.php statuses (data-dependency-map #17) → button states.
  expect(friendButtonState("isFriend")).toBe("remove");
  expect(friendButtonState("canAdd")).toBe("send");
  expect(friendButtonState("requestPending")).toBe("pending");
  expect(friendButtonState("cannotAdd")).toBe("cannot");

  // remove/send carry an action; pending/cannot are disabled with an
  // explanation (legacy disabled buttons + explanatory text).
  expect(FRIEND_BUTTON_VIEWS.remove).toEqual({ label: "Remove friend", disabled: false, hint: "" });
  expect(FRIEND_BUTTON_VIEWS.send).toEqual({ label: "Send friend request", disabled: false, hint: "" });
  expect(FRIEND_BUTTON_VIEWS.pending.disabled).toBe(true);
  expect(FRIEND_BUTTON_VIEWS.cannot.disabled).toBe(true);
  expect(FRIEND_BUTTON_VIEWS.pending.hint.length).toBeGreaterThan(0);
  expect(FRIEND_BUTTON_VIEWS.cannot.hint.length).toBeGreaterThan(0);
});

test("canDeleteComment matches the mock logged-in username by author name", () => {
  const comment = makeComment("T0MlKA");

  // The mock logged-in variant is "Pilot" (src/api/auth.ts getSession) —
  // T0MlKA's comment is not theirs, so no Delete button.
  expect(canDeleteComment(comment, "Pilot")).toBe(false);
  // Author-name match: Pilot's own comment is deletable.
  expect(canDeleteComment(makeComment("Pilot"), "Pilot")).toBe(true);
  // Logged out / session not resolved yet: never deletable.
  expect(canDeleteComment(comment, null)).toBe(false);
  // Name matching is exact, not case- or whitespace-tolerant.
  expect(canDeleteComment(comment, "t0mlka")).toBe(false);
});

test("commentLikeCount counts the legacy likes array plus the local optimistic like", () => {
  // The fixture rows have no likes field yet (trimmed snapshot).
  const comment = makeComment("T0MlKA");
  expect(commentLikeCount(comment)).toBe(0);
  // extraLikes is keyed by comment id (the local optimistic like).
  expect(commentLikeCount(comment, new Set([comment.id]))).toBe(1);
  expect(commentLikeCount(comment, new Set(["other-id"]))).toBe(0);
  const liked = comment as PlayerComment & { likes: string[] };
  liked.likes = ["a", "b"];
  expect(commentLikeCount(liked)).toBe(2);
  expect(commentLikeCount(liked, new Set([comment.id, comment.id]))).toBe(3);
});

test("getFriends serves the synthesized merged fixture (4 rows)", async () => {
  const friends = await getFriends();
  expect(friends).toHaveLength(4);
  for (const friend of friends) {
    expect(friend.id.length).toBeGreaterThan(0);
    expect(friend.permaLink.length).toBeGreaterThan(0);
    expect(friend.name.length).toBeGreaterThan(0);
    expect(typeof friend.lastSeen).toBe("number");
    expect(typeof friend.teamTag).toBe("string");
  }
});

test("getFriendStatus serves a valid legacy status; sendFriendRequest resolves the mock message", async () => {
  const status: FriendStatus = await getFriendStatus("d71580abf208616a");
  expect(["canAdd", "isFriend", "requestPending", "cannotAdd"]).toContain(status);

  expect(await sendFriendRequest("d71580abf208616a")).toEqual({
    success: true,
    message: "Request sent (mock)",
  });
});

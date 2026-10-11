// FRT-13 profile logic tests. Pure functions from src/api/profile.ts, no DOM:
// newest-first raid sorting, comment wall pagination, and the #id= deep-link
// hash round-trip (legacy user-share.js contract).
import { expect, test } from "bun:test";
import {
  COMMENT_PAGE_SIZE,
  buildProfileHash,
  paginateComments,
  parseProfileHash,
  sortRaidsNewestFirst,
} from "../src/api/profile";
import type { PlayerComment, RaidRecord } from "../src/api/types";

/** Builds a RaidRecord carrying the fields the profile helpers read. */
function makeRaid(
  overrides: Partial<RaidRecord> & { raidNumber: number; absoluteLastTime: number },
): RaidRecord {
  return {
    raidKills: 0,
    raidTime: 600,
    raidResult: "Survived",
    lastRaidSurvived: 1,
    lastRaidProfit: 0,
    lastRaidMap: "Ground Zero - Low",
    ...overrides,
  } as RaidRecord;
}

/** Builds a PlayerComment carrying the fields pagination displays. */
function makeComment(id: number): PlayerComment {
  return {
    id: `c${id}`,
    text: `comment ${id}`,
    author: `author ${id}`,
    sent_to_id: "player",
    avatar: "",
    date: "2025-12-31 12:33:39",
    timestamp: 1767195219 + id,
  } as PlayerComment;
}

test("sortRaidsNewestFirst orders raids by absoluteLastTime descending without mutating the input", () => {
  const raids = [
    makeRaid({ raidNumber: 1, absoluteLastTime: 1_700_000_100 }),
    makeRaid({ raidNumber: 2, absoluteLastTime: 1_700_000_300 }),
    makeRaid({ raidNumber: 3, absoluteLastTime: 1_700_000_200 }),
  ];
  const sorted = sortRaidsNewestFirst(raids);
  expect(sorted.map((raid) => raid.raidNumber)).toEqual([2, 3, 1]);
  // The input list keeps its original order (display sorting never reshuffles
  // the fixture data itself).
  expect(raids.map((raid) => raid.raidNumber)).toEqual([1, 2, 3]);
});

test("paginateComments slices legacy-sized pages and clamps out-of-range pages", () => {
  expect(COMMENT_PAGE_SIZE).toBe(5);
  const wall = Array.from({ length: 12 }, (_, index) => makeComment(index + 1));

  const first = paginateComments(wall, 1);
  expect(first.pageCount).toBe(3);
  expect(first.items).toHaveLength(5);
  expect(first.items[0].id).toBe("c1");
  expect(first.items[4].id).toBe("c5");

  const last = paginateComments(wall, 3);
  expect(last.items).toHaveLength(2);
  expect(last.items[1].id).toBe("c12");

  // Out-of-range requests clamp into the valid range instead of emptying.
  expect(paginateComments(wall, 99).page).toBe(3);
  expect(paginateComments(wall, 0).page).toBe(1);
  expect(paginateComments(wall, -2).items).toHaveLength(5);

  // An empty wall is still "page 1 of 1" (the empty state, not a crash).
  const empty = paginateComments([], 1);
  expect(empty.pageCount).toBe(1);
  expect(empty.items).toHaveLength(0);
});

test("profile hash round-trips the permaLink and rejects foreign hashes", () => {
  const hash = buildProfileHash("d71580abf208616a3a619cd3194ed3751925d1844eb34aec13d5a2e578b77268");
  expect(hash).toBe("#id=d71580abf208616a3a619cd3194ed3751925d1844eb34aec13d5a2e578b77268");
  expect(parseProfileHash(hash)).toBe(
    "d71580abf208616a3a619cd3194ed3751925d1844eb34aec13d5a2e578b77268",
  );
  expect(parseProfileHash("")).toBe(null);
  expect(parseProfileHash("#id=")).toBe(null);
  expect(parseProfileHash("#other=1")).toBe(null);
});

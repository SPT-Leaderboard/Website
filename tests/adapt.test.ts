/**
 * Unit tests for the FRT-20 first slice: the mock/real switch surface of
 * src/api/client.ts. The live-row adapter (adaptLiveSeasonEntry) is checked
 * against the dev FAKE-data shapes captured from GET /api/v2/seasons/current
 * (SPTLB_FAKE=1): the placeholder nested objects must normalize into the
 * domain PlayerEntry without touching well-formed fields. The switch itself
 * stays on the fixture path here (tests never set PUBLIC_API_BASE_URL).
 */

import { expect, test } from "bun:test";
import { adaptLiveSeasonEntry, getSeasons, REAL_API_ENABLED } from "../src/api/client";
import seasonFixture from "../src/mocks/season12.json";
import type { PlayerEntry } from "../src/api/types";

/** One dev FAKE-data row, reduced to the fields whose live shape diverges
 *  from PlayerEntry (all captured verbatim from a live response row). */
const liveShapedRow = {
  id: "9f83153c3361fd3268b44b30",
  name: "Test Player 001",
  permaLink: "7935d2f7c57a19dfa8d44e3a8e0f83296bcacf7f9043ffad18137ef3f63c21bc",
  totalScore: 674.3,
  banned: false,
  teamTag: "FAKE",
  // "present only on some entries": absent on 10/100 dev rows.
  // scavProfitGain / scavPlayTime deliberately omitted.
  allAchievements: { fake_achievement_1: true, fake_achievement_2: false },
  bestStats: { fake_bestStats: 4 },
  breachTraits: { fake_breachTraits: 0 },
  completed_quests: { fake_completed_quests: 8 },
  mapFatigue: { Customs: 6, Woods: 84, "Ground Zero": 98 },
  previousBan: "fake_previousBan",
  stattrack_weapons: { "7935d2f7c57a19dfa8d44e3a8e0f83296bcacf7f9043ffad18137ef3f63c21bc": 17 },
  teamVault: { fake_teamVault: 1 },
  traderInfo: {
    "Trader A": { unlocked: true, standing: 0.1, salesSum: 97716 },
  },
} as unknown as PlayerEntry;

test("the switch defaults to fixtures when PUBLIC_API_BASE_URL is unset", () => {
  expect(REAL_API_ENABLED).toBe(false);
});

test("getSeasons serves the fixture-derived list in mock mode", async () => {
  const list = await getSeasons();
  expect(list.current).toBe(12);
  expect(list.available).toEqual([12]);
});

test("the adapter keeps scalars and defaults the absent conditionals", () => {
  const row = adaptLiveSeasonEntry(liveShapedRow);
  expect(row.id).toBe(liveShapedRow.id);
  expect(row.name).toBe("Test Player 001");
  expect(row.totalScore).toBe(674.3);
  expect(row.teamTag).toBe("FAKE");
  expect(row.scavProfitGain).toBe(0);
  expect(row.scavPlayTime).toBe(0);
});

test("the adapter drops the dev placeholder maps it cannot map", () => {
  const row = adaptLiveSeasonEntry(liveShapedRow);
  // boolean placeholders are not unix-second timestamps
  expect(row.allAchievements).toEqual({});
  // placeholder string is not a ban record
  expect(row.previousBan).toBeUndefined();
  // numeric placeholder is not a per-weapon map
  expect(row.stattrack_weapons).toEqual({});
  // flat quest placeholder lacks the timestamp fields
  expect(row.completed_quests).toEqual({});
});

test("the adapter rebuilds bestStats, breachTraits and teamVault with defaults", () => {
  const row = adaptLiveSeasonEntry(liveShapedRow);
  expect(row.bestStats).toEqual({
    killsPerRaid: 0,
    damagePerRaid: 0,
    maxKillsInRaid: 0,
    maxDamageInRaid: 0,
    bestKDR: 0,
    bestSurvivalRate: 0,
  });
  expect(row.breachTraits).toEqual({
    completed: false,
    selected_at: 0,
    positive: [],
    negative: [],
    score_remaining: 0,
    modifiers: [],
    counters: [],
  });
  expect(row.teamVault).toEqual({ profitGained: 0, kills: 0 });
});

test("the adapter maps the flat dev mapFatigue onto mapCounts", () => {
  const row = adaptLiveSeasonEntry(liveShapedRow);
  expect(row.mapFatigue).toEqual({
    mapCounts: { Customs: 6, Woods: 84, "Ground Zero": 98 },
    totalTrackedRaids: 0,
    appliedPenalty: 0,
  });
});

test("the adapter fills the missing TraderInfo fields", () => {
  const row = adaptLiveSeasonEntry(liveShapedRow);
  expect(row.traderInfo["Trader A"]).toEqual({
    id: "",
    unlocked: true,
    loyaltyLevel: 0,
    salesSum: 97716,
    standing: 0.1,
    disabled: false,
  });
});

test("the adapter preserves a well-formed fixture row", () => {
  const entry = seasonFixture.leaderboard[0] as unknown as PlayerEntry;
  const row = adaptLiveSeasonEntry({ ...entry, teamTag: entry.teamTag ?? "" });
  expect(row.id).toBe(entry.id);
  expect(row.mapFatigue).toEqual(entry.mapFatigue);
  expect(row.bestStats).toEqual(entry.bestStats);
  expect(row.breachTraits).toEqual(entry.breachTraits);
  expect(row.teamVault).toEqual(entry.teamVault);
  expect(row.traderInfo).toEqual(entry.traderInfo);
  expect(row.completed_quests).toEqual(entry.completed_quests);
  expect(row.allAchievements).toEqual(entry.allAchievements);
  expect(row.stattrack_weapons).toEqual(entry.stattrack_weapons);
  expect(row.previousBan).toBeUndefined(); // fixture entry[0] carries none
});

test("the adapter defaults a missing teamTag to the empty string", () => {
  const row = adaptLiveSeasonEntry({ ...liveShapedRow, teamTag: undefined });
  expect(row.teamTag).toBe("");
});

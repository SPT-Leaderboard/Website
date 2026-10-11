import { expect, test } from "bun:test";
import {
  RARITY_ORDER,
  averageCompletion,
  completionPercentage,
  countHolders,
  countTotalPlayers,
  getAchievementCatalog,
  getAchievementCounters,
  sortAchievementRates,
  withCompletionRates,
  type AchievementRate,
} from "../src/api/achievements";
import type { AchievementCounters } from "../src/api/types";
import catalogFixture from "../src/mocks/achievement-catalog.json";
import countersFixture from "../src/mocks/achievement-counters.json";

const counters = countersFixture as unknown as AchievementCounters;

/** Compact synthetic snapshot: two players hold "ach-a", one also "ach-b", and the
 * third entry is a `[""]` placeholder player (the fixture's 94 such rows). */
const sample: AchievementCounters = {
  achievements: {
    "player-1": [{ "ach-a": 1 }],
    "player-2": [{ "ach-a": 2, "ach-b": 3 }],
    "player-3": [""],
  },
};

test("completionPercentage computes players-with-achievement over total players, two decimals", () => {
  expect(completionPercentage(2, 3)).toBe(66.67);
  expect(completionPercentage(1, 3)).toBe(33.33);
  expect(completionPercentage(1088, 1293)).toBe(84.15);
});

test("completionPercentage is 0 when there are no players", () => {
  expect(completionPercentage(0, 0)).toBe(0);
});

test("countTotalPlayers counts every counter entry, including [''] placeholder players", () => {
  expect(countTotalPlayers(sample)).toBe(3);
  expect(countTotalPlayers(counters)).toBe(1293);
});

test("countHolders skips [''] placeholder players when counting holders", () => {
  expect(countHolders(sample, "ach-a")).toBe(2);
  expect(countHolders(sample, "ach-b")).toBe(1);
  expect(countHolders(sample, "ach-unknown")).toBe(0);
});

test("achievement-catalog.json entries are unique by id with complete fields", () => {
  const ids = catalogFixture.map((entry) => entry.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(catalogFixture).toHaveLength(139);
  for (const entry of catalogFixture) {
    expect(entry.name.length).toBeGreaterThan(0);
    expect(entry.description.length).toBeGreaterThan(0);
    expect(entry.imageUrl.length).toBeGreaterThan(0);
    expect(RARITY_ORDER).toContain(entry.rarity);
  }
});

test("getAchievementCatalog resolves to the fixture catalog", async () => {
  const catalog = await getAchievementCatalog();
  expect(catalog).toHaveLength(catalogFixture.length);
});

test("getAchievementCounters resolves to the achievement-counters fixture", async () => {
  const snapshot = await getAchievementCounters();
  expect(countTotalPlayers(snapshot)).toBe(countTotalPlayers(counters));
});

test("withCompletionRates joins every catalog entry with a percentage in [0, 100]", async () => {
  const rates = withCompletionRates(await getAchievementCatalog(), counters);
  expect(rates).toHaveLength(catalogFixture.length);
  for (const rate of rates) {
    expect(rate.percent).toBeGreaterThanOrEqual(0);
    expect(rate.percent).toBeLessThanOrEqual(100);
  }
});

test("withCompletionRates reproduces the legacy percentage for the most-held achievement", async () => {
  const rates = withCompletionRates(await getAchievementCatalog(), counters);
  const top = rates.find((rate) => rate.id === "65141c30ec10ff011f17cc3b");
  expect(top?.holders).toBe(1088);
  expect(top?.percent).toBe(84.15);
});

test("averageCompletion averages percentages and is 0 for an empty list", () => {
  expect(averageCompletion([10, 20])).toBe(15);
  expect(averageCompletion([])).toBe(0);
});

test("sortAchievementRates orders by rarity (Common→Legendary), then completion descending", () => {
  const rates: AchievementRate[] = [
    { id: "l", name: "l", description: "", rarity: "Legendary", imageUrl: "", holders: 1, percent: 5 },
    { id: "c1", name: "c1", description: "", rarity: "Common", imageUrl: "", holders: 9, percent: 90 },
    { id: "r", name: "r", description: "", rarity: "Rare", imageUrl: "", holders: 1, percent: 1 },
    { id: "c2", name: "c2", description: "", rarity: "Common", imageUrl: "", holders: 4, percent: 40 },
  ];
  const sorted = sortAchievementRates(rates);
  expect(sorted.map((rate) => rate.id).join(",")).toBe("c1,c2,r,l");
});

import { expect, test } from "bun:test";
import {
  ALL,
  caliberOptions,
  cleanWeaponName,
  communityFavorites,
  filterWeaponStats,
  getAttachmentMaxPickRates,
  getAttachments,
  getCategories,
  getTopPlayers,
  getWeaponStats,
  headshotPercent,
  isEarlyGameCategory,
  isEndgameRank,
  killsPercent,
  shotsToKill,
  subCategoryOptions,
  timesLostRatio,
  withCategories,
  type WeaponStat,
} from "../src/api/meta";
import attachmentsFixture from "../src/mocks/meta/attachments.json";
import categoriesFixture from "../src/mocks/meta/categories.json";
import weaponCountersFixture from "../src/mocks/weapon-counters.json";
import seasonFixture from "../src/mocks/season12.json";
import type { SeasonData, WeaponCounters } from "../src/api/types";

const categories = categoriesFixture as Record<
  string,
  { main: string; sub: string; caliber: string }
>;
const attachments = attachmentsFixture as Record<
  string,
  { attachments: Record<string, { name: string; pickRate: number }[]> }
>;
const counters = weaponCountersFixture as unknown as WeaponCounters;

test("categories.json covers every templateId present in weapon-counters.json", async () => {
  const catalog = await getCategories();
  expect(Object.keys(catalog)).toEqual(Object.keys(categories));
  expect(catalog["5447a9cd4bdc2dbd208b4567"]).toEqual({
    main: "Primary Weapons",
    sub: "Assault Rifles",
    caliber: "5.56x45mm NATO",
  });

  const ids = new Set<string>();
  for (const player of Object.values(counters.weapons)) {
    for (const entry of Object.values(player.weapons)) {
      if (entry.originalId) ids.add(entry.originalId);
    }
  }
  expect(ids.size).toBeGreaterThan(200);
  for (const id of ids) {
    expect(id in categories).toBe(true);
  }
});

test("categories.json entries carry main/sub/caliber strings", () => {
  for (const category of Object.values(categories)) {
    expect(typeof category.main).toBe("string");
    expect(category.main.length).toBeGreaterThan(0);
    expect(typeof category.sub).toBe("string");
    expect(category.sub.length).toBeGreaterThan(0);
    expect(typeof category.caliber).toBe("string");
  }
});

test("attachments.json is a 5-weapon sample with 2-3 categories of 2-3 entries", () => {
  const ids = Object.keys(attachments);
  expect(ids).toHaveLength(5);
  for (const sample of Object.values(attachments)) {
    const groups = Object.keys(sample.attachments);
    expect(groups.length).toBeGreaterThanOrEqual(2);
    expect(groups.length).toBeLessThanOrEqual(3);
    for (const items of Object.values(sample.attachments)) {
      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items.length).toBeLessThanOrEqual(3);
      for (const item of items) {
        expect(item.name.length).toBeGreaterThan(0);
        expect(item.pickRate).toBeGreaterThan(0);
        expect(item.pickRate).toBeLessThanOrEqual(100);
      }
    }
  }
});

test("getWeaponStats aggregates per weapon and ranks by kills", async () => {
  const stats = await getWeaponStats();
  expect(stats.length).toBeGreaterThan(100);

  for (let i = 1; i < stats.length; i += 1) {
    expect(stats[i - 1].kills).toBeGreaterThanOrEqual(stats[i].kills);
  }

  // M4A1 leads; its totals equal the fixture sum across the cleaned-name
  // variants ("M4A1", "★ M4A1", color-tagged copies), and its templateId is
  // the variant's shared originalId.
  let expectedKills = 0;
  for (const player of Object.values(counters.weapons)) {
    for (const [name, entry] of Object.entries(player.weapons)) {
      if (cleanWeaponName(name) === "M4A1") expectedKills += entry.stats.kills;
    }
  }
  const m4a1 = stats[0];
  expect(m4a1.name).toBe("M4A1");
  expect(m4a1.kills).toBe(expectedKills);
  expect(m4a1.templateId).toBe("5447a9cd4bdc2dbd208b4567");
  expect(m4a1.players).toBeGreaterThan(0);
  expect(Number.isInteger(m4a1.averageUserLevel)).toBe(true);
  // Every fixture templateId is classified, so nothing falls back to "Unknown".
  for (const stat of stats) {
    expect(stat.main === "Unknown" && stat.sub === "Unknown").toBe(false);
  }
});

test("kills percent and sibling derivations follow the legacy counters formulas", () => {
  expect(killsPercent(0, 10)).toBe(0);
  expect(killsPercent(100, 25)).toBe(25);
  expect(killsPercent(3, 1)).toBeCloseTo(33.333, 1);

  expect(headshotPercent(0, 5)).toBe(0);
  expect(headshotPercent(10, 5)).toBe(50);

  expect(shotsToKill(0, 100)).toBe(0);
  expect(shotsToKill(4, 100)).toBe(25);

  expect(timesLostRatio(0, 0)).toBe(0);
  expect(timesLostRatio(9, 1)).toBe(10);
});

test("early-game and endgame tag rules", () => {
  expect(isEarlyGameCategory({ sub: "Shotguns" })).toBe(true);
  expect(isEarlyGameCategory({ sub: "Pistols WTT" })).toBe(true);
  expect(isEarlyGameCategory({ sub: "Revolvers" })).toBe(true);
  expect(isEarlyGameCategory({ sub: "Assault Rifles" })).toBe(false);
  expect(isEndgameRank(1)).toBe(true);
  expect(isEndgameRank(5)).toBe(true);
  expect(isEndgameRank(6)).toBe(false);
  expect(isEndgameRank(0)).toBe(false);
});

test("cascading subcategory options follow the main category", async () => {
  const stats = await getWeaponStats();
  const subs = subCategoryOptions(stats, "Primary Weapons");
  expect(subs.length).toBeGreaterThan(1);
  expect(subs).toContain("Assault Rifles");
  expect(subs).toContain("Shotguns");
  expect(subs).toEqual([...subs].sort((a, b) => a.localeCompare(b)));
  // No main selected -> the cascading select is disabled and empty.
  expect(subCategoryOptions(stats, ALL)).toEqual([]);
});

test("cascading caliber options follow main + subcategory", async () => {
  const stats = await getWeaponStats();
  const smgCalibers = caliberOptions(stats, "Primary Weapons", "Submachine guns");
  expect(smgCalibers).toContain("9x19mm");
  expect(smgCalibers.includes("5.56x45mm NATO")).toBe(false);

  const rifleCalibers = caliberOptions(stats, "Primary Weapons", "Assault Rifles");
  expect(rifleCalibers).toContain("5.45x39mm");
  expect(rifleCalibers).toContain("5.56x45mm NATO");

  // With no main category, the caliber list spans everything (legacy behavior).
  expect(caliberOptions(stats, ALL, ALL).length).toBeGreaterThan(
    rifleCalibers.length,
  );
});

test("filterWeaponStats applies text search and the cascade together", async () => {
  const stats = await getWeaponStats();

  const searched = filterWeaponStats(stats, {
    query: "m4a1",
    main: ALL,
    sub: ALL,
    caliber: ALL,
  });
  expect(searched.length).toBeGreaterThan(0);
  for (const stat of searched) {
    expect(stat.name.toLowerCase().includes("m4a1")).toBe(true);
  }

  const cascaded = filterWeaponStats(stats, {
    query: "",
    main: "Primary Weapons",
    sub: "Shotguns",
    caliber: "12/70",
  });
  expect(cascaded.length).toBeGreaterThan(0);
  for (const stat of cascaded) {
    expect(stat.main).toBe("Primary Weapons");
    expect(stat.sub).toBe("Shotguns");
    expect(stat.caliber).toBe("12/70");
  }

  // Caliber that cannot co-occur with the subcategory -> empty result.
  expect(
    filterWeaponStats(stats, {
      query: "",
      main: "Primary Weapons",
      sub: "Shotguns",
      caliber: "9x19mm",
    }),
  ).toEqual([]);

  expect(
    filterWeaponStats(stats, { query: "no-such-weapon", main: ALL, sub: ALL, caliber: ALL }),
  ).toEqual([]);
});

test("getTopPlayers lists the weapon's stattrack users", async () => {
  const top = await getTopPlayers({ name: "M4A1", templateId: "5447a9cd4bdc2dbd208b4567" });
  expect(top.simplified).toBe(false);
  expect(top.players.length).toBeGreaterThan(0);
  expect(top.players.length).toBeLessThanOrEqual(10);
  for (let i = 1; i < top.players.length; i += 1) {
    expect(top.players[i - 1].kills).toBeGreaterThanOrEqual(top.players[i].kills);
  }
  const leaderboard = (seasonFixture as unknown as SeasonData).leaderboard;
  const names = new Set(leaderboard.map((player) => player.name));
  for (const player of top.players) {
    expect(names.has(player.name)).toBe(true);
  }
});

test("getTopPlayers falls back to top leaderboard players with the documented simplification", async () => {
  const top = await getTopPlayers({ name: "No Such Weapon", templateId: "0000" });
  expect(top.simplified).toBe(true);
  const leaderboard = (seasonFixture as unknown as SeasonData).leaderboard;
  const expected = [...leaderboard]
    .sort((a, b) => (b.pmcKills || 0) - (a.pmcKills || 0))
    .slice(0, 10)
    .map((player) => player.name);
  expect(top.players.map((player) => player.name)).toEqual(expected);
});

test("getAttachments returns the grouped map or null when the weapon has no sample", async () => {
  const m4a1 = await getAttachments("5447a9cd4bdc2dbd208b4567");
  expect(m4a1 === null).toBe(false);
  expect(Object.keys(m4a1!)).toContain("Scopes & Optics");
  expect(await getAttachments("no-such-template")).toBe(null);
});

test("withCategories fills legacy Unknown defaults for missing templateIds", () => {
  const stat: WeaponStat = {
    name: "Mystery Gun",
    templateId: "missing",
    kills: 1,
    headshots: 0,
    shots: 10,
    timesLost: 0,
    players: 1,
    averageUserLevel: 10,
    main: "Unknown",
    sub: "Unknown",
    caliber: "No caliber",
  };
  const [merged] = withCategories([stat], categories);
  expect(merged.main).toBe("Unknown");
  expect(merged.sub).toBe("Unknown");
  expect(merged.caliber).toBe("No caliber");

  const [known] = withCategories(
    [{ ...stat, templateId: "5447a9cd4bdc2dbd208b4567" }],
    categories,
  );
  expect(known.main).toBe("Primary Weapons");
  expect(known.sub).toBe("Assault Rifles");
  expect(known.caliber).toBe("5.56x45mm NATO");
});

test("community favorites pick the highest pick rate per subcategory", async () => {
  const stats = await getWeaponStats();
  const maxRates = await getAttachmentMaxPickRates();
  const favorites = communityFavorites(stats, maxRates);
  // The sample covers two subcategories: Assault Rifles (M4A1 63.9 beats
  // NL545 DI 55.2, NL545 GP 58.4, SPEAR 6.8 61.8) and DMRs (SR-25).
  expect(favorites.size).toBe(2);
  expect(favorites.has("5447a9cd4bdc2dbd208b4567")).toBe(true);
  expect(favorites.has("5df8ce05b11454561e39243b")).toBe(true);
  expect(Object.keys(maxRates)).toContain("5447a9cd4bdc2dbd208b4567");
});

// FRT-12 leaderboard logic tests. Pure functions from src/api/leaderboard.ts,
// no DOM: sort order (banned always last), search matching, heartbeat-derived
// online status, aggregate stats, and stored-preference parsing.
import { expect, test } from "bun:test";
import {
  DEFAULT_SORT,
  ONLINE_THRESHOLD_SECONDS,
  SORT_COLUMNS,
  assignRanks,
  computeSeasonStats,
  deriveOnlineStatus,
  filterPlayers,
  parseAutoUpdate,
  parseSortState,
  serializeLeaderboard,
  sortPlayers,
  playerKills,
} from "../src/api/leaderboard";
import type { Heartbeat, PlayerEntry } from "../src/api/types";
import seasonFixture from "../src/mocks/season12.json";

const season = (seasonFixture as unknown as { leaderboard: PlayerEntry[] }).leaderboard;

/** Builds a PlayerEntry carrying the fields the leaderboard helpers read. */
function makeEntry(overrides: Partial<PlayerEntry> & { id: string; name: string }): PlayerEntry {
  return {
    banned: false,
    bossesKilled: 0,
    isCasual: false,
    isHardcore: false,
    isPremium: false,
    killToDeathRatio: 0,
    pmcKills: 0,
    pmcLevel: 1,
    scavsKilled: 0,
    survivalRate: 0,
    teamTag: "",
    totalRaids: 0,
    totalScore: 0,
    suspicious: false,
    ...overrides,
  } as PlayerEntry;
}

const NOW = 1_000_000;

test("sortPlayers keeps banned players last for every column and direction", () => {
  const rows = assignRanks([
    makeEntry({ id: "a", name: "Alpha", totalScore: 10 }),
    makeEntry({ id: "b", name: "Bravo", totalScore: 99, banned: true }),
    makeEntry({ id: "c", name: "Charlie", totalScore: 30 }),
  ]);
  for (const column of SORT_COLUMNS) {
    for (const dir of ["ascending", "descending"] as const) {
      const sorted = sortPlayers(rows, { key: column.key, dir });
      expect(sorted[sorted.length - 1].player.banned).toBe(true);
    }
  }
  // Bravo holds the top score yet still sorts last on the score column.
  const byScore = sortPlayers(rows, { key: "score", dir: "descending" });
  expect(byScore.map((row) => row.player.id)).toEqual(["c", "a", "b"]);
});

test("sortPlayers restores season order by rank and sorts other columns by value", () => {
  const rows = assignRanks([
    makeEntry({ id: "a", name: "harmony", totalScore: 31.6, pmcLevel: 32 }),
    makeEntry({ id: "b", name: "nova", totalScore: 60.4, pmcLevel: 12 }),
    makeEntry({ id: "c", name: "mist", totalScore: 53.3, pmcLevel: 7 }),
  ]);
  expect(
    sortPlayers(rows, { key: "rank", dir: "ascending" }).map((row) => row.player.id),
  ).toEqual(["a", "b", "c"]);
  expect(
    sortPlayers(rows, { key: "score", dir: "descending" }).map((row) => row.player.id),
  ).toEqual(["b", "c", "a"]);
  expect(
    sortPlayers(rows, { key: "level", dir: "descending" }).map((row) => row.player.id),
  ).toEqual(["a", "b", "c"]);
  expect(
    sortPlayers(rows, { key: "name", dir: "ascending" }).map((row) => row.player.id),
  ).toEqual(["a", "c", "b"]);
});

test("sortPlayers ranks heartbeat-fresh players first on the status column", () => {
  const rows = assignRanks([
    makeEntry({ id: "a", name: "Alpha" }),
    makeEntry({ id: "b", name: "Bravo" }),
    makeEntry({ id: "c", name: "Charlie" }),
  ]);
  const heartbeats = {
    b: { id: "b", timestamp: NOW - 10, type: "online" } satisfies Heartbeat,
  };
  const sorted = sortPlayers(rows, { key: "status", dir: "descending" }, heartbeats, NOW);
  expect(sorted[0].player.id).toBe("b");
});

test("filterPlayers matches names and team tags case-insensitively", () => {
  const rows = assignRanks([
    makeEntry({ id: "a", name: "harmony", teamTag: "SPTLB" }),
    makeEntry({ id: "b", name: "nova", teamTag: "faze" }),
    makeEntry({ id: "c", name: "mist", teamTag: "" }),
  ]);
  expect(filterPlayers(rows, "HARM").map((row) => row.player.id)).toEqual(["a"]);
  expect(filterPlayers(rows, "  faze  ").map((row) => row.player.id)).toEqual(["b"]);
  expect(filterPlayers(rows, "sptlb").map((row) => row.player.id)).toEqual(["a"]);
  expect(filterPlayers(rows, "   ")).toHaveLength(3);
  expect(filterPlayers(rows, "zzz")).toHaveLength(0);
});

test("deriveOnlineStatus applies the 300 second threshold", () => {
  const heartbeats = {
    fresh: { id: "fresh", timestamp: NOW - (ONLINE_THRESHOLD_SECONDS - 1), type: "online" },
    edge: { id: "edge", timestamp: NOW - ONLINE_THRESHOLD_SECONDS, type: "online" },
    stale: { id: "stale", timestamp: NOW - (ONLINE_THRESHOLD_SECONDS + 1), type: "online" },
  };
  expect(deriveOnlineStatus("fresh", heartbeats, NOW)).toBe("online");
  expect(deriveOnlineStatus("edge", heartbeats, NOW)).toBe("offline");
  expect(deriveOnlineStatus("stale", heartbeats, NOW)).toBe("offline");
  expect(deriveOnlineStatus("ghost", heartbeats, NOW)).toBe("offline");
});

test("computeSeasonStats aggregates the season fixture", () => {
  const stats = computeSeasonStats(season);
  expect(stats.totalPlayers).toBe(season.length);
  expect(stats.totalRaids).toBe(season.reduce((sum, p) => sum + (p.totalRaids || 0), 0));
  expect(stats.totalKills).toBe(
    season.reduce((sum, p) => sum + (p.pmcKills || 0) + (p.bossesKilled || 0) + (p.scavsKilled || 0), 0),
  );
  const expectedAverage =
    season.reduce((sum, p) => sum + (p.survivalRate || 0), 0) / season.length;
  expect(stats.averageSurvivalRate).toBeCloseTo(expectedAverage, 10);
});

test("computeSeasonStats is zeroed for an empty season", () => {
  expect(computeSeasonStats([])).toEqual({
    totalPlayers: 0,
    totalRaids: 0,
    totalKills: 0,
    averageSurvivalRate: 0,
  });
});

test("serializeLeaderboard detects data changes between update cycles", () => {
  const before = serializeLeaderboard(season);
  expect(serializeLeaderboard([...season])).toBe(before);
  const mutated = season.map((player, index) =>
    index === 0 ? { ...player, totalScore: (player.totalScore || 0) + 1 } : player,
  );
  expect(serializeLeaderboard(mutated) === before).toBe(false);
});

test("parseSortState accepts stored states and falls back on invalid ones", () => {
  expect(parseSortState(null)).toEqual(DEFAULT_SORT);
  expect(parseSortState('{"key":"score","dir":"descending"}')).toEqual({
    key: "score",
    dir: "descending",
  });
  expect(parseSortState('{"key":"nope","dir":"descending"}')).toEqual(DEFAULT_SORT);
  expect(parseSortState('{"key":"score","dir":"sideways"}')).toEqual(DEFAULT_SORT);
  expect(parseSortState('{"key":"score"}')).toEqual(DEFAULT_SORT);
  expect(parseSortState("not json")).toEqual(DEFAULT_SORT);
});

test("parseAutoUpdate defaults to on and only 'false' turns it off", () => {
  expect(parseAutoUpdate(null)).toBe(true);
  expect(parseAutoUpdate("true")).toBe(true);
  expect(parseAutoUpdate("garbage")).toBe(true);
  expect(parseAutoUpdate("false")).toBe(false);
});

test("playerKills sums PMC, boss, and SCAV kills", () => {
  expect(
    playerKills(makeEntry({ id: "a", name: "Alpha", pmcKills: 10, bossesKilled: 3, scavsKilled: 4 })),
  ).toBe(17);
});

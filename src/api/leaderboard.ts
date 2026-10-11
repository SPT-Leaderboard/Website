/**
 * Data helpers for the main season leaderboard page (FRT-12).
 *
 * Pure functions and constants only — no DOM — so tests/leaderboard.test.ts
 * can exercise sorting, search, aggregation, and heartbeat derivation
 * directly. The island (src/components/leaderboard/Leaderboard.tsx) composes
 * these with getCurrentSeason()/getHeartbeats() from src/api/client.ts.
 *
 * Legacy behavior source (docs/port/feature-inventory.md, index.html entries):
 *   app-core.js calculatePlaces  — banned rows always sort last;
 *   user-search.js               — 200 ms debounced name/team search, search
 *                                  pauses the live updater;
 *   ui-live-data-flow.js         — 8 s update cycle, re-render skipped while
 *                                  the serialized leaderboard is unchanged;
 *   system-heartbeat.js          — 300 s online threshold on heartbeat
 *                                  timestamps.
 */

import type { HeartbeatsMap, PlayerEntry } from "./types";

export const SEARCH_DEBOUNCE_MS = 200; // legacy user-search.js debounce
export const UPDATE_INTERVAL_SECONDS = 8; // legacy ui-live-data-flow.js updateInterval
export const ONLINE_THRESHOLD_SECONDS = 300; // legacy system-heartbeat.js onlineThreshold

/** localStorage keys for this page (new `sptlb:` namespace; legacy used cookies). */
export const SORT_STORAGE_KEY = "sptlb:sort";
export const AUTOUPDATE_STORAGE_KEY = "sptlb:autoupdate";

export type SortDir = "ascending" | "descending";

/** One sortable table column. `rank` = the season data's list order. */
export type SortKey =
  | "rank"
  | "name"
  | "level"
  | "score"
  | "kdr"
  | "survivalRate"
  | "raids"
  | "kills"
  | "status";

export interface SortState {
  key: SortKey;
  dir: SortDir;
}

export interface ColumnConfig {
  key: SortKey;
  label: string;
  /** First click direction: names A-first, stats best-first. */
  initialDir: SortDir;
  numeric: boolean;
}

export const SORT_COLUMNS: ColumnConfig[] = [
  { key: "rank", label: "Rank", initialDir: "ascending", numeric: true },
  { key: "name", label: "Player", initialDir: "ascending", numeric: false },
  { key: "level", label: "Level", initialDir: "descending", numeric: true },
  { key: "score", label: "Score", initialDir: "descending", numeric: true },
  { key: "kdr", label: "K/D", initialDir: "descending", numeric: true },
  { key: "survivalRate", label: "Survival rate", initialDir: "descending", numeric: true },
  { key: "raids", label: "Raids", initialDir: "descending", numeric: true },
  { key: "kills", label: "Kills", initialDir: "descending", numeric: true },
  { key: "status", label: "Status", initialDir: "descending", numeric: false },
];

/** Legacy default view: season order by rank (index.html initial render). */
export const DEFAULT_SORT: SortState = { key: "rank", dir: "ascending" };

/** One decorated row: the player plus their 1-based season rank. */
export interface LeaderboardRow {
  player: PlayerEntry;
  /** 1-based position in getCurrentSeason().leaderboard list order. */
  rank: number;
}

/** Kills shown per row and in the stats bar: PMC + bosses + SCAV kills. */
export function playerKills(player: PlayerEntry): number {
  return (player.pmcKills || 0) + (player.bossesKilled || 0) + (player.scavsKilled || 0);
}

/** Decorates the season list with list-order ranks (docs: rank = list order). */
export function assignRanks(players: PlayerEntry[]): LeaderboardRow[] {
  return players.map((player, index) => ({ player, rank: index + 1 }));
}

/** Case-insensitive match on player name and team tag; blank query keeps all. */
export function filterPlayers(rows: LeaderboardRow[], query: string): LeaderboardRow[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return rows;
  return rows.filter(
    (row) =>
      row.player.name.toLowerCase().includes(needle) ||
      row.player.teamTag.toLowerCase().includes(needle),
  );
}

function sortValue(row: LeaderboardRow, key: SortKey, online: Set<string>): number | string {
  const player = row.player;
  switch (key) {
    case "rank":
      return row.rank;
    case "name":
      return player.name;
    case "level":
      return player.pmcLevel;
    case "score":
      return player.totalScore;
    case "kdr":
      return player.killToDeathRatio;
    case "survivalRate":
      return player.survivalRate;
    case "raids":
      return player.totalRaids;
    case "kills":
      return playerKills(player);
    case "status":
      return online.has(player.id) ? 1 : 0;
  }
}

/**
 * Sorted view: the active key/direction, with banned rows always last
 * (legacy calculatePlaces) regardless of direction. `heartbeats` feeds the
 * status column; `nowSeconds` is injectable so callers (and tests) pin the
 * reference time instead of the function reading the clock.
 */
export function sortPlayers(
  rows: LeaderboardRow[],
  state: SortState,
  heartbeats: HeartbeatsMap = {},
  nowSeconds: number = Math.floor(Date.now() / 1000),
): LeaderboardRow[] {
  const sign = state.dir === "ascending" ? 1 : -1;
  const online = onlineIds(heartbeats, nowSeconds);
  return [...rows].sort((a, b) => {
    if (a.player.banned !== b.player.banned) return a.player.banned ? 1 : -1;
    const valueA = sortValue(a, state.key, online);
    const valueB = sortValue(b, state.key, online);
    if (typeof valueA === "string" && typeof valueB === "string") {
      return sign * valueA.localeCompare(valueB);
    }
    return sign * (Number(valueA) - Number(valueB));
  });
}

export type OnlineStatus = "online" | "offline";

/**
 * Online = a heartbeat newer than 300 s (legacy system-heartbeat.js
 * onlineThreshold); unknown id or stale timestamp = offline. Unix seconds.
 */
export function deriveOnlineStatus(
  playerId: string,
  heartbeats: HeartbeatsMap,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): OnlineStatus {
  const heartbeat = heartbeats[playerId];
  return heartbeat !== undefined && nowSeconds - heartbeat.timestamp < ONLINE_THRESHOLD_SECONDS
    ? "online"
    : "offline";
}

/** Ids whose latest heartbeat is fresher than the threshold. */
export function onlineIds(heartbeats: HeartbeatsMap, nowSeconds?: number): Set<string> {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const ids = new Set<string>();
  for (const [id, heartbeat] of Object.entries(heartbeats)) {
    if (now - heartbeat.timestamp < ONLINE_THRESHOLD_SECONDS) ids.add(id);
  }
  return ids;
}

/** Serialized leaderboard used for the unchanged-data check between cycles. */
export function serializeLeaderboard(players: PlayerEntry[]): string {
  return JSON.stringify(players);
}

export interface SeasonStats {
  totalPlayers: number;
  totalRaids: number;
  totalKills: number;
  averageSurvivalRate: number;
}

/** Aggregate stats bar values, computed over every season row. */
export function computeSeasonStats(players: PlayerEntry[]): SeasonStats {
  const totalPlayers = players.length;
  if (totalPlayers === 0) {
    return { totalPlayers: 0, totalRaids: 0, totalKills: 0, averageSurvivalRate: 0 };
  }
  const totalRaids = players.reduce((sum, player) => sum + (player.totalRaids || 0), 0);
  const totalKills = players.reduce((sum, player) => sum + playerKills(player), 0);
  const averageSurvivalRate =
    players.reduce((sum, player) => sum + (player.survivalRate || 0), 0) / totalPlayers;
  return { totalPlayers, totalRaids, totalKills, averageSurvivalRate };
}

/** Reads a stored sort state; anything invalid falls back to the default. */
export function parseSortState(raw: string | null): SortState {
  if (raw === null) return DEFAULT_SORT;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_SORT;
    const { key, dir } = value as { key?: unknown; dir?: unknown };
    if (dir !== "ascending" && dir !== "descending") return DEFAULT_SORT;
    const column = SORT_COLUMNS.find((candidate) => candidate.key === key);
    if (column === undefined) return DEFAULT_SORT;
    return { key: column.key, dir };
  } catch {
    return DEFAULT_SORT;
  }
}

export function serializeSortState(state: SortState): string {
  return JSON.stringify(state);
}

/** Reads the stored live-update preference; on by default (legacy default). */
export function parseAutoUpdate(raw: string | null): boolean {
  return raw !== "false";
}

export function serializeAutoUpdate(enabled: boolean): string {
  return enabled ? "true" : "false";
}

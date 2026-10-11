/**
 * FRT-17 data access for the Weapon Meta page (legacy `meta/index.html` +
 * `meta/js/main.js`). Signatures mirror `client.ts` so a real fetch client can
 * replace the fixtures later without changing the page.
 *
 * Legacy network reads (docs/port/data-dependency-map.md rows 26-27):
 * - row 26, `weaponStatsPath` (`/api/data/shared/weapon_counters.json`) →
 *   `getWeaponStats()`, aggregating the existing 20-player slice of
 *   `src/mocks/weapon-counters.json` into one row per weapon.
 * - row 27, the 25 MB equipment-history blob
 *   (`/api/data/pmc_equipment_blob/equipment_history_blob.json`) →
 *   `getAttachments()`, served by the synthesized per-weapon pick-rate sample in
 *   `src/mocks/meta/attachments.json` (see src/mocks/README.md).
 * - the legacy hardcoded `weaponCategories` catalog → `getCategories()`, served by
 *   `src/mocks/meta/categories.json` (synthesized over the fixture's templateIds).
 */

import attachmentsFixture from "../mocks/meta/attachments.json";
import categoriesFixture from "../mocks/meta/categories.json";
import weaponCountersFixture from "../mocks/weapon-counters.json";
import seasonFixture from "../mocks/season12.json";
import type { PlayerEntry, SeasonData, WeaponCounters } from "./types";

/** Weapon classification (legacy `weaponCategories` catalog shape). */
export interface WeaponCategory {
  main: string;
  sub: string;
  caliber: string;
}

/** One attachment pick-rate row inside a category group. */
export interface AttachmentPickRate {
  name: string;
  /** Share of recorded loadouts using the attachment, 0-100. */
  pickRate: number;
}

/** Category name -> attachment rows for one weapon. */
export type WeaponAttachments = Record<string, AttachmentPickRate[]>;

/**
 * One aggregated weapon row. Derived from the counters shape exactly like the
 * legacy `processWeaponData`: `stats` sums across every player carrying the
 * weapon (same cleaned display name).
 */
export interface RawWeaponStat {
  name: string;
  /** Most frequent `originalId` among the weapon's counters (icon + category key). */
  templateId: string;
  kills: number;
  headshots: number;
  shots: number;
  timesLost: number;
  /** Players carrying the weapon in the counters snapshot. */
  players: number;
  /** Mean level of those players, rounded (legacy rounds too). */
  averageUserLevel: number;
}

/** Aggregated row with its category catalog entry merged in. */
export interface WeaponStat extends RawWeaponStat {
  main: string;
  sub: string;
  caliber: string;
}

/** One top-player row in the analytics modal. */
export interface WeaponTopPlayer {
  name: string;
  permaLink: string;
  level: number;
  kills: number;
  headshots: number;
}

/**
 * Top players for one weapon. `simplified: true` means nobody in the leaderboard
 * snapshot has the weapon in `stattrack_weapons`, so the list falls back to the
 * leaderboard's top players by total kills (documented simplification — their
 * `kills` are total PMC kills, not per-weapon kills, and headshots are unknown).
 */
export interface WeaponTopPlayers {
  players: WeaponTopPlayer[];
  simplified: boolean;
}

/** Sentinel value for "no filter" in the select controls (legacy "all"). */
export const ALL = "all";

export interface WeaponFilters {
  query: string;
  main: string;
  sub: string;
  caliber: string;
}

/** Random 0-300 ms latency, matching the mock client's network feel. */
function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 300));
}

/**
 * Legacy `cleanWeaponNameFunc` (js/app-utils.js): strips item-color tags, the
 * star rarity markers and quotes so fixture variants ("★ M4A1",
 * `<color=#FFFFFF>★ NL545 GP</color>`) aggregate into the base weapon.
 */
export function cleanWeaponName(name: string): string {
  return name
    .replace(/<color=[^>]*>/g, "")
    .replace(/<\/color>/g, "")
    .replace(/[★☆]/g, "")
    .replace(/<b>/g, "")
    .replace(/<\/b>/g, "")
    .replace(/"/g, "")
    .trim();
}

/**
 * Legacy kills-% derivation (`meta/js/main.js processWeaponData`): kills as a
 * share of shots fired. 0 when no shots were recorded.
 */
export function killsPercent(shots: number, kills: number): number {
  return shots > 0 ? (kills / shots) * 100 : 0;
}

/** Legacy headshot-%: headshots as a share of kills. 0 when no kills. */
export function headshotPercent(kills: number, headshots: number): number {
  return kills > 0 ? (headshots / kills) * 100 : 0;
}

/** Legacy avg shots-to-kill. 0 when no kills (avoid dividing by zero). */
export function shotsToKill(kills: number, shots: number): number {
  return kills > 0 ? shots / kills : 0;
}

/**
 * Times-lost ratio: losses as a share of recorded weapon outcomes
 * (kills + timesLost). The legacy page computed the inverse share
 * (kills / (kills + timesLost)) but labeled the card after times lost; this
 * page keeps the label honest and computes the lost share.
 */
export function timesLostRatio(kills: number, timesLost: number): number {
  const total = kills + timesLost;
  return total > 0 ? (timesLost / total) * 100 : 0;
}

/**
 * "Early Game" tag: shotgun- or pistol-class weapon (subcategory read — the
 * task's "caliber is shotgun or pistol"). Revolvers count as pistols.
 */
export function isEarlyGameCategory(stat: Pick<WeaponStat, "sub">): boolean {
  const sub = stat.sub.toLowerCase();
  return sub.includes("shotgun") || sub.includes("pistol") || sub.includes("revolver");
}

/** "Endgame" tag: top 5 by kills rank. */
export function isEndgameRank(rank: number): boolean {
  return rank > 0 && rank <= 5;
}

/**
 * Aggregates the counters snapshot into per-weapon rows, mirroring the legacy
 * aggregation: group by cleaned display name; templateId = most frequent
 * originalId (ties broken by smallest id for determinism); rows sorted by
 * kills desc, ties by name asc.
 */
export function aggregateWeaponStats(counters: WeaponCounters): RawWeaponStat[] {
  interface Accumulator {
    kills: number;
    headshots: number;
    shots: number;
    timesLost: number;
    levels: number[];
    idCounts: Map<string, number>;
  }
  const map = new Map<string, Accumulator>();

  for (const userData of Object.values(counters.weapons)) {
    const level = userData.level || 0;
    for (const [weaponName, entry] of Object.entries(userData.weapons)) {
      const name = cleanWeaponName(weaponName);
      if (!name) continue;
      const stats = entry.stats;
      let acc = map.get(name);
      if (!acc) {
        acc = { kills: 0, headshots: 0, shots: 0, timesLost: 0, levels: [], idCounts: new Map() };
        map.set(name, acc);
      }
      acc.kills += stats.kills;
      acc.headshots += stats.headshots;
      acc.shots += stats.totalShots;
      acc.timesLost += stats.timesLost;
      acc.levels.push(level);
      const id = entry.originalId;
      if (id) acc.idCounts.set(id, (acc.idCounts.get(id) ?? 0) + 1);
    }
  }

  return [...map.entries()]
    .map(([name, acc]) => {
      let templateId = "";
      let bestCount = -1;
      for (const [id, count] of [...acc.idCounts.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
        if (count > bestCount) {
          templateId = id;
          bestCount = count;
        }
      }
      const averageUserLevel =
        acc.levels.length > 0
          ? Math.round(acc.levels.reduce((sum, level) => sum + level, 0) / acc.levels.length)
          : 0;
      return {
        name,
        templateId,
        kills: acc.kills,
        headshots: acc.headshots,
        shots: acc.shots,
        timesLost: acc.timesLost,
        players: acc.levels.length,
        averageUserLevel,
      };
    })
    .sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name));
}

/** Merges the category catalog into aggregated rows (legacy defaults when absent). */
export function withCategories(
  stats: RawWeaponStat[],
  categories: Record<string, WeaponCategory>,
): WeaponStat[] {
  return stats.map((stat) => {
    const category = categories[stat.templateId];
    return {
      ...stat,
      main: category?.main ?? "Unknown",
      sub: category?.sub ?? "Unknown",
      caliber: category?.caliber ?? "No caliber",
    };
  });
}

/**
 * Resolves the weapon rows ranked by kills, categories merged. Serves the
 * existing weapon-counters fixture; accepts more players/weapons when the real
 * `weapon_counters.json` replaces the 20-player slice.
 */
export async function getWeaponStats(): Promise<WeaponStat[]> {
  await delay();
  // Same `unknown` bridge as client.ts: the 436 KB fixture's inferred literal
  // type is structurally incompatible with the domain types in both directions.
  const counters = weaponCountersFixture as unknown as WeaponCounters;
  return withCategories(aggregateWeaponStats(counters), await getCategories());
}

/**
 * Resolves the weapon category catalog (`src/mocks/meta/categories.json`,
 * templateId -> {main, sub, caliber}). The loader accepts more templateIds as
 * the fixture grows toward full production coverage.
 */
export async function getCategories(): Promise<Record<string, WeaponCategory>> {
  await delay();
  return categoriesFixture as Record<string, WeaponCategory>;
}

/**
 * Resolves the attachment pick-rate groups for one templateId, or `null` when
 * the fixture has no sample for that weapon (the page shows a
 * no-attachment-data note). Stand-in for the 25 MB equipment-history blob;
 * more weapons arrive in the fixture without page changes.
 */
export async function getAttachments(templateId: string): Promise<WeaponAttachments | null> {
  await delay();
  const sample = (attachmentsFixture as Record<string, { attachments: WeaponAttachments }>)[
    templateId
  ];
  return sample ? sample.attachments : null;
}

/**
 * Highest attachment pick rate per templateId (across all its categories).
 * Drives the "Community Favorite" tag without loading every weapon's full
 * attachment groups.
 */
export async function getAttachmentMaxPickRates(): Promise<Record<string, number>> {
  await delay();
  const fixture = attachmentsFixture as Record<string, { attachments: WeaponAttachments }>;
  const maxRates: Record<string, number> = {};
  for (const [templateId, sample] of Object.entries(fixture)) {
    let max = 0;
    for (const items of Object.values(sample.attachments)) {
      for (const item of items) max = Math.max(max, item.pickRate);
    }
    maxRates[templateId] = max;
  }
  return maxRates;
}

/**
 * "Community Favorite" tag: among the weapons that have attachment data, the
 * one with the highest top pick rate per subcategory. Ties go to the better
 * kills rank (i.e. the earlier row in the kills-sorted `stats` list). Returns
 * the tagged templateIds.
 */
export function communityFavorites(
  stats: WeaponStat[],
  maxPickRates: Record<string, number>,
): Set<string> {
  const best = new Map<string, { templateId: string; rate: number }>();
  for (const stat of stats) {
    const rate = maxPickRates[stat.templateId];
    if (rate === undefined) continue;
    const key = stat.sub.toLowerCase();
    const current = best.get(key);
    if (!current || rate > current.rate) {
      best.set(key, { templateId: stat.templateId, rate });
    }
  }
  return new Set([...best.values()].map((entry) => entry.templateId));
}

/**
 * Top 10 players for one weapon, derived from the season12 leaderboard's
 * `stattrack_weapons` (keyed by permaLink). A stattrack entry matches on
 * `originalId` or cleaned display name. When nobody has the weapon recorded,
 * falls back to the leaderboard's top players by `pmcKills` with
 * `simplified: true` (their kills are total PMC kills, headshots unknown) —
 * a documented simplification of the legacy counters-based list.
 */
export async function getTopPlayers(weapon: {
  name: string;
  templateId: string;
}): Promise<WeaponTopPlayers> {
  await delay();
  const leaderboard = (seasonFixture as unknown as SeasonData).leaderboard;

  const tracked: WeaponTopPlayer[] = [];
  for (const player of leaderboard) {
    const weapons = player.stattrack_weapons?.[player.permaLink];
    if (!weapons) continue;
    for (const [entryName, entry] of Object.entries(weapons)) {
      if (entry.originalId !== weapon.templateId && cleanWeaponName(entryName) !== weapon.name) {
        continue;
      }
      tracked.push({
        name: player.name,
        permaLink: player.permaLink,
        level: player.pmcLevel,
        kills: entry.stats.kills,
        headshots: entry.stats.headshots,
      });
      break;
    }
  }
  if (tracked.length > 0) {
    tracked.sort((a, b) => b.kills - a.kills);
    return { players: tracked.slice(0, 10), simplified: false };
  }

  const fallback = [...leaderboard]
    .sort((a, b) => (b.pmcKills || 0) - (a.pmcKills || 0))
    .slice(0, 10)
    .map((player: PlayerEntry) => ({
      name: player.name,
      permaLink: player.permaLink,
      level: player.pmcLevel,
      kills: player.pmcKills || 0,
      headshots: 0,
    }));
  return { players: fallback, simplified: true };
}

/**
 * Sorted subcategory options for the cascading selects: the distinct subs of
 * the chosen main category, or an empty list (disabled select) when "all".
 */
export function subCategoryOptions(stats: WeaponStat[], main: string): string[] {
  if (main === ALL) return [];
  const subs = new Set<string>();
  for (const stat of stats) {
    if (stat.main.toLowerCase() === main.toLowerCase() && stat.sub) subs.add(stat.sub);
  }
  return [...subs].sort((a, b) => a.localeCompare(b));
}

/**
 * Sorted caliber options: distinct non-empty calibers of the weapons matching
 * the main filter (unless "all") and the sub filter (unless "all").
 */
export function caliberOptions(stats: WeaponStat[], main: string, sub: string): string[] {
  const calibers = new Set<string>();
  for (const stat of stats) {
    if (main !== ALL && stat.main.toLowerCase() !== main.toLowerCase()) continue;
    if (sub !== ALL && stat.sub.toLowerCase() !== sub.toLowerCase()) continue;
    if (stat.caliber) calibers.add(stat.caliber);
  }
  return [...calibers].sort((a, b) => a.localeCompare(b));
}

/** Applies the full filter set (legacy case-insensitive matching). */
export function filterWeaponStats(stats: WeaponStat[], filters: WeaponFilters): WeaponStat[] {
  const query = filters.query.toLowerCase();
  return stats.filter((stat) => {
    if (query && !stat.name.toLowerCase().includes(query)) return false;
    if (filters.main !== ALL && stat.main.toLowerCase() !== filters.main.toLowerCase()) return false;
    if (filters.sub !== ALL && stat.sub.toLowerCase() !== filters.sub.toLowerCase()) return false;
    if (filters.caliber !== ALL && stat.caliber.toLowerCase() !== filters.caliber.toLowerCase()) {
      return false;
    }
    return true;
  });
}

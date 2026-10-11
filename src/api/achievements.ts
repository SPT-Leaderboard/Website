/**
 * FRT-18 data access for the Achievement Rates page (legacy `achievements/index.html`
 * + `achievements/js/achievements.js`).
 *
 * The legacy page fetched the two compiled catalog files plus the shared
 * achievement counters and merged them client-side. Here the merged catalog
 * ships as the fixture `src/mocks/achievement-catalog.json` (merge documented
 * in `src/mocks/README.md`) and the counters resolver is re-exported from
 * `client.ts`, so a real fetch client can replace the fixtures later without
 * changing the page.
 *
 * The completion math mirrors the legacy page exactly
 * (`js/user-achievements.js` `calculateAchievementStats`): every entry in the
 * counters `achievements` map counts toward the player total — including the
 * 94 snapshot players whose value is a `[""]` placeholder, which therefore
 * hold no achievements — and each percentage keeps two decimals.
 */

import catalogFixture from "../mocks/achievement-catalog.json";
import type { AchievementCounters } from "./types";

export { getAchievementCounters } from "./client";

/** Canonical rarity order (task spec): Common, Rare, Epic, Legendary. */
export const RARITY_ORDER = ["Common", "Rare", "Epic", "Legendary"] as const;

export type AchievementRarity = (typeof RARITY_ORDER)[number];

/** One merged-catalog entry (shape produced by src/mocks/achievement-catalog.json). */
export interface AchievementCatalogEntry {
  id: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
  imageUrl: string;
}

/** A catalog entry joined with its completion numbers from the counters snapshot. */
export interface AchievementRate extends AchievementCatalogEntry {
  /** Players recorded as holding the achievement. */
  holders: number;
  /** `holders / totalPlayers` in percent, rounded to two decimals (legacy parity). */
  percent: number;
}

/** Random 0-300 ms latency, matching the mock client's network feel. */
function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 300));
}

/**
 * Resolves the merged catalog fixture. The build-time merge deduplicates by
 * id, so the array length is the number of distinct achievements.
 */
export async function getAchievementCatalog(): Promise<AchievementCatalogEntry[]> {
  await delay();
  return catalogFixture as AchievementCatalogEntry[];
}

/**
 * Total players recorded in the counters snapshot: every entry in the
 * `achievements` map counts, matching the legacy total
 * (`Object.keys(playerAchievements.achievements).length`).
 */
export function countTotalPlayers(counters: AchievementCounters): number {
  return Object.keys(counters.achievements).length;
}

/**
 * Players holding one achievement. Per-player values are
 * `achievements[playerId][0]` — an achievement-id → timestamp map; the
 * `[""]` placeholder players carry a string instead and hold nothing.
 */
export function countHolders(counters: AchievementCounters, achievementId: string): number {
  let holders = 0;
  for (const unlocks of Object.values(counters.achievements)) {
    const first = unlocks[0];
    if (typeof first !== "object") continue;
    if (achievementId in first) holders += 1;
  }
  return holders;
}

/**
 * Completion percentage for one achievement, two decimals (the legacy page
 * computed `(holders / totalPlayers * 100).toFixed(2)`; this returns the same
 * value as a number). No players means no percentage.
 */
export function completionPercentage(holders: number, totalPlayers: number): number {
  if (totalPlayers <= 0) return 0;
  return Math.round((holders / totalPlayers) * 100 * 100) / 100;
}

/** Mean of per-achievement percentages (summary header). Empty input averages to 0. */
export function averageCompletion(percents: number[]): number {
  if (percents.length === 0) return 0;
  return percents.reduce((sum, percent) => sum + percent, 0) / percents.length;
}

/** Joins the catalog with the counters into rate-bearing entries, in catalog order. */
export function withCompletionRates(
  catalog: AchievementCatalogEntry[],
  counters: AchievementCounters,
): AchievementRate[] {
  const totalPlayers = countTotalPlayers(counters);
  return catalog.map((entry) => {
    const holders = countHolders(counters, entry.id);
    return { ...entry, holders, percent: completionPercentage(holders, totalPlayers) };
  });
}

/**
 * Grid sort: rarity in canonical order (Common → Legendary), then completion
 * percentage descending. `Array.prototype.sort` is stable, so equal keys keep
 * catalog order.
 */
export function sortAchievementRates(rates: AchievementRate[]): AchievementRate[] {
  const rarityRank = (rarity: string) => {
    const index = RARITY_ORDER.indexOf(rarity as AchievementRarity);
    return index === -1 ? RARITY_ORDER.length : index;
  };
  return [...rates].sort((a, b) => {
    const byRarity = rarityRank(a.rarity) - rarityRank(b.rarity);
    if (byRarity !== 0) return byRarity;
    return b.percent - a.percent;
  });
}

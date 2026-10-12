/**
 * Data client: mock fixtures by default, the real v2 API when configured
 * (Tasks FRT-20 first slice).
 *
 * Default (no PUBLIC_API_BASE_URL): serves the trimmed production snapshots
 * from `src/mocks/` with a short random latency — exactly as before the
 * switch existed, so fixtures never ship differently.
 *
 * Real mode (PUBLIC_API_BASE_URL set, see .env.example): the functions below
 * fetch through the typed openapi-fetch client (src/api/openapi/client.ts)
 * at the configured base URL. Slice scope: status, the seasons list, the
 * current-season leaderboard, and the three shared counters. The profile
 * resolvers (raids/equipment/comments) and heartbeats keep their fixtures in
 * both modes until their pages rewire; the adapter below reconciles the live
 * current-season rows with the domain PlayerEntry type.
 */

import seasonFixture from "../mocks/season12.json";
import raidsIndexFixture from "../mocks/raids/04c08924fa7b41bf75f794ed371b9d3fd925b3ed7394ec95cf1d5897d0a2bcf6_index.json";
import equipmentFixture from "../mocks/equipment.json";
import commentsFixture from "../mocks/comments.json";
import countersFixture from "../mocks/counters.json";
import achievementCountersFixture from "../mocks/achievement-counters.json";
import weaponCountersFixture from "../mocks/weapon-counters.json";
import onlineFixture from "../mocks/online.json";
import heartbeatsFixture from "../mocks/heartbeats.json";
import { REAL_API_ENABLED } from "./openapi/base";
import {
  getAchievementCounters as v2GetAchievementCounters,
  getCurrentSeason as v2GetCurrentSeason,
  getGlobalCounters as v2GetGlobalCounters,
  getOnlineStatus as v2GetOnlineStatus,
  getSeasons as v2GetSeasons,
  getWeaponCounters as v2GetWeaponCounters,
} from "./openapi/client";
import type { SeasonList } from "./openapi/types";
import type {
  AchievementCounters,
  CommentsFile,
  Equipment,
  GlobalCounters,
  HeartbeatsMap,
  MapFatigue,
  OnlineStatus,
  PlayerEntry,
  QuestTimestamps,
  RaidIndex,
  SeasonData,
  WeaponCounters,
} from "./types";

/** The mock/real switch (src/api/openapi/base.ts); re-exported for the UI. */
export { REAL_API_ENABLED };

/** Random 0-300 ms latency, as if the data came over the network. */
function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 300));
}

/**
 * `resolveJsonModule` infers per-element literal types for fixture arrays;
 * their union normalization (`key?: undefined` on elements missing a key)
 * is structurally incompatible with the domain `Record` types in both
 * directions, so these two fixtures are bridged through `unknown`. The
 * other fixtures keep a direct assertion, which still verifies their
 * shape against the domain type.
 */

// ---------------------------------------------------------------------------
// Live-row adapter (real mode, current-season leaderboard)
// ---------------------------------------------------------------------------

/** Number value or the 0 default when the live row carries anything else. */
function numOr0(value: number | undefined): number {
  return typeof value === "number" ? value : 0;
}

/** Own numeric entries of a record; placeholder/string values are dropped. */
function numericEntries(record: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (record !== null && typeof record === "object") {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "number") out[key] = value;
    }
  }
  return out;
}

/**
 * Adapter: one live row of `GET /api/v2/seasons/current` -> domain
 * `PlayerEntry`. Exposed for tests (tests/adapt.test.ts).
 *
 * Verified against the dev FAKE-data API (SPTLB_FAKE=1, 100 rows) against
 * fixture `src/mocks/season12.json`: every legacy top-level key is present
 * (live rows only add the documented conditional fields) and every scalar the
 * leaderboard UI reads arrives with the legacy type. The divergences the
 * adapter reconciles, field by field (checked against a live response):
 * - teamTag           -> "" when absent (same normalization as the mock
 *                       ingest; search and the tag render need a string).
 * - scavProfitGain,
 *   scavPlayTime      -> 0 when absent ("present only on some entries" per
 *                       the yaml; seen missing on 10/100 dev rows).
 * - allAchievements   -> numeric entries only. Dev rows carry
 *                       Record<id, boolean> where the domain type models
 *                       unix-second unlock timestamps (Record<id, number>);
 *                       non-numeric placeholders are dropped.
 * - bestStats         -> each BestStats number defaults to 0 when absent or
 *                       not a number (dev rows carry a loose placeholder).
 * - breachTraits      -> rebuilt with neutral defaults for missing domain
 *                       fields (completed false, selected_at/score_remaining
 *                       0, empty positive/negative/modifiers/counters).
 * - completed_quests  -> entries whose accept_time/finish_time are not both
 *                       numbers are dropped (dev placeholder is flat).
 * - mapFatigue        -> dev rows carry a flat Record<mapName, count>; that
 *                       maps onto mapCounts with totalTrackedRaids and
 *                       appliedPenalty defaulting to 0 (not derivable). A row
 *                       that already carries the domain shape keeps it
 *                       (mapCounts defaulting to {}).
 * - previousBan       -> dropped when not an object (dev rows carry a
 *                       placeholder string; the domain type is a ban record).
 * - stattrack_weapons -> per-player values that are not objects are dropped
 *                       (dev rows carry Record<permaLink, number> where the
 *                       domain type models Record<permaLink,
 *                       Record<weapon, StattrackWeapon>>).
 * - teamVault         -> profitGained/kills default to 0 when not numbers.
 * - traderInfo        -> per trader, id defaults to "" and loyaltyLevel,
 *                       salesSum, standing to 0, unlocked/disabled to false
 *                       when absent (dev rows carry only unlocked, standing
 *                       and salesSum of the six TraderInfo fields).
 * Every other field passes through untouched.
 */
export function adaptLiveSeasonEntry(entry: PlayerEntry): PlayerEntry {
  const bestStats = entry.bestStats;
  const traits = entry.breachTraits;
  const positive = traits?.positive;
  const negative = traits?.negative;
  const modifiers = traits?.modifiers;
  const counters = traits?.counters;
  const rawFatigue = entry.mapFatigue as unknown;
  const structuredFatigue =
    rawFatigue !== null && typeof rawFatigue === "object" && "mapCounts" in rawFatigue
      ? (rawFatigue as MapFatigue)
      : undefined;

  const quests: Record<string, QuestTimestamps> = {};
  for (const [id, quest] of Object.entries(entry.completed_quests ?? {})) {
    if (typeof quest?.accept_time === "number" && typeof quest?.finish_time === "number") {
      quests[id] = quest;
    }
  }

  const stattrack: PlayerEntry["stattrack_weapons"] = {};
  for (const [playerId, weapons] of Object.entries(entry.stattrack_weapons ?? {})) {
    if (weapons !== null && typeof weapons === "object") stattrack[playerId] = weapons;
  }

  const traderInfo: PlayerEntry["traderInfo"] = {};
  for (const [code, trader] of Object.entries(entry.traderInfo ?? {})) {
    traderInfo[code] = {
      // Spread first: keep any fields the domain TraderInfo type does not model.
      ...trader,
      id: typeof trader?.id === "string" ? trader.id : "",
      unlocked: trader?.unlocked === true,
      loyaltyLevel: numOr0(trader?.loyaltyLevel),
      salesSum: numOr0(trader?.salesSum),
      standing: numOr0(trader?.standing),
      disabled: trader?.disabled === true,
    };
  }

  return {
    ...entry,
    teamTag: entry.teamTag ?? "",
    scavProfitGain: numOr0(entry.scavProfitGain),
    scavPlayTime: numOr0(entry.scavPlayTime),
    allAchievements: numericEntries(entry.allAchievements),
    bestStats: {
      killsPerRaid: numOr0(bestStats?.killsPerRaid),
      damagePerRaid: numOr0(bestStats?.damagePerRaid),
      maxKillsInRaid: numOr0(bestStats?.maxKillsInRaid),
      maxDamageInRaid: numOr0(bestStats?.maxDamageInRaid),
      bestKDR: numOr0(bestStats?.bestKDR),
      bestSurvivalRate: numOr0(bestStats?.bestSurvivalRate),
    },
    breachTraits: {
      completed: traits?.completed === true,
      selected_at: numOr0(traits?.selected_at),
      positive: Array.isArray(positive) ? positive : [],
      negative: Array.isArray(negative) ? negative : [],
      score_remaining: numOr0(traits?.score_remaining),
      modifiers: Array.isArray(modifiers) ? modifiers : [],
      counters: Array.isArray(counters) ? counters : [],
    },
    completed_quests: quests,
    mapFatigue: structuredFatigue
      ? {
          // Spread first: the snapshot files carry more keys than the domain
          // MapFatigue type models (topMap, sampleConfidence, ...) — keep them.
          ...structuredFatigue,
          mapCounts: structuredFatigue.mapCounts ?? {},
          totalTrackedRaids: numOr0(structuredFatigue.totalTrackedRaids),
          appliedPenalty: numOr0(structuredFatigue.appliedPenalty),
        }
      : {
          // Dev FAKE rows: the flat Record<mapName, count> IS the mapCounts data.
          mapCounts: numericEntries(rawFatigue),
          totalTrackedRaids: 0,
          appliedPenalty: 0,
        },
    previousBan:
      entry.previousBan !== null && typeof entry.previousBan === "object"
        ? entry.previousBan
        : undefined,
    stattrack_weapons: stattrack,
    teamVault: {
      profitGained: numOr0(entry.teamVault?.profitGained),
      kills: numOr0(entry.teamVault?.kills),
    },
    traderInfo,
  };
}

/** Whole-payload adapter for the current-season leaderboard (real mode). */
function adaptLiveSeason(season: SeasonData): SeasonData {
  return { leaderboard: season.leaderboard.map(adaptLiveSeasonEntry) };
}

// ---------------------------------------------------------------------------
// Mock vs real switch — one function per stub operation
// ---------------------------------------------------------------------------

/**
 * GET /api/v2/seasons (real mode) — current season number + available
 * numbers. Mock mode synthesizes the list from the only shipped season
 * snapshot (src/mocks/season12.json): current 12, available [12].
 */
export async function getSeasons(): Promise<SeasonList> {
  if (REAL_API_ENABLED) return v2GetSeasons();
  await delay();
  return { current: 12, available: [12] };
}

export async function getCurrentSeason(): Promise<SeasonData> {
  if (REAL_API_ENABLED) {
    return adaptLiveSeason(await v2GetCurrentSeason());
  }
  await delay();
  const season = seasonFixture as unknown as SeasonData;
  // Trimmed production snapshots omit teamTag on players without a team, but
  // the domain type says string (the cast above lets that slip). Normalize
  // once at ingest so search (toLowerCase) and the Player-cell tag render
  // never see undefined.
  return {
    ...season,
    leaderboard: season.leaderboard.map((entry) => ({ ...entry, teamTag: entry.teamTag ?? '' })),
  };
}

/** Serves the single fixture player's index; kept for interface parity; the `_` prefix marks it intentionally unused. */
export async function getPlayerRaids(_permaLink: string): Promise<RaidIndex> {
  await delay();
  return raidsIndexFixture as RaidIndex;
}

/** Serves the single fixture player's equipment; kept for interface parity; the `_` prefix marks it intentionally unused. */
export async function getPlayerEquipment(_playerId: string): Promise<Equipment> {
  await delay();
  return equipmentFixture as Equipment;
}

/** Serves the single fixture player's comments; kept for interface parity; the `_` prefix marks it intentionally unused. */
export async function getPlayerComments(_permaLink: string): Promise<CommentsFile> {
  await delay();
  return commentsFixture as CommentsFile;
}

export async function getGlobalCounters(): Promise<GlobalCounters> {
  if (REAL_API_ENABLED) return v2GetGlobalCounters();
  await delay();
  return countersFixture as GlobalCounters;
}

export async function getAchievementCounters(): Promise<AchievementCounters> {
  if (REAL_API_ENABLED) return v2GetAchievementCounters();
  await delay();
  return achievementCountersFixture as unknown as AchievementCounters;
}

export async function getWeaponCounters(): Promise<WeaponCounters> {
  if (REAL_API_ENABLED) return v2GetWeaponCounters();
  await delay();
  return weaponCountersFixture as WeaponCounters;
}

export async function getOnlineStatus(): Promise<OnlineStatus> {
  if (REAL_API_ENABLED) return v2GetOnlineStatus();
  await delay();
  return onlineFixture as OnlineStatus;
}

export async function getHeartbeats(): Promise<HeartbeatsMap> {
  await delay();
  return heartbeatsFixture as HeartbeatsMap;
}

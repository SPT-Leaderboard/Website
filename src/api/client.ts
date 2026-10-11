/**
 * Mock data client.
 *
 * Serves the trimmed production snapshots from `src/mocks/` with a short
 * random latency so UI work can start before the real API client lands.
 * The real fetch client replaces this module later without changing
 * these signatures.
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
import type {
  AchievementCounters,
  CommentsFile,
  Equipment,
  GlobalCounters,
  HeartbeatsMap,
  OnlineStatus,
  RaidIndex,
  SeasonData,
  WeaponCounters,
} from "./types";

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

export async function getCurrentSeason(): Promise<SeasonData> {
  await delay();
  return seasonFixture as unknown as SeasonData;
}

/** Serves the single fixture player's index; `permaLink` is unused for now. */
export async function getPlayerRaids(permaLink: string): Promise<RaidIndex> {
  await delay();
  return raidsIndexFixture as RaidIndex;
}

/** Serves the single fixture player's equipment; `playerId` is unused for now. */
export async function getPlayerEquipment(playerId: string): Promise<Equipment> {
  await delay();
  return equipmentFixture as Equipment;
}

/** Serves the single fixture player's comments; `permaLink` is unused for now. */
export async function getPlayerComments(permaLink: string): Promise<CommentsFile> {
  await delay();
  return commentsFixture as CommentsFile;
}

export async function getGlobalCounters(): Promise<GlobalCounters> {
  await delay();
  return countersFixture as GlobalCounters;
}

export async function getAchievementCounters(): Promise<AchievementCounters> {
  await delay();
  return achievementCountersFixture as unknown as AchievementCounters;
}

export async function getWeaponCounters(): Promise<WeaponCounters> {
  await delay();
  return weaponCountersFixture as WeaponCounters;
}

export async function getOnlineStatus(): Promise<OnlineStatus> {
  await delay();
  return onlineFixture as OnlineStatus;
}

export async function getHeartbeats(): Promise<HeartbeatsMap> {
  await delay();
  return heartbeatsFixture as HeartbeatsMap;
}

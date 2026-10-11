/**
 * Hand-written types for the SPT Leaderboard API payloads.
 *
 * Field lists follow `src/mocks/season12.json` `leaderboard[0]` and the
 * "Player entry fields" section of `docs/port/data-dependency-map.md`
 * (plus that section's conditional-fields table for the two fields the
 * fixture's entry[0] carries beyond the reference entry). Shapes are
 * exact: only fields observed in the production snapshot are typed.
 */

/** Achievement id -> unlock timestamp (unix seconds). */
export type AchievementTimestamps = Record<string, number>;

export interface BestStats {
  killsPerRaid: number;
  damagePerRaid: number;
  maxKillsInRaid: number;
  maxDamageInRaid: number;
  bestKDR: number;
  bestSurvivalRate: number;
}

export interface BreachTraits {
  completed: boolean;
  selected_at: number;
  positive: string[];
  negative: string[];
  score_remaining: number;
  modifiers: string[];
  /** Element shape not evidenced by the fixture (empty array). */
  counters: unknown[];
}

export interface QuestTimestamps {
  accept_time: number;
  finish_time: number;
}

/** Hideout area name -> upgrade level. */
export type HideoutLevels = Record<string, number>;

export interface MapFatigue {
  mapCounts: Record<string, number>;
  totalTrackedRaids: number;
  appliedPenalty: number;
}

/** Weapon display name -> stattrack counters. */
export interface StattrackWeapon {
  stats: {
    kills: number;
    headshots: number;
    totalShots: number;
    timesLost: number;
  };
  originalId: string;
}

/** Trader code (e.g. "PRAPOR") -> standing snapshot. */
export interface TraderInfo {
  id: string;
  unlocked: boolean;
  loyaltyLevel: number;
  salesSum: number;
  standing: number;
  disabled: boolean;
}

export interface TeamVault {
  profitGained: number;
  kills: number;
}

/** Ban record preceding the current state (docs conditional table). */
export interface PreviousBan {
  reason: string;
  bannedBy: string;
  bannedAt: number;
  unbannedBy: string;
  unbannedAt: number;
}

/**
 * One leaderboard row. Field set = fixture `leaderboard[0]` (96 fields);
 * entries of the live API may omit some of these (snapshot entries carry
 * 64-96 of them).
 */
export interface PlayerEntry {
  id: string;
  name: string;
  pmcLevel: number;
  lastPlayed: number;
  damage: number;
  accountType: string;
  sptVer: string;
  currentWinstreak: number;
  longestShot: number;
  isCasual: boolean;
  isHardcore: boolean;
  seasonsPlayed: number;
  permaLink: string;
  scavTotalProfit: number;
  totalRaids: number;
  registeredOnLeaderboard: number;
  registrationDate: number;
  absoluteLastTime: number;
  trusted: boolean;
  health: number;
  banned: boolean;
  lastProfitGain: number;
  totalProfit: number;
  scavsKilled: number;
  bossesKilled: number;
  hasKappa: boolean;
  isUsingStattrack: boolean;
  traderInfo: Record<string, TraderInfo>;
  pmcSide: string;
  scavLevel: number;
  prestige: number;
  isUsingFika: boolean;
  isUsingRealism: boolean;
  isUsingTP: boolean;
  isUsingWTT: boolean;
  isNew: boolean;
  allAchievements: AchievementTimestamps;
  pmcRaids: number;
  pmcKills: number;
  pmcDeaths: number;
  survived: number;
  averageLifeTime: number;
  killToDeathRatio: number;
  survivalRate: number;
  hideout: HideoutLevels;
  completed_quests: Record<string, QuestTimestamps>;
  hydration: number;
  energy: number;
  max_hydration: number;
  max_energy: number;
  longestHeadshot: number;
  scavRaids: number;
  scavKills: number;
  scavDeaths: number;
  scavSurvived: number;
  scavAverageLifeTime: number;
  scavKillToDeathRatio: number;
  scavSurvivalRate: number;
  profileTheme: string;
  mapFatigue: MapFatigue;
  bestStats: BestStats;
  totalScore: number;
  totalScoreDiff: number;
  profilePicture: string;
  suspicious: boolean;
  suspicious_reason: string;
  /** Empty array on fixture entry[0]; null on other snapshot entries. */
  suspicious_reasons: string[] | null;
  permBanned: boolean;
  disqualified: boolean;
  boostPerc: number;
  pmcPlayTime: number;
  totalPlayTime: number;
  dev: boolean;
  lastRaidSurvived: boolean;
  lastRaidKills: number;
  lastRaidAs: string;
  isTransition: boolean;
  lastRaidTransitionTo: string;
  discFromRaid: boolean;
  lastRaidRanThrough: boolean;
  lastRaidEXP: number;
  /** Legacy backend spelling; not "aggressor". */
  agressorName: string;
  lastRaidMap: string;
  /** Keyed by player permaLink, then weapon display name. */
  stattrack_weapons: Record<string, Record<string, StattrackWeapon>>;
  hasWinterTheme: boolean;
  breachTraits: BreachTraits;
  teamTag: string;
  teamJoinDate: number;
  teamVault: TeamVault;
  networkRaids: number;
  isPremium: boolean;
  premiumUntil: number;
  firstSeen: number;
  lcPointsEarned: number;
  scavProfitGain: number;
  scavPlayTime: number;

  // Conditional fields (docs "Player entry fields" conditional table):
  // present only on some entries, absent from fixture entry[0].
  banExpires?: number | null;
  banReason?: string;
  banTime?: number;
  casualTime?: number;
  pmcSurvived?: number;
  previousBan?: PreviousBan;
  tookAction?: string;
}

export interface SeasonData {
  leaderboard: PlayerEntry[];
}

/** Entry of `RaidIndex.blobs`. Optional fields vary per snapshot file. */
export interface RaidIndexBlob {
  blob_index: number;
  raid_count: number;
  start_raid?: number;
  end_raid?: number;
  created_at?: number;
  migrated?: boolean;
}

export interface RaidIndex {
  player_id: string;
  created_at: number;
  blobs: RaidIndexBlob[];
  current_blob: number;
  total_raids: number;
  last_updated: number;
  migrated_from_old?: boolean;
  migrated_at?: number;
}

/** One raid inside a `RaidBlob`. */
export interface RaidRecord {
  raidNumber: number;
  absoluteLastTime: number;
  lastRaidSessionID: string;
  lastRaidMap: string;
  lastRaidAs: string;
  raidResult: string;
  raidKills: number;
  bossesKilled: number;
  scavsKilled: number;
  raidDamage: number;
  raidTime: number;
  discFromRaid: boolean;
  isTransition: boolean;
  lastRaidTransitionTo: string;
  lastRaidEXP: number;
  lastRaidHits: number;
  lastRaidBodyPartHits: Record<string, number>;
  agressorName: string;
  agressorEdition: string;
  agressorPrestige: number | null;
  agressorKilledToBodyPart: string;
  lastRaidRanThrough: boolean;
  /** Numeric in the snapshot (1 = survived), unlike PlayerEntry's bool. */
  lastRaidSurvived: number;
  lastRaidDamageTaken: number | null;
  lcPointsEarned: number;
  lastRaidProfit: number;
  /** Legacy backend casing; not "totalScoreDiff". */
  TotalScoreDiff: number;
  foundLedx: boolean;
  foundIntel: boolean;
  foundGPU: boolean;
  foundBitcoin: boolean;
}

export interface RaidBlob {
  raids: RaidRecord[];
}

export interface EquipmentItem {
  id: string;
  template_id: string;
  amount: number;
  shortName: string;
  name: string;
}

export type EquipmentSlot =
  | "FirstPrimaryWeapon"
  | "SecondPrimaryWeapon"
  | "Holster"
  | "Backpack"
  | "TacticalVest"
  | "ArmorVest"
  | "Eyewear"
  | "FaceCover"
  | "Headwear"
  | "Earpiece";

/** Gear slot -> equipped items; empty array when the slot is unused. */
export type Equipment = Record<EquipmentSlot, EquipmentItem[]>;

export interface PlayerComment {
  id: string;
  text: string;
  author: string;
  sent_to_id: string;
  avatar: string;
  date: string;
  timestamp: number;
}

export type CommentsFile = PlayerComment[];

export interface GlobalCounters {
  total_raids: number;
  total_damage: number;
  total_hits: number;
  total_kills: number;
  total_playtime: number;
  /** Deaths per map id (e.g. "Woods", "bigmap"). */
  [mapId: string]: number;
}

/** Player hash -> list of achievement-unlock maps (normally one dict per
 * entry); 94 snapshot players instead carry a `[""]` placeholder. */
export interface AchievementCounters {
  achievements: Record<string, AchievementTimestamps[] | string[]>;
}

export interface WeaponStats {
  kills: number;
  headshots: number;
  totalShots: number;
  timesLost: number;
}

export interface WeaponEntry {
  stats: WeaponStats;
  originalId: string;
  totalStats: WeaponStats;
  lastKnownStats: WeaponStats;
}

export interface PlayerWeaponCounters {
  lastUpdate: number;
  level: number;
  name: string;
  playedMaps: Record<string, number>;
  weapons: Record<string, WeaponEntry>;
}

export interface WeaponCounters {
  weapons: Record<string, PlayerWeaponCounters>;
}

export interface OnlineStatus {
  online: boolean;
  outage: boolean;
  underWork: boolean;
  workText: string;
}

export interface Heartbeat {
  id: string;
  timestamp: number;
  type: string;
  map?: string | null;
  side?: string | null;
  gameTime?: string | null;
  state?: string;
  position?: {
    x: number | null;
    y: number | null;
    z: number | null;
  };
}

/** Player id -> latest heartbeat. */
export type HeartbeatsMap = Record<string, Heartbeat>;

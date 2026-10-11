/**
 * Data + pure logic for the player profile modal (FRT-13).
 *
 * Legacy behavior source (docs/port/feature-inventory.md):
 *   user-profiles.js — `openProfile()` loads customization via
 *                      `getCustomProfileSettings()` (theme, prestige styling,
 *                      BattlePass rewards, about-me, discord, custom pfp/name);
 *   user-raid-history.js — raid log = `{permaLink}_index.json` + `_blob_n.json`,
 *                      sorted newest-first;
 *   user-community.js  — comments paginated 5 per page;
 *   user-share.js      — `#id=<permaLink>` deep link.
 *
 * Pure helpers (raid sort, comment pagination, hash parsing) live here so
 * tests/profile.test.ts can exercise them without a DOM, mirroring the
 * src/api/leaderboard.ts layout. Mock resolvers serve the fixtures with the
 * same 0-300 ms latency as src/api/client.ts.
 */

import customizationFixture from "../mocks/profile/customization.json";
import raidsIndexFixture from "../mocks/raids/04c08924fa7b41bf75f794ed371b9d3fd925b3ed7394ec95cf1d5897d0a2bcf6_index.json";
import raidsBlobFixture from "../mocks/raids/04c08924fa7b41bf75f794ed371b9d3fd925b3ed7394ec95cf1d5897d0a2bcf6_blob_0.json";
import equipmentFixture from "../mocks/equipment.json";
import commentsFixture from "../mocks/comments.json";
import { getCurrentSeason } from "./client";
import type {
  Equipment,
  PlayerComment,
  PlayerEntry,
  RaidBlob,
  RaidIndex,
  RaidRecord,
} from "./types";

/** Random 0-300 ms latency, mirroring src/api/client.ts. */
function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 300));
}

/** Customization payload served by the legacy `profileAppearencePath` endpoint. */
export interface ProfileCustomization {
  profileTheme: string;
  usePrestigeStyling: boolean;
  prestigeBackground: string;
  backgroundReward: string;
  mainBackgroundReward: string;
  catReward: boolean;
  pfpStyle: string;
  pfpBorder: string;
  decal: string;
  about_me: string;
  discordUser: string;
  profilePicture: string;
  name: string;
  forbidNameChange: boolean;
}

/** Resolves the synthesized customization fixture (see src/mocks/README.md). */
export async function getCustomization(): Promise<ProfileCustomization> {
  await delay();
  return customizationFixture as ProfileCustomization;
}

/**
 * Raid log for a profile: the fixture player's index + blob stitched together,
 * in fixture order (sort with sortRaidsNewestFirst for display). Mock-mode
 * stand-in: whichever `permaLink` is open, the single fixture player's raid
 * log is served — same rule as `getPlayerRaids()` in src/api/client.ts
 * ("permaLink is unused for now"), and the same for getEquipment/getComments
 * below: every fixture owner except the season snapshot is off-board, so
 * gating on the key would dead-end the tabs in mock mode.
 */
export async function getRaids(permaLink: string): Promise<RaidRecord[]> {
  await delay();
  // Legacy two-step load (user-raid-history.js): index first, then every
  // `{permaLink}_blob_{n}.json` up to `current_blob`. The fixture index lists
  // no blobs, so the single snapshot blob is wired by its known index (0).
  const index = raidsIndexFixture as RaidIndex;
  const blobs = new Map<number, RaidBlob>([[0, raidsBlobFixture as RaidBlob]]);
  void permaLink;
  const raids: RaidRecord[] = [];
  for (let n = 0; n <= index.current_blob; n += 1) {
    const blob = blobs.get(n);
    if (blob) raids.push(...blob.raids);
  }
  return raids;
}

/**
 * Equipment loadout for a profile. Mock-mode stand-in: the single fixture
 * loadout is served regardless of `playerId` — the equipment snapshot owner
 * is not part of the season fixture, so gating on the id would dead-end the
 * tab (see src/mocks/README.md fixture provenance).
 */
export async function getEquipment(playerId: string): Promise<Equipment> {
  await delay();
  void playerId;
  return equipmentFixture as Equipment;
}

/**
 * Profile wall comments. Mock-mode stand-in: the single fixture comment file
 * is served regardless of `permaLink` (same rule as getRaids's counterpart
 * `getPlayerComments()` in src/api/client.ts).
 */
export async function getComments(permaLink: string): Promise<PlayerComment[]> {
  await delay();
  void permaLink;
  return commentsFixture as PlayerComment[];
}

/** Resolves the season entry for a permaLink, or null when it is not on the board. */
export async function getProfilePlayer(permaLink: string): Promise<PlayerEntry | null> {
  const season = await getCurrentSeason();
  return season.leaderboard.find((player) => player.permaLink === permaLink) ?? null;
}

/** Newest-first raid order (legacy user-raid-history.js sort key: absoluteLastTime). */
export function sortRaidsNewestFirst(raids: RaidRecord[]): RaidRecord[] {
  return [...raids].sort((a, b) => b.absoluteLastTime - a.absoluteLastTime);
}

/**
 * `#id=<permaLink>` deep-link parsing (legacy user-share.js checkUrlHash).
 * Returns the permaLink, or null for any other/empty hash.
 */
export function parseProfileHash(hash: string): string | null {
  if (!hash.startsWith("#id=")) return null;
  const raw = hash.slice("#id=".length);
  if (raw === "") return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

/** Inverse of parseProfileHash: the canonical profile URL fragment. */
export function buildProfileHash(permaLink: string): string {
  return `#id=${encodeURIComponent(permaLink)}`;
}

/** Legacy CommentsManager page size (5 comments per page). */
export const COMMENT_PAGE_SIZE = 5;

/** One sliced page of the comment wall. */
export interface CommentPage {
  items: PlayerComment[];
  /** 1-based page number, clamped into [1, pageCount]. */
  page: number;
  /** Always >= 1 (an empty wall is "page 1 of 1"). */
  pageCount: number;
}

/** Slices the comment wall into legacy-sized pages, clamping the request. */
export function paginateComments(comments: PlayerComment[], page: number): CommentPage {
  const pageCount = Math.max(1, Math.ceil(comments.length / COMMENT_PAGE_SIZE));
  const requested = Math.floor(page);
  const safePage = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), pageCount);
  const start = (safePage - 1) * COMMENT_PAGE_SIZE;
  return {
    items: comments.slice(start, start + COMMENT_PAGE_SIZE),
    page: safePage,
    pageCount,
  };
}

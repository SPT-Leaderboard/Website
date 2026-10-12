/**
 * Data source for the Global Leaderboard page (FRT-15).
 *
 * The legacy page fetched `/api/network/functions/global-lb/players.php`
 * (docs/port/feature-inventory.md, "Page: global/index.html"); no new-API
 * counterpart exists yet, so this module serves the synthesized
 * `src/mocks/global-players.json` fixture with the same 0-300 ms latency as
 * `src/api/client.ts`. Replacing the fixture with the real endpoint later
 * keeps the exported signature unchanged.
 */

import globalPlayersFixture from "../mocks/global-players.json";

/** One all-time leaderboard row. Field set = `src/mocks/global-players.json`. */
export interface GlobalPlayer {
  id: string;
  name: string;
  permaLink: string;
  /** Team tag without brackets; empty string when the player has no team. */
  teamTag: string;
  /** Avatar image URL (absolute or site-relative), as captured in season data. */
  avatar: string;
  /** Unix seconds of the player's last activity. */
  lastSeen: number;
  pmcKills: number;
  scavKills: number;
  bossesKilled: number;
  totalRaids: number;
  survived: number;
  /** Total play time in seconds. */
  totalPlayTime: number;
  totalProfit: number;
}

/** Random 0-300 ms latency, mirroring src/api/client.ts. */
function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 300));
}

export async function getGlobalPlayers(): Promise<GlobalPlayer[]> {
  await delay();
  // Mock mode has no /api/data/* routes in a static deploy (the avatar
  // middleware is dev-only) — swap fixture avatar URLs for the bundled default
  // so the deployed site loads without 404 noise. GlobalTable's onerror
  // initials fallback stays as the second line of defense.
  return (globalPlayersFixture as GlobalPlayer[]).map((player) => ({
    ...player,
    avatar: player.avatar.startsWith('/api/data/')
      ? '/media/default_avatar.png'
      : player.avatar,
  }));
}

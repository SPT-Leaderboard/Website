/**
 * FRT-16 data access for the Global Insights page (legacy `insights/index.html`).
 *
 * The legacy page fetched hardcoded season files 2-10 plus the shared global
 * counters. Here the seasons come from `src/mocks/insights/archives.json`, an
 * array of season snapshots — the loader accepts any number of entries, so
 * earlier seasons are added to that fixture without touching this module.
 * Signatures mirror `client.ts` so a real fetch client can replace the
 * fixtures later without changing the page.
 */

import archivesFixture from "../mocks/insights/archives.json";
import countersFixture from "../mocks/counters.json";
import type { GlobalCounters, SeasonData } from "./types";

/** One archived season: a display label plus its full season payload. */
export interface SeasonArchive {
  label: string;
  data: SeasonData;
}

/** Random 0-300 ms latency, matching the mock client's network feel. */
function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 300));
}

/**
 * Resolves the season archives fixture. The array length is the page's data
 * contract: currently one entry ("Season 12", re-using the season12 snapshot),
 * with seasons 2-11 arriving later.
 */
export async function getSeasonArchives(): Promise<SeasonArchive[]> {
  await delay();
  // Same `unknown` bridge as client.ts: the fixture's inferred literal type
  // (per-element `key?: undefined` unions) is structurally incompatible with
  // the domain types in both directions.
  return archivesFixture as unknown as SeasonArchive[];
}

/** Resolves `src/mocks/counters.json` (the shared global counters snapshot). */
export async function getGlobalCounters(): Promise<GlobalCounters> {
  await delay();
  return countersFixture as GlobalCounters;
}

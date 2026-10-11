// FRT-12 main season leaderboard island — rebuild of legacy `index.html`
// (docs/port/feature-inventory.md "Page: index.html"): the season table with
// client-side sorting, debounced search, an aggregate stats bar, and the
// 8-second live data flow.
// Pure logic lives in src/api/leaderboard.ts; fixtures come through
// getCurrentSeason()/getHeartbeats() in src/api/client.ts.
// Accessibility contract (docs/port/web-standards-audit.md):
//   DS2/DS3 — real sort buttons inside <th>, <caption>, scope="col", and
//             aria-sort kept in sync with the actual sort;
//   FL1     — labeled type="search" input with autocomplete off;
//   LB3/ES6 — loading and update announcements via role="status"/aria-live;
//   XC1     — prefers-reduced-motion honored for the update flash;
//   XC3     — loading strings end with the "…" character;
//   XC8     — Intl.NumberFormat for every displayed number.
import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { getCurrentSeason, getHeartbeats } from '../../api/client';
import type { HeartbeatsMap, PlayerEntry } from '../../api/types';
import ProfileModal from '../profile/ProfileModal';
import {
  AUTOUPDATE_STORAGE_KEY,
  DEFAULT_SORT,
  ONLINE_THRESHOLD_SECONDS,
  SEARCH_DEBOUNCE_MS,
  SORT_COLUMNS,
  SORT_STORAGE_KEY,
  UPDATE_INTERVAL_SECONDS,
  assignRanks,
  computeSeasonStats,
  deriveOnlineStatus,
  filterPlayers,
  parseAutoUpdate,
  parseSortState,
  serializeAutoUpdate,
  serializeLeaderboard,
  serializeSortState,
  sortPlayers,
  playerKills,
  type LeaderboardRow,
  type OnlineStatus,
  type SortState,
} from '../../api/leaderboard';
import './leaderboard.css';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');
const SCORE_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const RATE_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const TIME_FORMAT = new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' });

/** Row badges from player fields, in display order (legacy standing badges). */
const BADGES = [
  { key: 'suspicious', label: 'Suspicious', tone: 'warning' },
  { key: 'isPremium', label: 'Premium', tone: 'accent' },
  { key: 'isHardcore', label: 'Hardcore', tone: 'info' },
  { key: 'isCasual', label: 'Casual', tone: 'muted' },
] as const;

// web-standards-audit §8 ES4 keeps the inline error state + Retry affordance.
// Unreachable while the page is mock-backed (getCurrentSeason never rejects),
// so the branch is gated behind a flag that is never true until the real
// season client replaces src/api/client.ts.
const ERROR_STATE_REACHABLE = false;

export default function Leaderboard() {
  const [players, setPlayers] = createSignal<PlayerEntry[] | undefined>(undefined);
  const [heartbeats, setHeartbeats] = createSignal<HeartbeatsMap>({});
  const [failed, setFailed] = createSignal(false);

  const [sort, setSort] = createSignal<SortState>(DEFAULT_SORT);
  const [queryInput, setQueryInput] = createSignal('');
  const [appliedQuery, setAppliedQuery] = createSignal('');
  const [autoUpdate, setAutoUpdate] = createSignal(true);
  const [secondsLeft, setSecondsLeft] = createSignal(UPDATE_INTERVAL_SECONDS);
  const [updatedAt, setUpdatedAt] = createSignal<number | undefined>(undefined);
  const [updating, setUpdating] = createSignal(false);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let tickTimer: ReturnType<typeof setInterval> | undefined;
  let searchField: HTMLInputElement | undefined;
  let lastSerialized = '';
  let lastHeartbeatsSerialized = '';

  onMount(() => {
    // Preferences hydrate after hydration so SSR never touches localStorage.
    const storedSort = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (storedSort !== null) setSort(parseSortState(storedSort));
    setAutoUpdate(parseAutoUpdate(window.localStorage.getItem(AUTOUPDATE_STORAGE_KEY)));
    void loadSeason();
    tickTimer = setInterval(tick, 1000); // legacy ui-live-data-flow.js 1 s ticker
  });

  onCleanup(() => {
    if (searchTimer !== undefined) clearTimeout(searchTimer);
    if (tickTimer !== undefined) clearInterval(tickTimer);
  });

  async function loadSeason(): Promise<void> {
    setFailed(false);
    try {
      const [season, beats] = await Promise.all([getCurrentSeason(), getHeartbeats()]);
      applyCycle(season.leaderboard, beats);
    } catch {
      setFailed(true);
    }
  }

  /** One live-data cycle: re-render only when serialized data changed
      (legacy areLeaderboardsEqual skip in ui-live-data-flow.js). */
  function applyCycle(season: PlayerEntry[], beats: HeartbeatsMap): void {
    const serialized = serializeLeaderboard(season);
    if (serialized !== lastSerialized) {
      lastSerialized = serialized;
      setPlayers(season);
      setUpdatedAt(Date.now());
    }
    const beatsSerialized = JSON.stringify(beats);
    if (beatsSerialized !== lastHeartbeatsSerialized) {
      lastHeartbeatsSerialized = beatsSerialized;
      setHeartbeats(beats);
    }
  }

  /** Search pauses the live data flow (legacy user-search.js AppState). */
  const livePaused = () => !autoUpdate() || appliedQuery() !== '';

  function tick(): void {
    if (livePaused() || updating()) return;
    const next = secondsLeft() - 1;
    if (next > 0) {
      setSecondsLeft(next);
      return;
    }
    setSecondsLeft(UPDATE_INTERVAL_SECONDS);
    void runUpdateCycle();
  }

  async function runUpdateCycle(): Promise<void> {
    setUpdating(true);
    try {
      const [season, beats] = await Promise.all([getCurrentSeason(), getHeartbeats()]);
      applyCycle(season.leaderboard, beats);
    } catch {
      // A failed cycle keeps the last good data; the next tick retries.
    } finally {
      setUpdating(false);
    }
  }

  const toggleAutoUpdate = (enabled: boolean) => {
    setAutoUpdate(enabled);
    setSecondsLeft(UPDATE_INTERVAL_SECONDS);
    window.localStorage.setItem(AUTOUPDATE_STORAGE_KEY, serializeAutoUpdate(enabled));
  };

  const onSearchInput = (value: string) => {
    setQueryInput(value);
    if (searchTimer !== undefined) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setAppliedQuery(value), SEARCH_DEBOUNCE_MS);
  };

  const clearSearch = () => {
    if (searchTimer !== undefined) clearTimeout(searchTimer);
    searchTimer = undefined;
    setQueryInput('');
    setAppliedQuery('');
    searchField?.focus();
  };

  /** Sort on every header: first click applies the column's best-first
      direction, further clicks toggle. Banned rows stay last in sortPlayers. */
  const toggleSort = (key: SortState['key']) => {
    const current = sort();
    const next: SortState =
      current.key === key
        ? { key, dir: current.dir === 'ascending' ? 'descending' : 'ascending' }
        : {
            key,
            dir: SORT_COLUMNS.find((column) => column.key === key)?.initialDir ?? 'ascending',
          };
    setSort(next);
    window.localStorage.setItem(SORT_STORAGE_KEY, serializeSortState(next));
  };

  /** Season rows decorated with list-order ranks (docs: rank = list order). */
  const rankedRows = createMemo<LeaderboardRow[] | undefined>(() => {
    const season = players();
    return season === undefined ? undefined : assignRanks(season);
  });

  const stats = createMemo(() => computeSeasonStats(players() ?? []));

  const visibleRows = createMemo(() => {
    const rows = rankedRows();
    if (rows === undefined) return [];
    return sortPlayers(filterPlayers(rows, appliedQuery()), sort(), heartbeats());
  });

  const retry = () => {
    void loadSeason();
  };

  const showError = () => failed() && ERROR_STATE_REACHABLE;

  const liveStatus = () => {
    if (appliedQuery() !== '') return 'Search active — live updates paused.';
    if (!autoUpdate()) return 'Live data flow off.';
    if (updating()) return 'Updating…';
    return `Next update in ${secondsLeft()}s`;
  };

  return (
    <div class="leaderboard">
      {/* FRT-13: route-driven profile modal; row openers set #id=<permaLink>. */}
      <ProfileModal />
      <Show
        when={stats().totalPlayers > 0 || players() !== undefined}
        fallback={<StatsSkeleton />}
      >
        <dl class="leaderboard__stats" aria-label="Season totals">
          <div class="leaderboard__stat">
            <dt>Players</dt>
            <dd>{NUMBER_FORMAT.format(stats().totalPlayers)}</dd>
          </div>
          <div class="leaderboard__stat">
            <dt>Total raids</dt>
            <dd>{NUMBER_FORMAT.format(stats().totalRaids)}</dd>
          </div>
          <div class="leaderboard__stat">
            <dt>Total kills</dt>
            <dd>{NUMBER_FORMAT.format(stats().totalKills)}</dd>
          </div>
          <div class="leaderboard__stat">
            <dt>Avg. survival rate</dt>
            <dd>{RATE_FORMAT.format(stats().averageSurvivalRate)}%</dd>
          </div>
        </dl>
      </Show>

      <div class="leaderboard__toolbar">
        <div class="leaderboard__search">
          <label class="leaderboard__visually-hidden" for="leaderboard-player-search">
            Search players by name or team tag
          </label>
          <input
            id="leaderboard-player-search"
            ref={searchField}
            type="search"
            name="player-search"
            placeholder="Search by name or team tag…"
            autocomplete="off"
            spellcheck={false}
            value={queryInput()}
            onInput={(event) => onSearchInput(event.currentTarget.value)}
          />
          <Show when={queryInput() !== ''}>
            <button
              type="button"
              class="leaderboard__clear"
              aria-label="Clear search"
              onClick={clearSearch}
            >
              Clear
            </button>
          </Show>
        </div>
        <div class="leaderboard__live">
          <label class="leaderboard__live-toggle">
            <input
              type="checkbox"
              checked={autoUpdate()}
              onChange={(event) => toggleAutoUpdate(event.currentTarget.checked)}
            />
            Live data flow
          </label>
          <p class="leaderboard__live-status" role="status">
            {liveStatus()}
          </p>
          <Show when={updatedAt()} keyed>
            {(time) => (
              <p class="leaderboard__live-updated" data-flash>
                Updated{' '}
                <time datetime={new Date(time).toISOString()}>{TIME_FORMAT.format(time)}</time>
              </p>
            )}
          </Show>
        </div>
      </div>

      <Show
        when={showError()}
        fallback={
          <Show when={rankedRows() !== undefined} fallback={<TableSkeleton />}>
            <div class="leaderboard__table-wrap">
              <table class="leaderboard__table">
                <caption class="leaderboard__visually-hidden">
                  Current season leaderboard. Column headers are sortable buttons; banned
                  players always sort last.
                </caption>
                <thead>
                  <tr>
                    <For each={SORT_COLUMNS}>
                      {(column) => {
                        const active = () => sort().key === column.key;
                        return (
                          <th
                            scope="col"
                            class={`leaderboard__th${
                              column.numeric ? ' leaderboard__th--numeric' : ''
                            }`}
                            aria-sort={active() ? sort().dir : undefined}
                          >
                            <button
                              type="button"
                              class="leaderboard__sort"
                              onClick={() => toggleSort(column.key)}
                            >
                              {column.label}
                              <span class="leaderboard__sort-arrow" aria-hidden="true">
                                {active() ? (sort().dir === 'ascending' ? '↑' : '↓') : ''}
                              </span>
                            </button>
                          </th>
                        );
                      }}
                    </For>
                  </tr>
                </thead>
                <tbody>
                  <Show
                    when={visibleRows().length > 0}
                    fallback={
                      <tr>
                        <td class="leaderboard__empty" colspan={SORT_COLUMNS.length}>
                          <Show
                            when={rankedRows()!.length > 0}
                            fallback={
                              <>
                                <p class="leaderboard__empty-title">
                                  No players are on the leaderboard yet.
                                </p>
                                <p class="leaderboard__empty-hint">
                                  The season table fills in as players register raids.
                                </p>
                              </>
                            }
                          >
                            <p class="leaderboard__empty-title">
                              No players match “{appliedQuery().trim()}”.
                            </p>
                            <p class="leaderboard__empty-hint">
                              Try a different name or team tag, or clear the search to see all
                              players.
                            </p>
                          </Show>
                        </td>
                      </tr>
                    }
                  >
                    <For each={visibleRows()}>
                      {(row) => <LeaderboardTableRow row={row} heartbeats={heartbeats()} />}
                    </For>
                  </Show>
                </tbody>
              </table>
              <p class="leaderboard__footnote">
                Status is derived from heartbeats ({ONLINE_THRESHOLD_SECONDS} s threshold); ranks
                follow the season order.
              </p>
            </div>
          </Show>
        }
      >
        <div class="leaderboard__state" role="alert">
          <p class="leaderboard__state-title">Failed to load the season leaderboard.</p>
          <p class="leaderboard__state-hint">Check your connection and try again.</p>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      </Show>
    </div>
  );
}

/** One season table row; derives the heartbeat status once per render. */
function LeaderboardTableRow(props: { row: LeaderboardRow; heartbeats: HeartbeatsMap }) {
  const player = () => props.row.player;
  const status = () =>
    deriveOnlineStatus(player().id, props.heartbeats, Math.floor(Date.now() / 1000));
  return (
    <tr
      class={`leaderboard__row${player().banned ? ' leaderboard__row--banned' : ''}`}
    >
      <td class="leaderboard__td leaderboard__td--rank">{props.row.rank}</td>
      <td class="leaderboard__td leaderboard__td--player">
        {/* FRT-13 row opener (web-standards-audit KB1): a real button, so the
            primary row action is keyboard-reachable. Setting location.hash
            pushes a history entry, which drives the profile modal's
            Back/Forward behavior (ux-audit §4). */}
        <button
          type="button"
          class="leaderboard__profile-link"
          aria-label={`Open ${player().name}'s profile`}
          onClick={() => {
            window.location.hash = `id=${player().permaLink}`;
          }}
        >
          <span class="leaderboard__name">{player().name}</span>
        </button>
        <Show when={player().teamTag !== ''}>
          <span class="leaderboard__teamtag">[{player().teamTag}]</span>
        </Show>
        <Show when={player().banned}>
          <span class="leaderboard__badge leaderboard__badge--error">BANNED</span>
        </Show>
        <For each={BADGES}>
          {(badge) => (
            <Show when={player()[badge.key]}>
              <span class={`leaderboard__badge leaderboard__badge--${badge.tone}`}>
                {badge.label}
              </span>
            </Show>
          )}
        </For>
      </td>
      <td class="leaderboard__td leaderboard__td--numeric">
        {NUMBER_FORMAT.format(player().pmcLevel)}
      </td>
      <td class="leaderboard__td leaderboard__td--numeric">
        {SCORE_FORMAT.format(player().totalScore)}
      </td>
      <td class="leaderboard__td leaderboard__td--numeric">
        {SCORE_FORMAT.format(player().killToDeathRatio)}
      </td>
      <td class="leaderboard__td leaderboard__td--numeric">
        {RATE_FORMAT.format(player().survivalRate)}%
      </td>
      <td class="leaderboard__td leaderboard__td--numeric">
        {NUMBER_FORMAT.format(player().totalRaids)}
      </td>
      <td class="leaderboard__td leaderboard__td--numeric">
        {NUMBER_FORMAT.format(playerKills(player()))}
      </td>
      <StatusCell status={status()} />
    </tr>
  );
}

function StatusCell(props: { status: OnlineStatus }) {
  return (
    <td class="leaderboard__td leaderboard__td--status">
      <span class={`leaderboard__status leaderboard__status--${props.status}`}>
        {props.status === 'online' ? 'Online' : 'Offline'}
      </span>
    </td>
  );
}

/** Loading skeleton shown while the season promise resolves (audit §7 LB3). */
function TableSkeleton() {
  return (
    <div class="leaderboard__skeleton" role="status">
      <span class="leaderboard__visually-hidden">Loading the season leaderboard…</span>
      {Array.from({ length: 8 }, () => (
        <div class="leaderboard__skeleton-row" aria-hidden="true">
          <span class="leaderboard__skeleton-bar leaderboard__skeleton-bar--rank" />
          <span class="leaderboard__skeleton-bar leaderboard__skeleton-bar--player" />
          <span class="leaderboard__skeleton-bar" />
          <span class="leaderboard__skeleton-bar" />
          <span class="leaderboard__skeleton-bar leaderboard__skeleton-bar--status" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder stats bar rendered while the first cycle is in flight. */
function StatsSkeleton() {
  return (
    <div class="leaderboard__stats leaderboard__stats--skeleton" role="status" aria-hidden="true">
      {Array.from({ length: 4 }, () => (
        <span class="leaderboard__skeleton-bar leaderboard__skeleton-bar--stat" />
      ))}
    </div>
  );
}

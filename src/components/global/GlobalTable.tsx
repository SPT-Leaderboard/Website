// FRT-15 global leaderboard island — rebuild of legacy `global/index.html`
// (docs/port/feature-inventory.md "Page: global/index.html"): an all-time
// leaderboard with client-side sorting, a limit select, and debounced search.
// Accessibility contract (docs/port/web-standards-audit.md):
//   DS2/DS3 — real sort buttons inside <th>, <caption>, scope="col", and
//             aria-sort kept in sync with the actual sort (no dead affordances);
//   FL1/FL2 — labeled search input (type="search", autocomplete off) and
//             labeled limit select;
//   XC3    — UI strings end with the "…" character;
//   XC8    — Intl.NumberFormat / Intl.RelativeTimeFormat for numbers and dates.
import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { getGlobalPlayers, type GlobalPlayer } from '../../api/global';
import './global-table.css';

/** Every displayed column except Rank is sortable; Rank follows the active sort. */
type SortKey =
  | 'name'
  | 'teamTag'
  | 'lastSeen'
  | 'pmcKills'
  | 'scavKills'
  | 'bossesKilled'
  | 'totalRaids'
  | 'survived'
  | 'totalPlayTime'
  | 'totalProfit';

type SortDir = 'ascending' | 'descending';

interface SortColumn {
  key: SortKey;
  label: string;
  /** Names sort A-first; stats and recency sort best-first. */
  initialDir: SortDir;
  numeric: boolean;
}

const COLUMNS: SortColumn[] = [
  { key: 'name', label: 'Player', initialDir: 'ascending', numeric: false },
  { key: 'teamTag', label: 'Team', initialDir: 'ascending', numeric: false },
  { key: 'lastSeen', label: 'Last seen', initialDir: 'descending', numeric: false },
  { key: 'pmcKills', label: 'PMC kills', initialDir: 'descending', numeric: true },
  { key: 'scavKills', label: 'SCAV kills', initialDir: 'descending', numeric: true },
  { key: 'bossesKilled', label: 'Bosses', initialDir: 'descending', numeric: true },
  { key: 'totalRaids', label: 'Raids', initialDir: 'descending', numeric: true },
  { key: 'survived', label: 'Survived', initialDir: 'descending', numeric: true },
  { key: 'totalPlayTime', label: 'Play time', initialDir: 'descending', numeric: true },
  { key: 'totalProfit', label: 'Profit', initialDir: 'descending', numeric: true },
];

/** Legacy default state: sorted by richest (totalProfit), 25 rows (global/js/main.js). */
const DEFAULT_SORT_KEY: SortKey = 'totalProfit';
const DEFAULT_LIMIT = 25;
const LIMITS = [10, 25, 50] as const;
const SEARCH_DEBOUNCE_MS = 250; // legacy global/js/main.js debounce

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');
const PLAY_TIME_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const RELATIVE_FORMAT = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** Skeleton row count: header + 8 body bars, enough to suggest the table shape. */
const SKELETON_ROWS = 8;

/** "time ago" cell, legacy behavior (global/js/main.js timeAgo) via Intl (audit XC8). */
function formatRelativeTime(unixSeconds: number): string {
  const elapsedSeconds = Math.floor(Date.now() / 1000) - unixSeconds;
  if (elapsedSeconds < 60) return 'just now';
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (elapsedSeconds >= unitSeconds) {
      return RELATIVE_FORMAT.format(-Math.floor(elapsedSeconds / unitSeconds), unit);
    }
  }
  return RELATIVE_FORMAT.format(-elapsedSeconds, 'second');
}

// web-standards-audit §8 ES4 keeps the inline error state + Retry affordance.
// Unreachable while the page is mock-backed (getGlobalPlayers never rejects),
// so the branch is gated behind a flag that is never true until the real
// global-lb client replaces src/api/global.ts.
const ERROR_STATE_REACHABLE = false;

export default function GlobalTable() {
  const [players, setPlayers] = createSignal<GlobalPlayer[] | undefined>(undefined);
  const [failed, setFailed] = createSignal(false);

  const [sortKey, setSortKey] = createSignal<SortKey>(DEFAULT_SORT_KEY);
  const [sortDir, setSortDir] = createSignal<SortDir>('descending');
  const [limit, setLimit] = createSignal<number>(DEFAULT_LIMIT);

  const [queryInput, setQueryInput] = createSignal('');
  const [appliedQuery, setAppliedQuery] = createSignal('');
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let searchField: HTMLInputElement | undefined;

  onMount(() => {
    void loadPlayers();
  });

  onCleanup(() => {
    if (searchTimer !== undefined) clearTimeout(searchTimer);
  });

  async function loadPlayers(): Promise<void> {
    setPlayers(undefined);
    setFailed(false);
    try {
      setPlayers(await getGlobalPlayers());
    } catch {
      setFailed(true);
    }
  }

  const retry = () => {
    void loadPlayers();
  };

  const onSearchInput = (value: string) => {
    setQueryInput(value);
    if (searchTimer !== undefined) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setAppliedQuery(value.trim()), SEARCH_DEBOUNCE_MS);
  };

  const clearSearch = () => {
    if (searchTimer !== undefined) clearTimeout(searchTimer);
    searchTimer = undefined;
    setQueryInput('');
    setAppliedQuery('');
    searchField?.focus();
  };

  /** Sort on every header: first click applies the column's best-first direction,
      further clicks toggle. Native <button> gives focus + Enter/Space activation. */
  const toggleSort = (column: SortColumn) => {
    if (sortKey() === column.key) {
      setSortDir(sortDir() === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortKey(column.key);
      setSortDir(column.initialDir);
    }
  };

  const filteredPlayers = createMemo(() => {
    const all = players();
    if (!all) return [];
    const query = appliedQuery().toLowerCase();
    if (query === '') return all;
    return all.filter(
      (player) =>
        player.name.toLowerCase().includes(query) || player.teamTag.toLowerCase().includes(query),
    );
  });

  /** Ranked list = filtered + sorted. Rank is the 1-based position in the active
      sort (legacy rows carry `standing` from the server for the requested sort). */
  const rankedPlayers = createMemo(() => {
    const key = sortKey();
    const direction = sortDir() === 'ascending' ? 1 : -1;
    return [...filteredPlayers()].sort((a, b) => {
      if (key === 'name' || key === 'teamTag') return direction * a[key].localeCompare(b[key]);
      return direction * (a[key] - b[key]);
    });
  });

  const visiblePlayers = createMemo(() => rankedPlayers().slice(0, limit()));
  const columnCount = COLUMNS.length + 1; // + Rank

  /** Error branch gate: unreachable while getGlobalPlayers is mock-backed (never rejects);
      ERROR_STATE_REACHABLE keeps it that way until the real global-lb client lands. */
  const showError = () => failed() && ERROR_STATE_REACHABLE;

  return (
    <div class="global-leaderboard">
      <div class="global-leaderboard__toolbar">
        <div class="global-leaderboard__search">
          <label class="global-leaderboard__visually-hidden" for="global-player-search">
            Search players by name or team tag
          </label>
          <input
            id="global-player-search"
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
              class="global-leaderboard__clear"
              aria-label="Clear search"
              onClick={clearSearch}
            >
              Clear
            </button>
          </Show>
        </div>
        <div class="global-leaderboard__limit">
          <label for="global-limit-select">Show</label>
          <select
            id="global-limit-select"
            value={limit()}
            onChange={(event) => setLimit(Number(event.currentTarget.value))}
          >
            <For each={LIMITS}>
              {(option) => <option value={option}>{option}</option>}
            </For>

          </select>
        </div>
      </div>

      <Show
        when={showError()}
        fallback={
          <Show when={players() !== undefined} fallback={<TableSkeleton />}>
            <div class="global-leaderboard__table-wrap">
              <table class="global-leaderboard__table">
                <caption class="global-leaderboard__visually-hidden">
                  All-time global leaderboard. Column headers are sortable buttons.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" class="global-leaderboard__th global-leaderboard__th--rank">
                      Rank
                    </th>
                    <For each={COLUMNS}>
                      {(column) => {
                        const active = () => sortKey() === column.key;
                        return (
                          <th
                            scope="col"
                            class={`global-leaderboard__th${
                              column.numeric ? ' global-leaderboard__th--numeric' : ''
                            }`}
                            aria-sort={active() ? sortDir() : undefined}
                          >
                            <button
                              type="button"
                              class="global-leaderboard__sort"
                              onClick={() => toggleSort(column)}
                            >
                              {column.label}
                              <span class="global-leaderboard__sort-arrow" aria-hidden="true">
                                {active() ? (sortDir() === 'ascending' ? '↑' : '↓') : ''}
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
                    when={visiblePlayers().length > 0}
                    fallback={
                      <tr>
                        <td class="global-leaderboard__empty" colspan={columnCount}>
                          <p class="global-leaderboard__empty-title">
                            No players match “{appliedQuery()}”.
                          </p>
                          <p class="global-leaderboard__empty-hint">
                            Try a different name or team tag, or clear the search to see all
                            players.
                          </p>
                        </td>
                      </tr>
                    }
                  >
                    <For each={visiblePlayers()}>
                      {(player, index) => (
                        <tr>
                          <td class="global-leaderboard__td global-leaderboard__td--rank">
                            {index() + 1}
                          </td>
                          <td class="global-leaderboard__td global-leaderboard__td--player">
                            <span class="global-leaderboard__player">
                              <img
                                class="global-leaderboard__avatar"
                                src={player.avatar}
                                alt={`${player.name} avatar`}
                                width="40"
                                height="40"
                                loading="lazy"
                                decoding="async"
                              />
                              <span class="global-leaderboard__name">{player.name}</span>
                            </span>
                          </td>
                          <td class="global-leaderboard__td global-leaderboard__td--team">
                            {player.teamTag !== '' ? `[${player.teamTag}]` : '—'}
                          </td>
                          <td class="global-leaderboard__td">
                            <time datetime={new Date(player.lastSeen * 1000).toISOString()}>
                              {formatRelativeTime(player.lastSeen)}
                            </time>
                          </td>
                          <td class="global-leaderboard__td global-leaderboard__td--numeric">
                            {NUMBER_FORMAT.format(player.pmcKills)}
                          </td>
                          <td class="global-leaderboard__td global-leaderboard__td--numeric">
                            {NUMBER_FORMAT.format(player.scavKills)}
                          </td>
                          <td class="global-leaderboard__td global-leaderboard__td--numeric">
                            {NUMBER_FORMAT.format(player.bossesKilled)}
                          </td>
                          <td class="global-leaderboard__td global-leaderboard__td--numeric">
                            {NUMBER_FORMAT.format(player.totalRaids)}
                          </td>
                          <td class="global-leaderboard__td global-leaderboard__td--numeric">
                            {NUMBER_FORMAT.format(player.survived)}
                          </td>
                          <td class="global-leaderboard__td global-leaderboard__td--numeric">
                            {PLAY_TIME_FORMAT.format(player.totalPlayTime / 3_600)} h
                          </td>
                          <td class="global-leaderboard__td global-leaderboard__td--numeric">
                            {NUMBER_FORMAT.format(player.totalProfit)} ₽
                          </td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </tbody>
              </table>
            </div>
          </Show>
        }
      >
        <div class="global-leaderboard__state" role="status">
          <p class="global-leaderboard__state-title">Failed to load the global leaderboard.</p>
          <p class="global-leaderboard__state-hint">Check your connection and try again.</p>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      </Show>
    </div>
  );
}

/** Loading skeleton shown while the player promise resolves (audit §7 LB3). */
function TableSkeleton() {
  return (
    <div class="global-leaderboard__skeleton" role="status">
      <span class="global-leaderboard__visually-hidden">Loading global leaderboard…</span>
      {Array.from({ length: SKELETON_ROWS }, () => (
        <div class="global-leaderboard__skeleton-row" aria-hidden="true">
          <span class="global-leaderboard__skeleton-bar global-leaderboard__skeleton-bar--rank" />
          <span class="global-leaderboard__skeleton-bar global-leaderboard__skeleton-bar--avatar" />
          <span class="global-leaderboard__skeleton-bar global-leaderboard__skeleton-bar--player" />
          <span class="global-leaderboard__skeleton-bar" />
          <span class="global-leaderboard__skeleton-bar" />
        </div>
      ))}
    </div>
  );
}

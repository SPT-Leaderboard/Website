/**
 * FRT-17 Weapon Meta island (legacy `meta/index.html` + `meta/js/main.js`).
 *
 * Weapon cards ranked by kills in a responsive grid with text search (debounced)
 * and cascading native selects (main category → subcategory → caliber). Every
 * card links to an analytics modal (shared Modal primitive) with attachment
 * pick rates and the weapon's top players. Values derive from the weapon
 * counters, category catalog, and attachment fixtures via `src/api/meta.ts`.
 * No chart.js here — the legacy page's charts are simple tokenized bars.
 *
 * Audit notes: all controls are native elements (keyboard operable without
 * script); filter/result changes are announced via role="status"; icon
 * placeholders and skeletons are tokenized; motion is disabled under
 * prefers-reduced-motion (meta.css).
 */
import { createAsyncResource } from "../../lib/createAsyncResource";
import { For, Show, createMemo, createResource, createSignal, onCleanup } from "solid-js";
import { Modal } from "../Modal";
import {
  ALL,
  type WeaponAttachments,
  type WeaponFilters,
  type WeaponStat,
  type WeaponTopPlayers,
  caliberOptions,
  communityFavorites,
  filterWeaponStats,
  getAttachmentMaxPickRates,
  getAttachments,
  getTopPlayers,
  getWeaponStats,
  headshotPercent,
  isEarlyGameCategory,
  isEndgameRank,
  killsPercent,
  shotsToKill,
  subCategoryOptions,
  timesLostRatio,
} from "../../api/meta";
import "./meta.css";

const nf = new Intl.NumberFormat("en-US");

interface MetaData {
  stats: WeaponStat[];
  /** templateId -> highest attachment pick rate, for the Community Favorite tag. */
  maxPickRates: Record<string, number>;
}

interface WeaponAnalytics {
  attachments: WeaponAttachments | null;
  topPlayers: WeaponTopPlayers;
}

// The fixtures never reject; this never-true flag exists to exercise the error
// branch during development (FRT-17 states).
const DEMO_ERROR = false;

/** Weapon icon from the tarkov.dev CDN with a tokenized placeholder box while
 * loading and on error (the CDN is allowed here; modded templateIds 404). */
function WeaponIcon(props: { templateId: string; name: string }) {
  const [status, setStatus] = createSignal<"loading" | "loaded" | "error">("loading");
  return (
    <span class="meta-card__icon-box" data-icon-status={status()}>
      <Show when={props.templateId && status() !== "error"}>
        <img
          class="meta-card__icon"
          src={`https://assets.tarkov.dev/${props.templateId}-512.webp`}
          alt={props.name}
          loading="lazy"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      </Show>
    </span>
  );
}

function WeaponCard(props: {
  stat: WeaponStat;
  rank: number;
  favorite: boolean;
  onAnalytics: (stat: WeaponStat) => void;
}) {
  const stat = () => props.stat;
  const earlyGame = () => isEarlyGameCategory(stat());
  const endgame = () => isEndgameRank(props.rank);
  const tagCount = () =>
    (earlyGame() ? 1 : 0) + (endgame() ? 1 : 0) + (props.favorite ? 1 : 0);

  return (
    <article class="meta-card">
      <header class="meta-card__header">
        <WeaponIcon templateId={stat().templateId} name={stat().name} />
        <div class="meta-card__titles">
          <h3 class="meta-card__name">{stat().name}</h3>
          <Show when={tagCount() > 0}>
            <p class="meta-card__tags">
              <Show when={earlyGame()}>
                <span class="meta-tag meta-tag--early">Early Game</span>
              </Show>
              <Show when={endgame()}>
                <span class="meta-tag meta-tag--endgame">Endgame</span>
              </Show>
              <Show when={props.favorite}>
                <span class="meta-tag meta-tag--favorite">Community Favorite</span>
              </Show>
            </p>
          </Show>
        </div>
        <span class="meta-card__rank">#{props.rank}</span>
      </header>

      <dl class="meta-card__stats">
        <div class="meta-card__stat">
          <dt>Kills</dt>
          <dd>
            {nf.format(stat().kills)}{" "}
            <span class="meta-card__stat-extra">
              ({killsPercent(stat().shots, stat().kills).toFixed(1)}%)
            </span>
          </dd>
        </div>
        <div class="meta-card__stat">
          <dt>Headshot rate</dt>
          <dd>{headshotPercent(stat().kills, stat().headshots).toFixed(1)}%</dd>
        </div>
        <div class="meta-card__stat">
          <dt>Avg shots to kill</dt>
          <dd>{shotsToKill(stat().kills, stat().shots).toFixed(2)}</dd>
        </div>
        <div class="meta-card__stat">
          <dt>Times-lost ratio</dt>
          <dd>{timesLostRatio(stat().kills, stat().timesLost).toFixed(1)}%</dd>
        </div>
        <div class="meta-card__stat">
          <dt>Users (avg level)</dt>
          <dd>
            {nf.format(stat().players)}{" "}
            <span class="meta-card__stat-extra">({stat().averageUserLevel})</span>
          </dd>
        </div>
      </dl>

      <footer class="meta-card__footer">
        <p class="meta-card__class">
          {stat().main} · {stat().sub} · {stat().caliber}
        </p>
        <button
          type="button"
          class="meta-card__analytics"
          onClick={() => props.onAnalytics(stat())}
        >
          See analytics
        </button>
      </footer>
    </article>
  );
}

export default function MetaExplorer() {
  const data = createAsyncResource(async () => {
    // getWeaponStats() already merges the category catalog (getCategories()).
    const [stats, maxPickRates] = await Promise.all([
      getWeaponStats(),
      getAttachmentMaxPickRates(),
    ]);
    return { stats, maxPickRates } satisfies MetaData;
  });

  // Text search: the input keeps every keystroke; the filter query updates debounced.
  const [searchInput, setSearchInput] = createSignal("");
  const [query, setQuery] = createSignal("");
  const [main, setMain] = createSignal(ALL);
  const [sub, setSub] = createSignal(ALL);
  const [caliber, setCaliber] = createSignal(ALL);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const onSearchInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    setSearchInput(value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => setQuery(value), 250);
  };
  onCleanup(() => clearTimeout(debounceTimer));

  const stats = createMemo(() => data.data()?.stats ?? []);
  const favorites = createMemo(() =>
    communityFavorites(stats(), data.data()?.maxPickRates ?? {}),
  );

  // Cascading selects mirror the legacy page: changing the main category
  // repopulates (and resets) sub and caliber; changing the sub resets caliber.
  const mainOptions = createMemo(() => {
    const mains = new Set<string>();
    for (const stat of stats()) mains.add(stat.main);
    return [...mains].sort((a, b) => a.localeCompare(b));
  });
  const subOptions = createMemo(() => subCategoryOptions(stats(), main()));
  const caliberChoices = createMemo(() => caliberOptions(stats(), main(), sub()));

  const onMainChange = (event: Event) => {
    setMain((event.currentTarget as HTMLSelectElement).value);
    setSub(ALL);
    setCaliber(ALL);
  };
  const filters = createMemo<WeaponFilters>(
    () => ({ query: query().trim(), main: main(), sub: sub(), caliber: caliber() }),
  );
  const visible = createMemo(() => filterWeaponStats(stats(), filters()));
  const rankOf = createMemo(() => {
    const ranks = new Map<string, number>();
    stats().forEach((stat, index) => ranks.set(stat.name, index + 1));
    return ranks;
  });

  const resetFilters = () => {
    setSearchInput("");
    setQuery("");
    setMain(ALL);
    setSub(ALL);
    setCaliber(ALL);
  };

  // Analytics modal: attachments + top players load per open weapon.
  const [selected, setSelected] = createSignal<WeaponStat | null>(null);
  const analytics = createAsyncResource(selected, (weapon: WeaponStat) =>
    Promise.all([getAttachments(weapon.templateId), getTopPlayers(weapon)]).then(
      ([attachments, topPlayers]): WeaponAnalytics => ({ attachments, topPlayers }),
    ),
  );
  const hasAttachments = (attachments: WeaponAttachments | null) =>
    Boolean(attachments && Object.keys(attachments).length > 0);

  const failed = () => DEMO_ERROR || Boolean(data.error);

  return (
    <section class="meta" aria-label="Weapon meta">
      <Show
        when={!failed()}
        fallback={
          <div class="meta-notice" role="alert">
            <p>Weapon stats could not be loaded.</p>
            <button type="button" class="meta-notice__retry" onClick={() => data.refetch()}>
              Try again
            </button>
          </div>
        }
      >
        <Show
          when={!data.loading}
          fallback={
            <div class="meta-skeleton" role="status">
              <span class="sr-only">Loading weapon stats…</span>
              <div class="meta-skeleton__grid" aria-hidden="true">
                <div class="meta-skeleton__card" />
                <div class="meta-skeleton__card" />
                <div class="meta-skeleton__card" />
                <div class="meta-skeleton__card" />
              </div>
            </div>
          }
        >
          <form class="meta-filters" onSubmit={(event) => event.preventDefault()}>
            <label class="meta-filters__field meta-filters__field--search">
              <span class="meta-filters__label">Search</span>
              <input
                type="search"
                value={searchInput()}
                onInput={onSearchInput}
                placeholder="Weapon name…"
              />
            </label>
            <label class="meta-filters__field">
              <span class="meta-filters__label">Main category</span>
              <select value={main()} data-active={main() !== ALL} onChange={onMainChange}>
                <option value={ALL}>All main categories</option>
                <For each={mainOptions()}>{(option) => <option value={option}>{option}</option>}</For>
              </select>
            </label>
            <label class="meta-filters__field">
              <span class="meta-filters__label">Subcategory</span>
              <select
                value={sub()}
                data-active={sub() !== ALL}
                onChange={(event) =>
                  setSub((event.currentTarget as HTMLSelectElement).value)
                }
                disabled={subOptions().length === 0}
              >
                <option value={ALL}>All subcategories</option>
                <For each={subOptions()}>{(option) => <option value={option}>{option}</option>}</For>
              </select>
            </label>
            <label class="meta-filters__field">
              <span class="meta-filters__label">Caliber</span>
              <select
                value={caliber()}
                data-active={caliber() !== ALL}
                onChange={(event) =>
                  setCaliber((event.currentTarget as HTMLSelectElement).value)
                }
                disabled={caliberChoices().length === 0}
              >
                <option value={ALL}>All calibers</option>
                <For each={caliberChoices()}>
                  {(option) => <option value={option}>{option}</option>}
                </For>
              </select>
            </label>
            <p class="meta-filters__count" role="status">
              Showing {nf.format(visible().length)} of {nf.format(stats().length)} weapons
            </p>
          </form>

          <Show
            when={visible().length > 0}
            fallback={
              <div class="meta-notice" role="status">
                <p>No weapons match the current filters.</p>
                <button type="button" class="meta-notice__retry" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            }
          >
            <div class="meta-grid">
              <For each={visible()}>
                {(stat) => (
                  <WeaponCard
                    stat={stat}
                    rank={rankOf().get(stat.name) ?? 0}
                    favorite={favorites().has(stat.templateId)}
                    onAnalytics={setSelected}
                  />
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>

      <Modal
        open={selected() !== null}
        onClose={() => setSelected(null)}
        title={selected()?.name ?? ""}
      >
        <Show when={selected()} keyed>
          {(weapon) => (
            <div class="meta-modal">
              <p class="meta-modal__class">
                {weapon.main} · {weapon.sub} · {weapon.caliber}
              </p>

              <section class="meta-modal__section" aria-label="Attachment pick rates">
                <h3 class="meta-modal__heading">Attachment pick rates</h3>
                <Show
                  when={analytics.data()}
                  keyed
                  fallback={<p class="meta-modal__note" role="status">Loading analytics…</p>}
                >
                  {(loaded) => (
                    <Show
                      when={hasAttachments(loaded.attachments)}
                      fallback={
                        <p class="meta-modal__note">No attachment data recorded for this weapon yet.</p>
                      }
                    >
                      <For each={Object.entries(loaded.attachments!)}>
                        {([category, items]) => (
                          <div class="meta-modal__category">
                            <h4 class="meta-modal__category-title">
                              {category}{" "}
                              <span class="meta-modal__category-count">({items.length})</span>
                            </h4>
                            <ul class="meta-modal__attachments">
                              <For each={items}>
                                {(item) => (
                                  <li class="meta-modal__attachment">
                                    <span class="meta-modal__attachment-name">{item.name}</span>
                                    <span
                                      class="meta-modal__attachment-bar"
                                      aria-hidden="true"
                                    >
                                      <span
                                        class="meta-modal__attachment-fill"
                                        style={{ width: `${Math.min(item.pickRate, 100)}%` }}
                                      />
                                    </span>
                                    <span class="meta-modal__attachment-rate">
                                      {item.pickRate.toFixed(1)}%
                                    </span>
                                  </li>
                                )}
                              </For>
                            </ul>
                          </div>
                        )}
                      </For>
                    </Show>
                  )}
                </Show>
              </section>

              <section class="meta-modal__section" aria-label="Top players">
                <h3 class="meta-modal__heading">Top players</h3>
                <Show
                  when={analytics.data()}
                  keyed
                  fallback={<p class="meta-modal__note" role="status">Loading analytics…</p>}
                >
                  {(loaded) => (
                    <Show
                      when={loaded.topPlayers.players.length > 0}
                      fallback={<p class="meta-modal__note">No player data available.</p>}
                    >
                      <Show when={loaded.topPlayers.simplified}>
                        <p class="meta-modal__note">
                          No stattrack records for this weapon — showing the leaderboard's top
                          players by total kills as a stand-in.
                        </p>
                      </Show>
                      <ol class="meta-modal__players">
                        <For each={loaded.topPlayers.players}>
                          {(player, index) => (
                            <li class="meta-modal__player">
                              <span class="meta-modal__player-rank">{index() + 1}.</span>
                              <span class="meta-modal__player-name">{player.name}</span>
                              <span class="meta-modal__player-level">Lvl {player.level}</span>
                              <span class="meta-modal__player-stats">
                                {nf.format(player.kills)} kills
                                <Show when={!loaded.topPlayers.simplified}>
                                  {" "}
                                  · {headshotPercent(player.kills, player.headshots).toFixed(1)}% HS
                                </Show>
                              </span>
                            </li>
                          )}
                        </For>
                      </ol>
                    </Show>
                  )}
                </Show>
              </section>
            </div>
          )}
        </Show>
      </Modal>
    </section>
  );
}

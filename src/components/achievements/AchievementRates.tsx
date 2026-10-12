/**
 * FRT-18 Achievement Rates island (legacy `achievements/index.html` +
 * `achievements/js/achievements.js`).
 *
 * Replaces the legacy failures called out by the port docs:
 * - web-standards-audit §8 ES1: the legacy page caught data-load errors with
 *   `console.error` only and spun its "Processing Achievements..." dots
 *   forever. Here loading, error, and empty are distinct states; the error
 *   branch renders only when a resolver rejects — with the current mock
 *   resolvers that flag is never true — and it always offers Retry.
 * - Legacy sorting (rarity descending, common/rare/legendary) becomes the
 *   canonical Common → Rare → Epic → Legendary order, then completion
 *   descending, via `sortAchievementRates` in `src/api/achievements.ts`.
 * - Rarity chips reuse existing theme tokens (muted/info/accent/warning),
 *   which are AA-checked on both surfaces in `styles/tokens.css` — no new
 *   colors (web-standards-audit §5 CC1/CC2).
 * - Icons keep meaningful alt text and load lazily (audit §6 MH4/MH6), and
 *   carry intrinsic dimensions (MH3).
 *
 * All values derive from `src/mocks/achievement-catalog.json` and the
 * `achievement-counters.json` snapshot via `src/api/achievements.ts`.
 */
import { createAsyncResource } from '../../lib/createAsyncResource';
import { For, Show, createMemo, createResource, createSignal } from "solid-js";
import {
  RARITY_ORDER,
  averageCompletion,
  getAchievementCatalog,
  getAchievementCounters,
  sortAchievementRates,
  withCompletionRates,
  type AchievementRarity,
  type AchievementRate,
} from "../../api/achievements";
import "./achievements.css";

const nf = new Intl.NumberFormat("en-US");

type RarityFilter = AchievementRarity | "All";

/** "at least X percent" filter granularity: 5 percentage points per step. */
const MIN_PERCENT_STEP = 5;

/** One achievement card: icon, name, description, rarity, completion. */
function AchievementCard(props: { entry: AchievementRate }) {
  const entry = () => props.entry;
  return (
    // Dossier §Achievements: rarity is double-encoded — chip + inline card
    // border tint (same hue, tokenized via the chip's data-rarity rules).
    <article class="achievements-card" data-rarity={entry().rarity.toLowerCase()}>
      <header class="achievements-card__header">
        <img
          class="achievements-card__icon"
          src={entry().imageUrl}
          alt={`${entry().name} achievement icon`}
          width="48"
          height="48"
          loading="lazy"
          decoding="async"
        />
        <h3 class="achievements-card__title">{entry().name}</h3>
      </header>
      <p class="achievements-card__description">{entry().description}</p>
      <div class="achievements-card__progress">
        <div class="achievements-card__progress-label">
          <span>Completion</span>
          <span class="achievements-card__percent">{entry().percent.toFixed(2)}%</span>
        </div>
        {/* Decorative bar; the adjacent percent text carries the value for AT (audit MH5). */}
        <div class="achievements-card__progress-track" aria-hidden="true">
          <div class="achievements-card__progress-fill" style={{ width: `${entry().percent}%` }} />
        </div>
        <p class="achievements-card__holders">{nf.format(entry().holders)} players</p>
      </div>
      <p class="achievements-card__meta">
        <span class="achievements-card__rarity" data-rarity={entry().rarity.toLowerCase()}>
          {entry().rarity}
        </span>
      </p>
    </article>
  );
}

export default function AchievementRates() {
  const catalog = createAsyncResource(getAchievementCatalog);
  const counters = createAsyncResource(getAchievementCounters);
  const [rarity, setRarity] = createSignal<RarityFilter>("All");
  const [minPercent, setMinPercent] = createSignal(0);

  const loading = () => catalog.loading || counters.loading;
  // Audit ES1: never true with the mock resolvers, but this is the branch a
  // real client's failures land on — an error state with Retry, never an
  // infinite loader.
  const failed = () => Boolean(catalog.error) || Boolean(counters.error);

  const rates = createMemo(() => {
    const entries = catalog.data();
    const snapshot = counters.data();
    if (!entries || !snapshot) return null;
    return withCompletionRates(entries, snapshot);
  });

  const sorted = createMemo(() => {
    const all = rates();
    return all ? sortAchievementRates(all) : [];
  });

  // One filter button per rarity that actually occurs in the catalog,
  // in canonical Common → Legendary order.
  const presentRarities = createMemo(() => {
    const all = rates();
    if (!all) return [] as AchievementRarity[];
    return RARITY_ORDER.filter((option) => all.some((entry) => entry.rarity === option));
  });

  const visible = createMemo(() => {
    const currentRarity = rarity();
    const floor = minPercent();
    return sorted().filter(
      (entry) =>
        (currentRarity === "All" || entry.rarity === currentRarity) && entry.percent >= floor,
    );
  });

  const average = createMemo(() => {
    const all = rates();
    return all ? averageCompletion(all.map((entry) => entry.percent)) : 0;
  });

  function resetFilters() {
    setRarity("All");
    setMinPercent(0);
  }

  return (
    <section class="achievements" aria-label="Achievement rates">
      <Show
        when={!failed()}
        fallback={
          <div class="achievements-notice" role="alert">
            <p>Achievement data could not be loaded.</p>
            <button
              type="button"
              class="achievements-notice__retry"
              onClick={() => {
                catalog.refetch();
                counters.refetch();
              }}
            >
              Try again
            </button>
          </div>
        }
      >
        <Show
          when={!loading()}
          fallback={
            <div class="achievements-skeleton" role="status">
              <span class="sr-only">Loading achievement rates…</span>
              <div class="achievements-skeleton__block achievements-skeleton__block--summary" aria-hidden="true" />
              <div class="achievements-skeleton__block achievements-skeleton__block--filters" aria-hidden="true" />
              <div class="achievements-skeleton__row" aria-hidden="true">
                <div class="achievements-skeleton__block achievements-skeleton__block--card" />
                <div class="achievements-skeleton__block achievements-skeleton__block--card" />
                <div class="achievements-skeleton__block achievements-skeleton__block--card" />
              </div>
            </div>
          }
        >
          <section class="achievements-summary" aria-label="Catalog summary">
            <h2 class="achievements-heading">Catalog summary</h2>
            <dl class="achievements-summary__grid">
              <div class="achievements-summary__item">
                <dt>Total achievements</dt>
                <dd>{nf.format(sorted().length)}</dd>
              </div>
              <div class="achievements-summary__item">
                <dt>Average completion</dt>
                <dd>{average().toFixed(2)}%</dd>
              </div>
            </dl>
          </section>

          <div class="achievements-filters" role="group" aria-label="Filter achievements">
            <div class="achievements-filters__rarity" role="group" aria-label="Rarity">
              <For each={["All" as RarityFilter, ...presentRarities()]}>
                {(option) => (
                  <button
                    type="button"
                    class="achievements-filter"
                    aria-pressed={rarity() === option}
                    onClick={() => setRarity(option)}
                  >
                    {option}
                  </button>
                )}
              </For>
            </div>
            <div class="achievements-filters__completion">
              <label class="achievements-filters__label" for="achievement-min-completion">
                Minimum completion
              </label>
              <input
                id="achievement-min-completion"
                class="achievements-filters__slider"
                type="range"
                min="0"
                max="100"
                step={MIN_PERCENT_STEP}
                value={minPercent()}
                onInput={(event) => setMinPercent(event.currentTarget.valueAsNumber)}
              />
              <output class="achievements-filters__value" for="achievement-min-completion">
                at least {minPercent()}%
              </output>
            </div>
          </div>

          <Show
            when={visible().length > 0}
            fallback={
              <div class="achievements-notice" role="status">
                <p>No achievements match the current filters.</p>
                <button type="button" class="achievements-notice__retry" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            }
          >
            <div class="achievements-grid">
              <For each={visible()}>{(entry) => <AchievementCard entry={entry} />}</For>
            </div>
          </Show>
        </Show>
      </Show>
    </section>
  );
}

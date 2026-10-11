/**
 * FRT-16 Global Insights island (legacy `insights/index.html` + `insights/js/main.js`).
 *
 * Replaces the legacy fake tabs (web-standards-audit §1 DS7) with real tabs, and the
 * visual-only charts (§6 MH5) with `role="img"` + `aria-label` canvases plus a text
 * summary line per chart. Random chart colors (§5 CC3) are replaced by the fixed
 * tokenized palette in `insights.css`. All values derive from the season archives
 * and global counters fixtures via `src/api/insights.ts`.
 */
import Chart from "chart.js/auto";
import { For, Show, createMemo, createResource, createSignal, onCleanup, onMount } from "solid-js";
import { getGlobalCounters, getSeasonArchives, type SeasonArchive } from "../../api/insights";
import type { GlobalCounters, PlayerEntry } from "../../api/types";
import "./insights.css";

const nf = new Intl.NumberFormat("en-US");
const pf = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

/** One prepared chart: data plus the non-visual text that must ship with it. */
interface ChartSpec {
  id: string;
  type: "pie" | "bar";
  labels: string[];
  values: number[];
  /** Unit named in the summary line ("raids", "players", …). */
  unit: string;
  datasetLabel: string;
  /** What the chart shows; becomes the canvas `aria-label` (audit MH5). */
  ariaLabel: string;
  /** Top category and its share, so the data is never visual-only (audit MH5). */
  summary: string;
}

interface SummaryStat {
  label: string;
  value: string;
}

interface InsightReport {
  summary: SummaryStat[];
  general: ChartSpec[];
  maps: ChartSpec[];
}

/** Fixed chart palette (§5 CC3: no random colors) — token names from insights.css. */
const CHART_TOKENS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
] as const;

/** Legacy 13-map allowlist (insights/js/main.js validMapIds) with exact-key friendly names. */
const MAP_LABELS: Record<string, string> = {
  factory4_day: "Factory",
  factory4_night: "Night Factory",
  bigmap: "Customs",
  Woods: "Woods",
  Shoreline: "Shoreline",
  Interchange: "Interchange",
  RezervBase: "Reserve",
  Lighthouse: "Lighthouse",
  TarkovStreets: "Streets of Tarkov",
  laboratory: "Labs",
  Sandbox: "Ground Zero – Low",
  Sandbox_high: "Ground Zero – High",
  Labyrinth: "The Labyrinth",
};

/** "Top category — X% (N of M unit)." */
function summarize(labels: string[], values: number[], unit: string): string {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (values.length === 0 || total === 0) return "No data recorded yet.";
  let top = 0;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > values[top]) top = i;
  }
  return `Top: ${labels[top]} — ${pf.format(values[top] / total)} (${nf.format(values[top])} of ${nf.format(total)} ${unit}).`;
}

/** Legacy inclusive-upper buckets: value ≤ edges[i] lands in bucket i. */
function bucketCounts(players: PlayerEntry[], pick: (player: PlayerEntry) => number, edges: number[]): number[] {
  const counts = new Array<number>(edges.length + 1).fill(0);
  for (const player of players) {
    const value = pick(player);
    let index = 0;
    while (index < edges.length && value > edges[index]) index += 1;
    counts[index] += 1;
  }
  return counts;
}

/** Legacy total play time format (days/hours/minutes from seconds). */
function formatPlayTime(totalSeconds: number): string {
  if (!totalSeconds) return "0 min";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${nf.format(days)}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}min`);
  return parts.join(" ");
}

/** Aggregates every archived season into the summary card and chart specs. */
function buildReport(archives: SeasonArchive[], counters: GlobalCounters): InsightReport {
  const players: PlayerEntry[] = archives.flatMap((archive) => archive.data.leaderboard);

  // Legacy summary card (insights/js/main.js processPlayersData). "Raids recorded"
  // deliberately uses counters.total_raids instead of the legacy formula
  // (player PMC + SCAV sums + total_raids), which double-counted the same raids.
  const totalPmcRaids = players.reduce((sum, player) => sum + (player.pmcRaids || 0), 0);
  const totalScavRaids = players.reduce((sum, player) => sum + (player.scavRaids || 0), 0);
  const totalKills = players.reduce(
    (sum, player) => sum + (player.pmcKills || 0) + (player.bossesKilled || 0) + (player.scavsKilled || 0),
    0,
  );
  const totalDeaths = players.reduce(
    (sum, player) => sum + (player.pmcDeaths || 0) + (player.scavDeaths || 0),
    0,
  );
  const kappaPlayers = players.filter((player) => player.hasKappa).length;
  const avgLevel = players.length > 0
    ? players.reduce((sum, player) => sum + player.pmcLevel, 0) / players.length
    : 0;

  const summary: SummaryStat[] = [
    { label: "Archived seasons", value: archives.map((archive) => archive.label).join(", ") },
    { label: "Players", value: nf.format(players.length) },
    { label: "Raids recorded", value: nf.format(counters.total_raids) },
    { label: "Total play time", value: formatPlayTime(counters.total_playtime) },
    { label: "Total damage", value: nf.format(counters.total_damage) },
    { label: "Global K/D", value: (totalKills / Math.max(totalDeaths, 1)).toFixed(2) },
    { label: "Avg PMC level", value: avgLevel.toFixed(1) },
    {
      label: "Kappa",
      value:
        players.length > 0
          ? `${nf.format(kappaPlayers)} (${pf.format(kappaPlayers / players.length)})`
          : "0",
    },
  ];

  const raidSplit: ChartSpec = {
    id: "raid-split",
    type: "pie",
    labels: ["PMC", "SCAV"],
    values: [totalPmcRaids, totalScavRaids],
    unit: "raids",
    datasetLabel: "Raids",
    ariaLabel: "Pie chart of PMC versus SCAV raid counts across all archived seasons.",
    summary: summarize(["PMC", "SCAV"], [totalPmcRaids, totalScavRaids], "raids"),
  };

  const survivalLabels = ["0–20%", "21–40%", "41–60%", "61–80%", "81–100%"];
  const survivalValues = bucketCounts(players, (player) => player.survivalRate, [20, 40, 60, 80]);
  const survivalSpec: ChartSpec = {
    id: "survival-buckets",
    type: "bar",
    labels: survivalLabels,
    values: survivalValues,
    unit: "players",
    datasetLabel: "Players",
    ariaLabel: "Bar chart of player counts by survival rate bucket, from 0–20% to 81–100%.",
    summary: summarize(survivalLabels, survivalValues, "players"),
  };

  const kdLabels = ["0–1", "1–5", "5–10", "10–20", "20+"];
  const kdValues = bucketCounts(players, (player) => player.killToDeathRatio, [1, 5, 10, 20]);
  const kdSpec: ChartSpec = {
    id: "kd-buckets",
    type: "bar",
    labels: kdLabels,
    values: kdValues,
    unit: "players",
    datasetLabel: "Players",
    ariaLabel: "Bar chart of player counts by kill/death ratio bucket, from 0–1 to 20+.",
    summary: summarize(kdLabels, kdValues, "players"),
  };

  const levelLabels = ["1–10", "11–20", "21–30", "31–40", "41–50", "51+"];
  const levelValues = bucketCounts(players, (player) => player.pmcLevel, [10, 20, 30, 40, 50]);
  const levelSpec: ChartSpec = {
    id: "level-buckets",
    type: "bar",
    labels: levelLabels,
    values: levelValues,
    unit: "players",
    datasetLabel: "Players",
    ariaLabel: "Bar chart of player counts by PMC level bucket, from level 1–10 to 51+.",
    summary: summarize(levelLabels, levelValues, "players"),
  };

  // Prestige levels are not a fixed set in the data (snapshot has 0, 1, 2, 6),
  // so labels derive from the values instead of the legacy hardcoded trio.
  const prestigeCounts = new Map<number, number>();
  for (const player of players) {
    const level = player.prestige ?? 0;
    prestigeCounts.set(level, (prestigeCounts.get(level) ?? 0) + 1);
  }
  const prestigeSorted = [...prestigeCounts.entries()].sort((a, b) => a[0] - b[0]);
  const prestigeLabels = prestigeSorted.map(([level]) => (level === 0 ? "No Prestige" : `Prestige ${level}`));
  const prestigeValues = prestigeSorted.map(([, count]) => count);
  const prestigeSpec: ChartSpec = {
    id: "prestige",
    type: "bar",
    labels: prestigeLabels,
    values: prestigeValues,
    unit: "players",
    datasetLabel: "Players",
    ariaLabel: "Bar chart of player counts by prestige level.",
    summary: summarize(prestigeLabels, prestigeValues, "players"),
  };

  const mapEntries = Object.entries(MAP_LABELS)
    .map(([id, label]) => ({ label, count: counters[id] ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const mapLabels = mapEntries.map((entry) => entry.label);
  const mapValues = mapEntries.map((entry) => entry.count);
  const mapSpec: ChartSpec = {
    id: "map-popularity",
    type: "bar",
    labels: mapLabels,
    values: mapValues,
    unit: "raids on tracked maps",
    datasetLabel: "Raids",
    ariaLabel: "Bar chart of recorded raids per map, sorted from most to least popular.",
    summary: summarize(mapLabels, mapValues, "raids on tracked maps"),
  };

  return {
    summary,
    general: [raidSplit, survivalSpec, kdSpec, levelSpec, prestigeSpec],
    maps: [mapSpec],
  };
}

/** One chart card: canvas with role="img" + aria-label, plus the text summary line. */
function ChartCard(props: { spec: ChartSpec }) {
  let canvas: HTMLCanvasElement | undefined;
  let chart: Chart | undefined;

  onMount(() => {
    if (!canvas) return;
    const styles = getComputedStyle(document.documentElement);
    const palette = CHART_TOKENS.map((token) => styles.getPropertyValue(token).trim());
    const accent = styles.getPropertyValue("--color-accent").trim();
    const muted = styles.getPropertyValue("--color-text-muted").trim();
    const border = styles.getPropertyValue("--color-border").trim();
    // Respect prefers-reduced-motion: no chart animations when the user asked for less motion.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    Chart.defaults.font.family = "system-ui, sans-serif";
    Chart.defaults.color = muted;

    chart = new Chart(canvas, {
      type: props.spec.type,
      data: {
        labels: props.spec.labels,
        datasets: [
          {
            label: props.spec.datasetLabel,
            data: props.spec.values,
            backgroundColor:
              props.spec.type === "pie"
                ? props.spec.labels.map((_, index) => palette[index % palette.length])
                : accent,
            borderColor: border,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion ? false : undefined,
        plugins: {
          legend: { display: props.spec.type === "pie", position: "bottom" },
        },
        scales:
          props.spec.type === "bar"
            ? {
                x: { ticks: { color: muted }, grid: { color: border } },
                y: { beginAtZero: true, ticks: { color: muted, precision: 0 }, grid: { color: border } },
              }
            : undefined,
      },
    });
  });

  onCleanup(() => chart?.destroy());

  return (
    <figure class="chart-card">
      <div class="chart-card__plot">
        <canvas ref={canvas} role="img" aria-label={props.spec.ariaLabel} />
      </div>
      <figcaption class="chart-card__summary">{props.spec.summary}</figcaption>
    </figure>
  );
}

const TAB_IDS = ["general", "maps"] as const;
type TabId = (typeof TAB_IDS)[number];
const TAB_LABELS: Record<TabId, string> = { general: "General", maps: "Maps" };

export default function InsightsCharts() {
  const [archives, archiveActions] = createResource(getSeasonArchives);
  const [counters, counterActions] = createResource(getGlobalCounters);
  const [activeTab, setActiveTab] = createSignal<TabId>("general");
  let tabRefs: HTMLButtonElement[] = [];

  const loading = () => archives.loading || counters.loading;
  const failed = () => Boolean(archives.error) || Boolean(counters.error);
  const empty = () => (archives()?.length ?? 1) === 0;
  const report = createMemo(() => {
    const archivedSeasons = archives();
    const globalCounters = counters();
    if (!archivedSeasons || !globalCounters) return null;
    return buildReport(archivedSeasons, globalCounters);
  });

  // Real tabs (DS7): roving tabindex, selection follows arrow keys, Home/End supported.
  function onTabKeyDown(event: KeyboardEvent, index: number) {
    const last = TAB_IDS.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    setActiveTab(TAB_IDS[next]);
    tabRefs[next]?.focus();
  }

  return (
    <section class="insights" aria-label="Global insights data">
      <Show
        when={!failed()}
        fallback={
          <div class="insights-notice" role="alert">
            <p>Global insights could not be loaded.</p>
            <button
              type="button"
              class="insights-notice__retry"
              onClick={() => {
                archiveActions.refetch();
                counterActions.refetch();
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
            <div class="insights-skeleton" role="status">
              <span class="sr-only">Loading global insights…</span>
              <div class="insights-skeleton__block insights-skeleton__block--summary" aria-hidden="true" />
              <div class="insights-skeleton__row" aria-hidden="true">
                <div class="insights-skeleton__block insights-skeleton__block--chart" />
                <div class="insights-skeleton__block insights-skeleton__block--chart" />
              </div>
            </div>
          }
        >
          <Show
            when={!empty()}
            fallback={
              <div class="insights-notice" role="status">
                <p>No season archives are available yet. Statistics appear once the first season snapshot is added.</p>
              </div>
            }
          >
            <Show when={report()} keyed>
              {(data) => (
                <>
                  <section class="insights-summary" aria-label="All-time totals">
                    <h2 class="insights-heading">All-time totals</h2>
                    <dl class="insights-summary__grid">
                      <For each={data.summary}>
                        {(stat) => (
                          <div class="insights-summary__item">
                            <dt>{stat.label}</dt>
                            <dd>{stat.value}</dd>
                          </div>
                        )}
                      </For>
                    </dl>
                  </section>

                  <div class="insights-tablist" role="tablist" aria-label="Insights views">
                    {TAB_IDS.map((id, index) => (
                      <button
                        type="button"
                        role="tab"
                        id={`insights-tab-${id}`}
                        class="insights-tab"
                        aria-selected={activeTab() === id}
                        aria-controls={`insights-panel-${id}`}
                        tabindex={activeTab() === id ? 0 : -1}
                        ref={(el) => {
                          tabRefs[index] = el;
                        }}
                        onClick={() => setActiveTab(id)}
                        onKeyDown={(event) => onTabKeyDown(event, index)}
                      >
                        {TAB_LABELS[id]}
                      </button>
                    ))}
                  </div>

                  <div
                    role="tabpanel"
                    id="insights-panel-general"
                    aria-labelledby="insights-tab-general"
                    class="insights-panel"
                    hidden={activeTab() !== "general"}
                  >
                    <div class="insights-charts">
                      <For each={data.general}>{(spec) => <ChartCard spec={spec} />}</For>
                    </div>
                  </div>

                  <div
                    role="tabpanel"
                    id="insights-panel-maps"
                    aria-labelledby="insights-tab-maps"
                    class="insights-panel"
                    hidden={activeTab() !== "maps"}
                  >
                    <div class="insights-charts">
                      <For each={data.maps}>{(spec) => <ChartCard spec={spec} />}</For>
                    </div>
                  </div>
                </>
              )}
            </Show>
          </Show>
        </Show>
      </Show>
    </section>
  );
}

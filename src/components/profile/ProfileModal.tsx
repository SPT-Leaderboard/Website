/**
 * FRT-13 player profile modal island — rebuild of the legacy
 * `js/user-profiles.js` modal + `js/user-share.js` deep links
 * (docs/port/feature-inventory.md), scoped to the FRT-13 tab set:
 * Summary / Raids / Equipment / Comments. The body-hit SVG visualization
 * is out of scope (FRT-13 contract).
 *
 * Route-driven state (ux-audit §4): `#id=<permaLink>` opens the modal,
 * Back closes it and Forward reopens (the opener pushes the hash —
 * location.hash assignment from the leaderboard row button is the
 * pushState), closing strips the hash with history.replaceState so no
 * extra entry is left behind (legacy closeProfile behavior).
 * Data comes from src/api/profile.ts fixtures; the Summary header stats
 * resolve the season entry via getCurrentSeason().
 */
import { For, Show, createResource, createSignal, onCleanup, onMount } from "solid-js";
import { Modal } from "../Modal";
import { showToast } from "../Toast";
import { playerKills } from "../../api/leaderboard";
import {
  getComments,
  getCustomization,
  getEquipment,
  getProfilePlayer,
  getRaids,
  paginateComments,
  parseProfileHash,
  sortRaidsNewestFirst,
  type ProfileCustomization,
} from "../../api/profile";
import type {
  Equipment,
  EquipmentItem,
  EquipmentSlot,
  PlayerComment,
  PlayerEntry,
  RaidRecord,
} from "../../api/types";
import "./profile-modal.css";

const nf = new Intl.NumberFormat("en-US");
const scoreFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const rateFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

/** Profile tabs in display order (legacy Summary/Records split into four steps). */
const TAB_IDS = ["summary", "raids", "equipment", "comments"] as const;
type ProfileTab = (typeof TAB_IDS)[number];
const TAB_LABELS: Record<ProfileTab, string> = {
  summary: "Summary",
  raids: "Raids",
  equipment: "Equipment",
  comments: "Comments",
};

/**
 * Standing badges shown in the player header — duplicated small from the
 * leaderboard island's private BADGES list (not exported; FRT-13 scope).
 */
const PROFILE_BADGES = [
  { key: "suspicious", label: "Suspicious", tone: "warning" },
  { key: "isPremium", label: "Premium", tone: "accent" },
  { key: "isHardcore", label: "Hardcore", tone: "info" },
  { key: "isCasual", label: "Casual", tone: "muted" },
] as const;

/** The 10 equipment slots in display order (legacy PlayerEquipmentDisplay). */
const EQUIPMENT_SLOTS: { key: EquipmentSlot; label: string }[] = [
  { key: "Headwear", label: "Headwear" },
  { key: "Earpiece", label: "Headset" },
  { key: "FaceCover", label: "Face cover" },
  { key: "Eyewear", label: "Eyewear" },
  { key: "ArmorVest", label: "Body armor" },
  { key: "TacticalVest", label: "Tactical vest" },
  { key: "Backpack", label: "Backpack" },
  { key: "FirstPrimaryWeapon", label: "Primary weapon" },
  { key: "SecondPrimaryWeapon", label: "Secondary weapon" },
  { key: "Holster", label: "Holster" },
];

interface ProfileData {
  player: PlayerEntry | null;
  customization: ProfileCustomization;
  raids: RaidRecord[];
  equipment: Equipment;
  comments: PlayerComment[];
}

async function loadProfile(permaLink: string): Promise<ProfileData> {
  const [player, customization, raids, equipment, comments] = await Promise.all([
    getProfilePlayer(permaLink),
    getCustomization(),
    getRaids(permaLink),
    getEquipment(permaLink),
    getComments(permaLink),
  ]);
  return { player, customization, raids: sortRaidsNewestFirst(raids), equipment, comments };
}

/** Seconds → "21m 37s" (legacy formatSeconds shape, hours capped raid length). */
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`, `${seconds}s`);
  return parts.join(" ");
}

/** Seconds → "16d 8h 51min" (legacy formatPlayTime shape). */
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

/** Display label for a raid result; raidResult is free text in the snapshot. */
function raidStatusLabel(raid: RaidRecord): string {
  if (raid.raidResult !== "") return raid.raidResult;
  return raid.lastRaidSurvived === 1 ? "Survived" : "Killed";
}

function raidStatusTone(raid: RaidRecord): "success" | "error" | "muted" {
  const label = raidStatusLabel(raid).toLowerCase();
  if (label.includes("surviv")) return "success";
  if (label.includes("kill") || label.includes("death")) return "error";
  return "muted";
}

export default function ProfileModal() {
  const [permaLink, setPermaLink] = createSignal<string | undefined>(undefined);
  const [profile] = createResource(permaLink, loadProfile);

  // Single source of truth: the URL. pushState/replaceState don't fire these
  // events, so close() updates the signal directly; every other transition
  // (deep link, Back/Forward, row activation) goes through the listeners.
  const syncFromLocation = () =>
    setPermaLink(parseProfileHash(window.location.hash) ?? undefined);

  onMount(() => {
    syncFromLocation(); // deep link on first paint (user-share.js checkUrlHash)
    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);
  });

  onCleanup(() => {
    // SSR build renders the island and then disposes it — no window there.
    if (typeof window === "undefined") return;
    window.removeEventListener("hashchange", syncFromLocation);
    window.removeEventListener("popstate", syncFromLocation);
  });

  /** Legacy closeProfile: strip the hash without adding a history entry. */
  const close = () => {
    history.replaceState(history.state, "", window.location.pathname + window.location.search);
    setPermaLink(undefined);
  };

  const modalTitle = () => profile.latest?.player?.name ?? "Player profile";

  return (
    <Modal open={permaLink() !== undefined} onClose={close} title={modalTitle()}>
      <Show when={permaLink()}>
        <Show
          when={!profile.error}
          fallback={
            <p class="profile-state" role="alert">
              Failed to load this profile. Close it and try again.
            </p>
          }
        >
          <Show
            when={profile()}
            keyed
            fallback={
              <p class="profile-state" role="status">
                Loading profile…
              </p>
            }
          >
            {(data) => (
              <Show
                when={data.player}
                keyed
                fallback={
                  <p class="profile-state">
                    This player is not on the current season leaderboard, so there is no
                    profile to show.
                  </p>
                }
              >
                {(player) => <ProfileTabs player={player} data={data} />}
              </Show>
            )}
          </Show>
        </Show>
      </Show>
    </Modal>
  );
}

/** Modal body: player header, then the four tab panels. Remounts per open,
    so tab/comment-page state resets naturally. */
function ProfileTabs(props: { player: PlayerEntry; data: ProfileData }) {
  const [activeTab, setActiveTab] = createSignal<ProfileTab>("summary");
  const tabRefs: (HTMLButtonElement | undefined)[] = [];

  // Real tabs (DS7): roving tabindex, selection follows arrow keys, Home/End.
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
    <div class="profile">
      <p class="profile-header-line">
        <Show when={props.player.teamTag}>
          <span class="profile-teamtag">[{props.player.teamTag}]</span>
        </Show>
        <span>Level {nf.format(props.player.pmcLevel)}</span>
        <span>Score {scoreFormat.format(props.player.totalScore)}</span>
        <Show when={props.player.banned}>
          <span class="profile-badge profile-badge--error">BANNED</span>
        </Show>
        {PROFILE_BADGES.map((badge) => (
          <Show when={props.player[badge.key]}>
            <span class={`profile-badge profile-badge--${badge.tone}`}>{badge.label}</span>
          </Show>
        ))}
      </p>

      <div class="profile-tablist" role="tablist" aria-label="Profile sections">
        {TAB_IDS.map((id, index) => (
          <button
            type="button"
            role="tab"
            id={`profile-tab-${id}`}
            class="profile-tab"
            aria-selected={activeTab() === id}
            aria-controls={`profile-panel-${id}`}
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
        id="profile-panel-summary"
        aria-labelledby="profile-tab-summary"
        class="profile-panel"
        hidden={activeTab() !== "summary"}
      >
        <SummaryTab player={props.player} customization={props.data.customization} />
      </div>

      <div
        role="tabpanel"
        id="profile-panel-raids"
        aria-labelledby="profile-tab-raids"
        class="profile-panel"
        hidden={activeTab() !== "raids"}
      >
        <RaidsTab raids={props.data.raids} />
      </div>

      <div
        role="tabpanel"
        id="profile-panel-equipment"
        aria-labelledby="profile-tab-equipment"
        class="profile-panel"
        hidden={activeTab() !== "equipment"}
      >
        <EquipmentTab equipment={props.data.equipment} />
      </div>

      <div
        role="tabpanel"
        id="profile-panel-comments"
        aria-labelledby="profile-tab-comments"
        class="profile-panel"
        hidden={activeTab() !== "comments"}
      >
        <CommentsTab comments={props.data.comments} />
      </div>
    </div>
  );
}

function SummaryTab(props: { player: PlayerEntry; customization: ProfileCustomization }) {
  const player = props.player;
  const stats = [
    { label: "K/D", value: scoreFormat.format(player.killToDeathRatio) },
    { label: "Survival rate", value: `${rateFormat.format(player.survivalRate)}%` },
    { label: "Raids", value: nf.format(player.totalRaids) },
    { label: "Kills", value: nf.format(playerKills(player)) },
    { label: "Playtime", value: formatPlayTime(player.totalPlayTime) },
    { label: "Profit", value: moneyFormat.format(player.totalProfit) },
  ];
  return (
    <div>
      <dl class="profile-stats">
        {stats.map((stat) => (
          <div class="profile-stat">
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>
      <Show when={props.customization.about_me !== ""}>
        <p class="profile-about">{props.customization.about_me}</p>
      </Show>
      <Show when={props.customization.discordUser !== ""}>
        <p class="profile-discord">Discord: {props.customization.discordUser}</p>
      </Show>
    </div>
  );
}

function RaidsTab(props: { raids: RaidRecord[] }) {
  return (
    <Show
      when={props.raids.length > 0}
      fallback={<p class="profile-state">No raids recorded for this player yet.</p>}
    >
      <ul class="profile-raid-list">
        <For each={props.raids}>
          {(raid) => (
            <li class="profile-raid">
              <div class="profile-raid-top">
                <span class="profile-raid-map">{raid.lastRaidMap}</span>
                <span class={`profile-raid-status profile-raid-status--${raidStatusTone(raid)}`}>
                  {raidStatusLabel(raid)}
                </span>
              </div>
              <dl class="profile-raid-facts">
                <div>
                  <dt>Kills</dt>
                  <dd>{nf.format(raid.raidKills)}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{formatDuration(raid.raidTime)}</dd>
                </div>
                <div>
                  <dt>Profit</dt>
                  <dd>{moneyFormat.format(raid.lastRaidProfit)}</dd>
                </div>
              </dl>
            </li>
          )}
        </For>
      </ul>
    </Show>
  );
}

function EquipmentTab(props: { equipment: Equipment }) {
  return (
    <ul class="profile-slots">
      {EQUIPMENT_SLOTS.map(({ key, label }) => {
        const items = props.equipment[key] ?? [];
        const primary: EquipmentItem | undefined = items[0];
        return (
          <li class="profile-slot">
            <p class="profile-slot-name">{label}</p>
            <Show
              when={primary}
              keyed
              fallback={<p class="profile-slot-empty">Empty</p>}
            >
              {(item) => (
                <div class="profile-slot-item">
                  {/* Icons would need the legacy CDN; the placeholder box is the
                      tokenized stand-in (FRT-13: no external CDN calls). */}
                  <span class="profile-slot-icon" aria-hidden="true">
                    {item.shortName}
                  </span>
                  <div>
                    <p class="profile-item-name">{item.name}</p>
                    <Show when={items.length > 1}>
                      <p class="profile-slot-extra">
                        +{nf.format(items.length - 1)} attached parts
                      </p>
                    </Show>
                  </div>
                </div>
              )}
            </Show>
          </li>
        );
      })}
    </ul>
  );
}

function CommentsTab(props: { comments: PlayerComment[] }) {
  const [page, setPage] = createSignal(1);
  const [draft, setDraft] = createSignal("");
  const current = () => paginateComments(props.comments, page());

  // Mock mode: the legacy send_comment.php endpoint has no new-API
  // counterpart yet, so the form deliberately calls nothing (FRT-13 contract).
  const submitComment = (event: SubmitEvent) => {
    event.preventDefault();
    if (draft().trim() === "") return;
    showToast("Mock mode — comments are not sent yet.", "info");
    setDraft("");
  };

  return (
    <div class="profile-comments">
      <Show
        when={props.comments.length > 0}
        fallback={<p class="profile-state">No comments on this profile yet.</p>}
      >
        <ul class="profile-comment-list">
          <For each={current().items}>
            {(comment) => (
              <li class="profile-comment">
                <span class="profile-comment-avatar" aria-hidden="true">
                  {comment.author.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p class="profile-comment-meta">
                    <span class="profile-comment-author">{comment.author}</span>
                    <time datetime={new Date(comment.timestamp * 1000).toISOString()}>
                      {dateFormat.format(comment.timestamp * 1000)}
                    </time>
                  </p>
                  <p class="profile-comment-text">{comment.text}</p>
                </div>
              </li>
            )}
          </For>
        </ul>
        <Show when={current().pageCount > 1}>
          <nav class="profile-pagination" aria-label="Comment pages">
            {Array.from({ length: current().pageCount }, (_, index) => index + 1).map((n) => (
              <button
                type="button"
                class="profile-page"
                aria-current={current().page === n ? "page" : undefined}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
          </nav>
        </Show>
      </Show>
      <form class="profile-comment-form" onSubmit={submitComment}>
        <label for="profile-comment-text">Add a comment</label>
        <textarea
          id="profile-comment-text"
          rows={3}
          value={draft()}
          onInput={(event) => setDraft(event.currentTarget.value)}
        />
        <button type="submit" disabled={draft().trim() === ""}>
          Post comment
        </button>
      </form>
    </div>
  );
}

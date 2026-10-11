# Legacy Frontend Web Standards Audit (FRT-5)

Audit of the six legacy pages against the Vercel Web Interface Guidelines, per `.agents/skills/web-design-guidelines/SKILL.md`. Guidelines source: `vercel-labs/web-interface-guidelines` (`command.md`), fetched fresh for this review. Page and script facts were cross-checked against `docs/port/feature-inventory.md` (FRT-2). No legacy code was changed; every finding is a requirement for the new frontend.

**Pages audited:** `index.html`, `achievements/index.html`, `global/index.html`, `insights/index.html`, `meta/index.html`, `archive/index.html` (0 bytes).

**Severity scale**
- **Critical** — blocks a core task, dead-ends the page, or leaves the user in an unrecoverable state.
- **High** — excludes user groups (keyboard, screen reader) or breaks a primary guideline rule.
- **Medium** — guideline violation with real but bounded usability cost.
- **Low** — polish, semantics, or robustness issue.

**Line references:** `styles.css` etc. are repo-root files; `js/*.js` are shared scripts; `*/js/*.js` are page scripts; `index.html:N` etc. are page markup lines as of this worktree.

---

## Summary of findings by page and severity

| Page | Critical | High | Medium | Low | Total | Headline issues |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `index.html` (main leaderboard) | 2 | 9 | 17 | 17 | 45 | Click-only row targets; unclosable season-end overlay; autoplaying audio; 30 render-blocking scripts; silent toast errors |
| `achievements/index.html` | 1 | 2 | 5 | 8 | 16 | Infinite loader on data failure; no main landmark; no reduced-motion |
| `global/index.html` | 0 | 4 | 12 | 9 | 25 | Duplicate page title; unlabeled search input; faint focus indicators; state not in URL |
| `insights/index.html` | 0 | 4 | 7 | 8 | 19 | Charts have no non-visual alternative; silent fetch failure renders zeros; fake tab markup |
| `meta/index.html` | 1 | 3 | 10 | 7 | 21 | Loader dead-ends on failure; unlabeled search and filter selects; focus indicators removed |
| `archive/index.html` | 1 | 0 | 0 | 0 | 1 | 0-byte page shipped as a route |

Total: 60 distinct findings (a finding affecting several pages is counted once per page in the table, once per category section below).

---

## 1. Document structure and semantics

| ID | Page(s) | Rule (skill) | Evidence | Requirement for rewrite |
| --- | --- | --- | --- | --- |
| DS1 | index, achievements, global, insights, meta | Semantic HTML; skip link for main content | No `<main>` element and no skip link on any page; content sits directly in `<body>` between `<header>`/`<nav>` and `<footer>` (e.g. `index.html:55–538`) | Wrap each page's primary content in `<main>` and render a visually hidden skip link as the first focusable element |
| DS2 | index, global | Semantic HTML (`<table>`) | `<th>` cells have no `scope="col"`, table has no `<caption>`, no `aria-sort` anywhere (`index.html:460–473`, `global/index.html:100–109`); `aria-sort`/`scope`/`<caption>` grep to zero matches repo-wide | Add `scope="col"`, a visible or visually-hidden `<caption>`, and `aria-sort` that tracks actual sort state |
| DS3 | index | Buttons/links for actions, not decoration | Leaderboard headers carry `data-sort` attributes (`index.html:461–472`) but no JS sorting implementation exists (per FRT-2 inventory) — a sort affordance that does nothing | Either implement sorting (buttons inside `th`, `aria-sort` updated, URL state) or drop the `data-sort` attributes so no dead affordance ships |
| DS4 | index, achievements, global, insights, meta | Icon-only/link naming must be accurate | Logo `<a href="#">` has `aria-label="Weapon Meta"` on achievements/insights/meta/global and `aria-label="Home"` on index (`achievements/index.html:47`, `global/index.html:43`, `meta/index.html:46`, `insights/index.html:44`, `index.html:63`); the link goes nowhere (`#`) on every page | Make the logo a real home link with an accurate accessible name (site name) on every page |
| DS5 | achievements, insights, meta | Consistent landmarks | Subpage navbars are bare `<nav role="navigation">` while index/global wrap them in `<header>` (`achievements/index.html:45`, vs `index.html:62–64`) — inconsistent landmark structure across pages | Use one shared layout: `<header>` containing the nav on all pages |
| DS6 | global | Page must identify itself | `<title>SPT Leaderboard</title>` (`global/index.html:35`) is identical to the root page and the `<h1>` says "SPT Leaderboard" for a Global Leaderboard page | Give every page a unique, descriptive `<title>` and `<h1>` ("Global Leaderboard") |
| DS7 | insights | Semantic HTML before ARIA; working UI | `#general`/`#maps` use `tab-content`/`active` classes (`insights/index.html:74, 252`) with no `role="tablist"`, no switching JS (per FRT-2), and no `.tab-content` rule in any loaded stylesheet — the `active` class is a no-op and both sections just stack | Build real tabs (button-per-tab, `aria-selected`, URL state, keyboard arrow support) or remove the tab markup/classes |
| DS8 | index, global | Handle empty states / no dead markup | `<p id="status"></p>` is always empty (`index.html:447`, `global/index.html:82`) | Remove dead placeholder elements from markup |
| DS9 | archive | Every route must render a page | `archive/index.html` is 0 bytes: no doctype, no `lang`, no `<title>`, no content; the only reference is prose in the Ranking System modal promising a "season archives" dropdown that does not exist (`index.html` modal body) | In the rewrite, either implement the archive route (title, lang, content, empty state) or remove it and fix the modal copy |
| DS10 | global | Valid markup | Row avatar template has a duplicate `alt` attribute (`global/js/main.js:94`: `alt="" … alt="Avatar"`) — invalid HTML, second attribute ignored | Generate one `alt` per image; validate generated markup in CI |
| DS11 | index | Icon-only buttons need `aria-label` | Profile-modal close button is `&times;` with no aria-label (`js/user-profiles.js:381`), unlike team/modal close buttons which have them (`index.html:151, 322`) | Give every icon-only control an aria-label |
| DS12 | all | Document metadata | No `<meta name="description">` on any page (only `og:description`), and the OG image/URL are identical hardcoded values on subpages whose content differs | Add per-page description meta and correct canonical/OG URLs in the rewrite |

Passes to keep: `<html lang="en">` on all five non-empty pages; `viewport` without `user-scalable=no`/`maximum-scale`; `<title>` unique on achievements/insights/meta.

---

## 2. Keyboard access

| ID | Page(s) | Rule (skill) | Evidence | Requirement for rewrite |
| --- | --- | --- | --- | --- |
| KB1 | index | Interactive elements need keyboard handlers; no `<div onClick>` | Opening a profile or team is click-only: `app-core.js:344,352` and `630–633` bind `click` on `.player-name-wrapper` / `.teamtag` `<td>` cells; there is no `keydown` handler for them and zero `tabindex` in the entire repo — the page's primary action is unreachable by keyboard | Make row openers real focusable controls (button, or cell with `tabindex="0"` + Enter/Space) and give share/profile/team actions keyboard parity |
| KB2 | index | Modals: focus management | Info/Banned/Whitelist/TOS/Settings/Team/Profile modals close on Escape (`js/ui-navigation.js:270–273`, `js/user-profiles.js:2051–2055`, `js/user-teams.js:16–18`) but no code ever moves focus into a modal, traps it, or restores it on close (the only `.focus()` calls in `js/` are search and comment inputs); background content is never `inert`/`aria-hidden` | On open: focus the modal, trap Tab, set `aria-modal` with the background inert; on close: restore focus to the trigger |
| KB3 | index | Media controls need keyboard support; page must not dead-end | The season-finale overlay (`#seasonOverlay`, built in `js/system-season-end.js:36–140`) contains no button, no close control, and `cleanupSeasonEnd()` (line 635) is never called anywhere in the repo — when it triggers, the page is a full-screen overlay with looping video and music that can never be dismissed, by mouse or keyboard | Give any takeover overlay an always-reachable, keyboard-operable dismiss control that fully tears down timers, media, and intervals |
| KB4 | index | Overlays must not trap without exit management | First-visit welcome overlay (`js/app-welcome-screen.js:64–100`) covers the page; its action buttons are real `<button>`s (good) but the background is never made `inert` and focus is not moved into the overlay | Treat the welcome screen as a dialog: focus it on open, inert background, Escape/Enter paths |
| KB5 | index | Auto-dismissing content needs user control | Toasts auto-dismiss after 3000 ms with hover-pause only (`js/ui-toasts.js`), and raid/ban notifications auto-remove after 12–27 s (`js/raid-notifications.js`) — keyboard users cannot pause or reopen them | Add focus-pause (not just hover-pause), a persistent log (aria-live region or notification center), and keyboard dismiss |

Passes to keep: navbar dropdown toggles are `<button>` with `aria-expanded`/`aria-haspopup` maintained in `js/app-utils.js:81–112`; Escape closes dropdowns (`js/user-profiles.js:2163`); "Show More" raids, pagination (Prev/Next), preloader Retry, and share buttons are real `<button>`s; global page sort/limit are native `<select>`s with `<label for>`.

---

## 3. Focus visibility

| ID | Page(s) | Rule (skill) | Evidence | Requirement for rewrite |
| --- | --- | --- | --- | --- |
| FC1 | index, global | Never `outline: none` without focus replacement; use `:focus-visible` | `#playerSearch:focus { outline: none; border-color: var(--accent-teal); }` (`styles.css:925–929`) — replacement is a 1-px border tint; same pattern on `.search-input:focus` (`styles.css:6896–6900`), `.comment-input:focus` (`9527`), `.reply-input:focus` (`9753`); `:focus-visible` appears nowhere in any stylesheet | Define one tokenized `:focus-visible` style (≥3:1 contrast ring) applied globally; never remove outline without an equally visible replacement |
| FC2 | global | Focus indicators must be perceivable | `#sortSelect/#limitSelect { outline: none; }` with focus replacement of a 15%-alpha box-shadow (`global/styles.css:44, 56–60`) | Same global focus-visible token; no low-alpha-only indicators |
| FC3 | meta | Never `outline: none` without focus replacement | `.category-dropdown:focus { outline: none; … box-shadow: 0 0 0 2px rgba(99,102,241,0.3) }` (`meta/weaponmeta.css:521–526`) | Same global focus-visible token |
| FC4 | all | Sticky/fixed elements must not cover the focused element | Fixed navbar (`styles.css:386`) and fixed `#seasonTimer` (`styles.css:1042–1055`) overlay scrolled content; `scroll-margin-top` appears nowhere in any stylesheet | Add `scroll-margin-top` sized to the fixed chrome on all scroll targets/headings, and ensure fixed bars never overlap the focused control |

---

## 4. Forms and labels

| ID | Page(s) | Rule (skill) | Evidence | Requirement for rewrite |
| --- | --- | --- | --- | --- |
| FL1 | index, global, meta | Form controls need `<label>` or `aria-label`; inputs need `autocomplete` and `name` | `<input type="text" id="playerSearch" placeholder="Find player by name..." />` (`index.html:454`, `global/index.html:88`) and `#weaponSearch` (`meta/index.html:75`) have no label, no `aria-label`, no `name`, no `autocomplete`, no `spellcheck="false"` (they search usernames/IDs) | Label every search input (visible or `aria-label`), add `name`, `autocomplete="off"`, `spellcheck="false"`, and use `type="search"` |
| FL2 | meta | Form controls need labels | Filter selects `#mainCategory`, `#subCategory`, `#caliberFilter` have no `<label>`/`aria-label` (`meta/index.html:77–87`); the global page proves the pattern works (`<label for="sortSelect">`, `global/index.html:91–94`) | Give each select a persistent label; keep the cascading disabled states |
| FL3 | index | Form controls need labels | Comment `#comment-text` textarea is placeholder-only (`js/user-profiles.js:788`); reply input placeholder-only (`js/user-community.js:1339`, which also emits invalid `</input>`) | Associate real labels with comment/reply fields; fix the malformed markup |
| FL4 | index | State must be communicated | "By Name"/"By ID" toggle is two `<button>`s whose state is only a `.active` class (`js/user-search.js:43–46`) — no `aria-pressed`, no `role="radiogroup"` | Use `aria-pressed` toggle buttons or radio semantics for exclusive toggles |
| FL5 | index | Errors inline next to fields | Comment-form login errors are surfaced by rewriting the input's placeholder text ("Please log in to comment...", `js/user-community.js:679–682`) instead of an associated inline message | Render field-level messages as persistent inline text linked via `aria-describedby`; never encode state in placeholders |

---

## 5. Color and contrast

Measured WCAG ratios (computed, not eyeballed) against the real backgrounds:

| ID | Page(s) | Rule | Evidence | Requirement for rewrite |
| --- | --- | --- | --- | --- |
| CC1 | index | Contrast ≥ 4.5:1 | Equipment-slot labels `color: #888` at 12 px on `#1e293b` cards = 4.13:1, and empty-slot text `color: #666` = 2.55:1 (`styles.css:4137–4156`) — both fail AA | Define a muted-text token that passes 4.5:1 on card surfaces; never use `#666` on dark UI |
| CC2 | all | Contrast ≥ 4.5:1 | Shared tokens fail on the page background `--darker #0f172a`: `--gray-dark #64748b` = 3.75:1, `--gray-ultradark #475569` = 2.36:1 (used for text in multiple components) | Recompute the gray ramp against real backgrounds and ship only AA-passing text tokens |
| CC3 | insights | Contrast ≥ 4.5:1; color coding must be controlled | Chart segment colors are `getRandomColor()` (`insights/js/main.js:531–538`, applied at `144` and `474`) — random hex values give no contrast floor against the dark card background and no stable meaning | Use a fixed, tested palette with AA contrast on the chart background plus labels/patterns, not randomness |
| CC4 | index | Large-text contrast ≥ 3:1 | `--accent-blue #1e90ff` on `--bg-dark-secondary #223d5f` = 3.41:1 — passes only for large text; the same blue is used for body-size accents | Restrict the accent to large headings or lighten it wherever used at body sizes |

Passes to keep (measured on `#0f172a`): body text `#c9c9c9` 10.78:1; muted `#8892b0` 5.77:1; status colors `.average #f6d25d` 12.15:1, `.good #6fdf60` 10.54:1, `.lts #3da3cc` 6.21:1, `.bad #da6879` 5.30:1, `.impressive #ca60df` 5.31:1. Re-verify against real glass-card backgrounds in the rewrite.

---

## 6. Media handling

| ID | Page(s) | Rule | Evidence | Requirement for rewrite |
| --- | --- | --- | --- | --- |
| MH1 | index | Autoplay motion >5 s alongside content needs pause/stop/hide; muted loops must stop under `prefers-reduced-motion` | `media/season_end/test.mp4` autoplays in the season overlay (`js/system-season-end.js:52–54, 129–131`) and the welcome overlay (`js/app-welcome-screen.js:69–71`) with `autoplay muted loop playsinline` (attributes correct) but no controls, no pause, and no reduced-motion still alternative | Keep the correct video attributes; add controls/pause affordance and a `prefers-reduced-motion` static poster that replaces the loop |
| MH2 | index | Media controls need keyboard support; do not autoplay sound | Season finale music plays at volume 0.5 (`js/system-season-end.js:601–610`); ban-reveal music, killstreak and raid-result sounds autoplay (`js/raid-notifications.js:102, 228–235, 325, 479`); the Settings modal (`index.html:393–431`) offers no sound/mute toggle | Gate all audio behind a persisted mute/sound setting with an in-page control; never autoplay music |
| MH3 | all | `<img>` needs explicit `width` and `height` | Static images ship dimension-less: loader icon (`index.html:56`), event banner (`index.html:434`), navbar logos, footer logos on all five pages; JS-injected avatars/weapon icons are likewise dimension-less (e.g. `js/app-core.js:480`, `global/js/main.js:94`) | Ship intrinsic dimensions (or aspect-ratio boxes) for every image, static and injected |
| MH4 | all | Images need `alt` | Several images have no `alt` attribute at all: loader icon (`index.html:56`), announcement banner (`index.html:434`), footer logos on all five pages (`index.html:518`, `achievements/index.html:91`, `global/index.html:122`, `insights/index.html:256`, `meta/index.html:111`) — while the codebase already shows the right pattern elsewhere (`alt="" aria-hidden="true"`, `js/app-welcome-screen.js:78`) | Give every meaningful image a descriptive `alt` and every decorative image `alt=""` + `aria-hidden="true"`; do it consistently |
| MH5 | insights | Meaningful media needs descriptions/alternatives | All 16 chart `<canvas>` elements (`insights/index.html:107–268`) render the data only visually; Chart.js tables/summaries are not provided anywhere in `insights/js/main.js` | Provide a data-table or text-summary alternative for each chart (and role/description on the canvas) |
| MH6 | all | Below-fold images: `loading="lazy"` | JS-rendered images use `loading="lazy"` (20 usages across `js/`, `meta/js/main.js`), but static below-fold images (footer logos, announcement banner) don't | Apply lazy loading to below-fold images uniformly in the rewrite |

---

## 7. Loading behavior

| ID | Page(s) | Rule | Evidence | Requirement for rewrite |
| --- | --- | --- | --- | --- |
| LB1 | index | Performance: don't block render | `index.html:25–54` loads 30 scripts synchronously in `<head>` with no `defer`/`async` (the `data-cfasync` attributes are Cloudflare hints, not `defer`), plus `odometer.js` at the end of body (`index.html:537`) | Bundle/defer scripts; load the leaderboard as progressive enhancement so content paints without JS |
| LB2 | index | Don't fake latency | The preloader enforces a per-resource minimum display time of `800 + index×100 ms` across its weighted checklist (`js/app-init.js`) — tens of artificial seconds on a cold load | Show progress from real work only; remove artificial minimum-display timers |
| LB3 | index | Async status needs `aria-live`/`role="status"` | Preloader status text (`#status-text`, `index.html:61`) and staged messages ("Awaiting Leaderboard Engine...", `meta/js/main.js`) update silently; only `#profile-raid-streak` has `aria-live` in the whole repo (`js/user-profiles.js:402`) | Mark progress/status regions `role="status"` so loading is announced |
| LB4 | all | Dark mode & theming | No page sets `<meta name="theme-color">` or `color-scheme: dark` (zero matches in all heads and CSS) — UA scrollbars, form controls, and autocorrect styling render light on a dark UI | Set `color-scheme: dark` on `<html>` and a matching `theme-color` on every page |

Passes to keep: preloader has a real error container with a working Retry button (`index.html:58–60`); `waitForDataReady()` has a 15 s timeout with an error toast (`js/app-utils.js`); the main page has a visible offline state ("Offline. Trying to get you back...", `index.html:505–512`).

---

## 8. Error states

| ID | Page(s) | Rule | Evidence | Requirement for rewrite |
| --- | --- | --- | --- | --- |
| ES1 | achievements | Handle error states; errors need next steps | `achievements/js/achievements.js:152–154` catches data-load failure with `console.error` only — the "Processing Achievements..." loader dots (`achievements/index.html:80–87`) spin forever with no message and no retry | Every data load gets an error state with message + Retry; never an infinite spinner |
| ES2 | meta | Handle error states | `runWeaponBuilder` catch is `console.error` only (`meta/js/main.js:243–245`) — the loader freezes on its last stage text ("Waiting for API...") with no error UI | Same: staged loader must end in a recoverable error state |
| ES3 | insights | Handle error states; empty vs error are different | Fetch failure is `console.error` only (`insights/js/main.js:230–233`) — summary cards keep "0" defaults and charts stay blank, indistinguishable from "no data" | Distinguish empty vs loading vs failed with explicit states and retry |
| ES4 | global | Errors include a fix/next step | The global table does render an inline error row ("Failed to load leaderboard.", `global/js/main.js:83`) — the best of the four — but offers no retry action | Keep the inline error and add a Retry affordance; this is the pattern to standardize |
| ES5 | index | Focus first error | When the preloader error container appears, the Retry button (`index.html:60`) is not focused (no `.focus()` call in `js/app-init.js`) | Move focus to the error and its primary action when it appears |
| ES6 | index, global | Async updates (toasts) need `aria-live="polite"` | `ToastManager` creates `<div class="toast …">` with no role/aria-live (`js/ui-toasts.js:19, 49`); raid/ban notification elements are plain divs (`js/raid-notifications.js:150`) — every error/success toast is invisible to screen readers | Give the toast/notification containers `aria-live="polite"` (errors `assertive` where appropriate) and role="status" |
| ES7 | index | Robust wiring; fail loudly in dev | `AutoUpdater.init()` is called with 5 arguments but declares 4, so `#normalRadio` binds to the nonexistent `#heartbeatRadio` (`js/app-init.js`; documented in FRT-2) — the Normal/Force update-mode radios are silently broken | Rewrite binds controls by explicit contract; add a dev-time assertion that every referenced element exists |
| ES8 | index | Don't ship dead UI paths | `runTimer()` writes `#endDateDisplay` behind an existence guard (`js/system-timer.js:13–17`) but no page contains that element — the season end date silently never renders | In the rewrite, every rendered datum has a real target; delete dead bindings |
| ES9 | index | Use current APIs | Profile share falls back to deprecated `document.execCommand('copy')` (`js/user-share.js`) | Use Clipboard API with a proper fallback path and announced result |

---

## 9. Cross-cutting rule violations (animation, typography, navigation/state, touch, i18n, content)

| ID | Page(s) | Rule | Evidence | Requirement for rewrite |
| --- | --- | --- | --- | --- |
| XC1 | all | Honor `prefers-reduced-motion` | Zero `prefers-reduced-motion` matches in any CSS or JS, despite: autoplay videos (MH1), the 20-flake snowfall engine (`js/app-seasons.js`), animate.css entrance classes on every `<h1>`/announcement, odometer count-ups (`js/app-core.js`), and 1000 ms live-data tickers | Define a reduced-motion strategy up front: disable snowfall, video loops, entrance animations, and count-ups under the media query |
| XC2 | all | Never `transition: all` | `transition: all` occurs 123× in `styles.css`, 13× in `meta/weaponmeta.css`, 1× in `achievements/ach.css` | Transition explicit properties (`transform`, `opacity`, `color`) only |
| XC3 | all | `…` not `...`; loading states end with `…` | "Initializing..." (`index.html:61`), "Processing Achievements..." (`achievements/index.html:84`), "Getting API Status..." (all five pages), placeholders "Find player by name..." (`index.html:454`, `global/index.html:88`), "Search weapons..." (`meta/index.html:75`) | Use the `…` character in all UI strings and placeholders |
| XC4 | index, global, meta | URL reflects state; deep-link stateful UI | Sort/limit/search on global (`global/js/main.js` state object), search + type on index (`js/user-search.js`), and meta filters (`meta/js/main.js`) live only in JS/localStorage; the sole URL state is `#id=` for profiles (`js/user-share.js`) | Reflect search, sort, limit, and filters in query params so views are shareable and back-button-safe |
| XC5 | all | Theming rules (duplicate of LB4 scope) | See LB4 — `color-scheme`/`theme-color` absent | Covered by LB4 |
| XC6 | index | `target="_blank"` links need `rel="noopener"` | The announcement Discord link has `target="_blank"` without `rel` (`index.html:438`); footer links do it correctly (`rel="noopener"`) | Add `rel="noopener"` (standardize `rel="noopener noreferrer"` for externals) everywhere |
| XC7 | index | Links use `<a>` (Cmd/Ctrl+click, middle-click) | Welcome-screen external actions navigate via `onclick="window.open(...)"` buttons (`js/app-welcome-screen.js:92–96`) | Render external navigation as real `<a href>` links |
| XC8 | all | Use `Intl.*` for dates/numbers; `translate="no"` on tokens | Custom formatters hardcode formats (`formatPlayTime`, `formatSalesNum` with "₽", `js/app-utils.js`; `formatTime` in `insights/js/main.js`); brand/code tokens (SPTLB, KDR, skill tiers) carry no `translate="no"` | Format via `Intl.DateTimeFormat`/`Intl.NumberFormat` and mark brand tokens `translate="no"` |
| XC9 | all | Touch & interaction rules | `touch-action: manipulation`, `overscroll-behavior: contain` (modals/drawers), and `env(safe-area-inset-*)` appear nowhere in any stylesheet (grep zero across `styles.css`, `ach.css`, `global/styles.css`, `insights.css`, `weaponmeta.css`) even though team/profile modals scroll internally | Adopt the touch baseline: `touch-action: manipulation` on controls, `overscroll-behavior: contain` in modals, safe-area padding for full-bleed chrome |
| XC10 | index | Destructive actions need confirmation/undo, in-app | Comment deletion uses native `confirm()` (`js/user-community.js:1416`); friend removal is an unconfirmed stub (FRT-2) | Use an in-app confirm modal or undo window for destructive actions; no native dialogs |
| XC11 | index | Text must remain selectable/copyable | `user-select: none` is applied broadly (`styles.css:96, 2198, 2670, 3530, 3700`), including stats-bearing components | Restrict `user-select: none` to genuinely interactive chrome; keep stats copyable |

---

## Method note

- Checklist source: `vercel-labs/web-interface-guidelines` `command.md`, fetched per skill instructions; its rule groups were mapped onto the eight required audit categories plus a cross-cutting section.
- Page facts verified in markup; script facts verified by reading the named scripts and by repo-wide grep (e.g. `tabindex`, `aria-live`, `prefers-reduced-motion`, `outline: none`, `focus-visible`, `scroll-margin`, `touch-action`, `color-scheme`, `loading="lazy"` all return zero or enumerable matches as cited).
- Contrast ratios computed with the WCAG relative-luminance formula against the actual token values in `styles.css` / page CSS.
- Feature-behavior claims (AutoUpdater arity bug, never-called `cleanupSeasonEnd`, no sorting implementation, no tab-switching JS) are corroborated by `docs/port/feature-inventory.md` and re-verified by grep in this worktree.

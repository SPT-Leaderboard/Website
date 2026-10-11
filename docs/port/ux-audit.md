# Legacy Frontend UX Audit (FRT-6)

Audit of the current (legacy) frontend user experience, recorded from the code in this worktree. **Facts first, with evidence; every proposal is in its own clearly marked section and informs the new frontend only — nothing here is a change request for the legacy site.**

Skill reference: `.agents/skills/ui-ux-pro-max/SKILL.md` was not present in this worktree (it is a locked external skill, `nextlevelbuilder/ui-ux-pro-max-skill` per `skills-lock.json`); the audit uses its published rule categories (accessibility, touch, performance, layout/responsive, typography/color, animation, forms/feedback, navigation, charts) as the review framework. The feature map comes from `docs/port/feature-inventory.md` (FRT-2), verified against the code.

Pages audited: `index.html`, `achievements/index.html`, `global/index.html`, `insights/index.html`, `meta/index.html`, `archive/index.html`, plus the shared `styles.css` (226,208 bytes, 10,971 lines, ~1,493 rules) and page scripts.

---

## 1. Verified known facts (with evidence)

1. **`archive/index.html` is a 0-byte file that no page links to.** `ls -la archive/index.html` → `0` bytes. A repo-wide grep for "archive" in HTML/JS finds exactly one hit: `index.html:234`, prose inside the Ranking System modal — "Full season archives in the dropdown menu" — and no such dropdown exists in any markup. Users are promised a feature that does not exist; the file itself is a dead route.
2. **Every logo links to `#`. No page uses the logo as a home link.**
   - `index.html:70` — `<a href="#" aria-label="Home">`
   - `achievements/index.html:34`, `global/index.html:39`, `insights/index.html:35`, `meta/index.html:32` — `<a href="#" aria-label="Weapon Meta">` (the `aria-label` is a copy-paste error on all four subpages, including pages that are not Weapon Meta).
3. **The login button leaves the site for a server-rendered page.** All five non-empty pages link `/api/network/login/index.php` (`index.html:133`, `achievements:62`, `global:71`, `insights:63`, `meta:60`). Login state comes back via `js/api-auth.js` (`check_auth.php`, `credentials: 'include'`). The same anchor (`#loginButton`) is the only place a logged-in avatar and notification badge appear, so the "button" is simultaneously link, avatar, and inbox — all pointing offsite.
4. **The main page loads a 226 KB global stylesheet.** `styles.css` is 226,208 bytes raw (35,729 bytes when gzipped locally; unminified, 10,971 lines). It is loaded by every page (`index.html:6`, `../styles.css` or `/styles.css` on subpages), plus per-page CSS (`rewards.css` 21.6 KB on index only; `meta/weaponmeta.css` 22.3 KB; `achievements/ach.css`, `insights/insights.css`, `global/styles.css` ~3 KB each). Global page loads both `/styles.css` and its own `styles.css` (`global/index.html:6-7`).

---

## 2. Cross-cutting findings (facts)

### 2.1 Information architecture
- Six routes exist; five are reachable. **The all-time Global Leaderboard (`/global/`) is not linked from the homepage navbar at all** — `index.html` contains zero references to `global/` (grep). It is only discoverable from the other subpages' dropdowns or by guessing the URL.
- The homepage is simultaneously: seasonal leaderboard, Hall of Fame, event announcement, ranking rules (modal), TOS (modal), mod lists (modals), settings (modal), and the only gateway to the stats pages. IA consequence: the "Stats" dropdown is the only persistent page-level nav, and it lives inside a floating pill navbar.
- Naming is inconsistent for the same content: the insights page is called "Global Insights" (nav, `index.html:87`), "Data Report" (H1, `insights/index.html:72`), and "Global Statistics" (welcome-screen button, `app-welcome-screen.js:99`). Achievements is "Achievement Rates" (nav) vs "Global Achievements" (H1).
- The global (all-time) page brands itself identically to the homepage: `<title>SPT Leaderboard</title>` (`global/index.html:30`), H1 "SPT Leaderboard" (`global/index.html:83`), and the homepage's OG description ("Main Gate to the Ultimate Leaderboard…", `global/index.html:12`). Every page's `og:url` is the site root (`index.html:13`, `achievements:9`, `global:13`, `insights:9`, `meta:9`), so any shared subpage resolves to the homepage preview and URL.
- The seasonal leaderboard itself is absent from the homepage's own Stats dropdown (dropdown lists only meta/insights/achievements); each subpage's dropdown includes a self-link (redundant).
- LA/TOS, Banned Mods, Whitelisted Mods, Ranking System, and Settings are homepage-only modals — **unreachable from any subpage** (only `index.html` renders the Info/System dropdowns).
- No Privacy Policy exists anywhere (grep: only the data-collection clause inside the LA/TOS modal, `index.html:337-341`). No sitemap file exists (`find -name "sitemap*" -o -name "robots*"` → nothing).

### 2.2 Navigation
- Logo is a dead link (`href="#"`) on all pages (fact 2) — the strongest learned convention on the web ("logo = home") is broken.
- Subpages replace the home link with a "Go back" button (`achievements:59`, `global:68`, `insights:60`, `meta:57`) that (a) always goes to the site root regardless of where the user came from, and (b) uses the identical styling classes as the login button (`navbar-link navbar-link--login compact-login-btn`) — two adjacent same-looking buttons with different destinations.
- Dead affordance: main-table headers carry `data-sort` attributes (`index.html:479-490`) implying click-to-sort; no JS reads `data-sort` anywhere (grep across `js/` → 0 hits). Ranking order is fixed by `calculatePlaces()`.
- Dropdowns open on click with `aria-expanded`/`aria-haspopup` managed (`app-utils.js` `initNavbar`), and close on outside click and Escape — good. Escape also closes team, profile, and settings/info modals (`user-teams.js:16`, `user-profiles.js:2051`, `ui-navigation.js:270`).
- Deep linking exists only for profiles: `#id=<playerId>` opens/closes the profile modal (`user-share.js`). No other page or modal state is deep-linkable.
- Tooltips (API status, badges, standings) are hover-only (`.tooltip:hover .tooltiptext`, `styles.css`) — invisible on touch devices.

### 2.3 Content density
- Main page stack, top to bottom: fixed API-status bar → fixed floating navbar → H1 (offset by inline `margin-top: 180px`, `index.html:96`) → 9-stat aggregate odometer bar → previous-season winners strip → event announcement with background image → search + Live Data Flow/update-mode controls → 12-column table (Rank, Team, Name, Last Seen, Profile, Standing, PMC/SCAV Raids, SR, KDR, Life Time, Skill, SPT) → season timer → footer, plus preloader, welcome overlay, toasts, raid notification stack, and season-end overlay. Heavy even on desktop.
- The profile modal renders three columns containing 20+ sections (summary, records, raid history, achievements grid, quests, hideout, friends, comments, equipment, trader standings, body-hit SVG, badges…). On ≤768px the columns stack (`styles.css`, `@media (max-width: 768px)` block at 9388), producing an extremely long scroll.
- Insights renders 14 Chart.js canvases in one column (`insights/index.html:76-231`), all created at once; meta renders the full weapon catalog as cards with per-card images and stats grids.

### 2.4 Mobile layout
- Breakpoints exist at 1200/1024/768/480px. At 768px the navbar stacks into a column (`styles.css:9224`) and the table shrinks to `font-size: 0.8rem; padding: 3px 6px` (`styles.css:9250-9255`) — 12 columns are compressed, not reflowed; there is **no horizontal scroll container anywhere** (`overflow-x` count in styles.css: 0), and 32 `white-space: nowrap` declarations compete with the squeezed table.
- At 480px the top stats bar, winners, and player counts are `display: none` (`styles.css:9296-9307`) — mobile users lose aggregate stats and Hall of Fame entirely rather than getting a compact variant.
- The fixed navbar is positioned below a fixed stats bar via `top: calc(var(--top-stats-height, 70px))` (`styles.css:387`), compensated by hardcoded inline `margin-top: 180px/150px` on every H1 — brittle stacking on short/rotated viewports.
- Dropdowns are click-driven (touch-safe), but 44×44 touch-target and focus-ring rules are absent; several controls (search type toggle, radio pills, Clear) are small text buttons.

### 2.5 Dark mode
- The site is dark-only by design: `:root` defines a dark palette (`--bg-dark: #0a192f`, `styles.css:1-60`) and `body` paints `var(--darker)`. There is no theme toggle and zero `prefers-color-scheme` usage (grep count: 0). No light theme exists for bright environments or accessibility needs.
- Contrast (WCAG, computed): body text `#c9c9c9` on `#0a192f` = 10.6:1 (pass); muted `#8892b0` on page bg = 5.7:1 (pass) but 4.7:1 on card bg `#1e293b` (borderline); **`--gray-dark: #64748b` on card bg = 3.07:1 — fails AA 4.5:1 for normal text**; teal accent `#64ffda` = 14.1:1 (pass).
- No `prefers-reduced-motion` support (grep count: 0) despite constant motion: odometer count-ups, snowfall (Dec–Feb, `app-seasons.js`), animate.css entrances, 1 s heartbeat polling, live toasts, and the season-end video/music overlay.

### 2.6 Loading states
- **index:** full-screen preloader with progress dots, staged status text, and a real error state with Retry (`index.html:52-66`, `app-init.js`). Costs: per-resource minimum display of 800 ms + index×100 ms and a 1300 ms hide delay — boot time is partly artificial. A first-visit welcome overlay (`SPTLBWelcome`) blocks the content until "Enter Leaderboard".
- **achievements:** shimmer + 4-dot loader, 500px tall (`achievements/index.html:76-88`) — good pattern; on failure the catch only logs (`achievements/js/achievements.js:152-153`) and the loader spins forever.
- **global:** in-table "Loading…" row, replaced by data, "No players found.", or "Failed to load leaderboard." (`global/js/main.js:73,83,88`) — the only subpage with a complete state set.
- **insights:** **no loading state at all** — no loader markup, charts initialize with zeros; `catch` logs to console only (`insights/js/main.js:230-231`). On slow networks the page looks broken/empty.
- **meta:** best-in-class staged loader text ("Getting weapons…" → "Awaiting Leaderboard Engine…" → "Waiting for API…", `meta/js/main.js:223-238`), but the catch also only logs (line 243-244), leaving the loader stuck.
- Background cost on every page: `KeepAliveService` POSTs a heartbeat every 30 s (`app-utils.js:968`), API status polls every 30 s, and the global page runs a 1 s heartbeat fetch that nothing consumes (`feature-inventory.md`, `global` timers) — plus Chart.js is loaded on achievements but never used (`achievements/index.html:23`; no `new Chart` in `achievements/js/achievements.js`).

### 2.7 Empty states
- **index:** `#emptyLeaderboardNotification` ("Offline. Trying to get you back…" with a spinner, `index.html:497-506`) conflates three different situations — no data yet, API offline, and genuinely empty leaderboard — into one spinner message. Main-page in-table search hides non-matching rows with **no "no results" message** (`js/user-search.js:84-118`): an empty-looking table means either no match or no data.
- **global:** "No players found." exists (`global/js/main.js:88`) — the only proper empty state.
- **meta:** filtering to zero weapons empties the grid with no message (`renderWeaponCards` clears the container; no zero-guard, `meta/js/main.js:887-900`).
- **achievements/insights:** no empty state paths (data-driven pages; failure masquerades as eternal loading or zeroed charts).
- **archive:** an empty file — the ultimate empty state.

### 2.8 Error states
- Only two real error surfaces exist: the index preloader's Connection Error + Retry, and global's in-table "Failed to load leaderboard."
- Achievements, insights, and meta fail silently (`console.error` only); the shared `apiFetch` wrapper supports error toasts, but `ui-toasts.js` is not loaded on achievements, insights, or meta.
- The API status badge (`#serverStatus`, "API Degradation / API is Updating / API is Online / API is Unreachable") is a good ambient signal, but its details are hover-only tooltips.

### 2.9 Accessibility quick pass
- No `<main>` landmark and no skip link on any page (grep: 0 hits); the 12-column table has no caption or `scope` attributes; `outline: none` is applied to the four search inputs (`styles.css:926, 6897, 9528, 9754`) without an equivalent focus indicator on nav links/buttons.
- Icon-only controls (modal ×, close buttons) do carry `aria-label`s — good.
- The login anchor wraps avatar + notification badge with no distinct accessible name once logged in.

---

## 3. Findings per page

### 3.1 `index.html` — Seasonal Leaderboard (main)
- Densest page on the site (see 2.3). Primary task (scan rankings, open a profile) competes with announcement, winners, event art, timers, and live toasts.
- Logo dead-ends (fact 2); Stats dropdown omits both the seasonal leaderboard itself and the all-time `/global/` page (2.1) — the homepage nav does not reach half the site.
- Table headers fake sortability (`data-sort`, no handler); sticky `th` inside a page-scroll (not a scroll container) sticks the header to the viewport top, overlapping the fixed navbar stacking context.
- Empty state conflates offline/error/empty (2.7); search has no zero-result feedback.
- Settings modal (compact display, hide casual, timer, winners, cache bypass) is homepage-only and instant-apply + Save — reasonable, but undiscoverable from other pages.
- Strengths: genuine deep links for profiles (`#id=`), staged preloader with retry, live API status, click-driven touch-safe dropdowns, Escape-closable modals.

### 3.2 `achievements/index.html` — Achievement Rates
- Good shimmer loading pattern; **no error state** — a failed fetch leaves an infinite spinner (`achievements/js/achievements.js:152`).
- Loads Chart.js (~200 KB CDN) and never creates a chart; loads a second icon font (boxicons) alongside FontAwesome.
- Nav: logo `href="#"` mislabeled `aria-label="Weapon Meta"`; "Go back" + Login rendered as twin identical buttons; no link to this page's siblings outside the dropdown.
- H1 "Global Achievements" vs nav "Achievement Rates" (naming drift).
- No empty state (catalog is static-ish; failure = stuck loader).

### 3.3 `global/index.html` — Global (all-time) Leaderboard
- **Unreachable from the homepage nav** — the site's second core table is an orphan (2.1).
- Identical `<title>`/H1/OG to the homepage; no orientation signal that this is the all-time board.
- Best state coverage of all subpages: loading row, error row, "No players found." (`global/js/main.js:73-88`).
- Broken favicon: `href="media/icon_transparent.png"` resolves to `/global/media/…` which does not exist (`global/index.html:8`; no `global/media/` directory).
- Loads the 226 KB global stylesheet twice-removed (`/styles.css` + local `styles.css`), odometer JS+theme it never uses (`grep odometer global/js/main.js` → 0), and a 1 s heartbeat poll that no code consumes.

### 3.4 `insights/index.html` — Global Insights / "Data Report"
- **Dead content: the `#maps` tab exists in markup (`insights/index.html:232`) but no tab buttons and no tab-switching JS exist anywhere** (grep: `.tab-content` present; zero `tab` handlers in `insights/js/main.js`). The map-popularity charts are unreachable — only `#general` (hardcoded `active`) ever displays.
- **No loading and no error state** (2.6, 2.8): 14 charts initialize silently; failures log to console.
- Third name for the same page ("Global Statistics" in the welcome overlay vs "Global Insights" nav vs "Data Report" H1).
- Heavy head: global styles.css + insights.css + **meta/weaponmeta.css** (borrowed from another page) + boxicons + FontAwesome + Chart.js.
- Data scope is hardcoded seasons 2–10 (FRT-2 inventory) with no visible "data as of season X" label — users can't tell the report is stale by design.

### 3.5 `meta/index.html` — Weapon Meta
- Best loading UX on the site: staged, honest loader text (2.6). Everything after load is downhill: no error recovery, no "no results" empty state for filters (blank grid).
- Hidden dependency on leaderboard data: the page awaits `initEngine()` + `waitForDataReady()` and shows "Awaiting Leaderboard Engine…" — a confusing message for a weapons page that appears to depend on a leaderboard.
- Favicon points to a different asset (`media/newlogo_transparent_snow.png`) than every other page — inconsistent brand mark.
- Same nav issues as other subpages (logo `#`, mislabeled aria, twin "Go back"/Login buttons, homepage-only modals unreachable).
- Weapon analytics modal has tabs, Escape close, and image fallbacks — solid.

### 3.6 `archive/index.html` — Archive
- 0-byte file, no inbound links, no content (fact 1). The only "archive" mention on the site (Ranking System modal, `index.html:234`) promises "full season archives in the dropdown menu" that does not exist. UX verdict: a promised feature is a dead end in both directions — the promise has no target, and the target has no content.

---

## 4. PROPOSAL — New navigation structure (six pages + profile modal)

> Proposal for the new frontend only. Not a legacy change request.

Principles: logo = home; every page reachable from every page; one name per thing; states (modal) are URLs, not orphans.

**Top-level navbar (persistent, all pages):**

| Slot | Item | Notes |
| --- | --- | --- |
| Logo | **Home** → seasonal leaderboard (`/`) | Fixes the broken convention; logo is the home link. |
| Nav item 1 | **Leaderboard** (seasonal, `/`) | Highlighted as current page when active. |
| Nav item 2 | **Global** (all-time, `/global`) | Promoted out of obscurity — today it is unlinked from home. |
| Nav item 3 | **Stats** dropdown → Weapon Meta (`/meta`), Global Insights (`/insights`), Achievements (`/achievements`) | One dropdown for the three data views; no self-links inside. |
| Nav item 4 | **More** dropdown → Ranking Rules, Banned Mods, Whitelisted Mods, LA/TOS, Settings | Homepage-only modals become site-wide; each gets its own URL (`/rules`, `/tos`, …) so it is deep-linkable, with the modal rendered as an overlay on the current page. |
| Right | **Login / account** | Single entry point to the Network login; when logged in, avatar + notifications open an account menu (profile on Network, logout) instead of the whole button being one external link. |

**Profile modal:** keep the deep link, generalize it — `/#id=…` (or `/profile?id=…`) stays the canonical player URL; the modal becomes route-driven (`history.pushState`), so Back/Forward close and reopen it, and any page can open any player. Modal internal tabs (Summary / Records / History / Achievements / Comments) mirror the legacy sections so density is split into steps.

**Removed in the new IA:** the empty `archive/` route (either ship real season archives under `/seasons` or delete the promise from the rules copy), the "Go back" pseudo-button (browser back + logo home cover it), and self-referential dropdown links.

---

## 5. PROPOSAL — Footer: Terms of Service, Privacy Policy, sitemap

> Proposal for the new frontend only.

Keep the current three-column footer shape (brand / legal / links) and add a dedicated **legal row** that is present on every page:

- **Terms of Service** → `/tos` (content currently trapped in the homepage-only LA/TOS modal).
- **Privacy Policy** → `/privacy` — does not exist today anywhere; the data-collection clauses currently live only inside the TOS modal (`index.html:337-341`) and deserve a standalone page.
- **Sitemap** → `/sitemap` (human-visible page listing the six pages + season archives) and a machine `/sitemap.xml` (none exists today; `robots.txt` is also absent).
- Footer link row layout: `© 2026 SPT Leaderboard · Terms of Service · Privacy Policy · Sitemap · GitHub · Discord · SPTushonka Mod`.
- Rationale: legal links are a footer convention; putting ToS/Privacy/sitemap there makes them globally reachable without spending navbar slots, and the sitemap doubles as the discovery surface for anything that leaves the top nav.

---

## 6. PROPOSAL — Recommendations, ordered by user impact

> Proposal for the new frontend only. Order = expected impact on a typical user, highest first.

1. **Make navigation truthful and complete.** Logo links home; every page links to every page (including `/global` from home); kill the fake-sortable headers or implement sorting; remove the mislabeled logo `aria-label`s. (Fixes facts 2, the `/global` orphan, and the dead sort affordance.)
2. **One name per page.** Settle on "Global Insights" (or "Data Report") and "Achievements" (or "Achievement Rates") and use it in nav, H1, `<title>`, and OG tags; give `/global` a distinct title/H1 ("Global Leaderboard — All-Time"); correct each page's `og:url`.
3. **Give every page the full state set: loading, error, empty.** Port global's in-table trio and meta's staged loader everywhere; add a visible error message + retry to achievements/insights/meta (today: console-only failure); add a "no results" message to main-page and meta filtering; split the "Offline. Trying to get you back…" catch-all into distinct empty vs error states.
4. **Fix the unreachable content.** Ship the Insights maps tab (add tab buttons) or delete it; either implement season archives or remove the "Full season archives in the dropdown menu" promise; decide the fate of the empty `archive/` route.
5. **Cut the cost of first paint.** Split or tree-shake the 226 KB `styles.css` per page; stop loading Chart.js on achievements, odometer on global, and the borrowed `weaponmeta.css` on insights; lazy-run the 1 s heartbeat and 30 s keepalive only where consumed; compress/truncate the preloader's artificial per-resource delays.
6. **Mobile = reflow, not shrink.** Turn the 12-column table into a card/condensed-row layout below ~768px (or add a horizontal scroll container); restore the hidden-at-480px stats as a compact strip; replace the hardcoded `margin-top: 180px` H1 offset with document flow.
7. **Accessibility baseline.** `<main>` + skip link; visible focus styles replacing `outline: none`; fix `--gray-dark` text usage (3.07:1) against cards; respect `prefers-reduced-motion` for snowfall/odometer/toasts; add captions/`scope` to tables; hover-tooltip content gets a tap/click fallback.
8. **Legal + discovery.** Standalone `/tos` and new `/privacy` pages (content exists today only inside a modal), footer legal row, `sitemap.xml` + `robots.txt`; per-page OG tags.
9. **Rethink the first-run gauntlet.** The welcome overlay + preloader delays + announcement stack delay the core task; make the welcome overlay skippable-before-animations (persist `SPTLBWelcome` on first interaction), and demote the announcement to a dismissible banner.
10. **Background hygiene.** Gate `KeepAliveService` to logged-in sessions, stop unconsumed polling on subpages, and load `ui-toasts.js` wherever `apiFetch` can raise toasts.

---

*Audit recorded from code in this worktree; line numbers refer to current files. Companion docs: `docs/port/feature-inventory.md` (FRT-2), `docs/port/data-dependency-map.md`.*

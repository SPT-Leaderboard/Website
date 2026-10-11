# Legacy Frontend Feature Inventory (FRT-2)

Inventory of the current frontend, recorded from the code as it exists in this worktree.
Scope read: all `*.html` pages (root `index.html` plus `achievements/`, `global/`, `insights/`, `meta/`, `archive/`), all files under `js/`, and each page's own script (`*/js/*.js`).
Per page: features implemented by its scripts, shared global variables it uses, timers and their intervals, localStorage keys and cookies, and hash routes handled.

---

## Page: `index.html` (main leaderboard, repo root)

### Scripts loaded (in document order)

`media/utility/odometer.js`, then from `js/`:
`api-fetch.js`, `app-core.js`, `api-auth.js`, `system-winners.js`, `system-heartbeat.js`, `system-season-end.js`, `system-timer.js`, `system-image-cropper.js`, `api-monitor.js`, `user-achievements.js`, `user-raid-history.js`, `user-search.js`, `user-quests.js`, `user-hideout.js`, `app-utils.js`, `ui-navbar.js`, `user-community.js`, `user-profiles.js`, `user-share.js`, `user-teams.js`, `battlepass-calculator.js`, `battlepass-rewards.js`, `ui-live-data-flow.js`, `ui-navigation.js`, `ui-toasts.js`, `raid-notifications.js`, `app-init.js`, `app-seasons.js`, `app-welcome-screen.js`.

### Features by script

- `media/utility/odometer.js` — third-party number animation used by `animateNumber()` (`js/app-core.js`).
- `js/api-fetch.js` — `apiFetch()` wrapper: cache-busting `?t=` param, AbortController timeout (default 10000 ms), JSON parsing, optional error toasts via `showToast`.
- `js/app-core.js` — leaderboard engine:
  - Loads current season data (`loadSeasonData(CURRENT_SEASON)` → `../api/data/seasons/season12.json`); shows `#emptyLeaderboardNotification` when data is missing.
  - `initEngine()` main-page detection: `pathname` in `['/', '/index.html', '/index.htm', '/index.php']` **with empty `search` and empty `hash`** sets `EngineState.isOnMainPage = true`; otherwise false.
  - Loads previous-season winners (`loadPreviousSeasonWinners()`, season 11, with `fallbacks/11.json` fallback) via `system-winners.js` `displayWinners()`.
  - Restores previous aggregate stats from localStorage (`leaderboardStats`) and re-saves them after winner load (`saveCurrentStats()`).
  - Loads shared achievement counters (`loadAchievementsData()` from `user-achievements.js`) on the main page.
  - Full leaderboard render (`displayLeaderboard`, batched 50 rows with `setTimeout(processNextBatch, 0)` yielding) and compact render (`displaySimpleLeaderboard`, skips players outside top 50 offline > 15 days when auto-update is on).
  - Row features: heartbeat-based "Online / In Raid / In Transit / Gearing Up / Browsing Flea / Modding Weapon / Trading / Finished Raid / Offline / Banned" status column; standing badges (banned, suspicious "SkillIssueDetector™ (Beta)", hardcore, good standing, Premium BattlePass owner, boost % with icon/color); network-rank icon + tooltip (`getRank()`, 50 levels/5 groups); prestige icons 1–6; skill tier label (`getRankLabel()` L-…G); share button (`copyProfile`); PMC/SCAV raid counts; color-coded SR/KDR/Life Time/SPT version (`addColorIndicators()`); "Calibrating..." for zero score.
  - Row/table click handling: player cell → `openProfile(playerId)`; team tag → `openTeam(tag)`.
  - Ranking: `calculatePlaces()` sorts by `totalScore`, zeroes and re-ranks banned players as `"BANNED"` with `media/default_banned.png`, labels casual players `"Casual"`.
  - Aggregate stats bar: `calculateOverallStats()` computes totals (raids, kills, deaths, damage, K/D, avg survival, play time, total players, online from heartbeat) and animates them via odometer; welcome-screen numbers animated only while `localStorage['welcomeClosed'] !== 'true'`.
  - `resetStats()` zeroing counters on data failure.
- `js/api-auth.js` — Network login status: `checkAuth()` POST-less GET to `/api/network/login/check_auth.php` with `credentials: 'include'` and 10 s abort; updates `#loginButton`, `#loginButtonText`, `#userProfilePfp`, `#userAvatar`, `#networkNotifies` (unread badge, "99+" cap); sets `isLoggedIn` and `window.global_user_data`. `silentAuthCheck()` is defined but never invoked anywhere in the repo.
- `js/system-winners.js` — previous-season Hall of Fame: `displayWinners()` renders top 3 of the previous season (ordered 2-1-3) into `#winners` with medal classes, crown/medal icons, avatars (`{pmcPfpsPath}{permaLink}.png`), rank text, and skill score.
- `js/system-heartbeat.js` — `HeartbeatMonitor` class polling `ApiPaths.heartbeatsPath` (`../api/main/heartbeat/heartbeats.json`); online threshold 300 s; `getOnlineCount()`, `isOnline(id)`, `getPlayerStatus(id)` (status map: online, in_menu, in_hideout, in_raid, in_transit, in_stash, in_flea, in_modding, in_trading, raid_end), `getLastOnlineTime()`; instance on `window.heartbeatMonitor`.
- `js/system-season-end.js` — season-finale overlay: `endSeason()` (triggered by the countdown timer) builds `#seasonOverlay` with looping `media/season_end/test.mp4` video, season stat cards (kills, raids, playtime), season facts (top fragger, deadliest weapon, most played map, trade volume, best survivor, top grinder), top-3 hero cards with rank badges, validated PMC full-body images (`checkPMCExists()`, 5 s timeout, `imageCache` Map), animated card entrance (2 s stagger), shuffled player rotation (`startPlayerRotation()`, 5 s interval), season-end music (`season_end_final.mp3` then looping `end_music.mp3`), stat count-up animations, and `cleanupSeasonEnd()`. Also exports `calculateSeasonStats()`, `filterPlayersWithImages()`, `renderHeroElement()`, `checkPMCExists()` reused by the welcome screen.
- `js/system-timer.js` — season countdown: `seasonEndTimestamp = 1796083200 * 1000` (2026-12-01 00:00:00 UTC); `runTimer()` writes `#endDateDisplay` (UTC date), ticks `#timerDisplay` every second ("Xd Xh Xm Xs (UTC)"); on expiry sets "Season has ended!", stops the interval, and calls `endSeason()` once after `waitForDataReady()`. Also calls `playAppropriateTrack(diff)` with staged thresholds (≤30 s / ≤85 s / ≤145 s) — note `audioElements` is declared in `system-season-end.js` and never populated, so those plays target empty keys.
- `js/system-image-cropper.js` — PMC full-body image loading: `autoCropTransparent()` canvas alpha-trim (padding 5 px), `loadAndCropPlayerImage()` loads `{pmcPfpsPath}{permaLink}_full.png` (cache-busted when the `cacheBypassToggle` setting is on) into `.playermodel-image img` with `media/default_full_pmc_avatar.png` fallback.
- `js/api-monitor.js` — API status badge `#serverStatus`: polls `/api/main/online.json` every 30 s; states "API Degradation" / "API is Updating" / "API is Online" / "API is Unreachable" with hover tooltip for `workText`.
- `js/user-achievements.js` — per-player achievements: loads `achievements/js/compiledAchData.json`, `achievements/js/compiledAchSEData.json`, `ApiPaths.achievementsPath` (`/api/data/shared/achievement_counters.json`); computes global obtain percentages; latest-achievement card and "all achievements" grid (rarity order Common/Epic/Legendary, then timestamp); icon resolution via `https://assets.tarkov.dev/achievement-{id}-icon.webp` (1 s test) with local `imageUrl` fallback and `media/player-achievements/Standard_35_1.png` default.
- `js/user-raid-history.js` — profile raid history: loads `{lastRaidsPath}{permaLink}_index.json` then all `{permaLink}_blob_{n}.json` blobs (progress % in loader), falls back to legacy `{permaLink}.json`; sorts newest-first; paginated display 50 at a time with "Show More" button; day/week group markers and "Returned into battle after …" marker (>14 days gap); raid cards with map background/icon, status (Survived / Killed in Action / Runner / Left / In Transit), faction, duration, "time ago", killer info (edition color + body-part decode), badges (Map Wipe ≥10 kills, Boss Hunter >5 bosses, Found LEDX/Intel Folder/GPU/Bitcoin, Richest Raid >15 M ₽), profit, LC points, skill-score diff, stats grid; cross-profile indicator ("Played on: …" opens that profile); raids summary (survival rate, avg kills, total kills/damage/EXP/LC/profit, longest HS); per-map stats cards (favourite maps: top 3 with ≥40 raids); profile raid-streak badge (consecutive active days); body-hit visualization on an SVG body (head/chest/stomach/arms/legs, selector 10/25/50/100/500/All).
- `js/user-search.js` — in-table search: `AppState` module; search by name or by ID (toggle buttons + Ctrl+1/Ctrl+2 shortcuts, persisted); debounced (200 ms) filtering of `tbody` rows with highlight animation; Clear button; disables auto-update while a search is active; restores last search/type on load; re-inits `AutoUpdater` (with no arguments).
- `js/user-quests.js` — profile quest list: loads `achievements/js/compiledQuests.json`, merges with `player.completed_quests`; statuses Completed / In Progress / Not Accepted; filter buttons, text search, "Showing X of Y" counter, stats header (total/completed/in-progress/not-accepted/completion %); quest image resolution over `media/player_quests/` with `.png`/`.jpg` attempts and `default.jpg` fallback.
- `js/user-hideout.js` — profile hideout grid: `HIDEOUT_MODULES` catalog (26 modules with max levels), built (sorted by level) vs not-built module cards with `media/player_hideout/` images.
- `js/app-utils.js` — shared utilities: `escapeHtml`, `sleep`, `getPrettyMapName` (map alias table), `getBoostDescription`, `initNavbar` (top-stats-bar offset CSS vars + navbar dropdown open/close behavior), `getRank()` (rating → rank name/level 1–50/image/gradient/border/text colors), `getRankText()`, `setCookie`/`getCookie` (localStorage-first with cookie mirror), `cleanWeaponNameFunc`, time formatters (`formatLastPlayedRaid`, `formatSeconds`, `formatDate`, `formatOnlineTime`, `formatPlayTime`, `formatPlayTimeShort`, `formatLastSeen` (deprecated), `formatTime`, `howMuchUntilFutureDateWeHaveLeft`), `capitalize`, `getCustomProfileSettings()` (POST to `profileAppearencePath`), `waitForDataReady()` (500 ms poll on `EngineState.isDataReady`, 15 s timeout + error toast), `formatSalesNum`, `isPremium`, `loadJSON`, `window.findPlayer`, `window.findPlayerByPermaLink`, `renderUsernameHTML` (priority-ranked name styles: rank 1/2/3 gold/silver/bronze, banned, dev, tester, SPTLB team, winner, premium, Twitch Players, EOD/Unheard icons), `getPlayerEdition`, `truncateName`, `imageExists`, `loadAndCropPlayerImageUtil`, `KeepAliveService` (started immediately; POSTs `api/main/heartbeat/keepalive.php` every 30 s, retry backoff up to 3, dispatches `connectionLost` CustomEvent), settings access via `SettingsHelper` (defined in `ui-navigation.js`).
- `js/ui-navbar.js` — single `DOMContentLoaded` listener calling `initNavbar()` (implemented in `app-utils.js`).
- `js/user-community.js` — profile community features:
  - `FriendManager`: friend status check via `/api/network/functions/community/is_friend.php` (5 min cache), add friend via `send_friend_request.php`, unfriend dropdown (removal is a stub with a 1 s delay, no API call), friend list merge of server friends (`get_friends.php`) and "local friends" (same `permaLink` or `teamTag` from `leaderboardData`), heartbeat-driven online dots/status, click opens that profile (`openProfile(id, true)`), login-required button → `/api/login/`.
  - `CommentsManager`: loads `/api/data/user-comments/player_{permaLink}.json`, paginated rendering (5 per page, page indicators with ellipsis), submit via `send_comment.php`, likes via `like_comment.php`, replies via `reply_comment.php`, soft delete via `delete_comment.php` (author or `role > 5`), role badges (Staff/Casual/Ranked/Trusted), raid-count badge, online indicator, guest badge, HTML-entity-safe rendering, login-disabled form.
  - `RaidTimeAnimator`: requestAnimationFrame clock advancing an in-raid HH:MM:SS at 7× real time, resynced from heartbeats.
  - `PlayerEquipmentDisplay`: loads `/api/data/pmc_equipment/{playerId}.json`, renders helmet/face cover/headset/eyewear, tactical/armor vest, primary/secondary/holster weapons, backpack as icons (CDN `assets.tarkov.dev/{template_id}-512.webp`), weapon click opens attachment tooltip with grouped categories and batched image loading (3 per 50 ms).
  - `TabManager`: Summary / Season Records tabs; computes season-wide averages/max per stat from `leaderboardData` and renders record-comparison cards ("Record Holder", "Most Deaths", "Unluckiest SCAV"); dispatches `globalAveragesReady` CustomEvent consumed in `user-profiles.js` for summary trend arrows.
  - `ProfileLoader`: `#loading-model` overlay with staged status text.
- `js/user-profiles.js` — profile modal engine: `ProfileState`; `openProfile(playerId, reOpenProfile)` guards re-entry, sets `window.location.hash = 'id=…'`, disables the leaderboard table and auto-update, loads customization via `getCustomProfileSettings()` (theme, prestige styling, BattlePass rewards, about-me, discord, custom pfp/name, showcase items), `localhost` demo overrides; renders three-column profile (main card with PMC/SCAV overviews, registration dropdown with account info, raid details while in raid, breach modifiers from `player.breachTraits` with `BREACH_MODIFIER_META` catalog, item showcase, badges incl. prestige/winner/premium/banned-before/kappa/dev/hardcore/seasons-played tiers/trusted/suspicious; leaderboard rank display; body-hit SVG; stats by map; latest achievement; achievements; hideout; summary/records tabs; raid history; comment form + list + pagination; quests; full-body player model with health/hydration/energy; friend list; most-used weapon (Stattrack) with mastery EXP bar; weapons list; trader standings for 11 traders), `generateBadgesHTML()`, `startStatusUpdater()` (5 s heartbeat polling of the open profile; on state change refreshes player image, quests, raid history, hideout; runs the raid clock), `updateSummaryTrends()` via `globalAveragesReady`, modal close (button/Escape) with cleanup of intervals/managers, hash cleared via `history.replaceState`, scroll restore, `window.closeProfile` exposure.
- `js/user-share.js` — profile deep links: `copyProfile(id)` copies `{profileUrlPath}{id}` (fallback `document.execCommand('copy')`) with toasts; `checkUrlHash()` on `DOMContentLoaded` and `hashchange` handles `#id=<playerId>` (opens profile after `waitForDataReady()` + 500 ms) and calls `window.closeProfile()` when the hash is removed.
- `js/user-teams.js` — team modal: `openTeam(tag)` filters `leaderboardData` by case-insensitive `teamTag` (dedup by permaLink/id), sorts by rating then PMC level, renders aggregate stats (members, avg level, total PMC raids, total kills, avg survival) and member cards; click on a member opens their profile; close via button/overlay/Escape.
- `js/battlepass-calculator.js` — `initHOF(player, bestWeapon)`: computes `battlePassLevel` from `networkRaids` via `getRank()`; Stattrack weapon mastery (`calculateMasteryLevel`: EXP = 0.1×shots + 30×kills + 70×headshots, 800 EXP/level) rendered into mastery UI; calls `refreshRewards()`.
- `js/battlepass-rewards.js` — BattlePass cosmetic rewards: `refreshRewards()` applies level-gated card backgrounds, main backgrounds (incl. achievement-gated goons/lighthouse/raider), weapon decals, avatar border colors, prestige styling, and cat reward (`#catrew` shown when `bp_cat` and level ≥ 20).
- `js/ui-live-data-flow.js` — `AutoUpdater` module: 1 s countdown ticker; reloads `loadSeasonData(CURRENT_SEASON)` every `updateInterval = 8` ticks; "Live Data Flow" toggle + Normal/Force update mode radios (`#autoUpdateToggle`, `#timeToUpdate`, `#normalRadio`, `#forceUpdateRadio`); persists toggle/mode via `getCookie`/`setCookie`; "Next update in: Xs" / "Force update in: Xs" / "Updating..." / "Auto-update disabled" display; skips re-render in normal mode when data unchanged (`areLeaderboardsEqual`).
- `js/ui-navigation.js` — `SettingsManager` (`window.settingsManager`) and `SettingsHelper`: settings `showTimer`, `showWinners`, `lbToggle`, `casualToggle`, `cacheBypassToggle` persisted to localStorage `appSettings`; instant-apply on toggle change + Save button; shows/hides `#seasonTimer` and `#winners`; modals: Ranking System info, Banned Mods (`/api/network/functions/get_banned_mods.php`), Whitelisted Mods (`/api/network/functions/get_whitelist_mods.php`), LA/TOS, Settings; close via ×, outside click, Escape.
- `js/ui-toasts.js` — `ToastManager` + `showToast()` compat wrapper: success/error/warning/info toasts, 3000 ms default auto-dismiss with hover pause and progress bar.
- `js/raid-notifications.js` — live raid toast feed: `checkRecentPlayers()` (called from `loadSeasonData`) notifies players active in the last 10 min (max 3 on load, staggered by 1600 ms); `showPlayerNotification()` with dedupe per raid, 1600 ms throttle, max 5 stacked notifications; raid result sounds (`pmc-raid-run/died`, `scav-raid-run/died`); killstreak text + sounds (standard handler and `UpgradedKillstreakHandler` for `sptlb_killstreak_upgrade`, incl. "RAMPAGE"); raid win-streak > 5 sound; profit/loss highlights (≥ +2.5 M ₽ / ≤ −1.5 M ₽ sounds); new-player welcome ("NEW" badge, firstblood sound, 24 h cookie dedupe); ban notifications with reveal music and reason/date/moderator (61 min cookie dedupe); auto-removal 12 s (ban/new 27 s); map background from `media/leaderboard_icons/maps/`.
- `js/app-init.js` — preloader: weighted resource checklist (API connectivity + HEAD checks of core scripts), min display time per resource (800 + index×100 ms); progress-gated boot: ≥25 % `initEngine()`, then `checkAuth()`, then `AutoUpdater.init('autoUpdateToggle', 'timeToUpdate', 'forceUpdateRadio', 'heartbeatRadio', 'normalRadio')` + `runTimer()` + `initSearch()`, then `waitForDataReady()` → `completeLoading()` (hides `#loader`, restores body scroll); error container with Retry; `initWelcomeScreen()` at ≥75 % progress. Note: `init()` is called with 5 arguments while `AutoUpdater.init` declares 4 parameters, so the 5th (`'normalRadio'`) is dropped and `normalRadio` is bound to the non-existent `#heartbeatRadio` element.
- `js/app-seasons.js` — snowfall effect (NCVV-inherited IIFE): 20 snowflakes animated via `requestAnimationFrame`, only during winter months (Dec/Jan/Feb); removes `.snowflake` element otherwise.
- `js/app-welcome-screen.js` — first-visit welcome overlay (shown while `localStorage['SPTLBWelcome'] !== 'true'`): video background, rotating glitch text (`Fun` class, 2 s per phrase), three showcase players (newcomer/veteran/champion selection with image validation and no-repeat memory `lastShownPlayers`), season stat counters, buttons: "Enter Leaderboard" (persists `SPTLBWelcome=true`), external mod page + Discord, and `window.location.href = '../insights/'` ("Global Statistics").
- `index.html` static features: preloader with retry; navbar (Stats/Info/System dropdowns, login button with avatar + unread badge); info modals (Ranking System text, Banned Mods, Whitelisted Mods, LA/TOS text, Settings); top stats bar (API status + aggregate odometer stats + season players + online); winners strip; KORD Breach event announcement with Discord link; leaderboard table with sortable headers (`data-sort` attributes; no JS sorting implementation found — sorting is by `calculatePlaces` only); search + live-data controls; season timer div; empty-leaderboard offline notification; player profile modal shell; footer (GitHub, forge mod link, MIT); Discord links.

### Shared global variables used on this page

- Defined in `js/app-core.js`: `leaderboardData`, `oldLeaderboardData`, `CURRENT_SEASON` (= 12), `isLoggedIn`, `EngineState`, `isLocalhost`, `PrevStats`, `ApiPaths`.
- Defined in `js/api-auth.js`: `autoLoginAttempts`, `authCheckInProgress`, `authCheckCompleted`, `window.global_user_data`.
- Defined in `js/app-utils.js`: `window.findPlayer`, `window.findPlayerByPermaLink`, `window.keepAliveService` (plus plain shared functions).
- Defined in `js/system-heartbeat.js`: `window.heartbeatMonitor`.
- Defined in `js/ui-live-data-flow.js`: `AutoUpdater`.
- Defined in `js/ui-navigation.js`: `window.settingsManager`, `SettingsManager`, `SettingsHelper`.
- Defined in `js/ui-toasts.js`: `toastManager`, `showToast`.
- Defined in `js/user-search.js`: `AppState`.
- Defined in `js/system-season-end.js`: `imageCache`, `audioElements`, `lastPlayed`, `playerRotationInterval`, `rotationIndex`, `isSwapping`; at runtime also `window.seasonRotationPlayers`, `window.seasonTopPlayers`, `window.seasonMusic`.
- Defined in `js/system-timer.js`: `seasonEndTimestamp`, `timerInterval`, `seasonEnded`.
- Defined in `js/raid-notifications.js`: `playerNotificationData`, `processedNewPlayers`, `notificationStack`, `NOTIFICATION_DELAY`, `MAX_NOTIFICATIONS`, `lastNotificationTime`, `isBanSoundPlaying`.
- Defined in `js/user-achievements.js`: `achievementsData`, `playerAchievements`, `totalPlayers`, `achievementStats`, `isDataLoaded`.
- Defined in `js/user-quests.js`: `currentQuests`, `currentFilter`, `currentSearch`.
- Defined in `js/user-hideout.js`: `HIDEOUT_MODULES`.
- Defined in `js/user-raid-history.js`: `RAID_STATUSES`, `RAID_STAT_KEYS`, `DISPLAY_BATCH_SIZE`, `currentDisplayOffset`, `allRaids`, `isLoadingMore`, `hasMoreToDisplay`, `currentPlayerIdGlobal`, `isFullyLoaded`; runtime `window.raidEventController`.
- Defined in `js/user-teams.js`: `currentTeamData`.
- Defined in `js/user-share.js`: `_profileOpenTimeout`.
- Defined in `js/user-profiles.js`: `ProfileState`, `BREACH_ICON_BASE`, `BREACH_MODIFIER_META`, `BREACH_FALLBACK_ICON`; runtime `window.profileLoader`, `window.closeProfile`.
- Defined in `js/app-welcome-screen.js`: `lastShownPlayers`, `phrases`.
- Classes defined in `js/user-community.js` and used by `user-profiles.js`: `FriendManager`, `CommentsManager`, `RaidTimeAnimator`, `PlayerEquipmentDisplay`, `TabManager`, `ProfileLoader`.
- Classes defined in `js/system-season-end.js`/`js/system-heartbeat.js`/`js/ui-navigation.js`: none exported as globals except instances listed above.

### Timers (interval / one-shot)

- `js/system-heartbeat.js`: `setInterval` → `fetchHeartbeats()` every `fetchTime` = **1000 ms**.
- `js/api-monitor.js`: `setInterval` → `updateServerStatus()` every **30000 ms** (after initial call on `DOMContentLoaded`).
- `js/app-utils.js` (`KeepAliveService`, started at load): `setInterval` → POST keepalive heartbeat every `#heartbeatInterval` = **30000 ms**; retry backoff `setTimeout` up to **30000 ms**.
- `js/app-utils.js` (`waitForDataReady`): `setInterval` poll every **500 ms** (until data ready or 15000 ms timeout).
- `js/system-timer.js`: `setInterval` → `updateTimer()` every **1000 ms** (`timerInterval`, cleared when the season ends).
- `js/ui-live-data-flow.js` (`AutoUpdater`): `setInterval` tick every **1000 ms**; data reload every **8** ticks.
- `js/raid-notifications.js`: throttle **1600 ms** (`NOTIFICATION_DELAY`); notification removal at **12000/12300 ms**; ban/new-player removal at **27000/27300 ms**; initial batch staggered `shownCount * 1600 ms`; throttle-eviction **200 ms**.
- `js/system-season-end.js`: `playerRotationInterval` every **5000 ms**; entrance/animation `setTimeout`s (100/300/400 ms, hero stagger 2000 ms, rotation start delay 400 + top3×2000 + 3000 ms, fact stagger 700 + i×100 ms); image existence check timeout **5000 ms**.
- `js/user-profiles.js`: `startStatusUpdater` poll every **5000 ms**; `RaidTimeAnimator` `requestAnimationFrame` loop (7× speed); `startRegistrationInfoUpdater` defines a **60000 ms** interval but is never called.
- `js/user-search.js`: search debounce **200 ms**; restore-search run after **300 ms**; row stagger `index * 5 ms`; clear-button **150 ms**.
- `js/user-quests.js`: grid refresh delay **200 ms**; card animation delay `index * 0.05 s`.
- `js/user-raid-history.js`: "Show More" render delay **100 ms**; batches of **50** raids.
- `js/user-community.js`: comment page-transition **400 ms**, new-comment highlight **600 ms**, success flash **2000 ms**, error flash **3000 ms**, friend-request refresh **2000 ms**, unfriend stub **1000 ms**, attachment image batches of 3 every **50 ms**, image tests **1000/2000 ms**.
- `js/ui-toasts.js`: default toast duration **3000 ms**, slide-out **300 ms**.
- `js/ui-navigation.js`: save-confirmation **2000 ms**; modal open/close transitions **10 ms / 300 ms**.
- `js/app-init.js`: per-resource minimum display **800 + index×100 ms**; loader hide **1300 ms**; scroll restore **+300 ms**; status text fade **200/400 ms**.
- `js/app-welcome-screen.js`: phrase rotation every **2000 ms** (first after **1000 ms**); hero reveal **800 + i×500 ms** after **400 ms**; image crop start after **100 ms**.
- `js/app-core.js`: render batch yield `setTimeout(processNextBatch, 0)`.
- `js/api-fetch.js` / `js/api-auth.js`: AbortController timeouts of **10000 ms** (default per request).
- `js/user-achievements.js`: CDN icon test timeout **1000 ms** per icon.

### localStorage keys

- `leaderboardStats` — read in `app-core.js initEngine()` (main page), written by `saveCurrentStats()`.
- `welcomeClosed` — read in `app-core.js calculateOverallStats()` (gates welcome-screen number animation).
- `SPTLBWelcome` — read/written by `app-welcome-screen.js`.
- `appSettings` — read/written by `ui-navigation.js` (`SettingsManager`).
- Mirrored preference keys read/written through `getCookie()`/`setCookie()` (`app-utils.js`), which use localStorage first and a cookie as fallback/mirror: `autoUpdateEnabled`, `updateMode`, `forceUpdateEnabled` (`ui-live-data-flow.js`), `searchType`, `playerSearch` (`user-search.js`).

### Cookies

- Via `setCookie(name, value)` (`app-utils.js`): `name=value; path=/; max-age=31536000` — used for `autoUpdateEnabled`, `updateMode`, `forceUpdateEnabled`, `searchType`, `playerSearch`.
- `banNotify_{playerId}=1` (`raid-notifications.js`) — expires after **61 minutes**, `path=/`.
- `newPlayer_{playerId}=1` (`raid-notifications.js`) — expires after **24 hours**, `path=/; SameSite=Lax`, plus `Secure` on HTTPS.
- Network session cookie: sent with `credentials: 'include'` on `/api/network/login/check_auth.php` and friend endpoints; the cookie name is not present in frontend code.

### Hash routes

- `#id=<playerId>` — opens the player profile modal (`user-share.js` `checkUrlHash()` on load and `hashchange`; `user-profiles.js` sets this hash in `openProfile()` and clears it with `history.replaceState` on close).
- Any non-empty hash (including `#id=…`) makes `app-core.js initEngine()` classify the page as **not** the main page (`EngineState.isOnMainPage = false`).

---

## Page: `achievements/index.html` (Achievement Rates)

### Scripts loaded

`https://cdn.jsdelivr.net/npm/chart.js` (loaded but no chart is created by the page script), then from `js/`: `api-fetch.js`, `app-core.js`, `api-auth.js`, `achievements/js/achievements.js`, `api-monitor.js`, `app-utils.js`, `ui-navbar.js`, `app-seasons.js`.

### Features

- `achievements/js/achievements.js` — global achievement-rate cards: loads `../achievements/js/compiledAchData.json`, `../achievements/js/compiledAchSEData.json`, and `ApiPaths.achievementsPath` (`/api/data/shared/achievement_counters.json`) via `loadJSON()`; merges old (SPT 3.11) and new (SPT 4.0) achievement catalogs; computes per-achievement completion % over all recorded players; renders cards sorted by rarity (common/rare/legendary) then completion, with colored borders, icons from `..{achievement.imageUrl}`, progress bars, and rarity labels.
- `js/api-auth.js`, `js/api-monitor.js`, `js/app-utils.js`, `js/ui-navbar.js`, `js/app-seasons.js` — same shared features as on the main page (login button state, API status badge + navbar behavior, utility functions, snowfall).
- `js/app-core.js` — `initEngine()` runs on `DOMContentLoaded`? No: on this page nothing calls `initEngine()`; only the globals/paths are defined. `EngineState.isOnMainPage` stays `false` (pathname is `/achievements/`).
- Page markup: navbar (Stats dropdown, "Go back" link, login button), `#serverStatus` bar, `#achievements-container` with loading dots, footer.

### Shared global variables used

- `ApiPaths` (reads `ApiPaths.achievementsPath`), `EngineState`, `CURRENT_SEASON`, `leaderboardData`, `isLoggedIn`, `isLocalhost`, `PrevStats` (all defined in `app-core.js`, loaded; only `ApiPaths` is actually read by the page script).
- `window.global_user_data` (defined by `api-auth.js`), `showToast` (defined by `ui-toasts.js`, which this page does **not** load), `window.keepAliveService` and `window.findPlayer`/`window.findPlayerByPermaLink` (defined by `app-utils.js`).

### Timers

- `js/api-monitor.js`: `setInterval` **30000 ms** (API status).
- `js/app-utils.js` `KeepAliveService`: `setInterval` **30000 ms** (keepalive POST, started at script load).

### localStorage keys

- None read or written by the scripts this page loads (`getCookie` is not invoked on this page).

### Cookies

- None set by these scripts; the Network session cookie travels with `credentials: 'include'` on the auth check endpoints (name not in frontend code).

### Hash routes

- None handled.

---

## Page: `global/index.html` (Global Leaderboard)

### Scripts loaded

`/js/api-fetch.js`, `/js/api-auth.js`, `/js/app-core.js`, `/js/system-heartbeat.js`, `/js/api-monitor.js`, `/js/app-utils.js`, `/js/ui-toasts.js`, `/js/ui-navbar.js`, `/js/app-seasons.js`, plus `media/utility/odometer.js` and `js/main.js` (i.e. `global/js/main.js`, loaded at the end of `body`).

### Features

- `global/js/main.js` — all-time global leaderboard: `API.players = '/api/network/functions/global-lb/players.php'`, `API.sorts = '/api/network/functions/global-lb/sort_options.php'`; state `{sort: 'richest', limit: 25, q: ''}`; loads sort options into `#sortSelect`; reloads on sort change / limit change (`#limitSelect`: 10/25/50/100/All) / debounced (250 ms) search (`#playerSearch`, Clear button); renders rank, team tag, avatar + name, "time ago" last seen, net worth, and two sort-dependent columns per `COLUMN_CONFIG` (16 sort keys: richest, total_balance, inventory_value, showcase_value, most_kills, pmc_kills, scav_kills, boss_kills, most_damage, most_raids, survived, max_streak, raid_time, battlepass_exp, seasons, net_worth); dynamically renames table headers 6 and 7.
- `js/system-heartbeat.js` — heartbeat polling runs on this page (see timers) although no page code consumes it.
- `js/app-core.js` — globals only on this page; `initEngine()` is never called here.
- `js/api-fetch.js`, `js/api-auth.js`, `js/api-monitor.js`, `js/app-utils.js`, `js/ui-toasts.js`, `js/ui-navbar.js`, `js/app-seasons.js` — shared features as on the main page.
- Page markup: navbar with a four-item Stats dropdown (Global Leaderboard, Weapon Meta, Global Insights, Achievement Rates), "Go back", login; search + sort/limit controls; 7-column `#leaderboardTable`; footer.

### Shared global variables used

- `ApiPaths`, `EngineState`, `CURRENT_SEASON`, `leaderboardData`, `isLoggedIn`, `isLocalhost`, `PrevStats` (defined in `app-core.js`; the page script uses none of them directly and uses its own `fetch()`).
- `window.global_user_data` (`api-auth.js`), `window.heartbeatMonitor` (`system-heartbeat.js`), `window.keepAliveService` (`app-utils.js`), `toastManager`/`showToast` (`ui-toasts.js`).

### Timers

- `js/system-heartbeat.js`: `setInterval` **1000 ms** (heartbeat fetch).
- `js/api-monitor.js`: `setInterval` **30000 ms** (API status).
- `js/app-utils.js` `KeepAliveService`: `setInterval` **30000 ms** (keepalive POST).
- `global/js/main.js`: search debounce **250 ms**.

### localStorage keys

- None read or written by the scripts this page loads.

### Cookies

- None set by these scripts; Network session cookie via `credentials: 'include'` on auth endpoints.

### Hash routes

- None handled.

---

## Page: `insights/index.html` (Global Insights / Data Report)

### Scripts loaded

`https://cdn.jsdelivr.net/npm/chart.js`, then from `js/`: `api-fetch.js`, `app-core.js`, `api-auth.js`, `insights/js/main.js`, `api-monitor.js`, `app-utils.js`, `ui-navbar.js`, `app-seasons.js`.

### Features

- `insights/js/main.js` — all-time data report (Chart.js):
  - Fetches season files `../api/data/seasons/season2.json` … `season10.json` (hardcoded list `[2..10]`) and `../api/data/shared/global_counters.json`; flattens all `leaderboard` arrays into `playersData`.
  - Summary card: total raids (PMC + SCAV + `mapsData.total_raids`), total players, total play time, total damage, global K/D, average PMC level, Kappa count + %.
  - Charts: PMC/SCAV raid distribution (pie), survival-rate buckets, K/D buckets, account editions (doughnut), PMC sides (pie), PMC level buckets, prestige distribution, average-lifetime buckets, longest-shot buckets, hit-zone distribution, trader loyalty (LL > 2), trader sales-sum buckets, playstyle (PvE/Mixed/PvP), boss-kill buckets, map popularity (bar + map list with counts and %, from `global_counters.json` keys filtered to a 13-map allowlist).
  - Helpers: `createChart`, `updateChart`, `getRandomColor`, local `formatPlayTime`; uses shared `getPrettyMapName`.
- `js/api-auth.js`, `js/api-monitor.js`, `js/app-utils.js`, `js/ui-navbar.js`, `js/app-seasons.js` — shared features as on the main page.
- `js/app-core.js` — globals only; `initEngine()` is never called on this page.
- Page markup: navbar, `#serverStatus`, "general" tab with stats card + 14 chart canvases, "maps" tab with 2 canvases + `#map-stats`, footer. (No tab-switching JS found in `insights/js/main.js`; the "general" tab has class `active` in markup.)

### Shared global variables used

- `ApiPaths`, `EngineState`, `CURRENT_SEASON`, `leaderboardData`, `isLoggedIn`, `isLocalhost`, `PrevStats` (defined in `app-core.js`; the page script reads none of them, using its own `fetch()` and its own `playersData`/`mapsData`/`charts` globals).
- `window.global_user_data` (`api-auth.js`), `window.keepAliveService` (`app-utils.js`).

### Timers

- `js/api-monitor.js`: `setInterval` **30000 ms** (API status).
- `js/app-utils.js` `KeepAliveService`: `setInterval` **30000 ms** (keepalive POST).
- No other timers in the page script.

### localStorage keys

- None read or written by the scripts this page loads.

### Cookies

- None set by these scripts; Network session cookie via auth endpoints.

### Hash routes

- None handled.

---

## Page: `meta/index.html` (Weapon Meta)

### Scripts loaded

From `js/`: `api-fetch.js`, `app-core.js`, `app-utils.js`, `ui-navbar.js`, `api-auth.js`, then `meta/js/main.js`, then `api-monitor.js`, `app-seasons.js`.

### Features

- `meta/js/main.js` — weapon meta page:
  - Loads `ApiPaths.weaponStatsPath` (`/api/data/shared/weapon_counters.json?t=…`), then calls `await initEngine()` (from `app-core.js`) and `await waitForDataReady()` to join with leaderboard data, then loads `ApiPaths.equipmentBlobStatsPath` (`../api/data/pmc_equipment_blob/equipment_history_blob.json`) asynchronously.
  - Aggregates per-weapon stats across all players (kills, headshots, shots, times lost, average user level, top 3 maps, top players by kills); classifies weapons via a hardcoded `weaponCategories` catalog (template-id → main category / subcategory / caliber, including "WTT" modded weapons); computes kills %, headshot %, avg shots-to-kill, times-lost ratio.
  - Filters: text search, main category, cascading subcategory and caliber dropdowns (`populateSubCategories`/`populateCalibers`).
  - Weapon cards: rank, icon, tags (Early Game / Mid-Wipe / Endgame / Veteran, Community Favorite / Popular Choice, Noob Stomper, Highly Modded), map tags, top-3 player preview, stats grid.
  - Analytics modal (`openWeaponModal`): attachments pick-rate per category (CDN icons), top 10 players (with rendered usernames via `renderUsernameHTML` when found in leaderboard data), loadout previews (5 shown, "+N more"), tab switching, overlay/Escape close, "show more" items expansion.
- `js/app-core.js` — `initEngine()` is invoked by the page script; since pathname is `/meta/`, `EngineState.isOnMainPage` is `false`: season 12 data is fetched and ranked (`loadSeasonData(12)` → `calculatePlaces`) but not rendered, and `EngineState.isDataReady` becomes `true` (used for `waitForDataReady`).
- `js/app-utils.js`, `js/ui-navbar.js`, `js/api-auth.js`, `js/api-monitor.js`, `js/app-seasons.js` — shared features as on the main page (this page does **not** load `system-heartbeat.js`, `ui-toasts.js`, or `ui-live-data-flow.js`).
- Page markup: navbar, `#serverStatus`, weapon filter bar (`#weaponSearch`, `#mainCategory`, `#subCategory`, `#caliberFilter`), `#weaponsContainer` with loader, footer.

### Shared global variables used

- `ApiPaths` (reads `weaponStatsPath`, `equipmentBlobStatsPath`), `EngineState`, `CURRENT_SEASON`, `leaderboardData`, `isLoggedIn`, `isLocalhost`, `PrevStats`, `EngineState.isDataReady` via `waitForDataReady()` (all from `app-core.js`).
- `window.findPlayerByPermaLink`, `window.keepAliveService` (`app-utils.js`); `SettingsHelper` usage via `SettingsHelper.get('cacheBypassToggle')` patterns exists in shared code (not on this page's path); `window.global_user_data` (`api-auth.js`).
- Page-script globals: `allWeapons`, `allEquipmentData`, `weaponAttachmentsMap`, `weaponCategories`.

### Timers

- `js/api-monitor.js`: `setInterval` **30000 ms** (API status).
- `js/app-utils.js` `KeepAliveService`: `setInterval` **30000 ms** (keepalive POST).
- `js/app-utils.js` `waitForDataReady`: **500 ms** poll (invoked by the page script).
- No timers in `meta/js/main.js` itself.

### localStorage keys

- None read or written by the scripts this page loads.

### Cookies

- None set by these scripts; Network session cookie via auth endpoints.

### Hash routes

- None handled.

---

## Page: `archive/index.html`

- The file exists but is **empty (0 bytes)**. It loads no scripts, renders no markup, and implements no features. No other page links to it (the only mention of "archive" is prose in `index.html`'s Ranking System modal: "Full season archives in the dropdown menu"; no such dropdown exists in the current markup).

### Shared globals / Timers / localStorage / Cookies / Hash routes

- None (no scripts).

---

## Navigation

Recorded from the markup of each page (plus runtime navigations performed by page scripts).

| From page | Links to other pages of this site | Other (non-page) navigation targets |
| --- | --- | --- |
| `index.html` | `meta/` ("Weapon Meta"), `insights/` ("Global Insights"), `achievements/` ("Achievement Rates") — relative URLs in the Stats dropdown. Runtime: welcome screen "Global Statistics" button → `window.location.href = '../insights/'` (`app-welcome-screen.js`). | Logo and all nav dropdown buttons (`#`), login → `/api/network/login/index.php`, announcement + welcome Discord buttons (`https://discord.gg/…`), footer: GitHub issues, GitHub repo, `forge.sp-tarkov.com` mod page, MIT license link. |
| `achievements/index.html` | `/meta/`, `/insights/`, `/achievements/` (Stats dropdown); "Go back" → `/../` (site root). | Login → `/api/network/login/index.php`; footer external links as above. |
| `global/index.html` | `/global/` ("Global Leaderboard"), `/meta/`, `/insights/`, `/achievements/` (Stats dropdown); "Go back" → `/../`. | Login → `/api/network/login/index.php`; footer externals. |
| `insights/index.html` | `/meta/`, `/insights/`, `/achievements/` (Stats dropdown); "Go back" → `/../`. | Login → `/api/network/login/index.php`; footer externals. |
| `meta/index.html` | `/meta/`, `/insights/`, `/achievements/` (Stats dropdown); "Go back" → `/../`. | Login → `/api/network/login/index.php`; footer externals. |
| `archive/index.html` | None (empty file). | None. |

Facts:

- Every page's navbar logo links to `#` (no page uses the logo as a home link).
- `global/index.html` is the only subpage whose Stats dropdown includes a link to itself (`/global/`); the other subpages also include themselves in the dropdown (`/achievements/`, `/insights/`, `/meta/` respectively).
- The root `index.html` navbar has no link back to itself in the dropdown and has additional Info and System dropdowns (modal openers, not page links) that the subpages do not have.
- The login button on every page points to `/api/network/login/index.php` (server-side page, not part of this static repo).
- No page links to `archive/`.
- In-profile navigations (`openProfile`) are modal state changes plus the `#id=` hash on the same page, not page-to-page links.

---

## Season

Evidence for which season file `app-core.js` loads and what the current-season constant says:

- `js/app-core.js` line 18: `const CURRENT_SEASON = 12;`
- `js/app-core.js` `initEngine()` → `prepareSeasonData()` → `loadSeasonData(CURRENT_SEASON)`; `loadSeasonData(season)` fetches `` `${ApiPaths.seasonPath}${season}${ApiPaths.seasonPathEnd}` `` where `ApiPaths.seasonPath = '../api/data/seasons/season'` and `ApiPaths.seasonPathEnd = '.json'` → **`app-core.js` loads `../api/data/seasons/season12.json`** (freshly, and on every `AutoUpdater` cycle, which re-calls `loadSeasonData(CURRENT_SEASON)`).
- Previous-season winners: `loadPreviousSeasonWinners()` uses `previousSeason = CURRENT_SEASON - 1` → fetches **`../api/data/seasons/season11.json`**, with fallback **`../fallbacks/11.json`**.
- `ApiPaths.currentSeason` is declared as `'/api/data/seasons/season11.json'` (localhost override `'../fallbacks/season11.json'`). A repo-wide grep shows this property is **never read** by any code — it is only the declaration and the localhost reassignment. The actual load path is derived from `seasonPath` + `CURRENT_SEASON`, as above.
- Other `CURRENT_SEASON` consumers: `js/ui-live-data-flow.js` (`loadSeasonData(CURRENT_SEASON)` in the auto-update cycle and `forceUpdate()`), `js/system-season-end.js` (overlay title `` `SEASON ${CURRENT_SEASON} FINALE` ``).
- Local fallback data present in the repo: `fallbacks/season1.json` … `season12.json` (plus `oldSeason.bak`). The insights page independently fetches hardcoded `../api/data/seasons/season2.json` … `season10.json` (does not include 11 or 12).
- Season end constant: `js/system-timer.js` `const seasonEndTimestamp = 1796083200 * 1000;` — 1796083200 s epoch = **2026-12-01 00:00:00 UTC**. When the countdown reaches zero, the timer displays "Season has ended!" and triggers `endSeason()` (system-season-end overlay) once.
- Localhost note: `if (isLocalhost)` in `app-core.js` repoints `seasonPath` to `../fallbacks/season` and `currentSeason` to `../fallbacks/season11.json`; `loadSeasonData` itself still uses `seasonPath + CURRENT_SEASON`, i.e. `../fallbacks/season12.json` locally.

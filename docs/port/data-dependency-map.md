# Data Dependency Map (FRT-3)

Legacy network dependencies of the SPT Leaderboard frontend, verified against the code.
Facts only. Every `fetch` / `apiFetch` / `XMLHttpRequest` / image-`src` network read in the legacy code is listed.

## Method

- Entry points read: `js/app-core.js` (constants), then every file with network calls.
- The task's search (`rg -l "fetch\(|XMLHttpRequest" js/`) finds only 5 files, because most calls go through the
  `apiFetch()` wrapper (`js/api-fetch.js`), and `fetch\(` is case-sensitive (`apiFetch(` does not match).
  A follow-up `rg -n "apiFetch\(" js/` was used to get the full inventory; sibling pages
  (`global/`, `insights/`, `meta/`) were scanned as well.
- Player fields verified from `fallbacks/season12.json` (`fallbacks/` also has `season1..11.json` and `oldSeason.bak`).
  "Verified" = the field name is read as a player-object property somewhere in the legacy frontend
  (`js/`, `global/`, `insights/`, `meta/`); everything else is marked **unverified**.

## Constants (`js/app-core.js`)

- `CURRENT_SEASON = 12` (line 9). The current season file is `season12.json`.
- `ApiPaths` (lines 48–63) holds all legacy paths; on `localhost`/`127.0.0.1` an override block (lines 66–83)
  repoints most of them at `../fallbacks/…`.
- Dead constants (defined, never fetched anywhere): `ApiPaths.currentSeason` (`/api/data/seasons/season11.json`,
  stale vs `CURRENT_SEASON = 12`), `ApiPaths.profileComments`/`profileCommentsEnd` (comments are actually read via a
  separate literal in `user-community.js`), `ApiPaths.globalCounters` (`global_counters.json` is only fetched by the
  insights page with its own literal).

## Main table

All JSON calls return parsed JSON via `apiFetch()` (10 s timeout, cache-busting `?t=` by default).
"Replacement" = the API the new backend must serve for the same feature; same-path entries are the paths the
backend team already listed as known reads.

| # | Page or feature | Data read today | API call that replaces it | Priority |
|---|-----------------|-----------------|---------------------------|----------|
| 1 | Main page — leaderboard table + live auto-refresh | `{"leaderboard":[player,…]}` for the current season (`js/app-core.js:197`; periodic re-fetch `js/ui-live-data-flow.js:43,215`) | `GET /api/data/seasons/season12.json` (unchanged) | 1 |
| 2 | Main page — previous-season winners (Hall of Fame) | Season N−1 leaderboard (`js/app-core.js:163`), local fallback `../fallbacks/season11.json` (`js/app-core.js:165`) | `GET /api/data/seasons/season11.json` | 1 |
| 3 | Loader — connectivity check | Presence of online flag (`js/app-init.js:15,43`) | `GET /api/main/online.json` | 3 |
| 4 | Main page — server status badge | `online`/`underWork`/`outage`/`workText` (`js/api-monitor.js:9`) | `GET /api/main/online.json` | 3 |
| 5 | Session — auth state, avatar, unread badge | `authenticated`, `username`, `profilePicture`, `unreadCount`, `maintenance` (`js/api-auth.js:25,140`; `credentials: 'include'`) | `GET /api/network/login/check_auth.php` (same path, new backend) | 3 |
| 6 | Main page — online players / in-raid activity (heartbeat poll + notifications) | Map of `id → {id, timestamp, type, map, side, gameTime}` (`js/system-heartbeat.js:27`) | `GET /api/main/heartbeat/heartbeats.json` | 3 |
| 7 | Session — keep-alive ping while logged in | No response body used (`js/app-utils.js:852,895`, `POST`, every 30 s) | `POST api/main/heartbeat/keepalive.php` (same path, new backend) | 3 |
| 8 | Profile overlay — appearance/customization (theme, backgrounds, prestige, cat reward, about me, discord, custom pfp/name) | `settings` object incl. `profileTheme`, `usePrestigeStyling`, `prestigeBackground`, `backgroundReward`, `mainBackgroundReward`, `catReward`, `pfpStyle`, `pfpBorder`, `decal`, `about_me`, `discordUser`, `profilePicture`, `name`, `forbidNameChange` (`js/app-utils.js:531`, `POST {profileId}`; caller `js/user-profiles.js:216`) | `POST /api/network/functions/get_player_customization.php` (same path, new backend) | 2 |
| 9 | Profile overlay — raid history | Index + blob files keyed by **permaLink** (`js/user-raid-history.js:161,186`; legacy single file fallback `:210`) | `GET /api/data/player_raids/<permaLink>_index.json`, `GET /api/data/player_raids/<permaLink>_blob_<n>.json`, legacy `GET /api/data/player_raids/<permaLink>.json` | 2 |
| 10 | Profile overlay — equipment viewmodel | Slot → items keyed by **player id** (`js/user-community.js:1789`; constructed with `player.id` at `js/user-profiles.js:1092`) | `GET /api/data/pmc_equipment/<id>.json` | 2 |
| 11 | Profile / winners / teams — full-body PMC avatar | PNG images keyed by permaLink (`ApiPaths.pmcPfpsPath`; `js/app-utils.js:809`, `js/system-image-cropper.js:121`, `js/system-season-end.js:336,381,675`, `js/system-winners.js:33`, `js/user-teams.js:106`, `js/user-profiles.js:821`; `<permaLink>_full.png` on profile, `<permaLink>.png` on winners) | `GET /api/data/pmc_avatars/<permaLink>_full.png` (and `<permaLink>.png`) | 2 |
| 12 | Profile overlay — comments list | Array of comments, file keyed by **permaLink** (`js/user-community.js:612–618,1032`) | `GET /api/data/user-comments/player_<permaLink>.json` — note: backend team described `player_<id>.json`; code uses `player_<permaLink>.json` | 3 |
| 13 | Profile overlay — comment send | `POST {comment, receiverId, receiverPermaLink}` (`js/user-community.js:915`) | `POST /api/network/functions/comment/send_comment.php` (same path, new backend) | 3 |
| 14 | Profile overlay — comment like/unlike | `POST {comment_id, permaLink, liker_profile_id}` (`js/user-community.js:1274`) | `POST /api/network/functions/comment/like_comment.php` (same path, new backend) | 3 |
| 15 | Profile overlay — comment reply | `POST {parent_id, receiverPermaLink, comment, receiverId}` (`js/user-community.js:1364`) | `POST /api/network/functions/comment/reply_comment.php` (same path, new backend) | 3 |
| 16 | Profile overlay — comment delete | `POST {comment_id, permaLink}` (`js/user-community.js:1419`) | `POST /api/network/functions/comment/delete_comment.php` (same path, new backend) | 3 |
| 17 | Profile overlay — friend button status | `POST {profileId}` → `{status}` (`canAdd`/`isFriend`/`requestPending`/`cannotAdd`) (`js/user-community.js:95`) | `POST /api/network/functions/community/is_friend.php` (same path, new backend) | 4 |
| 18 | Profile overlay — send friend request | `POST {profileId}` → `{success,message}` (`js/user-community.js:233`) | `POST /api/network/functions/community/send_friend_request.php` (same path, new backend) | 4 |
| 19 | Profile overlay — friends list | `POST {profileId}` → `{friends:[…]}` (`js/user-community.js:282`; removeFriend is a client-side stub, no endpoint) | `POST /api/network/functions/community/get_friends.php` (same path, new backend) | 4 |
| 20 | Achievements system (main page + profile) | Compiled static JSON + per-player achievement timestamps (`js/user-achievements.js:16–18`) | `GET /api/data/shared/achievement_counters.json` (same path); the two compiled files are repo static assets, no API needed | 1 |
| 21 | Login button | Plain navigation link, not a fetch (`index.html:133`, `js/api-auth.js:110,128`) | `GET /api/network/login/index.php` (page, new backend) | 3 |
| 22 | Banned/whitelisted mods modal (navbar) | Mod name lists (`js/ui-navigation.js:280,287`) | **Not in the backend team's known list — needs decision.** Legacy: `GET /api/network/functions/get_banned_mods.php`, `GET /api/network/functions/get_whitelist_mods.php` | TBD |
| 23 | Quests overlay | Static compiled quests JSON (`js/user-quests.js:44`) | Repo static asset, no API needed (`achievements/js/compiledQuests.json`) | n/a |
| 24 | Equipment item icons (viewmodel) | External image CDN with repo fallback (`js/user-community.js:1999–2010`) | External, unchanged: `https://assets.tarkov.dev/<template_id>-512.webp`, fallback `media/weapon_attachments/…` | n/a |
| 25 | Quests/achievements image preloading | `new Image()` probes (no fetch) in `js/user-quests.js:305`, `js/system-season-end.js:687` | n/a | n/a |

### Sibling pages

| # | Page or feature | Data read today | API call that replaces it | Priority |
|---|-----------------|-----------------|---------------------------|----------|
| 26 | `meta/` — weapon stats builder | `{"weapons":{…}}` (`meta/js/main.js:225`; consumes `ApiPaths.weaponStatsPath`) | `GET /api/data/shared/weapon_counters.json` | 1 |
| 27 | `meta/` — attachment/equipment history | Full equipment-history blob (`meta/js/main.js:249`; consumes `ApiPaths.equipmentBlobStatsPath`) | `GET /api/data/pmc_equipment_blob/equipment_history_blob.json` | 2 |
| 28 | `meta/` — engine boot | Runs `initEngine()` → rows 1, 2, 20 apply | — | — |
| 29 | `insights/` — season archives | Seasons 2–10 leaderboards (`insights/js/main.js:214`) | `GET /api/data/seasons/season{2..10}.json` | 1 |
| 30 | `insights/` — global map/raid counters | `total_raids`, `total_damage`, `total_playtime`, per-map keys (`insights/js/main.js:217`) | `GET /api/data/shared/global_counters.json` | 1 |
| 31 | `global/` — global leaderboard rows | Sortable/filterable player rows (`global/js/main.js:76`) | **Not in the known list — needs decision.** Legacy: `GET /api/network/functions/global-lb/players.php?sort=&limit=&q=` | 1 |
| 32 | `global/` — sort options | `{key,label}` list (`global/js/main.js:59`) | **Not in the known list — needs decision.** Legacy: `GET /api/network/functions/global-lb/sort_options.php` | 1 |

Notes on the main-page stat tiles: the animated totals (raids/kills/damage/playtime) are computed from the season
file (`calculateOverallStats`, `js/app-core.js`); `global_counters.json` is **not** fetched on the main page today.

## Endpoints the backend team's known list does not mention

- `POST api/main/heartbeat/keepalive.php` — session keep-alive (`js/app-utils.js`).
- `GET /api/network/functions/get_banned_mods.php`, `GET /api/network/functions/get_whitelist_mods.php` (`js/ui-navigation.js`).
- `GET /api/network/functions/global-lb/players.php`, `GET /api/network/functions/global-lb/sort_options.php` (`global/js/main.js`).
- `GET /api/data/pmc_avatars/<permaLink>_full.png` / `<permaLink>.png` — avatar images (path exists in `ApiPaths`, used via `img.src`).
- Static repo JSONs fetched as data: `achievements/js/compiledAchData.json`, `achievements/js/compiledAchSEData.json`, `achievements/js/compiledQuests.json`.

## Keying discrepancies vs the backend team's notes

- Comments: code keys the file by **permaLink** (`player_<permaLink>.json`, `js/user-community.js:1031`), not by player id.
- Raids: keyed by **permaLink**, with `_index.json` / `_blob_<n>.json` split files; the plain `<permaLink>.json` is only a fallback.
- Equipment: keyed by **player id** (`pmc_equipment/<id>.json`).

## Player entry fields (one entry, `fallbacks/season12.json`, `leaderboard[0]`)

The file's shape is `{"leaderboard":[ … ]}`. This entry has **94 fields**; entries in the same file have 64–96 fields
(player count: 97; union of all fields: 103). The backend team's "about 60 fields" understates the real size.
Types are from this entry. "Verified" = consumed by legacy frontend code.

| Field | Type | Status (legacy consumer) |
|-------|------|--------------------------|
| `absoluteLastTime` | int | verified (core, profiles, raid-history, community, notifications) |
| `accountType` | str | verified (utils, profiles, insights) |
| `agressorName` | str | verified (raid-history, notifications) — note spelling `agressor` |
| `allAchievements` | dict | verified (user-achievements, battlepass-rewards) |
| `averageLifeTime` | int | verified (core, teams, insights) |
| `banned` | bool | verified (core, utils, profiles, notifications, welcome, season-end, navigation) |
| `bestStats` | dict | **unverified** — no consumer found |
| `boostPerc` | int | verified (core) |
| `bossesKilled` | int | verified (profiles, raid-history, community, insights) |
| `breachTraits` | dict | verified (profiles: `modifiers`) |
| `completed_quests` | dict | verified (profiles, user-quests) |
| `currentWinstreak` | int | verified (profiles, community, notifications) |
| `damage` | int | verified (core, profiles, community, season-end, insights) |
| `dev` | bool | verified (profiles, achievements, community, welcome, utils, meta) |
| `discFromRaid` | bool | verified (raid-history, notifications) |
| `disqualified` | bool | **unverified** — no consumer found |
| `energy` | float | verified (profiles: health/energy bars) |
| `firstSeen` | int | verified (profiles) |
| `hasKappa` | bool | verified (profiles, insights) |
| `hasWinterTheme` | bool | **unverified** — no consumer found |
| `health` | float | verified (profiles) |
| `hideout` | dict | verified (profiles, user-hideout) |
| `hydration` | float | verified (profiles) |
| `id` | str | verified (everywhere; lookup key `window.findPlayer`) |
| `isCasual` | bool | verified (core, profiles, community, notifications, welcome, season-end) |
| `isHardcore` | bool | verified (core, profiles) |
| `isNew` | bool | verified (notifications) |
| `isPremium` | bool | verified (utils `isPremium`, core, profiles) |
| `isTransition` | bool | verified (raid-history, notifications) |
| `isUsingFika` | bool | verified (profiles) |
| `isUsingRealism` | bool | **unverified** — no consumer found |
| `isUsingStattrack` | bool | verified (profiles, battlepass-calculator) |
| `isUsingTP` | bool | verified (profiles, utils) |
| `isUsingWTT` | bool | **unverified** — no consumer found |
| `killToDeathRatio` | float | verified (core, profiles, teams, community, season-end, insights) |
| `lastPlayed` | int | verified (profiles, community, season-end) |
| `lastProfitGain` | int | verified (notifications) |
| `lastRaidAs` | str | verified (raid-history, notifications) |
| `lastRaidEXP` | int | verified (raid-history, notifications) |
| `lastRaidKills` | int | verified (notifications) |
| `lastRaidMap` | str | verified (raid-history, notifications) |
| `lastRaidRanThrough` | bool | verified (raid-history, notifications) |
| `lastRaidSurvived` | bool | verified (raid-history, notifications) |
| `lastRaidTransitionTo` | str | verified (raid-history, notifications) |
| `lcPointsEarned` | int | verified (raid-history, notifications) |
| `longestHeadshot` | int | verified (raid-history) |
| `longestShot` | int | verified (profiles, community, insights) |
| `mapFatigue` | dict | verified (season-end) |
| `max_energy` | int | verified (profiles) |
| `max_hydration` | int | verified (profiles) |
| `name` | str | verified (everywhere) |
| `networkRaids` | int | verified (core, profiles, teams, community, notifications, season-end, battlepass-calculator) |
| `permBanned` | bool | verified (core, community, notifications) |
| `permaLink` | str | verified (profiles, raid-history, community, teams, avatars, winners, season-end) |
| `pmcDeaths` | int | verified (profiles, community, season-end, insights) |
| `pmcKills` | int | verified (core, profiles, teams, community, season-end, insights, global) |
| `pmcLevel` | int | verified (profiles, teams, insights) |
| `pmcPlayTime` | int | verified (profiles) |
| `pmcRaids` | int | verified (core, profiles, teams, community, insights) |
| `pmcSide` | str | verified (profiles, insights) |
| `premiumUntil` | int | verified (utils `isPremium`) |
| `prestige` | int | verified (core, profiles, battlepass-rewards, insights) |
| `profilePicture` | str | verified (core, profiles, community, raid-history, notifications, winners) |
| `profileTheme` | str | verified (profiles; overwritten by customization API when present) |
| `registeredOnLeaderboard` | int | verified (profiles) |
| `registrationDate` | int | verified (profiles) |
| `scavAverageLifeTime` | int | **unverified** — no consumer found |
| `scavDeaths` | int | verified (profiles, community, insights) |
| `scavKillToDeathRatio` | int | verified (profiles) |
| `scavKills` | int | verified (profiles, community, insights, global) |
| `scavLevel` | int | verified (profiles) |
| `scavRaids` | int | verified (core, profiles, community, insights) |
| `scavSurvivalRate` | int | verified (profiles) |
| `scavSurvived` | int | **unverified** — no consumer found |
| `scavTotalProfit` | int | verified (community) |
| `scavsKilled` | int | verified (profiles, community, raid-history, insights) |
| `seasonsPlayed` | int | verified (profiles, welcome, global) |
| `sptVer` | str | verified (core) |
| `stattrack_weapons` | dict | verified (profiles, season-end; keyed by permaLink) |
| `survivalRate` | int | verified (core, profiles, teams, raid-history, season-end, insights, meta) |
| `survived` | int | verified (core, raid-history, notifications, season-end, global) |
| `suspicious` | bool | verified (core, utils, profiles) |
| `suspicious_reason` | str | verified (profiles) |
| `suspicious_reasons` | null | verified (profiles) — null in this entry |
| `teamJoinDate` | int | **unverified** — no consumer found |
| `teamTag` | str | verified (core, utils, teams, community, notifications, global) |
| `teamVault` | dict | **unverified** — no consumer found |
| `totalPlayTime` | int | verified (core, welcome, season-end) |
| `totalProfit` | int | verified (community, raid-history) |
| `totalRaids` | int | verified (core, teams, community, raid-history, season-end, insights) |
| `totalScore` | float | verified (core, welcome, season-end, winners) — ranking value |
| `totalScoreDiff` | float | **unverified** — no consumer found |
| `traderInfo` | dict | verified (profiles, season-end, insights; per-trader `unlocked`/`standing`/`salesSum`) |
| `trusted` | bool | verified (core, utils, profiles, community) |

Conditional fields present on *other* entries of the same file but not on `leaderboard[0]`
(union of the file = 103 fields):

| Field | Type | Status |
|-------|------|--------|
| `banExpires` | int | verified (profiles, notifications) |
| `banReason` | str | verified (profiles, notifications) |
| `banTime` | int | verified (profiles, notifications) |
| `casualTime` | int | **unverified** — no consumer found |
| `pmcSurvived` | int | **unverified** — no consumer found |
| `previousBan` | — | **unverified** — no consumer found |
| `scavPlayTime` | int | verified (profiles) |
| `scavProfitGain` | int | **unverified** — no consumer found |
| `tookAction` | str | verified (profiles, notifications) |

Unverified count: 10 of 94 fields on this entry, plus 4 conditional fields (`bestStats`, `disqualified`,
`hasWinterTheme`, `isUsingRealism`, `isUsingWTT`, `scavAverageLifeTime`, `scavSurvived`, `teamJoinDate`,
`teamVault`, `totalScoreDiff`; conditional: `casualTime`, `pmcSurvived`, `previousBan`, `scavProfitGain`).

## Reference shapes seen in fallbacks (for contract checks)

- `fallbacks/heartbeats.json`: `{ "<playerId>": { id, timestamp, type, map, side, gameTime }, … }`
- `fallbacks/shared/global_counters.json`: `{ total_raids, total_damage, total_hits, total_kills, total_playtime, "<MapName>": <count>, … }`
- `fallbacks/shared/weapon_counters.json`: `{ "weapons": { "<playerId>": … } }`
- `fallbacks/shared/achievement_counters.json`: `{ "achievements": { … } }`
- `fallbacks/player_raids/`: files named `<permaLink>.json`, `<permaLink>_index.json`, `<permaLink>_blob_<n>.json`
- Index blob shape used by `js/user-raid-history.js`: `{ total_raids, blobs: [{blob_index, raid_count}], current_blob }`; blob files: `{ raids: […] }`

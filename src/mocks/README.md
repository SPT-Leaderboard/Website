# Mock data fixtures

Trimmed snapshots of real production data captured 2026-10-09 (snapshot
root: the `backup/api` data volume). Every fixture keeps the exact
original shape — rows or keys were dropped, fields never were. These
files are imported only by `src/api/client.ts`, `src/api/global.ts`, and
`tests/`; page code never reads them directly.

The one exception is `global-players.json`, which is not a snapshot but a
derivative fixture (details in the table below).

| Fixture | Source (snapshot) | Trim |
|---|---|---|
| `season12.json` | `data/seasons/season12.json` | Kept the 25 highest-`totalScore` entries in original file order (source had 100, unsorted by score). No fields dropped; entry[0] keeps all 96 of its fields. |
| `raids/04c08924…_index.json` | `data/player_raids/04c08924…_index.json` | None (byte copy). Picked permaLink `04c08924…`: the smallest `total_raids` (1) among players with at least one blob file, 15 players tied, alphabetically first kept. |
| `raids/04c08924…_blob_0.json` | `data/player_raids/04c08924…_blob_0.json` | None (byte copy). Only one blob file exists for this player, so "first two blobs" yields one. |
| `equipment.json` | `data/pmc_equipment/57c461aca58cace7a9359998.json` | None (byte copy; first file alphabetically of 886). |
| `comments.json` | `data/user-comments/player_0ad44002….json` | None (byte copy). No comments file exists for the raids pick's permaLink, so the first file alphabetically was used instead. |
| `counters.json` | `data/shared/global_counters.json` | None (byte copy). |
| `achievement-counters.json` | `data/shared/achievement_counters.json` | None (byte copy). |
| `weapon-counters.json` | `data/shared/weapon_counters.json` | `weapons` map kept for the first 20 keys in file order (source had 266); shape `{"weapons": {…}}` unchanged. |
| `online.json` | `main/online.json` | None (byte copy). |
| `heartbeats.json` | `main/heartbeat/heartbeats.json` | None (byte copy). |
| `global-players.json` | derived — `data/seasons/season12.json` (FRT-15) | Not a snapshot: 25 rows synthesized from the `season12.json` entries, one row per entry in file order. Per row: `id`, `name`, `permaLink` copied; `teamTag` copied (empty string where the season entry has none — 13 of 25 have a tag); `avatar` = `profilePicture`; `lastSeen` = `absoluteLastTime`; stats copied unchanged: `pmcKills`, `scavKills`, `bossesKilled`, `totalRaids`, `survived`, `totalPlayTime` (seconds), `totalProfit`. Consumed by `src/api/global.ts` (stand-in for the not-yet-existing global-lb API). |
| `insights/archives.json` | `data/seasons/season12.json` | Array of season archives served by `getSeasonArchives()` (`src/api/insights.ts`); currently one entry — the season12 fixture (25 highest-`totalScore` entries) re-used under the label "Season 12". The loader accepts any number of entries: earlier seasons (the legacy insights page read seasons 2–10) are appended here as their snapshots arrive, without page changes. |
| `achievement-catalog.json` | `achievements/js/compiledAchData.json` + `achievements/js/compiledAchSEData.json` (FRT-18) | Merge of the two legacy achievement catalogs (SPT 3.11 + SPT 4.0), deduplicated by achievement id. The two `achievementCompiled` maps are combined in the legacy merge order (`achievements/js/achievements.js` `mergeAchievements()`: SE/4.0 map last, so a shared id keeps the 4.0 entry), then each entry is reshaped to `{id, name, description, rarity, imageUrl}` in one array. 95 + 44 source entries, 0 id overlaps, 139 rows kept. Consumed by `src/api/achievements.ts`. |
| `profile/customization.json` | derived — shape of the `profileAppearencePath` response (FRT-13) | Not a snapshot: fully synthesized. One object with the customization fields the legacy profile reads from `getCustomProfileSettings()` (`js/user-profiles.js:223-237`): `profileTheme`, `usePrestigeStyling`, `prestigeBackground`, `backgroundReward`, `mainBackgroundReward`, `catReward`, `pfpStyle`, `pfpBorder`, `decal`, `about_me`, `discordUser`, `profilePicture`, `name`, `forbidNameChange`. BattlePass reward fields hold their documented defaults (`default`/`none`/`false` — the legacy `??` fallbacks), so the synthesized data reads as a non-prestige player with no cosmetic overrides. `name`/`discordUser`/`about_me` are invented to stay coherent with the `season12.json` top entry; `profilePicture` is empty (no custom avatar override). Consumed by `src/api/profile.ts`. |
| `session.json` | synthesized (FRT-19) | Not a snapshot: the real session API does not exist yet (FRT-22, blocked on the backend), so there is nothing to capture. The legacy check (`js/api-auth.js` `checkAuth()`, `GET /api/network/login/check_auth.php`, data-dependency-map #5) returned `{authenticated, username, profilePicture, unreadCount, maintenance}`; this fixture is a synthesized logged-out response of that exact shape — all-negative fields (`false`/`null`/`0`). The logged-in development variant (username `Pilot`, `unreadCount: 3`) is not a file: `getSession()` derives it from this fixture when the `sptlb:mocksession` flag is set. Consumed by `src/api/auth.ts`. |

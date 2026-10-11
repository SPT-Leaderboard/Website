# v2 API client (OpenAPI draft 0.1.0)

Task FRT-21. A hand-written typed client for the v2 website API. The authority
is the backend's OpenAPI draft (read-only, outside this repo):

- contract: `sptlb/backend/docs/api/openapi.yaml` (draft 0.1.0)
- rules: `sptlb/backend/docs/api/api-design.md`

No codegen tool and no new dependency: the types are hand-written, and where a
yaml schema matches an existing domain type, `openapi/types.ts` re-exports it
from `src/api/types.ts` instead of duplicating it.

**Not consumed yet.** The seven pages, the profile modal, the auth widget and
the mock layer still run on `src/api/client.ts` and the page-mock resolvers.
Rewiring the pages is a later task, after the backend ships. This module must
compile (`bun run check`) and pass its unit tests (`tests/openapi.test.ts`);
nothing imports it from the UI.

## Files

| file | role |
| --- | --- |
| `base.ts` | `API_BASE` — from `import.meta.env.PUBLIC_API_BASE`, empty-string default (same origin); trailing slashes stripped. |
| `types.ts` | yaml-derived types; re-exports the matching `src/api/types.ts` types. |
| `client.ts` | one function per operation the pages use, `ApiError`, the ETag cache. |

## Client behavior

- Requests are relative against `API_BASE`, so `""` (default) fetches
  `/api/v2/...` from the same origin (api-design.md rule 3).
- `credentials: "include"` on every request. Public reads need no session;
  writes use the session cookie, so the cookie is always sent.
- Every non-2xx answer throws `ApiError { code, message, status }`; `code` and
  `message` are parsed from the `{ code, message }` body (rule 6). A body that
  is not that shape falls back to `http_<status>` + status text.
- ETag cache for `GET /api/v2/heartbeats` and `GET /api/v2/seasons/current`
  (the two polled endpoints): the first 200 stores `{etag, data}`, later calls
  send `If-None-Match`, and a 304 returns the cached object (same reference).
  A 200 with a new ETag refreshes the entry. `resetEtagCache()` clears the
  cache (tests). Other GETs are plain reads — the browser handles their
  `Cache-Control`.

## Mapping: stub / page-mock function -> v2 operation

Stub client (`src/api/client.ts`) — names and return types kept exactly:

| stub function | v2 operation | v2 function |
| --- | --- | --- |
| `getCurrentSeason(): SeasonData` | `GET /api/v2/seasons/current` | `getCurrentSeason()` (ETag cache) |
| `getPlayerRaids(permaLink)` | `GET /api/v2/players/{permaLink}/raids` | `getPlayerRaids(permaLink)` |
| `getPlayerEquipment(playerId)` | `GET /api/v2/players/{permaLink}/equipment` | `getPlayerEquipment(permaLink)` — parameter is the permaLink now (deviation 1) |
| `getPlayerComments(permaLink)` | `GET /api/v2/players/{permaLink}/comments` | `getPlayerComments(permaLink)` |
| `getGlobalCounters()` | `GET /api/v2/counters/global` | `getGlobalCounters()` |
| `getAchievementCounters()` | `GET /api/v2/counters/achievements` | `getAchievementCounters()` |
| `getWeaponCounters()` | `GET /api/v2/counters/weapons` | `getWeaponCounters()` |
| `getOnlineStatus()` | `GET /api/v2/status` | `getOnlineStatus()` |
| `getHeartbeats()` | `GET /api/v2/heartbeats` | `getHeartbeats()` (ETag cache) |

Page mocks (`src/api/*.ts`) — replaced by v2 operations at rewiring time:

| mock function | v2 operation | v2 function |
| --- | --- | --- |
| `profile.ts getRaids(permaLink)` (index + blobs stitched) | `GET .../raids` + `GET .../raids/blobs/{blob}` | `getPlayerRaids` + `getPlayerRaidBlob(permaLink, blob)` |
| `profile.ts getCustomization()` | `GET /api/v2/players/{permaLink}/settings` | `getPlayerSettings(permaLink)` (deviation 2) |
| `insights.ts getSeasonArchives()` (one bundled fixture) | `GET /api/v2/seasons` + `GET /api/v2/seasons/{season}` | `getSeasons()` + `getSeason(season)`; "previous season" = `getSeason(current - 1)` |
| `meta.ts getAttachments()` (synthesized stand-in) | `GET /api/v2/equipment-history` | `getEquipmentHistory()` |
| `auth.ts getSession()` | `GET /api/v2/session` | `getSession()` |
| `community.ts getFriendStatus(permaLink)` | `GET /api/v2/players/{permaLink}/friend-status` | `getFriendStatus(permaLink)` |
| `community.ts sendFriendRequest(permaLink)` | `POST /api/v2/friend-requests` | `sendFriendRequest(permaLink)` |
| `community.ts getFriends()` | `GET /api/v2/players/{permaLink}/friends` | `getPlayerFriends(permaLink)` — needs the viewed permaLink at the call site |
| `community.ts likeComment(commentId, permaLink)` | `POST /api/v2/comments/{commentId}/like` | `likeComment(commentId)` |
| `community.ts replyComment(parentId, permaLink, text)` | `POST /api/v2/comments/{commentId}/replies` | `replyToComment(commentId, comment)` |
| `community.ts deleteComment(commentId, permaLink)` | `DELETE /api/v2/comments/{commentId}` | `deleteComment(commentId)` |
| `global.ts getGlobalPlayers()` | — | **none**: `GET /api/v2/global/players` is tagged `global-later`, "reserved, not built" in the yaml |

Deliberately not wired (no page consumer today, or not built): the two avatar
endpoints (binary PNG; pages use the `profilePicture`/`avatar` URL fields from
payloads), `POST /players/{permaLink}/comments` (`createPlayerComment` — no
write path exists in the mock layer yet), `POST /session/keepalive`, the mod
lists (`GET /mods/banned`, `GET /mods/whitelisted`), and everything the yaml
tags reserved (`heartbeats/stream`, `global/*`, `friend-requests/{accept,
decline,ignore,cancel,remove,pending,ignored}`).

## Deviations between the yaml and the legacy mocks

1. **Equipment is keyed by permaLink now.** The stub and the mock resolvers
   took a profile id (`data/pmc_equipment/<profileId>.json`); the v2 URL is
   `/api/v2/players/{permaLink}/equipment` (rule 4: the profile id is never in
   a path). The client parameter is `permaLink`.
2. **Settings is GET.** The legacy `get_player_customization.php` was a POST;
   v2 is `GET /players/{permaLink}/settings` and answers
   `{success, settings: {name?, about?, discord?, profilePicture?}, showcase}`.
   The profile modal's `ProfileCustomization` fixture shape (theme, prestige
   styling, battle-pass rewards, ...) has no counterpart in the v2 body — the
   modal rewiring must reconcile this.
3. **Comments lose `receiverId` (and `liker_profile_id`).** Writes take the
   receiver from the path and the author/liker from the session. The mock
   write signatures therefore shrink (`likeComment(commentId)`,
   `deleteComment(commentId)`). Additionally the v2 `Comment` payload is a
   **superset** of the trimmed `PlayerComment` the stub return type models:
   it adds `permaLink`, `author_id`, `likes` (array of liker keys),
   `is_deleted`, `replies`, `parent_id`, `deleted_at`, and *stored replies
   omit `sent_to_id`/`parent_id`/`replies* — while `PlayerComment` requires
   `sent_to_id`. `getPlayerComments()` keeps the stub return type
   (`CommentsFile`) with a single documented cast at the parse boundary; the
   field-set reconciliation happens when the profile page rewires.
4. **Errors are typed.** The mocks never fail; every non-2xx v2 answer throws
   `ApiError {code, message, status}` (`not_found`, `unauthenticated`,
   `forbidden`, `rate_limited`, `validation_failed`). Legacy body-level
   failures become status codes (e.g. settings "No match"/"Player not found"
   is 404 `not_found`; friend-status "cannotAdd" while unauthenticated is 401).
5. **Heartbeat shape.** yaml types `gameTime` as a number; the repo's
   `Heartbeat.gameTime` is `string | null` (see questions). The yaml
   guarantees no `position` (the mod's `cords` were never public) and models
   no `state`; the repo type keeps both as optional legacy fields.
6. **Action return values changed.** `likeComment` returns
   `{success, likes, liked}` (mock: `{success}`); `replyToComment` returns the
   created `Comment` with 201 (mock: `{success}`); `deleteComment` returns
   nothing (204; mock: `{success}`); `sendFriendRequest` returns
   `{success, message}` with 201.
7. **Player requiredness.** yaml marks `scavPlayTime` and `scavProfitGain`
   "present only on some entries" while `PlayerEntry` requires them (the
   fixture's entry[0] carries them) — see questions.
8. **Friend list rows.** v2 rows carry `{permaLink, id, name, profilePicture,
   added_at, status}`; the community mock's `FriendRow` carries
   `{teamTag, lastSeen}` — team tag/last-seen must be joined from season data
   at rewiring time.
9. **No pagination.** `?limit`/`?offset`/`?fields` are reserved and not built
   (rule 2); comment walls come whole (the server keeps the last 100).

## Questions for the backend

Open questions this client inherits verbatim from the yaml's
`x-open-questions` (none blocks the client — every non-2xx throws `ApiError`
keyed by the body's `code`, whatever the final mapping is):

- HTTP codes for `already_friends` / `request_already_sent` on
  `POST /friend-requests` are undecided (409 vs 400).
- Whether `POST /session/keepalive` requires a session is undecided.
- Comment-write rate limits are undecided (legacy 3/min + 3 h block was never
  enforced); 429 is documented but the real limits are not.
- `Cache-Control` for `GET /players/{permaLink}/friends` is unspecified (no
  Cache-Control header declared).
- Delete authorization: confirm v2 really lets the author delete (the legacy
  check was broken — `$devTokens` undefined, every delete answered 403).
- `community/unignore_request.php` is absent from the reserved list — confirm
  it is dropped.
- Exact key casing inside `PlayerSettings.settings` is unverified.
- Assumed types (yaml flags them itself): showcase `base_price` integer,
  friend `added_at` unix seconds, comment `date` string, heartbeat `gameTime`
  number, comment `likes` array of liker keys.

Found while writing this client (frontend side):

- `gameTime`: the yaml types it `number`, but the repo's `Heartbeat.gameTime`
  is `string | null` (in-game clock like "00:34:56"?). One of the two is wrong
  — confirm the payload type before the pages rewire (`HeartbeatsMap` is
  re-exported unchanged, so the client compiles either way).
- `Heartbeat.map/side/gameTime`: yaml models them as optional-and-absent, the
  repo type models them nullable (`string | null`). Confirm nullability.
- `PlayerEntry.scavPlayTime` / `scavProfitGain`: "present only on some
  entries" per the yaml, required in `PlayerEntry` (fixture entry[0] carries
  them). Confirm whether all current entries really carry them.
- `RaidIndex.blobs[]`: the yaml models only `blob_index` + `raid_count`, while
  the snapshot files also carry `start_raid`/`end_raid`/`created_at`/`migrated`
  (modeled as optional in `RaidIndexBlob`). Confirm the extras stay.
- `Equipment`/`RaidBlob` inner shapes are deliberately loose in the yaml; the
  repo types (`EquipmentSlot` -> `EquipmentItem[]`, `RaidRecord`) model the
  legacy files. Confirm the files keep those shapes.
- Comment `date`: format not stated anywhere; needed only for display sorting
  (the sortable key is `timestamp`).

# v2 API client (OpenAPI draft 0.2.0)

Tasks FRT-21 (typed client) and FRT-21b (migration to openapi-typescript +
openapi-fetch). The authority is the backend's OpenAPI draft (read-only,
outside this repo):

- contract: `sptlb/backend/docs/api/openapi.yaml` (draft 0.2.0)
- rules: `sptlb/backend/docs/api/api-design.md`

The types are generated with openapi-typescript (dev dependency) and the client
calls the API through openapi-fetch (runtime dependency). Where a page keeps a
stub return type, `openapi/types.ts` re-exports the matching domain type from
`src/api/types.ts`; the client casts at the parse boundary (see deviations).

**Consumed through the stub switch (FRT-20 first slice).** The seven pages, the
profile modal, the auth widget and the page-mock resolvers still run on
`src/api/client.ts`; that module now calls THIS module's season/status/counter
operations when `PUBLIC_API_BASE_URL` is set (see `.env.example` at the repo
root) and serves the fixtures otherwise. The profile resolvers and heartbeats
stay on fixtures in both modes until their pages rewire. This module must
compile (`bun run check`) and pass its unit tests (`bun test
tests/openapi.test.ts`).

## Files

| file | role |
| --- | --- |
| `base.ts` | `API_BASE` — from `import.meta.env.PUBLIC_API_BASE_URL`, empty-string default; trailing slashes stripped. Also `REAL_API_ENABLED` — the mock/real switch of the stub client. |
| `schema.d.ts` | **Generated** — openapi-typescript output from the backend yaml. Do not edit; regenerate (command below). |
| `types.ts` | Page-facing aliases derived from `schema.d.ts`, re-exports of the matching `src/api/types.ts` domain types, and the two shapes the schema does not cover (the normalized `PlayerSettings` view, the bare `FriendStatus` union). |
| `client.ts` | One function per operation the pages use, on openapi-fetch; `ApiError`; the ETag cache. |

## Codegen (draft regeneration)

This replaces FRT-21's hand-editing: after the backend bumps
`docs/api/openapi.yaml`, regenerate the types and reconcile `types.ts` /
`client.ts` with the changelog the yaml carries in `x-changelog`:

```sh
podman run --rm -v "$PWD":/app \
  -v /media/ssd2/downloads/sptlb/backend/docs/api:/backend-api:ro \
  -w /app docker.io/oven/bun:latest \
  bunx openapi-typescript /backend-api/openapi.yaml -o src/api/openapi/schema.d.ts
```

(The plain command is `bunx openapi-typescript <yaml> -o
src/api/openapi/schema.d.ts`; the backend docs live outside this repo, so the
container mounts them read-only at `/backend-api`.)

Current generation: draft **0.2.0** (`info.version`), openapi-typescript
7.13.0, openapi-fetch 0.17.0.

## Client behavior

- One `createClient<paths>({ baseUrl: API_BASE })`; `""` (default) keeps the
  request URLs relative, so they hit the site that served the page
  (api-design.md rule 3). Path parameters are inserted by openapi-fetch and
  URL-encoded.
- `credentials: "include"` on every request. Public reads need no session;
  writes use the session cookie, so the cookie is always sent.
- Every non-2xx answer throws `ApiError { code, message, status }`. openapi-fetch
  hands the parsed JSON error body to the client, which reads `{ code, message }`
  (rule 6). A body of any other shape (gateway HTML, empty body, other JSON)
  falls back to `http_<status>` + status text.
- Requests with a JSON body get `Content-Type: application/json` automatically;
  a 204 resolves with no value.
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
| `profile.ts getCustomization()` | `GET /api/v2/players/{permaLink}/settings` | `getPlayerSettings(permaLink)` (deviations 2 and 3) |
| `insights.ts getSeasonArchives()` (one bundled fixture) | `GET /api/v2/seasons` + `GET /api/v2/seasons/{season}` | `getSeasons()` + `getSeason(season)`; "previous season" = `getSeason(current - 1)` |
| `meta.ts getAttachments()` (synthesized stand-in) | `GET /api/v2/equipment-history` | `getEquipmentHistory()` (no `?weapon=` — see 0.2.0 normalizations) |
| `auth.ts getSession()` | `GET /api/v2/session` | `getSession()` |
| `community.ts getFriendStatus(permaLink)` | `GET /api/v2/players/{permaLink}/friend-status` | `getFriendStatus(permaLink)` (deviation 6) |
| `community.ts sendFriendRequest(permaLink)` | `POST /api/v2/friend-requests` | `sendFriendRequest(permaLink)` |
| `community.ts getFriends()` | `GET /api/v2/players/{permaLink}/friends` | `getPlayerFriends(permaLink)` — needs the viewed permaLink at the call site |
| `community.ts likeComment(commentId, permaLink)` | `POST /api/v2/comments/{commentId}/like` | `likeComment(commentId)` |
| `community.ts replyComment(parentId, permaLink, text)` | `POST /api/v2/comments/{commentId}/replies` | `replyToComment(commentId, comment)` |
| `community.ts deleteComment(commentId, permaLink)` | `DELETE /api/v2/comments/{commentId}` | `deleteComment(commentId)` |
| `global.ts getGlobalPlayers()` | — | **none**: `GET /api/v2/global/players` is tagged `global-later`, "reserved, not built" in the yaml |

Deliberately not wired (no page consumer today, or not built): the two avatar
endpoints (binary PNG; pages use the `profilePicture`/`avatar` URL fields from
payloads), `POST /players/{permaLink}/comments` (`createPlayerComment` — no
write path exists in the mock layer yet), `POST /session/keepalive` (requires a
session; 401 `unauthenticated` without — see rate limits below), the mod lists
(`GET /mods/banned`, `GET /mods/whitelisted`), and everything the yaml tags
reserved (`heartbeats/stream`, `global/*`, `friend-requests/{accept, decline,
ignore, cancel, remove, pending, ignored}`).

## 0.2.0 normalizations and deviations of the libraries (FRT-21b)

Applied in the client, recorded here:

1. **Settings accessors normalize the three 0.2.0 quirks**
   (`getPlayerSettings`):
   - `usePrestigeStyling` arrives `integer | string` (0/1 on most profiles, a
     string on a few — the legacy writer passed the stored value through) and
     is normalized to a **boolean**: `0`, `"0"` and `"false"` are false, any
     other present value is true; absent stays absent.
   - `catReward` arrives `integer | string` and is normalized to a **string**
     (the integer form is stringified).
   - `discord` is read from the new `discordUser` spelling first; when absent,
     it falls back to the deprecated `discord_user` (about two thirds of real
     profiles only carry the old spelling). The returned settings object drops
     both raw keys and exposes the single `discord` field.
   - `team_user` exists on every profile; the frontend does not read it. It
     passes through in the settings object but is not part of the typed view's
     read surface beyond its `team_user?: string` entry.
   Every other yaml key passes through, and undocumented
   `additionalProperties` keys survive at runtime (untyped).
2. **FriendStatus unwrap.** The yaml 0.2.0 wires the four values wrapped as
   `{status: "canAdd" | "isFriend" | "requestPending" | "cannotAdd"}`; the
   page-facing contract (and the community mock) is the bare union, so
   `getFriendStatus()` unwraps that one key. Confirmed against the backend
   before the pages rewire (question below).
3. **equipment-history `?weapon=` is typed but not exposed.** The yaml
   documents the query parameter (template id of a weapon) as planned for 0.3.0
   and **not built**; the generated schema types it, the client deliberately
   does not. Without the parameter the whole file is served — that stays the
   current behavior.
4. **Rate limits are documented, not coded** — `ApiError` carries only
   `{code, message, status}`; add header parsing when a page consumer needs it:
   - Comment writes (`POST /players/{permaLink}/comments`,
     `POST /comments/{commentId}/replies`): 3 comments per minute per author;
     over the limit answers 429 `rate_limited` with the `Retry-After` header
     (seconds).
   - `POST /api/v2/friend-requests` duplicates: 409 `already_friends` /
     `request_already_sent`.
   - `POST /api/v2/session/keepalive` requires a session; 401
     `unauthenticated` without.
5. **openapi-fetch builds one `Request` per call** and hands it to `fetch`;
   the response body is consumed by the library (JSON-parsed into `data` or
   `error`). The unit tests therefore stub `fetch` *and* shim `Request`
   (Bun has no document base URL for relative request URLs; browsers do) —
   see `tests/openapi.test.ts`.

## Deviations between the yaml and the legacy mocks

1. **Equipment is keyed by permaLink now.** The stub and the mock resolvers
   took a profile id (`data/pmc_equipment/<profileId>.json`); the v2 URL is
   `/api/v2/players/{permaLink}/equipment` (rule 4: the profile id is never in
   a path). The client parameter is `permaLink`.
2. **Settings is GET, and normalized.** The legacy
   `get_player_customization.php` was a POST; v2 is
   `GET /players/{permaLink}/settings` and answers
   `{success, settings, showcase}` — normalized as in 0.2.0 normalizations 1.
   The profile modal's `ProfileCustomization` fixture shape (theme variants,
   battle-pass reward keys beyond `catReward`, ...) still has no counterpart in
   the v2 body — the modal rewiring must reconcile this.
3. **Comments lose `receiverId` (and `liker_profile_id`).** Writes take the
   receiver from the path and the author/liker from the session. The mock
   write signatures therefore shrink (`likeComment(commentId)`,
   `deleteComment(commentId)`). The v2 `Comment` payload is a superset of the
   trimmed `PlayerComment` the stub return type models (it adds `permaLink`,
   `author_id`, `likes`, `is_deleted`, `replies`, `parent_id`, `deleted_at`).
   0.2.0 made the seven frontend-visible keys required and typed `likes` as an
   optional count (number), not the liker-key array of the earlier draft.
   `getPlayerComments()` keeps the stub return type (`CommentsFile`); the
   field-set reconciliation happens when the profile page rewires.
4. **Errors are typed.** The mocks never fail; every non-2xx v2 answer throws
   `ApiError {code, message, status}` (`not_found`, `unauthenticated`,
   `forbidden`, `rate_limited`, `validation_failed`, `already_friends`,
   `request_already_sent`). Legacy body-level failures become status codes
   (e.g. settings "No match"/"Player not found" is 404 `not_found`;
   friend-status "cannotAdd" while unauthenticated is 401). See 0.2.0
   normalizations 4 for the rate-limit codes.
5. **Heartbeat shape.** yaml types `gameTime` as a number; the repo's
   `Heartbeat.gameTime` is `string | null` (see questions). The yaml
   guarantees no `position` (the mod's `cords` were never public) and models
   no `state`; the repo type keeps both as optional legacy fields.
6. **FriendStatus is wrapped.** The yaml wires `{status}`; the client unwraps
   to the page-facing bare union (0.2.0 normalizations 2).
7. **Player requiredness.** yaml marks `scavPlayTime` and `scavProfitGain`
   "present only on some entries" while `PlayerEntry` requires them (the
   fixture's entry[0] carries them) — see questions.
8. **Friend list rows.** v2 rows carry `{permaLink, id, name, profilePicture,
   added_at, status}`; the community mock's `FriendRow` carries
   `{teamTag, lastSeen}` — team tag/last-seen must be joined from season data
   at rewiring time.
9. **No pagination.** `?limit`/`?offset`/`?fields` are reserved and not built
   (rule 2); comment walls come whole (the server keeps the last 100).
10. **The generated schema is strictly wider than the page types.** `Player`
    requires all ~103 legacy fields, `Raid`/`Equipment`/the equipment-history
    blob are loose objects. The client keeps the stub-compatible return types
    (`SeasonData`, `Equipment`, ...) and casts at the single parse boundary
    (`unwrap`); per-field reconciliation happens when the pages rewire.

## Questions for the backend

Open questions this client inherits from the yaml (none blocks the client —
every non-2xx throws `ApiError` keyed by the body's `code`, whatever the final
mapping is):

- **FriendStatus wire shape**: the 0.2.0 schema wraps the four values in
  `{status}`; the client unwraps `.status`. Confirm the endpoint really answers
  the wrapper — if a bare string ships, drop the unwrap in `client.ts`.
- **`Comment.likes`**: 0.2.0 made it an optional integer count ("new in v2,
  may be absent"), dropping the liker-keys array the earlier draft carried.
  Confirm no screen needs the liker list itself.
- `gameTime`: the yaml types it `number`, but the repo's `Heartbeat.gameTime`
  is `string | null` (in-game clock like "00:34:56"?). One of the two is wrong
  — confirm the payload type before the pages rewire (`HeartbeatsMap` is
  re-exported unchanged, so the client compiles either way).
- `Heartbeat.map/side/gameTime`: the yaml models them as optional-and-absent,
  the repo type models them nullable (`string | null`). Confirm nullability.
- `PlayerEntry.scavPlayTime` / `scavProfitGain`: "present only on some
  entries" per the yaml, required in `PlayerEntry` (fixture entry[0] carries
  them). Confirm whether all current entries really carry them.
- `RaidIndex.blobs[]`: the yaml models only `blob_index` + `raid_count`, while
  the snapshot files also carry `start_raid`/`end_raid`/`created_at`/`migrated`
  (modeled as optional in `RaidIndexBlob`). Confirm the extras stay.
- `Equipment`/`RaidBlob` inner shapes are deliberately loose in the yaml; the
  repo types (`EquipmentSlot` -> `EquipmentItem[]`, `RaidRecord`) model the
  legacy files. Confirm the files keep those shapes.
- The fields of the `equipment-history?weapon=` slice answer (the yaml's own
  open question; the parameter itself is 0.3.0 and not built).
- Exact rate-limit numbers for comment writes and friend requests are "not
  fixed yet" per the yaml; 429/409 codes are documented, the thresholds are
  not.

Resolved by draft 0.2.0 (kept for history): friend-request conflict codes
(409 `already_friends` / `request_already_sent`), the keepalive session
requirement (401 `unauthenticated`), the friends `Cache-Control`
(`private, max-age=30`), `community/unignore_request.php` (present as the
reserved `DELETE /friend-requests/ignored/{permaLink}`), the comment `date`
format (a display string, e.g. "2026-10-11 17:08:22"), and the assumed types
(showcase `base_price` integer, friend `added_at` unix seconds, heartbeat
`gameTime` number).

# Feature gap register

Owner decision (grilling session 2026-10-12, FRT-2/FRT-1 reconciliation): every
feature below is IN SCOPE for the new frontend — none is deferred — and will be
delivered in rounds, main leaderboard page first. Tracked in Linear under the
"Pages" category (FRT-11) as round issues.

Reconciliation evidence: full inventory-vs-`src/` walk, 2026-10-12. The six
documented deferrals (body-hit SVG, equipment CDN icons, inert comment submit,
global-lb stand-in fixture, FRT-22 session, comment-delete simplification) are
NOT gaps — they stay as recorded.

## Round 1 — Leaderboard (main page)

- Team modal (`openTeam` legacy): team popup from row tag
- Season countdown timer + season-end overlay
- Previous-season winners Hall of Fame
- API status badge (`online.json`; `getOnlineStatus()` exists, unrendered)
- Session keepalive POST every 30 s (`/api/v2/session/keepalive`)
- First-visit welcome screen
- Rank icons 1–50, prestige, skill tier, version colors, PMC/SCAV counts
- Compact/simple render + display toggles (lb/casual/timer/winners)
- Search: name/ID toggle, Ctrl shortcuts, persisted query
- Full standing badges (7+ kinds, boost %)
- Live raid toast feed (`js/raid-notifications.js` port): toast stack + sounds.
  Owner decision: use `@solid-toast` (battle-tested) + a small native-Audio
  sound wrapper; add a persisted mute (legacy had none). First entry on /settings.

## Round 2 — Profile depth

- Season Records record cards
- Raid history depth: paging, day/week + return markers, badges, summary, per-map, streak
- In-raid live panel + raid clock (heartbeat-driven profile refresh)
- Quests (catalog, filters, statuses)
- Hideout grid
- Per-player achievements + latest-achievement card
- Weapon attachment tooltip
- Stats-by-map
- Registration/account info, breach modifiers
- Showcase, full-body model/health bars, Stattrack mastery, weapons list, traders
- Cosmetics application (theme/pfp/name/category/BP fetched but unapplied)
- "Played on" cross-profile indicator
- Profile rank in summary header

## Round 3 — Community, meta, misc

- Comment author badges (role/raid-count/online/guest)
- Meta card map tags + full tag set (3 of 8 today)
- Insights: remaining 9 general charts; per-map counts+% list; seasons 2–10 fixtures
- Global: 16 server sort keys (needs API `sort_options`); limits 100/All
- P2: `/login` route (lands with FRT-22); achievements icon probe + fallback chain
- Cosmetics excluded as trivial: snowfall, KORD banner, odometer animation

## Bugs fixed during reconciliation

- P1: nav "Ranking Rules" → `/rules` and "Settings" → `/settings` were 404s.
  Placeholder pages added (owner decision: WIP pages; /rules becomes a
  bullet-point summary of the ToS).

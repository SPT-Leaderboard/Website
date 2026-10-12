# Prod design dossier (interaction + states)

Reference for the rewrite's styling work. Sources: live captures
(/tmp/prod-interactive, 2026-10-12) where the prod pages rendered, and the
legacy CSS (styles.css, ach.css, weaponmeta.css — the code prod actually
serves) where the API-gated pages never loaded. Cross-checked by vision
review (deepseek-v4.1-flash).

## Computed tokens (from live prod)
- body: Noto Sans 16px, #c9c9c9 on #0f172a
- h1: Orbitron 700, 40px, ls 2px, uppercase, #1e90ff (MODERNIZE: no glow)
- th: Inter 12.24px, uppercase, ls 1px, rgba(42,57,105,.41) band, pad 10px 20px
- buttons: radius 8px, pad 8px 16px, 13px

## Welcome gate
- Full-screen overlay, 2-col flex, 40px gap, video bg + scrim rgba(10,10,18,.7→.1)
- h1 "WELCOME TO SPTLB" ~36px cyan #38bdf8; glitch-phrase subtitle cycles every ~3s
- CTA: gradient 135deg #00e1ff→#0077ff, dark text, 14px 32px, min-w 280px, radius 8px,
  Rajdhani 18px uppercase; hover scale 1.01, active .98
- Secondaries: glass blur(10px), 1px glass-border, 10px 20px, hover rgba(255,255,255,.12)
- Dismiss: fade+translateY(-20px) 300ms, localStorage flag

## Nav
- Floating centered pill ~560px, radius 16px, translucent + border, 48px logo
- Items 13px, 8px 16px, radius 8px, rgba(255,255,255,.05), caret; Login = solid teal
- Dropdown: 4px under trigger, ~200px, bg #131c2e, radius 8px, rows ~46px
- Top strip: "API is Online" green-dot pill, stat chips, "Season end in" countdown

## Tables
- Row hover: rgba(100,154,255,.1) full row (styles.css:1050)
- Header: uppercase, ls 1px, Inter, band rgba(42,57,105,.41)
- Rank chip: radius 8px, rgba(255,255,255,.096) bg, #ffffff3b border
- Avatar: 45px, 2px rgba(132,210,255,.8) ring, hover scale 1.08
- Presence: 10-state pill, 2px hue border + 11px dot (MODERNIZE: no blink)

## Profile modal
- Centered ~1180×760, radius 12px, bg #131d33, border rgba(255,255,255,.08)
- Backdrop: dark scrim + blur(10px)
- 5-tile stat strip; tabs Summary/Raids/Equipment/Comments/Friends
- (Tab-bar active-state styling: source from styles.css modal section; live
  capture caught the team overview instead of a player profile)

## Insights
- Cards: radius 12px, bg #101a2e, border rgba(255,255,255,.06), 24px padding
- Card header: colored icon + 20px bold title; legend bottom, 22×10 swatch
- Axis labels 12px #64748b; palette indigo #6366f1 (PMC) / violet #8b5cf6 (SCAV)
- Tooltip: #0b0f1a box, radius 4px, 6px 8px, 12px white, no border
  (MODERNIZE: add border/shadow for separation)

## Weapon meta
- Filter slab: sticky top 155px, pad 20px, bg rgba(255,255,255,.034), radius 12px,
  blur 12px; search 50% width, focus #6366f1 + ring rgba(99,102,241,.3)
- Selects: 40px, bg #1e293b, radius 6px; active filter → #4d7ea8 border
- Grid: auto-fill minmax(380px,1fr), gap 15px
- Card: 145deg glass gradient, radius 24px, pad 28px, blur 20px;
  hover → #6366f1 border + deeper shadow
- Weapon-tag pills: #2d3748 base, hue only in the 12px text (7 semantic tones)

## Achievements
- Grid: auto-fill minmax(320px,1fr), gap 15px; no group headers, rarity-desc sort
- Card: same glass, radius 24px, per-rarity inline border tint
  (common #d1d1d1 / rare #1565c0 / legendary #ff8f00)
- Tile: 64px icon in 8px-radius frame + indigo glow; title 1.4rem glow
- Progress: 10px track, fill 90deg #6366f1→#a78bfa + glow
- Rarity chips: radius 20px, .9rem uppercase; opacity+border escalation per rarity

## Steal-list (top touches)
Gate glass secondary buttons · glitch subtitle · full-row hover tint incl.
sticky cell · 5-tile stat strip · indigo glow focus rings · legend-first chart
cards · 4-dot colored loader with status sentence · sticky filter slab ·
weapon-tag tone system · double rarity encoding (chip + border tint)

## Skip-list (do not copy)
Fixed-width nav overflowing mobile · loading-only pages without skeletons ·
borderless 4px tooltips · unstyled native selects · hover-only affordances ·
0.65rem text · blink animations · blocking welcome gate (rewrite: non-blocking
or none)

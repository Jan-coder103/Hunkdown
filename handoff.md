# Latest handoff

Phase 10 now has the main menu (Loadout, Settings, Maps, Skill tree), pause settings and asset viewer navigation, two selectable seeded maps, combat scoreboards, a separate rewards screen, and versioned local profile storage. The map and look sensitivity persist locally. Result claims are idempotent and retain the latest 100 match IDs. The profile recovers to a fresh local profile when its saved version/data is invalid or storage is unavailable.

The user selected a simple placeholder economy. Current provisional values are 100 XP +25 per kill +1 per 10 damage +20 per revive, and 50 credits +10 per kill +25 per revive. Field Notes costs 250 credits for +25% XP; Scrounger costs 400 credits for +25% credits. Bonuses round down and affect progression only. These rates/costs are documented in `docs/game-design.md` and await human review.

Verification: `npm run check` passes (120 tests across 26 files, strict typecheck, production build). The 514.84 kB shared asset/Three.js chunk warning remains. In the Codex in-app browser at `http://127.0.0.1:5186/`, the menu tabs rendered, Garden District selection persisted across reload and launched that map, Escape opened pause, and pause Settings → Resume returned to the match. The console had no warning/error entries; sample rendering showed about 60 FPS. Pointer lock was not acquired, and the round did not complete during this check, so movement, revive/death/respawn, and the visible two-stage results/payout still need manual review.

Next: ask the user to playtest the active match controls and results flow, and review the provisional economy/skills. Keep Phase 9 bot-tactics review open. Do not claim user verification. The formal 100+ bot performance profile remains Phase 13.

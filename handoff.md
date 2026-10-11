# Latest handoff

On 2026-10-11 implemented the follow-up safe-zone and HUD requests. Safe regions now have half the previous area (half width, unchanged depth). `src/game/match/safe-area.ts` is shared by roster spawning, match protection/confinement and rendering. All bots spawn/respawn within the smaller zones; boundary-cell spawns shift inward by body radius. Countdown bots slowly wander around seeded home anchors at up to 0.75 m/s, honoring collision and safe-zone bounds without combat.

The ammo display now has a procedural SVG rifle symbol. A separate grenade counter above it includes a filling ring with the next restock countdown. GrenadeSystem replenishes one grenade every 30 simulation seconds while below two; throwing another preserves timer progress, pause stops it, full inventory discards surplus credit, death continues it and respawn refills/reset as before. Shared simulation timing drives the HUD.

Verification: `npm run check` passed with 205 tests across 32 files, type checking and build. Added 100-bot spawn/respawn/wandering/confinement and restock behavior tests plus actual mounted-app count/ring/pause/completion coverage. Browser smoke at localhost:5190 (1280 × 720, Codex in-app browser) confirmed match and new HUD with empty warning/error logs. Manual throw/restock timing, hands-on combat feel, sustained 100-bot performance and human approval remain unverified. Existing shared bundle warning: 561.74 kB.

Next: human review of safe-zone size, bot warmup feel, grenade balance and HUD. Existing death-screen loadout editing and user-provided audio remain outstanding. Preserve seeded maps, simulation/render separation, corpse resource cleanup and 100+ bot goal. Dev server: http://127.0.0.1:5190/.

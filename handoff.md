# Latest handoff

Implemented folder-based custom playable maps on 2026-10-11. Place editor-exported JSON in root `maps/`, reload the dev game (restart Vite if needed), select its authored name in Maps, and Join round. Production sites need rebuilding/redeployment. The user's exported Test City is now `maps/city-draft.honkmap.json`.

`map-catalog.ts` discovers raw JSON via Vite glob, validates schema and objective-connected spawns, rejects duplicates independently, and provides built-ins plus custom selections. Invalid files show errors in Maps. Profile supports namespaced custom IDs; removed maps fall back to Midtown without resetting progression. Player placement uses the bot roster's safe connected spawn and ground elevation.

Verification: `npm run check` passed (222 tests/35 files, typecheck, build); browser selected Test City and launched its live match/countdown/HUD with no console warnings/errors. Shared 562.61 kB bundle warning remains. Hands-on custom-map combat and human approval are pending.

Next: review/play Test City and author more maps using `maps/README.md`. Existing death-screen loadout editing, approved audio clips, and other human-review work remain outstanding. No deployment performed.

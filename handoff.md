# Latest handoff

## Current status

Phase 8 character work is implemented. `tactical-chicken.asset.ts` provides the close/far low-poly chicken models, collision metadata, and team markings. `ChickenCharacterView` provides first-person camera wings and a third-person rig with movement, jump-flap, aim, reload, damage, and death presentation hooks. The practice range now uses enemy chickens.

`npm run check` passes: 76 tests across 17 files, strict typecheck, and production build. Vite reports the Honk-47 chunk at 505.04 kB minified. Browser inspection at `http://127.0.0.1:5181/asset-viewer.html` confirmed both chicken LODs and bounds; the combat range showed three chicken targets and first-person wings at about 60 FPS. The in-app browser did not acquire pointer lock, so no hands-on movement or reload playtest was possible. Human review is pending.

Phase 7 is still technically complete with human visual approval pending for the Honk-47 and Corner cafe. Do not claim approval for either phase until the user confirms.

## Next step

Review the tactical chicken's silhouette, equipment, team palette, and first-person proportions, along with the Phase 7 rifle and cafe candidates. Record any requested revisions. Before implementing Phase 9 match policy, resolve the objective capture rules and the death/revive/respawn/ticket edge cases listed in `tracker.md`.

## Open design issues

See `tracker.md` for the Phase 9 capture and lifecycle decisions, Phase 10 class/progression rules, Phase 13 performance target, and Phase 16 plane ability rules. Phase 4 combat values and Phase 6 map/generator defaults remain provisional.

# Latest handoff

## Current status

Phase 4 is technically complete; human review of weapon scale/model, shooting feel, and grenade handling is pending. The app now opens to a combat practice range with the code-generated Honk-47, three targets, hitscan damage, reloads, and grenade trajectory/throw support. `npm run check` passes 56 tests across 13 files, strict typecheck, and production build; Vite reports a non-blocking 533.75 kB minified bundle warning.

Browser rendering was checked at `http://127.0.0.1:5175/` at about 60 FPS, with no captured browser warnings or errors after fixing an empty trajectory-geometry update. The in-app browser could not acquire pointer lock, so hands-on firing, aiming, reloading, grenade throwing, and movement were not verified. See `tracker.md` for assumptions and remaining human review.

## Next work

Phase 5: define code-generated asset factories with collision metadata and explicit ownership, establish exactly two visual LOD tiers, add low-quality building/decoration/weapon/bird placeholders, and create the separate asset viewer with bounds and LOD inspection. Preserve the Honk-47 content and combat runtime boundaries; do not count practice targets as the Phase 8 chicken character.

## Open design issues

`tracker.md` retains the capture-point and death/ticket policies for Phase 9, progression/class rules for Phase 10, performance targets for Phase 13, and plane ability rules for Phase 16. Phase 4 tuning values are provisional and are listed in the tracker.

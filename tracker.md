# Current progress

Updated: 2026-10-06.

## Summary

- Phase 1: technically complete; human review pending.
- Phase 2: technically complete; human review pending.
- Phase 3: technically complete; human movement review pending.
- Phase 4: technically complete; human review of shooting feel pending.
- Phase 5: technically complete; human review pending.
- Active phase — 6: not started.
- User verification: none yet.
- Skipped features: none. Future additions remain outside base scope as stated in the plan.

## Phase 1

Technical acceptance is complete. Human review of the foundation and plan remains pending; see Foundation verification below.

## Phase 2

- [x] Create Three.js renderer, blank scene, perspective camera, lighting, resize handling, and explicit disposal.
- [x] Add bounded fixed-step simulation and pass interpolation alpha to rendering.
- [x] Add keyboard lifecycle with held/pressed state and focus/visibility cleanup.
- [x] Add deterministic seeded randomness, running/paused/disposed states, and pause/resume behavior.
- [x] Add frame, simulation, and fixed-step diagnostics.
- [x] Add behavior tests, rerun the full suite, type checking, and production build.
- [x] Verify the browser scene and Escape/Resume behavior.
- [ ] Human review of the engine shell.

## Phase 3

- [x] Build the flat movement playground with test walls, low obstacles, and a traversable ramp plus matching collision surfaces.
- [x] Implement fixed-step WASD movement, jumping, held sprint, default hold crouch, sprint-to-slide, Q/E lean, aim FOV and 80% look sensitivity, collision, ramp traversal, and render interpolation.
- [x] Add pointer-lock mouse look and held right-mouse aim with blur/visibility recovery and explicit listener cleanup.
- [x] Add configurable class-gated boosted double jump and wall jump; the Movement Test Class enables both for evaluation.
- [x] Add behavior tests for collision/ramp traversal, frame-rate consistency, movement/capabilities, camera interpolation, pointer lock lifecycle, and playground resource disposal.
- [x] Run `npm run check`: 39 tests across 12 files passed; strict typecheck and production build passed. Vite emitted a non-blocking bundle-size warning (506.67 kB minified JS).
- [x] Browser page rendered at `http://127.0.0.1:5174/` at about 60 FPS. Escape paused simulation (0 fixed steps); Resume returned it to Running.
- [ ] Human review of movement feel and visual playground.

Browser limitation: pointer-lock acquisition was attempted by clicking the scene and using Resume in the in-app browser, but `document.pointerLockElement` remained `null`; the in-app browser automation did not provide a successful pointer-lock session. As a result, mouse look, aim, held movement/jump, collision, slope traversal, and focus recovery have not been manually playtested in-browser. Their logic is covered by automated tests, but interactive acceptance remains open.

## Phase 4

- [x] Add a typed weapon schema, startup discovery from `src/content/weapons/*.weapon.ts`, unique-ID/schema validation, and the generated Honk-47 model in its own content file.
- [x] Add automatic/semi-automatic firing support, seeded spread, independent magazine/reserve state, cooldowns, reloads, aim accuracy, camera recoil, muzzle flash, and reload animation.
- [x] Resolve hitscan against target hitboxes and movement-world solid boxes; apply team-filtered damage, death, and impact knockback.
- [x] Add shared cancellable 4-second revive at 50% health and configurable full-health respawn timer primitives.
- [x] Add G-to-equip grenades, a ballistic trajectory preview, two-grenade inventory, collision/fuse detonation, line-of-sight radial damage with falloff, and teammate protection.
- [x] Connect the combat practice range and HUD; add a local weapon-pose hit stop, hit flash/marker, and nearby-explosion camera shake without halting world simulation.
- [x] Fix the engine input edge lifecycle so one-shot keys survive frames with no fixed step and clear after the first simulation step that consumes them.
- [x] Keep the hidden grenade arc geometry untouched when no arc is shown, removing repeated empty-buffer warnings from Three.js.
- [x] Add behavior coverage for ammo/cooldowns/reload, schema errors/discovery, hitscan/occlusion/teams, damage/lifecycle, grenades, view/resource lifecycle, pointer mouse buttons, recoil, and fixed-step key edges.
- [x] Run `npm run check`: 56 tests across 13 files passed; strict typecheck and production build passed. Vite reports a non-blocking 533.75 kB minified bundle warning.
- [x] Browser page rendered at `http://127.0.0.1:5175/`; the practice range, aligned target, HUD, and first-person rifle are visible at about 60 FPS. Final browser warning/error capture was empty after fixing the empty-arc update.
- [ ] Human review of weapon model, shooting feel, and grenade handling.

Browser limitation: the in-app browser did not acquire pointer lock during the manual check, and keyboard input simulation did not update the page. Actual firing, aiming, reload key interaction, grenade throw, and movement therefore remain unverified in a hands-on browser playtest; automated behavior tests cover the combat logic and event lifecycles.

Phase 4 tuning assumptions: Honk-47 starts with a 30-round magazine and 120 reserve rounds, fires at 600 RPM, deals 34 damage, and reloads in 1.8 seconds. Grenades start at two, fly at 11 m/s with a 3.2 m/s upward boost, detonate on first solid/ground contact or after 2.2 seconds, and use a 4.2 m blast radius with up to 90 damage and linear falloff. Revives take four seconds and restore 50% health; respawn delay and spawn are supplied by the later match system. These values are initial tuning choices, not final match policy.

## Phase 5

- [x] Define typed code-generated assets with validated bounds, collision boxes, explicit ownership, and exactly two visual LOD tiers.
- [x] Add building, decoration, weapon, and bird placeholders. The bird is a pipeline placeholder, not the Phase 8 player character.
- [x] Add the separate `/asset-viewer.html` app with lighting, drag orbit, wheel zoom, collision/bounds guides, and close/far selection.
- [x] Add behavior tests for asset metadata failures, collider containment, both LODs, disposal across swaps, viewer errors, orbit/zoom, and listener cleanup.
- [x] Run `npm run check`: 62 tests across 14 files passed; strict typecheck and production build passed. Vite builds the main app and viewer as separate HTML entry points with a shared Three.js chunk; no bundle-size warning.
- [x] Browser check in Codex in-app browser at `http://127.0.0.1:5176/asset-viewer.html`: all four assets report loaded; far LOD and bounds toggle work; drag changes the orbit; wheel changes zoom; no browser warnings or errors captured.
- [ ] Human review of placeholder appearance and viewer workflow.
- [ ] Link the viewer from the Escape menu when Phase 10 creates that menu.

Phase 5 assumption: collision metadata uses axis-aligned boxes, and visual bounds are authored per asset. Close/far tiers alter only rendering; both keep the same collision records. The viewer entry is directly addressable until the planned Escape menu exists.

## Decisions to resolve before affected features

1. **Objective:** notes call the mode capture the flag, but describe one central capture point ending the round. Planning uses a central capture-point mode. Confirm capture duration, contested behavior, decay, and tie resolution before Phase 9.
2. **Death timing:** notes require respawn after 20 seconds and bodies remaining for 30 seconds. Proposed rule: 20-second respawn eligibility, revive available only before respawn, visual corpse cleanup at 30 seconds. A revive removes the corpse immediately. Confirm before Phase 9; never create a duplicate live bird.
3. **Tickets:** 200 per team, one ticket per respawn, none for revives. Proposed initial spawns cost no tickets and tickets reaching zero end the round immediately; confirm edge cases before Phase 9.
4. **Progression/classes:** classes, skill tree effects, XP/money formulas, unlock costs, and persistence/reset behavior need definition before Phase 10.
5. **Performance:** bot count minimum is 100; FPS, reference hardware, resolution, and supported browsers need agreement before Phase 13 acceptance.
6. **Plane ability:** kill threshold, duration, cooldown, return-to-player behavior, and rewards need agreement before Phase 16.

## Revision queue

None yet. Record failures, deferred checks, user feedback, and relevant reproduction details here as work proceeds.

## Phase 2 verification

- `npm run check`: passed (21 tests across 8 files, strict type checking, production build).
- Browser: Codex in-app browser at `http://127.0.0.1:5174/`; blank scene and live diagnostics rendered. Escape opened the pause overlay, and the Resume button returned the engine to Running. The displayed frame rate was about 60 FPS.
- Automated lifecycle checks repeat start/dispose three times and verify animation-frame cancellation, keyboard listener removal, and view disposal. SceneView tests verify resize updates, zero-size hosts, and disposal.
- Browser viewport resizing and console logs were not checked in this pass.
- Human review and user verification remain pending.

## Foundation verification

- Node.js 22.19.0; Vite 8.3.3; Vitest 5.0.3; Three.js r180; TypeScript 5.9.x.
- `npm run check`: passed (1 initial test, strict type checking, production build).
- Dependency install audit: zero reported vulnerabilities after updating test tooling.
- Browser: Codex in-app browser at `http://127.0.0.1:5173/`; visible foundation page renders correctly and captured warning/error logs are empty.
- Revalidated 2026-10-06: `npm ci --offline` completed from the lockfile (70 packages added; zero reported vulnerabilities), and `npm run check` passed (1 test, typecheck, production build). The foundation page rendered in the Codex in-app browser at `http://127.0.0.1:5174/` because port 5173 was already occupied; its heading, Phase 1 status, 100+ bot target, Three.js version, and visual direction were visible.
- No gameplay or performance playtest applies yet. No user verification has been claimed.
- Network installation and local server required elevated execution because the sandbox blocks registry DNS and listening sockets; both succeeded. The reserved `.git` directory also required elevated Git initialization/writes.

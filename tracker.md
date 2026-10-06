# Current progress

Updated: 2026-10-06.

## Summary

- Phase 1: technically complete; human review pending.
- Phase 2: technically complete; human review pending.
- Phase 3: technically complete; human movement review pending.
- Phase 4: technically complete; human review of shooting feel pending.
- Phase 5: technically complete; human review pending.
- Phase 6: technically complete; human review pending.
- Phase 7: candidate revisions are technically complete; human visual review pending.
- Phase 8: character implementation and technical checks are complete; human visual review pending.
- Active phase — 9: bot navigation and tactical decision foundation implemented; match policy and simulation integration remain open.
- User verification: none yet.
- Skipped features: none. Future additions remain outside base scope as stated in the plan.

## Phases 1–8 review — 2026-10-06

Reviewed the phase acceptance criteria, project specifications, engine/input and movement boundaries, combat/lifecycle, typed assets/viewer, seeded map data/generation/editor, and chicken presentation. This review does not grant human approval; subsequent Phase 9 work is tracked below.

Corrections:
- Phase 4: eliminate floating-point cooldown residue that reduced the Honk-47's 600 RPM cadence at the engine's 60 Hz fixed step. Regression verifies ten shots in one second.
- Phase 4: bind revive/respawn timers to a specific death. An intervening revival followed by another death invalidates the old action instead of reviving/respawning the new death early.
- Phase 6: reject cell painting that blocks an existing authored route or closes its required doors before changing the document. Clear routes before making those edits. Cropping a winding route now preserves separate connected segments with unique IDs.
- Phase 6: render enterable-house placeholder walls directly from door collision segments, replacing closed decorative building models in these cells. Detailed enterable exteriors remain Phase 11 work.
- Phase 6: put ramps entirely on the low side of elevation boundaries so raised tiles do not bury half the incline; align their visual width/position with collision descriptors.
- Phase 6: extend the preview camera's far plane with map size so larger supported grids remain visible. Validate maps before clearing the current preview.

Verification:
- `npm run check`: 83 tests across 18 files passed; strict typecheck and production build passed. Existing 505.04 kB shared weapon/Three.js chunk warning remains non-blocking.
- Codex in-app browser at `http://127.0.0.1:5182/`: combat range and first-person chicken wings rendered, with diagnostics around 60 FPS. The map editor resized to 4 × 4, painted an N/S enterable house and adjacent elevation, and displayed three ramps (the elevated cell was at the map boundary). Chicken far LOD loaded in the asset viewer. Captured warning/error logs were empty.
- Browser DOM reported pointer lock acquired, but the visible controls continued to report uncaptured mouse and automated click/R input did not change ammunition. Firing/reload and movement remain unverified as hands-on interactions; behavior tests cover their logic. No new human approval is claimed.
- Human review of movement/shooting feel and representative assets remains pending. Full generated-map gameplay and 100+ bot performance belong to later phases.

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

## Phase 6

- [x] Add a versioned, validated map document with row-major street, solid-house, enterable-house, and elevation cells plus orthogonal authored routes.
- [x] Add the top-down grid painter with blue solid houses, yellow enterable houses, north/south, west/east, and all-side door layouts, and green elevation cells.
- [x] Add deterministic building selection from three typed building assets and clearance-aware placement from five typed decoration assets.
- [x] Generate elevated tiles and matching ramp render/collision descriptors at accessible elevation boundaries; build a door-aware navigation graph from the same cell data.
- [x] Add validated local save/load, JSON import/export, grid resizing, and a standalone `/map-editor.html` generation preview.
- [x] Add behavior tests for schema validation, malformed imports, door rules, seeded generation, route/decoration clearance, elevation links, and save/load round trips.
- [x] Run `npm run check`: 71 tests across 16 files passed; strict typecheck and production build passed. Vite builds the game, asset viewer, and map editor as separate entry points.
- [x] Browser check in the Codex in-app browser at `http://127.0.0.1:5180/map-editor.html`: editor and 3D preview rendered; painted an enterable house, drew a route through its open doors, and observed four ramps after elevating an adjacent cell.
- [ ] Human review of map-editor workflow, generated city look, door readability, and route/prop clearance.

Phase 6 assumptions: maps default to 16 × 16 cells at 8 m per cell; dimensions range from 2 to 64 cells, and cell size ranges from 4 to 32 m. Elevation rises 1.25 m, enterable door gaps are 1.5 m wide, and decoration candidates are selected with a 20% seeded chance while preserving clearance from authored paths and other props. These values are initial editor/generator defaults.

## Phase 7 — Asset revision and quality direction

- [x] Replace the separate rifle placeholder with the in-game Honk-47 model in the asset viewer. The viewer and combat range now use the same model builder; bounds and the viewer collision envelope are 0.24 × 0.46 × 1.28 m.
- [x] Refine the corner cafe prototype with a striped two-sided awning, framed windows, a door, and sign details while retaining its building-shell collision and fitting both LODs inside declared bounds.
- [x] Frame assets from their declared bounds when selected, including small weapon models; rename the LOD controls to describe detail rather than placeholder status.
- [x] Revise the reload pose so the magazine lowers, pauses, returns to the receiver, and resets cleanly; keep recoil and reload motion composed.
- [x] Add behavior coverage for the shared Honk-47 model, scale/bounds, automatic viewer framing, and magazine removal/insertion.
- [x] Run `npm run check`: 72 tests across 16 files passed; strict typecheck and production build passed.
- [x] Browser review in the Codex in-app browser at `http://127.0.0.1:5180/asset-viewer.html`: Honk-47 and corner cafe load with close/far LODs; selection frames each asset; no browser warnings or errors were captured. The combat range also rendered the updated rifle, and the map editor rendered the generated city preview. Reload was verified by behavior tests, not manually triggered in-browser during this pass.
- [ ] Human approval of the Honk-47 and corner cafe visual direction.

Review inventory: revised review candidates are Honk-47 and corner cafe. Placeholders still awaiting Phase 11 production work are Pastel row house, Tall townhouse, Street lamp, Street tree, Cafe kiosk, Plaza fountain, Street bicycle, and Tactical bird placeholder. The bird remains a pipeline placeholder, not the Phase 8 player character.

Phase 7 assumptions: rifle scale and olive/charcoal/wood palette are initial art choices; the cafe's visible additions remain decorative while the existing shell collider defines building blocking. Visual approval is open until the user confirms direction or gives revisions.

## Phase 8 — Player chicken character

- [x] Add a typed, low-poly tactical chicken with feathered body, helmet and goggles, field vest and pack, webbed feet, team patches, and bounded collision metadata.
- [x] Provide close and far render LODs and player, friendly, and enemy team markings.
- [x] Add first-person camera wing sleeves and a third-person character view with locomotion, jump flapping, aim, reload, damage-flash, and death-pose hooks.
- [x] Replace practice paper targets with enemy chickens and keep their death pose visible for review.
- [x] Add behavior coverage for team colors, LOD detail, character animation states, damage/death presentation, and view disposal.
- [x] Run `npm run check`: 76 tests across 17 files passed; strict typecheck and production build passed. Vite reports the existing Honk-47 chunk at 505.04 kB minified.
- [x] Browser review at `http://127.0.0.1:5181/asset-viewer.html` confirmed the chicken's close/far models and bounds. The combat range at `http://127.0.0.1:5181/` showed three chicken targets and the camera-mounted first-person wings while running at about 60 FPS.
- [ ] Human review of the chicken silhouette, field gear, team colors, and first-person proportions.

Browser limitation: clicking the combat range in the Codex in-app browser did not acquire pointer lock. Locomotion, jump, aim, reload, damage, and death poses were not manually driven in-browser; their state transitions are covered by behavior tests. No user visual approval is recorded.

Phase 8 assumptions: the character is 1.9 m tall in authored bounds; player, friendly, and enemy colors begin as amber, teal, and coral. First-person representation uses camera-mounted wing sleeves alongside the rifle. Death pose is presentation-only; corpse timing and lifecycle policy remain for Phase 9.

## Phase 9 — Bot logic, navigation, and match rules

- [x] Build door- and slope-aware bot routes on the generated navigation graph; seeded route weights let bots choose repeatable alternate lanes.
- [x] Add tactical bot intents for objective movement, visible-enemy selection, engagement, imperfect aim, local crowd avoidance, keeping distance, and low-health/outnumbered cover seeking.
- [x] Derive cover from reachable cells shielded by solid buildings; preserve entity state by leaving movement, weapon firing, and match lifecycle to their owning systems.
- [x] Add behavior coverage for blocked routes, door/slope connectivity, deterministic route variation, building cover, objective seeking, enemy visibility, inaccurate aim, cover seeking, and crowd avoidance.
- [x] Run `npm run check`: 90 tests across 19 files passed; strict typecheck and production build passed. The existing 505.04 kB Honk-47 bundle warning remains.
- [ ] Integrate bot intents with a live match simulation and verify multi-route movement, targeting/fire cadence, crowd behavior, and 100+ bot scaling.
- [ ] Implement map-derived combatant spawns and cover/line-of-sight observations for the integrated bot runtime.
- [ ] Implement countdown, objective capture, respawn/revive/corpse lifecycle, ticket accounting, and round outcomes after the open policy decisions below are resolved.
- [ ] Human playtest bot routes, accuracy, retreat behavior, and match rules.

Phase 9 progress so far is simulation logic only. The current browser game is still the Phase 4 combat practice range; no live bot match exists to manually playtest. Objective and lifecycle rules remain pending user direction, and Phases 1–8 still have human-review items open.

## Decisions to resolve before affected features

1. **Objective:** notes call the mode capture the flag, but describe one central capture point ending the round. Planning uses a central capture-point mode. Proposed default: 30 seconds of uninterrupted control; contested progress pauses and accumulated progress persists. Resolve capture duration, contest/decay, and whether zero tickets ends the round immediately before objective outcome code.
2. **Death timing:** notes require respawn after 20 seconds and bodies remaining for 30 seconds. Proposed rule: 20-second respawn eligibility, revive available only before respawn, visual corpse cleanup at 30 seconds, and immediate corpse removal on revive. Resolve before lifecycle code; never create a duplicate live bird.
3. **Tickets:** 200 per team, one ticket per respawn, none for revives. Proposed initial spawns cost no tickets and tickets reaching zero end the round immediately. Resolve before ticket and match-end code.
4. **Progression/classes:** classes, skill tree effects, XP/money formulas, unlock costs, and persistence/reset behavior need definition before Phase 10.
5. **Performance:** bot count minimum is 100; FPS, reference hardware, resolution, and supported browsers need agreement before Phase 13 acceptance.
6. **Plane ability:** kill threshold, duration, cooldown, return-to-player behavior, and rewards need agreement before Phase 16.

## Revision queue

Phase 7 visual approval is pending. Record user feedback and any requested asset revisions here before closing the phase.

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

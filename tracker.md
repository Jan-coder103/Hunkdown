# Current progress

Updated: 2026-10-08.

## Summary

- Phase 1: technically complete; human review pending.
- Phase 2: technically complete; human review pending.
- Phase 3: technically complete; human movement review pending.
- Phase 4: technically complete; the training range now has nine auto-resetting targets, three distances, and hit statistics; human review of shooting feel pending.
- Phase 5: technically complete; human review pending.
- Phase 6: technically complete; human review pending.
- Phase 7: candidate revisions are technically complete; human visual review pending.
- Phase 8: character implementation and technical checks are complete; human visual review pending.
- Phase 9: technical implementation complete; human gameplay review pending.
- Phase 10: match/menu/results/progression shell is implemented, with direct ready-room access to the shooting range; death-screen loadout editing and human gameplay/reward review remain.
- Phase 11: registered asset candidate pass and enterable-house facade set are technically complete; human visual review remains.
- Phase 12: comedy physics and destruction are technically implemented; human comedy/comfort review remains.
- Phase 13: 100-bot render optimization, the prior foreground profile, and cheaper off-screen AI scheduling are technically verified; human performance/gameplay review remains.
- Active phase — 14: audio playback/settings scaffolding is complete; user-provided clips and audible review remain.
- Phase 15: base-game quality review is underway; one full bot match completed through rewards, with hands-on controls and human approval pending.
- User verification: none yet.
- Skipped features: none. Future additions remain outside base scope as stated in the plan.

## GitHub Pages deployment — 2026-10-08

Added automatic GitHub Actions deployment on pushes to main, with dependency installation, tests, type checking, and a dedicated `/Hunkdown/` production build. Normal local dev/build keep `/`. Tool navigation and audio loading use Vite's deployment base. Repository Pages source switched from branch publishing to Actions.

Verification: `npm run check` passed (195 tests across 31 files, type checking, production build); `npm run build:pages` passed. New behavior coverage verifies actual browser audio requests under both local and Pages base paths. Existing 561.71 kB shared chunk warning remains. Live deployment verification pending; no human gameplay approval claimed.

## Physical corner-peeking lean — 2026-10-07

Replaced camera-only roll with a feet-anchored body tilt up to 0.28 radians. Eyes move approximately 44 cm sideways standing or 28 cm crouched and drop slightly; the camera-mounted rifle and wings follow automatically while the red-dot alignment remains centered. Lean direction follows player yaw, Q/E together cancel, and release/respawn recenters. Five sampled body volumes sweep the lean angle to limit it against walls, terrain, and world bounds; render interpolation and mouse turns also recheck clearance.

The player match combatant receives the leaned top displacement and stance height. Hitscan uses a height-dependent tilted hit volume, so the exposed upper body can take return fire. Bot perception/aim samples the leaned upper body, and grenade occlusion/damage samples its shifted center. Third-person chicken rigs support the same whole-rig tilt in both LODs; first-person wings inherit camera tilt.

Verification: `npm run check` passed with 193 tests across 30 files, strict type checking, and production build. Behavior tests verify blocked neutral shots become corner-peeking hits, camera/gun translation with planted feet, return fire hitting the exposed body, adjacent-wall and turning/interpolation clearance, facing-relative direction, crouch, both keys, full-rig close/far tilt, and match hit-volume/respawn synchronization. Browser visual QA at `http://127.0.0.1:5190/` (1280 × 720 in-app browser) used a temporary preview with the real controller/weapon/world: a hidden target became visible through the centered optic after leaning, while eye X moved from 0.20 m to -0.24 m and feet X stayed at 0.20 m. Console warnings/errors were empty; preview removed after inspection. Physical held-key pointer-lock play and human feel review remain unverified. Shared bundle warning remains 561.71 kB; sustained 100-bot performance was not rerun.

## Reference rifle revision and red-dot aiming — 2026-10-07

Rebuilt the Honk-47 from typed geometry toward the user's reference: dark steel/polymer palette, layered receiver and dust cover, exposed bolt/charging handle/selector/pins, rail teeth, handguard vents, front sight guards, extended stock, suppressor, trigger guard, textured grip, and a continuous curved magazine with pressed ribs. Close and far models share the main silhouette; fine fittings are close-only. Updated the asset bounds/collision envelope to contain the longer muzzle and magazine.

Held right mouse now smoothly translates and rotates the rifle from hip carry into an authored optical-axis alignment at 0.65 m eye relief. The optic has an open tube, annular rims, a lightly tinted transparent lens, and a visible red dot while aimed; the HUD crosshair hides during aim. Reload lowers the weapon and dot, then restores held aim; recoil recovers to the aligned sight, and respawn resets the hip pose. Presentation changes leave combat rules untouched.

Verification: `npm run check` passed with 188 tests across 30 files, strict type checking, and production build. New tests project the optical axis and dot to screen center, raycast through the optic to detect occluding geometry, verify camera look/roll alignment, update-rate consistency, recoil/reload/reset behavior, and held mouse integration through the mounted app. Existing asset tests validate both LOD envelopes. Browser visual QA at `http://127.0.0.1:5189/`, 1280 × 720 in-app browser, inspected side silhouette, hip carry, and centered open optic in a temporary real-renderer preview (removed afterward), plus the updated rifle in the actual shooting range. Console warnings/errors were empty. Physical held-mouse aiming with native pointer lock and human visual/feel approval remain unverified. The shared bundle warning now reports 561.71 kB, including procedural extrusion support. No sustained 100-bot performance profile was rerun.

## Requested controls and combat HUD fixes — 2026-10-07

Corrected vertical camera recoil so shots lift the aim ray, and lifted the rifle during its existing upward muzzle rotation. Q now rolls left and E right, with smooth recentering. The live death view uses a compact bottom information panel with transparent surroundings and no backdrop blur; the large HUD and crosshair hide while dead. Mouse wheel zooms the death camera between 25 m and 180 m, resets to 90 m for each death, and ignores alive, paused, menu, and results views. Camera shake no longer disturbs the death camera. Added a top-center countdown driven by the existing match timer and a restrained red edge vignette proportional to missing health, cleared at full health, death, menus, and results.

Verification: `npm run check` passed with 184 tests across 29 files, strict type checking, and production build. Behavioral regressions cover upward aim/muzzle movement, both lean directions and recentering, countdown completion and pause, damage intensity, zoom direction/limits, and respawn cleanup. Browser smoke at `http://127.0.0.1:5188/` (663 × 658 in-app browser) confirmed the top-center countdown; computed death-overlay styles showed bottom alignment, transparent background, and no blur. Browser warnings/errors were empty. Hands-on recoil/lean, visible wounded/death presentation, and physical wheel interaction remain for human playtest. No human verification is claimed. The existing 530.96 kB shared chunk warning remains.

## Shooting range access and training update — 2026-10-07

The first-person scene behind the ready-room menu was the existing movement/combat prototype, but the menu's only action entered a 100-bot match. The ready room now has a separate Shooting range action. The former test map has three marked firing lanes, nine chicken targets at 10 m, 15 m, and 20 m, bullseyes, backstops, cover, and the movement ramp. Targets stand again after 1.6 seconds. Reset range restores targets, ammunition/grenades, player position, and local range stats. HUD stats show shots, hits, accuracy, bullet/grenade damage, knockdowns, and remaining targets; range play does not award match rewards.

`npm run check` passed: 180 tests across 29 files, strict type checking, and production build. Browser smoke at `http://127.0.0.1:5188/` confirmed the ready-room action enters the range, the pause menu returns to the ready room, and the action can reopen it. The range HUD showed nine targets and 60 FPS at 663 × 658, with about 3.1 ms frame work and 453 draws. Browser warnings/errors were empty. The in-app browser did not acquire pointer lock, so manual movement and firing were not verified; behavior tests verify all nine targets are reachable by hitscan and exercise target reset/respawn and bullet/grenade stats. No human approval is claimed.

## Audio listener compatibility fix — 2026-10-07

Fixed the reported render-loop TypeError when an AudioListener lacks modern AudioParam properties (the Firefox listener API). Position and orientation now independently detect complete parameter groups and fall back to `setPosition` / `setOrientation`. Modern listeners retain parameter updates. Regression coverage verifies legacy updates across successive frames, inactive/disposed guards, and preference for modern properties.

`npm run check` passed: 173 tests across 28 files, strict type checking, and production build. The existing 530.95 kB shared asset/Three.js chunk warning remains. A live Firefox playtest was not performed; audible review remains blocked on user-provided clips. No human verification is claimed.

## All implemented phases review — 2026-10-07

Reviewed the implemented portions of phases 1–15 against the source brief, plan, specifications, tracker, and earlier review handoffs. Inspected the engine/input/movement, weapon/lifecycle/grenade logic, typed assets and tools, map/navigation/AI, match and UI/progression integration, destruction/LOD/resource ownership, and audio infrastructure. The baseline passed all 154 tests; this review adds 13 behavior cases.

Corrections:
- Phases 9/10: finish the round and show leaderboards/rewards immediately even if the player is dead. Hide the death overlay and keep results paused; Escape cannot resume completed-round screens or bypass the ready room. Consume refused Escape presses so they cannot trigger a delayed resume.
- Phases 3/6/9: share raised tile ground surfaces between player and bot movement. Players now stay on elevated tiles and can jump/land on them; bots traverse ramps continuously in both directions. Unsupported ledges block entry rather than snapping actors upward. Rectangular map bounds now use the actual width and depth.
- Phases 4/6/9: raised tiles and ramp wedges occlude shots, visibility, and grenade sweeps. Empty air above the slope remains clear.
- Phase 4: remove the unchecked grenade spawn offset that could throw through nearby thin cover. The visible arc and projectile share an origin and ballistic integration; wall blasts remain slightly outside the surface so near-side targets take damage while far-side cover still blocks it.
- Phases 9/10: select revive anchors from current match-owned deaths. Older corpses cannot mask a nearby revivable teammate or revive a later death from an old location. Range includes vertical distance.
- Phases 1/2/10: separate the application mount from its browser bootstrap for integration testing, detach retained menu/map/skill listeners on disposal, and update the outdated README to describe the implemented match and tools.

Verification:
- `npm run check`: 167 tests across 28 files passed; strict type checking and production build passed. New application-flow tests use the real engine, 100-bot match, combat, and profile code with DOM/renderer ports to verify alive/dead match completion, rewards applied once, blocked Escape, and the next-round loop. Terrain, grenade, and revive regressions cover the corrections above.
- Browser smoke in Codex's in-app browser at `http://127.0.0.1:5188/`, 663 × 658: ready room remained open on Escape, Garden District launched with 100 bots, the countdown/city/player rig rendered, and Escape opened pause. Captured warnings/errors were empty. A running-view sample showed 60 FPS with 2.4 ms frame work and 0.2 ms simulation work; an earlier startup/background sample was 4 FPS, so this is functional evidence, not a new sustained performance profile.
- The corrected death-to-results path and physical terrain/grenade/revive behavior were verified by automated tests, not a hands-on browser playtest. No human approval is claimed; the prior Phase 13 profile has not been rerun.

Continuation — 2026-10-07: replaced plain enterable-house panels with palette-specific stucco facades, base and roof bands, windows, shutters, and doorway trim generated around the existing collision segments. Added close/far models, paired distance/frustum culling, and destruction synchronization so a broken wall stays hidden after tier changes. Doorway trim stays outside the 1.5 m opening. `npm run check` passed with 168 tests across 28 files, strict type checking, and production build; the existing 530.95 kB shared asset/Three.js chunk warning remains. Browser smoke at `http://127.0.0.1:5189/` painted an enterable cell in the map editor (one generated building) and launched the 100-bot Midtown match at 60 FPS. The preview is top-down and pointer lock did not engage, so side-on facade review and combat interaction were not established; browser console logs were not inspected. No human visual approval is claimed.

Continuation — 2026-10-07: added cheaper off-focus bot simulation in `src/game/bots/bot-simulation.ts`. Bot thinking slows to one quarter of the configured interval beyond 32 m from the player (or objective for spectator matches) and returns to full rate within 26 m. Bots with a live opponent within sight range stay at full rate. Movement, weapons, hits, damage, and match lifecycle remain fixed-step; transitioning detail keeps the same combatant, intent, and weapon. Added tests for lower decision counts, focus transitions, and detailed off-focus engagements. `npm run check` passed with 171 tests across 28 files, strict type checking, and production build; the 530.95 kB shared asset/Three.js warning remains. The sustained 1920×1080 profile was not repeated after this simulation change, and no human playtest or approval is claimed.

Remaining acceptance work:
- Phase 10 has a live death view but no loadout editing controls while dead; the ready-room loadout lists only Honk-47. This is now tracked explicitly instead of treating all Phase 10 requirements as finished.
- Phase 11 enterable-house production visuals and Phase 13 enterable-house LOD/culling and cheaper off-screen AI scheduling are complete as recorded in the 2026-10-07 continuations. Phase 14 needs user-supplied clips; the current manifest is empty. All human visual, gameplay, balance, and comedy reviews remain open.
- No new expansion phase was started in this review.

## Phases 9–14 review — 2026-10-07

Reviewed match lifecycle and ticket outcomes, bot navigation/AI, player combat integration, progression and results, production asset geometry, destruction/render ownership, mass-scale scheduling, and audio playback/settings against the phase requirements.

Corrections:
- Phase 9: simultaneous due respawns cannot spend more tickets than remain. Exhaustion resolves after both teams' due lifecycle transitions, preserving a draw when both exhaust together. Excess actors stay dead and terminal results remain frozen. Zero-ticket configurations resolve before lifecycle work.
- Phases 10/12: thrown player grenades keep advancing and detonating while the player is dead, including damage attribution and destruction. Dead players cannot fire, reload, equip, or throw. Returning to life refills carried ammunition/grenades and cancels the rifle's old reload/recoil presentation without deleting already-thrown projectiles.
- Phase 11: correct both bicycle LODs so tires, rims, spokes, hubs, and chainring align with the frame rather than facing across it.
- Phase 14: snapshot spatial event positions before asynchronous clip loading, disconnect source/gain/panner nodes when a voice ends or fails, and prevent pending gesture unlocks from reconnecting a disposed manager.

Acceptance gaps made explicit:
- Phase 11's registered viewer inventory contains refined candidates. Enterable-house facade visuals and their close/far runtime tiers were subsequently implemented in the 2026-10-07 continuation below.
- Phase 13 keeps off-screen battles running with staggered decisions, but applies the same simulation fidelity everywhere. A separate cheaper off-screen simulation mode and transition verification remain unimplemented. Enterable-house LOD/culling was added in the 2026-10-07 continuation below. Prior 100-bot measurements remain valid evidence for that build, not proof these requirements are complete.
- Phase 14 remains silent because no user-provided sound clips are available. Human visual, gameplay, comedy, and sound reviews remain open.

Verification:
- `npm run check`: 154 tests across 27 files passed; strict type checking and production build passed. Added ten regression cases covering simultaneous ticket exhaustion, dead-player grenade continuity, respawn inventory/pose, bicycle geometry, and asynchronous audio ownership. The shared asset/Three.js chunk warning remains (530.95 kB).
- Codex in-app browser at `http://127.0.0.1:5187/`: final build launched the Midtown 100-bot match from the ready room and displayed its countdown/HUD; console warnings/errors were empty at launch. This is a smoke check, not a repeat of the sustained 1920×1080 profile.
- Hands-on pointer-lock combat, death-time grenade playback, revival, and audible output were not manually driven during this review. Automated tests verify the corrected simulation behaviors; no human approval is claimed.

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
- [x] Link the viewer from the Escape menu; implemented in Phase 10.

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

Review inventory: Phase 7 candidates Honk-47 and corner cafe still need human visual approval. Phase 8's tactical chicken also needs human visual approval. The remaining Phase 11 city set is being refined below.

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

Phase 8 assumptions: the character is 1.9 m tall in authored bounds; player, friendly, and enemy colors begin as amber, teal, and coral. First-person representation uses camera-mounted wing sleeves alongside the rifle. Death pose is presentation-only; corpse timing and lifecycle policy were resolved in Phase 9.

## Phase 9 — Bot logic, navigation, and match rules

- [x] Build door- and slope-aware bot routes on the generated navigation graph; seeded route weights let bots choose repeatable alternate lanes.
- [x] Add tactical bot intents for objective movement, visible-enemy selection, engagement, imperfect aim, local crowd avoidance, keeping distance, and low-health/outnumbered cover seeking.
- [x] Derive cover from reachable cells shielded by solid buildings; preserve entity state by leaving movement, weapon firing, and match lifecycle to their owning systems.
- [x] Add a data-only skirmish simulation with deterministic team spawns on cells connected to the center objective, route-following movement through generated colliders/ramps, building-blocked visibility, Honk-47 cadence/reload, and shared hitscan damage.
- [x] Keep route waypoints until bots reach cell centers; add regression coverage for traversing a generated enterable-house door without clipping its walls.
- [x] Add behavior coverage for blocked routes, door/slope connectivity, deterministic route variation/spawns/skirmishes, building cover and sight blocking, objective seeking, imperfect aim, cover seeking, and crowd avoidance.
- [x] Add a switchable bird's-eye browser preview with generated city blocks, team-marked chicken views, live simulation positions, damage poses, and transient team-colored shot tracers. The existing combat practice view remains available.
- [x] Add behavior coverage for live scene synchronization, bot movement, visible shot tracers, and resource cleanup.
- [x] Add a 20-second fixed-step round countdown; bots hold their spawn positions and do not fire before it completes.
- [x] Add countdown and match-gating behavior coverage, including exact 60 Hz completion and stationary bots before round start.
- [x] Implement the central capture point: 30 seconds of control wins; contested and neutral periods pause progress while each side keeps its earned time.
- [x] Implement 20-second respawn eligibility, 4-second pre-respawn teammate revives at team spawn with 50% health, no revive ticket cost, one ticket per respawn, and up to 30-second corpse cleanup. A revive removes its corpse; a respawn leaves the old body until cleanup.
- [x] Add outcome and ticket HUD states; the preview displays capture state, team ticket counts, and victory/draw reason.
- [x] Add behavior coverage for capture persistence/contests, countdown boundary timing, capture wins, revive eligibility/cancellation/health, corpse separation/cleanup, ticket exhaustion, terminal outcomes, and duplicate lifecycle protection.
- [x] Run `npm run check`: 107 tests across 24 files passed; strict typecheck and production build passed. The existing 514.84 kB shared asset/Three.js chunk warning remains.
- [x] Browser verification in Codex's in-app browser at `http://127.0.0.1:5184/`: observed the 20-second countdown and active 16-bot combat HUD with tickets and objective status. A sample read 60 FPS and about 7.3 ms frame work; this is not a formal 100+ bot performance test.
- [x] Defer the 100+ bot performance profile to Phase 13; the Phase 9 browser preview used 16 bots and makes no scaling claim.
- [x] Integrate player F-interaction for reviving bots and player death/respawn presentation with Phase 10; details are tracked below.
- [ ] Human playtest bot routes, accuracy, retreat behavior, capture rules, and match outcomes.

The Phase 9 preview remains a spectator bot match; Phase 10 adds a separate playable join-round path. Bot respawns restore full health and the weapon's initial ammunition. A simultaneous exhaustion of both teams' last tickets resolves as a draw. Phases 1–8 still have human-review items open.

## Phase 10 — UI/UX and progression shell

- [x] Add a playable join-round path with a locally controlled friendly player sharing the bots' movement world, hit registration, objective presence, and match-owned death lifecycle.
- [x] Hold F within 2.5 m of a fallen friendly bot to begin its existing 4-second revive; releasing F, leaving range, switching targets, or dying cancels the interaction.
- [x] On player death, release pointer lock and switch to the live bird's-eye city view while the battle continues; return the player to the friendly spawn after the existing 20-second delay and charge one ticket.
- [x] Add behavior coverage for a human player as a shared hit target, player-initiated teammate revive, player death/respawn, ticket accounting, and movement-state reset on spawn.
- [x] Run `npm run check`: 111 tests across 24 files passed; strict type checking and production build passed. The 514.84 kB shared Three.js/asset chunk warning remains.
- [x] Add four main menu tabs, local look-sensitivity setting, two selectable seeded map presets, Escape pause settings, asset viewer navigation, and return-to-main-menu flow. Loadout accurately exposes the only current weapon and identifies later class/weapon work.
- [x] Track damage, kills, healing/revives, and deaths per combatant; show top-five leaderboards on a results screen, then a separate reward screen.
- [x] Add a version-1 local profile with invalid/unsupported/unavailable save recovery, map/settings persistence, skill purchases, and a bounded 100-match reward history. Duplicate result claims do not pay twice.
- [x] Add the user-selected provisional economy: 100 XP +25/kill +1 per 10 damage +20/revive; 50 credits +10/kill +25/revive. Field Notes costs 250 credits for +25% XP; Scrounger costs 400 credits for +25% credits. Bonuses round down and do not affect combat.
- [x] Add behavior coverage for profile recovery/round-trip, settings bounds, formulas, skill purchase, reward idempotency, all four leaderboard rankings, match score attribution, and selectable map navigation.
- [x] Run `npm run check`: 120 tests across 26 files passed; strict typecheck and production build passed. The existing 514.84 kB shared asset/Three.js chunk warning remains.
- [x] Browser check in Codex's in-app browser at `http://127.0.0.1:5186/`: the menu and all tab content rendered; selected Garden District persisted across reload and launched the matching city; Escape opened pause; Settings opened from pause and Resume returned to the live match. Console error/warning log was empty; sample match view showed about 60 FPS.
- [x] Manually observe a completed round, both results screens, and the visible payout; completed in the 2026-10-07 Phase 15 browser smoke run recorded below.
- [ ] Add loadout editing from the live death screen. Only the ready-room listing of the sole implemented primary exists today.
- [ ] Human playtest movement, combat, revive range/hold behavior, player death view, and respawn feel. The in-app browser did not acquire pointer lock, so movement, death, and revive were not driven manually in this pass.
- [ ] Human review the provisional XP/credit rates and skill costs/effects, menu presentation, and complete result-to-next-round loop.

Phase 10 assumptions: player revive uses a 2.5 m interaction radius and requires holding F for the shared four-second revive duration. The player automatically returns at the spawn point when the 20-second eligibility timer completes; pointer lock must be reacquired by clicking the scene. The selected economy and skill bonuses are provisional placeholders, kept progression-only and easy to adjust. These rules remain open for human review.

## Phase 11 — High-quality asset production

- [x] Refine the pastel row house and tall townhouse with layered facades, framed windows, trim, entries, and low-poly roof details.
- [x] Replace plain enterable-house panels with asset-colored stucco, foundation/roof courses, windows, shutters, and collision-aligned door surrounds; preserve the existing open-door geometry and destructible panel IDs.
- [x] Add separate close/far enterable-house models and behavior coverage for clear doorways and wall destruction across LOD transitions.
- [x] Refine the street lamp, street tree, cafe kiosk, plaza fountain, and street bicycle with clearer silhouettes and street-level detail.
- [x] Keep code-generated close/far LODs and collision metadata; generated visual bounds remain inside each declared asset envelope.
- [x] Remove the duplicate tactical bird placeholder from the asset registry and viewer. The detailed Tactical chicken remains the canonical bird asset; the Honk-47 remains the shared combat/viewer model.
- [x] Add asset-pipeline coverage for the refined models, reduced far LODs, bounds, and placeholder-free viewer inventory.
- [x] Run `npm run check`: 121 tests across 26 files passed; strict type checking and production build passed. The shared 522.27 kB asset/Three.js chunk warning remains.
- [x] Browser review in the Codex in-app viewer at `http://127.0.0.1:5186/asset-viewer.html`: reviewed the row house, townhouse, lamp, tree, kiosk, fountain, and bicycle models; bounds and collision guides loaded. The map editor also loaded with the revised assets available.
- [ ] Human visual approval of the refined city set and the existing cafe, chicken, and Honk-47 direction.
- [ ] Iterate from user feedback before closing the production set.

Phase 11 review inventory: Pastel row house, Corner cafe, Tall townhouse, Street lamp, Street tree, Cafe kiosk, Plaza fountain, Street bicycle, Tactical chicken, Honk-47, and the generated enterable-house facade set. Registered assets are code-generated TypeScript models with two render LODs; enterable houses now also build collision-aligned close/far facades from map data. No placeholder asset remains in the registered viewer set. New weapons, classes, and future tactical gear are not part of this phase's finished inventory.

Phase 11 assumptions: the current review pass keeps existing scale, palette, and gameplay collision metadata. New facade and prop details are presentation-only. Visual direction and final production approval remain with the user.

## Phase 12 — Comedy physics and destruction

- [x] Add speed-bounded impact impulses to players and bots; hits, rifle recoil, and grenade blasts can shove or briefly lift combatants. Player movement combines recoil with keyboard movement; impact motion has drag and respects walls.
- [x] Add a short, impulse-driven chicken flop with a bounce and settled pose; gameplay corpse and revive positions remain match-owned.
- [x] Make generated street decorations and individual enterable-house wall panels destructible. Rifle hits and grenade blasts damage them; destroyed colliders stop blocking movement and shots, and bots add safe flat routes through newly opened house walls.
- [x] Keep debris bounded to 32 shared/reused pieces with a short lifetime; avoid prop placement inside navigation clearance or house footprints.
- [x] Add behavior coverage for impulse bounds, player/bot recoil, death tumbling, prop and wall destruction, debris cleanup, collision removal, and navigation opening.
- [x] Run `npm run check`: 132 tests across 26 files passed; strict type checking and production build passed. The shared 522.27 kB asset/Three.js chunk warning remains.
- [x] Browser check at `http://127.0.0.1:5186/`: joined the live Midtown match; the player view, city, weapon, match HUD, and countdown rendered at a sample 60 FPS (about 2.7 ms simulation work). Browser error/warning log was empty.
- [ ] Human playtest recoil, ragdoll, and destruction feel; review the comedy and comfort direction before closing the phase. The in-app browser did not acquire pointer lock, so firing and destruction were not driven manually during this check.

Phase 12 assumptions: impulse speed is capped at 12 m/s; rifle recoil is a repeated backward/upward kick, and hit knockback is stronger than the Phase 4 baseline. Decorations start at 68 health and enterable wall panels at 136 health. Debris settles and expires after about 1.35 seconds. Solid house shells remain static; wall panels and street props carry the destructible-cover behavior. These are initial tuning values for human review, not final balance approval. Phase 13 owns 100+ bot performance profiling.

## Phase 13 — Performance and mass scale

- [x] Set the reference target with the user: 60 FPS at 1920×1080 on their normal desktop.
- [x] Raise playable and spectator skirmishes to 50 friendly plus 50 enemy bots; retain authoritative off-screen simulation.
- [x] Use two chicken render tiers, distance and frustum culling for characters and city assets, instanced repeated floor tiles, and a two-draw far chicken silhouette.
- [x] Give enterable houses close/far render tiers with distance/frustum culling while keeping their shared wall collisions and destruction state intact.
- [x] Stagger bot decision updates, reduce per-step snapshot and perception allocations, and pool expired corpse views by team under a 192-view cap. Destruction debris remains bounded at 32 pieces.
- [x] Show frame work, simulation work, draw calls, triangle count, geometry count, and visible/close/far character counts in diagnostics.
- [x] Add coverage for 100-bot simulation, off-screen simulation continuity, LOD changes without match-state drift, corpse-view reuse, culling, batching, and renderer telemetry.
- [x] Run `npm run check`: 138 tests across 26 files passed; strict type checking and production build passed. The existing shared 531.02 kB asset/Three.js chunk warning remains.
- [x] Profile the active match at 1920×1080, DPR 1, in Codex's in-app browser on the reference host (Intel Core i5-3570K, 3.40 GHz): first-person samples held 60 FPS with 2.4–4.0 ms frame work; bird's-eye samples with all 100 bots visible held 60 FPS with 5.6–7.7 ms work, roughly 469–506 draws and 33.7–39.0k triangles.
- [x] Confirm sustained performance in a stable foreground browser session at 1920×1080 on the Intel Core i5-3570K host. A dedicated spectator match ran for about 84 seconds: all interval samples displayed 60 FPS, with 4.8–8.3 ms frame work and 0.3–3.1 ms simulation work. The 100-bot view showed about 480–522 draws and 33.9–42.2k triangles. Geometry settled at 889–890 over the final 30 seconds while 126/126 close/far character views were visible. A separate first-person match stayed at 60 FPS across 50 seconds of samples, with 2.6–4.5 ms frame work.
- [x] Check browser console and post-pooling geometry: no console warnings/errors; geometry remained at 889–890 during the stable overhead plateau. One 45.1 ms frame-work sample appeared in a separate player match near ticket exhaustion; it did not recur in the dedicated 84-second spectator profile.

Phase 13 render optimization and the recorded performance checks passed. Enterable houses have two render tiers with distance/frustum culling; collision, destruction, and simulation state remain shared across tiers. Bot AI now thinks at one quarter of its normal rate outside a hysteretic radius around the player (or the objective in spectator mode). Bots with live opponents in sight stay detailed; movement, weapon timing, hit resolution, and lifecycle updates still run every fixed step. Focus transitions preserve each combatant, intent, and weapon state. Automated coverage verifies lower distant decision counts and nearby combat detail. The historical 1920×1080 performance profile predates this simulation change and was not rerun. The browser HUD reports a rounded instantaneous rate and the samples were taken every 10 seconds, not as a per-frame histogram. No user verification is claimed.

## Phase 14 — Sound design

- [x] Add a versioned local audio manifest with required source/license attribution for each supplied clip; keep the manifest empty until user-provided files are available.
- [x] Add gesture-unlocked Web Audio playback with spatial listener/panners, master and effects buses, bounded voice counts, and event throttles. Missing or invalid clip mappings stay silent without requesting a file.
- [x] Connect gunshots, explosions, reloads, hit feedback, footsteps, UI clicks, and short bot knockout honks to gameplay events.
- [x] Add saved master/effects volume controls and migrate version-1 browser profiles to version 2 with 80% defaults.
- [x] Add behavior coverage for audio unlock, spatial routing, volume buses, missing/unsafe mappings, and per-sound/global voice limits.
- [x] Run `npm run check`: 144 tests across 27 files passed, strict type checking passed, and production build passed. The shared 531.02 kB asset/Three.js chunk warning remains.
- [x] Browser check at 1920×1080: Settings showed both volume controls at 80%; changing master volume to 79% persisted across reload, then was restored to 80%. Browser console warnings/errors were empty.
- [ ] Import user-provided clips with source/license records and manually review the audible balance and clarity. `public/audio/manifest.json` currently has no mapped clips, so sound output was not audibly verified.

Phase 14 is active. Its playback and settings infrastructure is technically implemented; sound clip integration and human listening review remain open. No user verification is claimed.

## Phase 15 — Base-game quality control

- [x] Review menu entry, saved map selection, 100-bot match launch, countdown, ticket-based match completion, leaderboards, rewards, and return to the ready room in the browser. Garden District completed with a friendly ticket-exhaustion victory; the payout showed 100 XP and 50 credits.
- [x] Review pause/resume and opening Settings from a paused match. Both volume sliders displayed the saved 80% defaults.
- [x] Observe match progression, player death/automatic respawn, and the overhead view with up to 135 characters including corpses. Browser HUD samples showed 60 FPS, 1.1–5.8 ms frame work, and 0.0–3.4 ms simulation work at the in-app browser's 663 × 658 viewport. This was a functional smoke run, not a replacement for the 1920 × 1080 Phase 13 acceptance profile.
- [x] Check browser console during the run: no warnings or errors.
- [x] Run `npm run check`: 144 tests across 27 files passed; strict type checking passed; production build passed. The shared 531.02 kB asset/Three.js chunk warning remains.
- [ ] Human playtest of pointer lock, movement, aiming, shooting, reload, grenades, and revive. The in-app browser did not acquire pointer lock, so these controls were not verified by hand in this pass.
- [ ] Human approval of the complete base game before expansion. Existing visual, feel, balance, and comedy review items remain open in earlier phases.

Phase 15 technical review is in progress. The browser completed an unattended bot battle from menu to results and payout, but this does not establish hands-on playability or user approval. Audio remains silent pending approved user-supplied clips in Phase 14.

## Decisions to resolve before affected features

1. **Objective — resolved for Phase 9:** one central point needs 30 seconds of control; contests and neutral time pause progress, and accumulated progress persists. Capture ends the round.
2. **Death timing — resolved for Phase 9:** 20-second respawn eligibility; teammate revive can complete before respawn, takes four seconds, and restores 50% health at team spawn; a completed revive removes its corpse. Unrevived bodies are cleaned up after 30 seconds.
3. **Tickets — resolved for Phase 9:** 200 per team; initial spawns are free; each respawn costs one; revives cost none; a team reaching zero ends the round. Simultaneous exhaustion is treated as a draw.
4. **Progression/classes:** the user selected a simple placeholder economy for Phase 10. The provisional formulas and two progression-only bonuses are implemented and documented; rates, costs, class effects, and save/reset behavior need human review.
5. **Performance target — resolved 2026-10-06:** 60 FPS at 1920×1080 on the user's normal desktop; the sustained foreground acceptance run is tracked in Phase 13 above.
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

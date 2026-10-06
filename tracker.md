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
- Phase 9: technical implementation complete; human gameplay review pending.
- Phase 10: UI/UX and progression shell is technically implemented and verified; human gameplay and reward review remain.
- Phase 11: first high-quality asset candidate pass is technically complete; human visual review and direction remain.
- Phase 12: comedy physics and destruction are technically implemented; human comedy/comfort review remains.
- Phase 13: performance and mass-scale implementation is complete; sustained profile verified in the foreground browser, with one near-round-end work spike recorded below.
- Active phase — 14: audio playback/settings scaffolding is complete; user-provided clips and audible review remain.
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
- [ ] Manually observe a completed round, the two results screens, and the visible payout. Automated coverage verifies leaderboard ordering and reward idempotency; the naturally played round did not end during this check.
- [ ] Human playtest movement, combat, revive range/hold behavior, player death view, and respawn feel. The in-app browser did not acquire pointer lock, so movement, death, and revive were not driven manually in this pass.
- [ ] Human review the provisional XP/credit rates and skill costs/effects, menu presentation, and complete result-to-next-round loop.

Phase 10 assumptions: player revive uses a 2.5 m interaction radius and requires holding F for the shared four-second revive duration. The player automatically returns at the spawn point when the 20-second eligibility timer completes; pointer lock must be reacquired by clicking the scene. The selected economy and skill bonuses are provisional placeholders, kept progression-only and easy to adjust. These rules remain open for human review.

## Phase 11 — High-quality asset production

- [x] Refine the pastel row house and tall townhouse with layered facades, framed windows, trim, entries, and low-poly roof details.
- [x] Refine the street lamp, street tree, cafe kiosk, plaza fountain, and street bicycle with clearer silhouettes and street-level detail.
- [x] Keep code-generated close/far LODs and collision metadata; generated visual bounds remain inside each declared asset envelope.
- [x] Remove the duplicate tactical bird placeholder from the asset registry and viewer. The detailed Tactical chicken remains the canonical bird asset; the Honk-47 remains the shared combat/viewer model.
- [x] Add asset-pipeline coverage for the refined models, reduced far LODs, bounds, and placeholder-free viewer inventory.
- [x] Run `npm run check`: 121 tests across 26 files passed; strict type checking and production build passed. The shared 522.27 kB asset/Three.js chunk warning remains.
- [x] Browser review in the Codex in-app viewer at `http://127.0.0.1:5186/asset-viewer.html`: reviewed the row house, townhouse, lamp, tree, kiosk, fountain, and bicycle models; bounds and collision guides loaded. The map editor also loaded with the revised assets available.
- [ ] Human visual approval of the refined city set and the existing cafe, chicken, and Honk-47 direction.
- [ ] Iterate from user feedback before closing the production set.

Phase 11 review inventory: Pastel row house, Corner cafe, Tall townhouse, Street lamp, Street tree, Cafe kiosk, Plaza fountain, Street bicycle, Tactical chicken, and Honk-47. All are code-generated TypeScript models with two render LODs; no placeholder asset remains in the registered viewer set. New weapons, classes, and future tactical gear are not part of this phase's finished inventory.

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
- [x] Stagger bot decision updates, reduce per-step snapshot and perception allocations, and pool expired corpse views by team under a 192-view cap. Destruction debris remains bounded at 32 pieces.
- [x] Show frame work, simulation work, draw calls, triangle count, geometry count, and visible/close/far character counts in diagnostics.
- [x] Add coverage for 100-bot simulation, off-screen simulation continuity, LOD changes without match-state drift, corpse-view reuse, culling, batching, and renderer telemetry.
- [x] Run `npm run check`: 138 tests across 26 files passed; strict type checking and production build passed. The existing shared 531.02 kB asset/Three.js chunk warning remains.
- [x] Profile the active match at 1920×1080, DPR 1, in Codex's in-app browser on the reference host (Intel Core i5-3570K, 3.40 GHz): first-person samples held 60 FPS with 2.4–4.0 ms frame work; bird's-eye samples with all 100 bots visible held 60 FPS with 5.6–7.7 ms work, roughly 469–506 draws and 33.7–39.0k triangles.
- [x] Confirm sustained performance in a stable foreground browser session at 1920×1080 on the Intel Core i5-3570K host. A dedicated spectator match ran for about 84 seconds: all interval samples displayed 60 FPS, with 4.8–8.3 ms frame work and 0.3–3.1 ms simulation work. The 100-bot view showed about 480–522 draws and 33.9–42.2k triangles. Geometry settled at 889–890 over the final 30 seconds while 126/126 close/far character views were visible. A separate first-person match stayed at 60 FPS across 50 seconds of samples, with 2.6–4.5 ms frame work.
- [x] Check browser console and post-pooling geometry: no console warnings/errors; geometry remained at 889–890 during the stable overhead plateau. One 45.1 ms frame-work sample appeared in a separate player match near ticket exhaustion; it did not recur in the dedicated 84-second spectator profile.

Phase 13 technical and performance checks are complete. The browser HUD reports a rounded instantaneous rate and the samples were taken every 10 seconds, not as a per-frame histogram. No user verification is claimed.

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

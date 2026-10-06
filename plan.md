# Operation Honkdown — development plan

## Scope and working method

Build an English-language, bright pastel, low-poly FPS in TypeScript and Three.js. One human player fights alongside and against bots in a dense, navigable city. The target is at least 100 bots, satisfying tactical shooting, absurd chicken physics, and a complete repeatable match loop. No multiplayer backend is in the initial scope.

Develop in the order below. Each phase has automated feature tests, a full regression run, type checking, a production build, an updated tracker and handoff, and a Git commit. Interactive phases additionally need a human playtest; technical completion and human approval are separate statuses. Temporary details belong in `tracker.md`, never here. See `docs/testing.md` for gates.

## Phase 1 — Project foundation

- Preserve the source brief; create agent entry points, this plan, tracker, handoff, and supporting specifications.
- Initialize Git, ignore generated files, and create the first reviewed project baseline.
- Scaffold TypeScript, Three.js, Vite, and a test runner with documented commands.
- Establish folders for engine, game systems, content, UI, tools, and tests.
- Document ambiguous rules, phase dependencies, and the review workflow.
- Acceptance: a clean install can run tests, type checking, build, and the foundation page; no gameplay completion claims.

## Phase 2 — Core engine shell

- Add renderer, scene, camera, lighting, resizing, and explicit startup/disposal.
- Add a fixed-step simulation with interpolated rendering, input lifecycle, and seeded randomness.
- Add game states, pause/resume behavior, and diagnostics for frame/simulation timings.
- Acceptance: stable blank 3D scene; repeat start/dispose without leaked listeners/resources; pause stops world simulation.

## Phase 3 — Player movement and test map

- Create a flat movement playground with walls, slopes, and measurable obstacles.
- Add pointer-lock look, WASD, jump, held sprint, crouch, slide, and Q/E lean.
- Add held aiming with zoom and 80% of normal look sensitivity.
- Implement class-gated boosted double jump and wall jump with speed boost.
- Acceptance: consistent movement across frame rates; collision, slope traversal, lost focus, and pointer-lock recovery work; human approves feel.

## Phase 4 — Weapons, shooting, and combat lifecycle

- Define a common weapon schema, a startup registry, and one-file-per-weapon content.
- Build the first detailed code-generated weapon, recoil, aim, firing and reload animations.
- Implement ammunition, fire rate, hit registration, damage, health, death, and shared revive/respawn primitives.
- Add hit flash, restrained hit freeze, knockback, and explosion camera shake; avoid blocking unrelated world simulation for local feedback.
- Add G to equip a grenade, a visible trajectory arc, and left click to throw.
- Acceptance: reliable damage and ammo accounting, blocked shots respect geometry, reload/cooldown interactions behave, human approves shooting feel. Full match policy comes in Phase 9.

## Phase 5 — Asset pipeline and asset viewer

- Define typed asset factories with collision metadata, disposal ownership, and two LOD tiers.
- Create low-quality building, decoration, weapon, and bird placeholders.
- Create a separate asset viewer entry point/app with orbit inspection, lighting, bounds, and LOD selection; launch it from Escape menu when that menu exists.
- Acceptance: every placeholder loads in the viewer; invalid metadata is reported; repeated preview swaps release resources.

## Phase 6 — Map generation and simple editor

- Define versioned, serializable cell data and authored paths with deterministic seeded building selection.
- Make a top-down grid painter: blue solid houses, yellow enterable houses, green elevation.
- Support yellow-building door variants north/south, west/east, and all sides; generate slope tiles at elevation boundaries.
- Fill building cells edge-to-edge; keep routes open; place trees, cafes, fountains, and bikes using clearance/logical rules.
- Add map save/load and generation preview using placeholders.
- Acceptance: identical seed/layout produces identical maps; doors, slopes, and lanes stay navigable; saved maps round-trip and invalid maps fail clearly.

## Phase 7 — Asset revision and quality direction

- Review existing detailed weapon assets and city prototypes with the user.
- Fix scale, silhouettes, palette, collision, and obvious animation defects; establish the quality bar for later production assets.
- Acceptance: approved representative assets in the viewer; placeholders elsewhere are tracked explicitly. This is an early revision pass; Phase 11 completes the wider asset set.

## Phase 8 — Player chicken character

- Build the low-poly cartoony chicken with tactical gear, team recognition, and first/third-person representations.
- Add locomotion, wing flapping during jumps, aim, reload, damage, and death pose hooks.
- Acceptance: no camera clipping or unreadable team silhouettes; character works with existing movement/weapons; human approves the visual direction.

## Phase 9 — Bot logic, navigation, and match rules

- Build navigation from map cells, connected doors, slopes, and cover candidates.
- Add friendly/enemy team bots, varied route selection, objective seeking, enemy detection, imperfect aim, and fire decisions.
- Add local crowd avoidance, retreat when outnumbered, and cover seeking at low health.
- Connect lifecycle rules: 20-second respawn, 4-second revive, 50% revive health, corpse cleanup, and team tickets.
- Implement 20-second round countdown, one central capture objective, 200 tickets per team, and match-end conditions.
- Acceptance: bots reach objectives by varied routes; fair visibility/accuracy; no double respawn or duplicate ticket deductions; revived entities retain one identity. Final capture and corpse timing policy must be confirmed before this phase closes.

## Phase 10 — UI/UX and progression shell

- Main menu: loadout, settings, map selection, skill tree, join round.
- Add HUD, countdown, objective/tickets, damage/death feedback, and Escape resume/settings menu with asset viewer link.
- Add live bird's-eye death view, loadout edits while dead, and eligible spawn at team starting point.
- Results: four leaderboards (damage, kills, healing, deaths), then XP/money rewards, then return to main menu.
- Create versioned local progression/settings storage; define economy and skill effects with the user.
- Acceptance: the full menu-to-match-to-results-to-next-match loop works; rewards apply exactly once; invalid saved data is handled.

## Phase 11 — High-quality asset production

- Replace city, decoration, gear, character, and weapon placeholders with refined TypeScript-generated models.
- Iterate in the asset viewer using user feedback; maintain shared scale, palette, and collision conventions.
- Provide coherent close/far LOD variants for the finished content set.
- Acceptance: approved production set, explicit placeholder inventory, no readability or navigation regressions.

## Phase 12 — Comedy physics and destruction

- Add exaggerated recoil impulses that can propel players/bots, dramatic ragdolls, and comedic chicken reactions.
- Add low-poly destructible props/building parts with bounded debris and updated collision/navigation.
- Keep competitive rules, revive anchors, and readability reliable amid chaos.
- Acceptance: no uncontrolled simulation growth or invalid respawns; destroyed geometry affects cover consistently; human approves comedy and comfort settings.

## Phase 13 — Performance and mass scale

- Profile 100+ bots on a documented browser, resolution, and reference machine; agree a frame-time target with the user.
- Apply exactly two render LOD tiers, view/range culling, instancing, batching, and resource reuse.
- Implement cheap off-screen combat simulation with persistent state and fair transitions to detailed simulation.
- Budget AI/pathfinding, cap debris and corpses, inspect memory, and stress long matches and bird's-eye views.
- Acceptance: at least 100 bots meet the agreed performance budget; off-screen fighting continues; no disappearance, duplicate damage, or ticket drift when detail changes; no multiplayer/network dependency.

## Phase 14 — Sound design

- Import user-provided sound files with source/license records.
- Add spatial gunshots/explosions, honks, footsteps, reloads, hit feedback, UI, and volume controls.
- Limit voice concurrency and comply with browser audio activation rules.
- Acceptance: clear combat cues, useful volume settings, graceful missing-file fallback, and acceptable performance at scale.

## Phase 15 — Base-game quality control

- Review the complete loop, map seeds, combat, bot behavior, progression, controls, graphics/audio settings, and long-session stability.
- Fix blockers and tune readability, difficulty, and comedy using human feedback.
- Acceptance: base game is playable from start to finish with 100+ bots; known limitations recorded; user approves the base before expansion.

## Phase 16 — Giant bird plane ability

- Agree a kill threshold, duration, cooldown, exit behavior, and ticket/score rules.
- Add earned activation and third-person control of a large autonomous bird drone above the city.
- Highlight enemies red through geometry; add dive attacks with miniguns and explosive bird-dropping bombs.
- Reuse far LODs and simulation budgets; handle player death, ability exit, and match end safely.
- Acceptance: ability earns/activates correctly, control returns reliably, highlights and damage are consistent, and 100+ bot performance remains acceptable.

## Phase 17 — Final QC, balance, and playtesting

- Playtest ordinary matches and ability-heavy matches, tune weapons/classes/rewards, and fix regression bugs.
- Check fresh installs, saved-state upgrades, settings, supported browsers, performance, and resource cleanup.
- Document run/build instructions, controls, known issues, and remaining ideas.
- Acceptance: automated gates pass, user signs off the playable build, and unresolved issues have explicit disposition.

## Future additions (outside the base acceptance gates)

- Night vision goggles and heat vision tactical gear.
- Small reconnaissance drone.
- Placeable sandbags.
- More weapons and classes.
- Enterable cars/planes through F interaction when vehicles are added.

Keep extension points for these ideas, but do not treat them as implemented or expand an active phase without user direction.

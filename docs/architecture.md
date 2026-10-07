# Technical direction

## Foundation

TypeScript with strict checks, Three.js for rendering and procedural models, Vite for local development/production builds, and Vitest for unit/integration tests. Phase 2 provides the renderer and runtime shell; player movement begins in Phase 3. Target desktop browsers with keyboard/mouse first. Do not add a backend or multiplayer stack without a new requirement.

## Folder responsibilities

| Folder | Responsibility |
| --- | --- |
| `src/engine/` | Clock, renderer lifecycle, input, shared math/resource helpers |
| `src/game/` | Game states and orchestration |
| `src/game/player/` | Movement, camera, class abilities |
| `src/game/combat/` | Weapon use, damage, health and lifecycle |
| `src/game/audio/` | Gesture-unlocked audio, spatial playback, volume buses, and voice budgets |
| `src/game/bots/` | AI, perception, navigation, simulation budgets |
| `src/game/match/` | Round countdown, objectives, tickets, respawn and scoring |
| `src/game/world/` | Cells, generation, collision, destruction |
| `src/content/weapons/` | One typed definition per weapon and startup discovery |
| `src/content/assets/` | TypeScript asset factories, collision metadata, and exactly two render LODs |
| `src/ui/` | Menus, HUD, settings, results and progression views |
| `src/tools/asset-viewer/` | Separate inspection app for generated assets and collision/bounds guides |
| `src/tools/map-editor/` | Standalone top-down grid painter and generated-city preview |
| `tests/` | Behavior tests and deterministic fixtures |
| `public/audio/` | User-provided audio later |
| `docs/` | Stable technical/design/testing reference |

Empty folders are deliberate boundaries, not implemented systems. Add abstractions when their phase needs them, rather than prebuilding a speculative framework.

## Important boundaries

- `EngineRuntime` owns animation-frame scheduling, keyboard listener lifetime, fixed-step updates, pause/resume transitions, and timing diagnostics. One-shot keyboard presses persist until a fixed step runs, then clear between catch-up steps. Pausing clears held input and resets the accumulator; rendering may continue while world updates stop.
- `src/main.ts` bootstraps the application; `src/app.ts` owns its mounted UI/game orchestration and disposal. Application flow tests exercise real match, combat, profile, and engine code with DOM/renderer ports. The ready room and result screens prevent engine resumption; Escape is consumed once even when resumption is refused. Match completion opens results independently of player life state.
- `SceneView` owns the Three.js renderer, scene, camera, lighting, resize observer, and canvas lifecycle. Render calls receive a fixed-step interpolation alpha; simulation does not depend on renderer visibility or timing.
- Phase 3's `PlayerController` and `MovementWorld` own kinematic player movement, camera interpolation, collision, walkable ramps, and class-gated jump abilities. `PointerLockControls` owns mouse capture, look deltas, held aim, left-button fire edges, and focus/visibility recovery; dispose it with its view.
- Player leaning keeps the authoritative feet position fixed while offsetting camera/weapon/arms around that pivot. Five body clearance bands sweep the requested angle through collision; rendered interpolation rechecks clearance. The shared combatant stores top lean displacement and pose height, and hitscan transforms rays into the tilted body volume. Bot perception/aim and grenade center sampling use the leaned pose.
- Generated elevated tiles and ramps share `MovementWorld` ground heights for players and bots and solid ray intersections for combat/perception/projectiles. Rectangular maps use separate horizontal extents, and ground steps above 0.2 m block horizontal entry until reached by a ramp or jump.
- Fixed-step simulation owns authoritative bird positions, health, team membership, round countdown, objective and ticket state. In a playable match the local player is another combatant in the shared hit-target set; `BotSkirmishMatch` owns player death, revive, corpse, respawn, and ticket transitions just as it does for bots. Rendering interpolates state and owns GPU resources.
- The 20-second round countdown advances only while match simulation steps run; bots remain at their spawn positions until it completes. Pausing the engine therefore pauses the countdown.
- `ChickenCharacterView` is rendering-only: player/combatant state drives separate first-person wing sleeves or a third-person chicken rig, while locomotion, jump flaps, aim, reload, damage, and death poses never change gameplay state.
- `AudioManager` owns browser audio context lifetime, spatial listener updates, master/effects buses, clip loading from `public/audio/manifest.json`, and bounded sound voices. The app unlocks audio after a pointer or keyboard gesture; missing manifest entries remain silent.
- Hidden/cullable meshes do not remove entities from simulation. Cheap/detailed simulation transitions preserve one entity identity and damage/ticket accounting.
- Keep visual LOD (exactly two tiers) distinct from AI update frequency/simulation fidelity.
- Seed random map choices and test scenarios. Generate geometry/collision/navigation from the same cell data.
- Phase 6 maps use a versioned `operation-honkdown-map` document with row-major cell records, explicit enterable-house door layouts, and orthogonal authored paths. `generateMap` uses the map seed to select typed building and decoration assets, builds enterable-wall and slope collision descriptors, and links only reachable cells. The map editor imports/exports JSON and saves a validated local draft.
- Use shared immutable content definitions and separate mutable runtime weapon state. Startup discovers weapon modules (for example Vite `import.meta.glob` with eager loading), validates unique IDs/schema, and fails clearly on malformed content. Do not populate gameplay weapon data before Phase 4.
- Asset definitions validate finite min/max bounds, positive collision box sizes contained by those bounds, and exactly `close` and `far` LOD builders. A generated asset owns the render objects and unique geometry/material resources for both tiers; dispose it once when a preview or runtime instance is replaced.
- Lifecycle changes must be atomic: death, revive, respawn, and cleanup cannot duplicate a bird or spend a ticket twice.
- Save map/progression/settings with versioned schemas and validation; unknown/invalid data needs explicit recovery.
- The versioned browser profile is `operation-honkdown-profile`; version 2 stores local sensitivity, selected map, master/effects volumes, XP, credits, progression skills, and a bounded 100-match reward idempotency history. Version 1 profiles migrate with 80% audio defaults. Storage failures fall back to an in-memory profile with a user-facing notice.
- Escape/tools and browser focus changes must release pointer lock and suppress stuck inputs. Audio unlocks on a user gesture.

## Initial decisions

Use a single local browser process. Delay the choice of physics library until collision/ragdoll requirements can be assessed. Delay advanced AI/worker structure until profiling supports it. Agree numerical performance targets on measured hardware rather than inventing an FPS guarantee.

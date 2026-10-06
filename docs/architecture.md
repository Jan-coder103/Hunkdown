# Technical direction

## Foundation

TypeScript with strict checks, Three.js for rendering and procedural models, Vite for local development/production builds, and Vitest for unit/integration tests. The initial page is only a scaffold; Phase 2 creates the actual engine. Target desktop browsers with keyboard/mouse first. Do not add a backend or multiplayer stack without a new requirement.

## Folder responsibilities

| Folder | Responsibility |
| --- | --- |
| `src/engine/` | Clock, renderer lifecycle, input, shared math/resource helpers |
| `src/game/` | Game states and orchestration |
| `src/game/player/` | Movement, camera, class abilities |
| `src/game/combat/` | Weapon use, damage, health and lifecycle |
| `src/game/bots/` | AI, perception, navigation, simulation budgets |
| `src/game/match/` | Objectives, tickets, respawn and scoring |
| `src/game/world/` | Cells, generation, collision, destruction |
| `src/content/weapons/` | One typed definition per weapon and startup discovery |
| `src/content/assets/` | TypeScript asset factories and LOD metadata |
| `src/ui/` | Menus, HUD, settings, results and progression views |
| `src/tools/asset-viewer/` | Separate inspection app (Phase 5) |
| `src/tools/map-editor/` | Top-down editor (Phase 6) |
| `tests/` | Behavior tests and deterministic fixtures |
| `public/audio/` | User-provided audio later |
| `docs/` | Stable technical/design/testing reference |

Empty folders are deliberate boundaries, not implemented systems. Add abstractions when their phase needs them, rather than prebuilding a speculative framework.

## Important boundaries

- Fixed-step simulation owns authoritative bird positions, health, team membership, objective and ticket state. Rendering interpolates state and owns GPU resources.
- Hidden/cullable meshes do not remove entities from simulation. Cheap/detailed simulation transitions preserve one entity identity and damage/ticket accounting.
- Keep visual LOD (exactly two tiers) distinct from AI update frequency/simulation fidelity.
- Seed random map choices and test scenarios. Generate geometry/collision/navigation from the same cell data.
- Use shared immutable content definitions and separate mutable runtime weapon state. Startup discovers weapon modules (for example Vite `import.meta.glob` with eager loading), validates unique IDs/schema, and fails clearly on malformed content. Do not populate gameplay weapon data before Phase 4.
- Asset factories return render objects plus collision/LOD metadata with explicit resource ownership; reuse shared geometry/materials when safe.
- Lifecycle changes must be atomic: death, revive, respawn, and cleanup cannot duplicate a bird or spend a ticket twice.
- Save map/progression/settings with versioned schemas and validation; unknown/invalid data needs explicit recovery.
- Escape/tools and browser focus changes must release pointer lock and suppress stuck inputs. Audio unlocks on a user gesture.

## Initial decisions

Use a single local browser process. Delay the choice of physics library until collision/ragdoll requirements can be assessed. Delay advanced AI/worker structure until profiling supports it. Agree numerical performance targets on measured hardware rather than inventing an FPS guarantee.

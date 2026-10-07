# Latest handoff

On 2026-10-07, replaced camera-only lean with physical corner peeking. PlayerController pivots around planted feet by up to 0.28 radians, offsetting standing eyes about 44 cm (crouched about 28 cm) with a slight height drop. Camera children move the rifle and wings together and preserve optical alignment. Five clearance bands sweep the lean angle; interpolation and mouse turns recheck walls/terrain/world bounds. Q/E together cancel, release recenters, and spawn resets.

The live match syncs top lean displacement and stance height into Combatant. Hitscan shears its ray into the leaning hit volume; bots perceive/aim at the leaned upper body, and grenades sample its shifted center. ChickenCharacterView supports whole-rig third-person tilt in both LODs; first-person inherits the camera transform.

Verification: `npm run check` passed with 193 tests across 30 files, strict type checking, and build. Tests cover real cover/shot peeking, gun/camera movement without foot movement, return fire against exposed body, wall and turn/interpolation clearance, yaw/crouch/both-key/spawn behavior, close/far body pose, and match hit-volume synchronization. Browser visual QA at `http://127.0.0.1:5190/` (1280 × 720) in a temporary real-controller preview confirmed a covered target became visible through the centered sight as eyes shifted sideways with feet fixed. No warnings/errors; preview removed. Physical held-key/pointer-lock play and human approval remain open. Shared bundle warning: 561.71 kB. No sustained 100-bot profile rerun.

Next: human review of lean/aim/firing and prior movement/death/range changes. Death-screen loadout editing and user-provided audio remain open. Preserve seeded maps and simulation/render boundaries.

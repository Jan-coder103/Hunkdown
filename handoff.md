# Latest handoff

Refined phone controls on 2026-10-15. Lean buttons now sit on the right edge above FIRE and toggle mutually exclusive lean on tap, allowing one thumb to lean then shoot. Active lean is highlighted and clears with pause, focus loss, death, disabling and disposal; desktop keyboard hold-to-lean is unchanged.

Removed SPRINT button: `TouchControls.input` requests ShiftLeft whenever phone controls are enabled and active. Shared movement retains normal aim/crouch restrictions and desktop Shift behavior. JUMP now shows ↑, RELOAD ↻, AIM an SVG crosshair; accessible labels preserve action names.

Verification: 246/247 tests across 39 files pass; only existing map-name assertion fails (“Test City” vs “Untitled City”). Typecheck/build pass with existing bundle warning. Expanded tests cover lean toggle/fire/direction/reset, automatic sprint gating and keyboard fallback. Browser at 844×390: reviewed icons/right-edge controls, lean remained active while FIRE spent ammo, and pause/resume reset lean. Physical phone ergonomics and human approval pending.

Keep user's deleted `maps/city-draft.honkmap.json` and untracked `maps/city-draft.honkmap(1).json` untouched. Existing building/aerial review, renewed performance profiling, audio clips and death-screen loadout work remain open.

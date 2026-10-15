# Latest handoff

Added phone touch controls and compact phone HUD on 2026-10-15. Settings → Phone controls & HUD has saved Auto / On / Off options. Auto recognizes phone user agents or coarse-pointer screens with short side <=600 CSS px. Existing profile v2 saves accept the optional field and default to Auto while preserving progression. Pointer-lock requests are disabled in phone mode.

`src/ui/touch-controls.ts` owns independent pointer capture, left-pad directional input, right-drag look and held/one-shot combat actions, with cancellation/focus/pause/death/disposal cleanup. App merges touch movement edges into the existing keyboard input and touch fire/aim into combat. PlayerController now accepts only the input methods it needs. The top-aligned phone HUD leaves room for thumbs; pause is available during death and spectator views.

Verification: 245/246 tests pass across 39 files; only the pre-existing map-catalog name mismatch fails (“Test City” vs user's “Untitled City”). Typecheck/build pass with existing bundle warning. Browser at 390×844 and 844×390: reviewed controls/HUD, FIRE reduced ammo 30→29, PAUSE opened menu. Physical phone multi-touch ergonomics, performance remain pending; no human approval claimed.

Keep user's deleted `maps/city-draft.honkmap.json` and untracked `maps/city-draft.honkmap(1).json` untouched. Earlier building/sky changes remain. Next: phone playtest and existing human building review, aerial visual review, renewed 100-bot profiling and audio/death-screen loadout work.

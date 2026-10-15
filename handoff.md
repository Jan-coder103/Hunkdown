# Latest handoff

Added phone aim toggle and fixed short-landscape overlay scrolling on 2026-10-15. Touch AIM now behaves like lean: tap to toggle with aria-pressed/highlight, tap again off. Aim persists after release and during firing; shared clear resets aim/lean on pause, focus loss, death, disabling and disposal. Desktop mouse aim stays held.

The user's screenshot showed the pause card overflowing. Pause overlays now constrain their card to available height with overflow-y:auto; short-screen padding is smaller. Removed root-level phone touch-action:none (which blocked native menu scrolling); only the gameplay scene/controls suppress gestures. Pause cards, settings panels and results support pan-y scrolling.

Verification: 246/247 tests across 39 files pass; only existing map-name mismatch fails (“Test City” vs “Untitled City”). Typecheck/build pass with existing bundle warning. Extended aim behavior coverage. Browser at 640×300: tap aim then fire kept aim active and spent ammo; pause card stayed inside y=10…290 and scrolled to Settings/Return; settings panel scrolled to final audio/help rows. Physical phone gestures and human approval remain pending.

Preserve user's deleted `maps/city-draft.honkmap.json` and untracked `maps/city-draft.honkmap(1).json`. Existing building/aerial review, renewed performance profiling, audio clips and death-screen loadout work remain open.

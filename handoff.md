# Latest handoff

Reworked phone action buttons on 2026-10-15 following the user's screenshot. `src/style.css` now uses explicit grid positions: FIRE is a 102×102 px circle at bottom right; all ten secondary actions are 48×48 px circles above or to its left. Nothing sits below/right of FIRE. Safe-area margins remain. The movement pad shrinks on <=360 px screens to avoid overlap. Input behavior is unchanged.

Verification: full suite 246/247 tests pass across 39 files, with only the pre-existing map-catalog name mismatch (“Test City” vs “Untitled City”). Typecheck/build pass with existing bundle warning. Browser at 844×390: inspected layout and measured circles/bounds. At 390×844, FIRE spent one round. Physical phone ergonomics and human approval remain pending.

Previous phone Auto/On/Off settings, compact HUD and simplified menu remain intact. Preserve user's deleted `maps/city-draft.honkmap.json` and untracked `maps/city-draft.honkmap(1).json`. Existing building/aerial review, renewed performance profiling, audio clips and death-screen loadout work remain open.

# Latest handoff

Fixed enterable/open buildings on 2026-10-15 following the user's screenshot. The old generated wall segments left full-height entrance slots. `map-generator.ts` now adds a destructible header on each authored door side, from 2.2 m to building top, with stable `house-x-y-side-header` IDs and shared wall health. This affects rendered walls and authoritative collision/hitscan consistently. Door passages below 2.2 m stay clear. Both LODs and existing destruction ownership use the generated records.

`map-geometry.ts` now gives enterable facades larger upper panes, consistent spacing, no thin dark shutters, slimmer cornices, lowered sills, and entrance trims matching the header height. Header windows align to adjoining panels using global floor heights. Earlier solid-building, sky and skyline changes remain intact.

Verification: 242/243 tests pass across 38 files; only pre-existing map-catalog name assertion fails (“Test City” vs user's “Untitled City”). New ray tests cover four header faces at 3 m and doorway clearance at 1.8 m in both LODs. Existing door/navigation/destructible geometry checks pass. Typecheck/build pass with existing bundle warning. Map editor starts without warning/error logs. Close-up visual inspection of this enterable-building revision and human approval remain pending.

Keep user's deleted `maps/city-draft.honkmap.json` and untracked `maps/city-draft.honkmap(1).json` untouched. Next: human building review, aerial visual review, renewed 100-bot profiling and outstanding audio/death-screen loadout work.

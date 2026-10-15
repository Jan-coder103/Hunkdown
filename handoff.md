# Latest handoff

Implemented automatic sidewalks/roads on 2026-10-15. `src/game/world/street-layout.ts` derives a paving layout from map cells: asphalt on street cells, concrete sidewalk strips and outside corners around the union of adjacent building tiles, pale curbs, and white dashed lane markings from connected road-span centers. Internal shared building walls get no sidewalks. Wide road areas receive central lanes rather than one lane grid per cell. Building/elevation cells are excluded from street paint. Paving is presentation-only, at most 4 cm tall; navigation, ramps, doors, seeded map generation, and destruction state remain unchanged.

`street-view.ts` batches road/pavement/curb/paint into at most four instanced draws, sharing geometry. Both `BotSkirmishView` and `MapPreview` use it; preview cleanup now releases instanced resources too. Gray concrete underfloor replaces the colored grid tiles.

Verification: full suite 230/231 passing, with six new street tests; sole failure is the pre-existing catalog assertion expecting “Test City” instead of the user's replacement “Untitled City”. Typecheck/build pass (existing chunk warning). Browser editor rendered a continuous ring around a painted 2×2 block; live Midtown rendered asphalt, dashed lines, curb edges, and 60 FPS at 663×658, with no console warnings/errors. No hands-on movement, renewed 1080p profile, or human approval claimed. Screenshot: `/tmp/honkdown-streets.jpg`.

Preserve the user's deleted `maps/city-draft.honkmap.json` and untracked `maps/city-draft.honkmap(1).json`. Next: human review road/sidewalk appearance and curb/door traversal, plus renewed 100-bot performance profiling. Audio and death-screen loadout work remains outstanding.

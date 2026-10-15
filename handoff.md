# Latest handoff

Implemented the requested dense downtown building revision on 2026-10-15. The three existing building IDs now use a shared typed factory in `src/content/assets/downtown-building.ts`: full 2.8×2.8 structural footprints, four/five/eight floors, flat roofs, detailed four-sided close facades, and 24-triangle far models. Game/editor scaling therefore fills adjacent cells with walls rather than just roof overhangs. Enterable houses use the new heights and omit facade detail at far LOD, retaining panel IDs and door collision behavior. Gameplay culling spheres include taller buildings.

Verification: 222/223 tests pass; the sole failure is the existing catalog expectation “Test City” versus the locally replaced “Untitled City” map. Typecheck and build pass, with the existing shared chunk warning. Dev-server startup was blocked by sandbox EPERM; visual review and new performance profiling remain pending. Human approval is not claimed.

User map changes were present before this work: deleted `maps/city-draft.honkmap.json` and untracked `maps/city-draft.honkmap(1).json`. Leave these untouched. Next: visually review the downtown silhouettes and close/far transitions, and profile the denser close detail with 100 bots. Existing audio and death-screen loadout work remains outstanding.

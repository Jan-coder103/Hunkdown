# Latest handoff

Implemented a proper main menu on 2026-10-15. The full-screen charcoal/yellow layout has large Operation Honkdown branding, a dedicated 3D chicken display stage and muted skyline, profile, tabs, selected battleground, and persistent range/join buttons. `src/ui/menu-backdrop.ts` owns the separate title scene/camera and resources; `SceneView.render` accepts an optional presentation scene/camera, sharing the existing renderer. App rendering selects the title scene while the menu is visible and skips gameplay presentation; existing paused simulation remains paused. Training-ground geometry no longer appears behind the menu.

All existing menu functions remain: maps/custom maps, saved settings, skills/profile, pause settings/resume and results return. Inner panels scroll, tabs/actions stay fixed, and changing tabs resets scroll. Scene viewport is aria-hidden while the title menu is active. No downloaded art or new dependencies.

Verification: full suite 234/235 pass across 37 files; only pre-existing map-catalog name assertion fails (“Test City” vs user's “Untitled City”). Typecheck/build pass with existing bundle warning. Browser reviewed desktop 1280×720 and narrow 390×844, map choice, Settings, range launch, pause and return to menu; warnings/errors empty. Restored Midtown selection after tests. Screenshot `/tmp/honkdown-main-menu.jpg`. No human visual approval claimed.

Keep the user's deleted `maps/city-draft.honkmap.json` and untracked `maps/city-draft.honkmap(1).json` untouched. Next: human review the main menu and downtown streets, renewed 100-bot profiling, plus outstanding audio/death-screen loadout work.

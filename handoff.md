# Latest handoff

Corrected the stale map-catalog test on 2026-10-15 after CI failed. `tests/map-catalog.test.ts` now expects “Untitled City”, matching the authored map committed in `8ef1182`, instead of the older “Test City”. No map or gameplay data changed.

Verification: `npm run check` passes: all 247 tests across 39 files, strict typecheck and production build. Existing large-bundle warning remains. No browser check needed for this assertion-only correction.

Prior phone changes remain: aim/lean toggles, automatic sprint, action symbols, circular controls and scrollable landscape pause/settings menus. Physical phone gesture/ergonomic review and human approval remain pending. The replacement city map export is now committed as `maps/city-draft.honkmap(1).json`; there are no pending map deletions or untracked exports from the earlier handoffs. Building/aerial review, renewed profiling, audio clips and death-screen loadout work remain open.

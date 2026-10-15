# Latest handoff

Updated buildings to a modern gray palette and added a visible FPS counter on 2026-10-15. Solid and enterable facades now use gray concrete, charcoal trim, and blue-gray glass. Close solid windows are larger; tile footprints/heights and two LODs remain unchanged. The dedicated top-right FPS output in `src/app.ts` uses existing frame diagnostics every ten frames, with CSS keeping it visible during gameplay/death view and hidden in the main menu.

Verification: 224/225 tests pass, including new palette and real-engine FPS coverage. The existing map-catalog test still expects “Test City” while the user's replacement map is named “Untitled City”. Typecheck and build pass with the existing bundle-size warning. Browser visual review and performance profiling remain pending; no human approval claimed.

Preserve the user's pre-existing deleted `maps/city-draft.honkmap.json` and untracked `maps/city-draft.honkmap(1).json`. Next: visually review the modern downtown look, FPS placement, and close/far transitions, then profile 100-bot performance. Existing audio and death-screen loadout work remains outstanding.

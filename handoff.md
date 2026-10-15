# Latest handoff

Added top-left fullscreen toggle on 2026-10-15. `src/ui/fullscreen-toggle.ts` owns native fullscreen entry/exit, browser fullscreenchange synchronization, unsupported/rejected request handling, duplicate-request suppression and listener cleanup. `src/app.ts` mounts it over menus/gameplay and disposes it. CSS reserves space by shifting title/radar/phone health. The game root enters fullscreen and uses existing scene resizing.

Verification: `npm run check` passes all 249 tests across 40 files, strict typecheck and production build. Existing bundle warning remains. New tests cover entry/exit, external Escape-style exit, unsupported/denied requests, retry, duplicate clicks and disposal. Browser entered/exited fullscreen with the button and updated its accessible state. Physical phone fullscreen testing and human approval remain pending.

All previous phone/menu work remains intact. Map catalog assertion now matches “Untitled City”; replacement map is committed as `maps/city-draft.honkmap(1).json`. User is pausing game work after this commit/push. Outstanding review items remain physical phone ergonomics, building/aerial review, renewed profiling, audio clips and death-screen loadout.

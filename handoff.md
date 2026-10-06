# Latest handoff

## Current status

Phase 5 is technically complete; human review of the placeholder visuals and viewer workflow is pending. The asset pipeline provides validated metadata, owned close/far render objects, and disposable geometry/material resources. Four placeholders are in `src/content/assets/`. The separate asset viewer is available at `/asset-viewer.html` and supports asset selection, LOD selection, bounds/collision guides, drag orbit, and wheel zoom.

`npm run check` passes 62 tests across 14 files, strict typecheck, and a multipage production build. Browser check at `http://127.0.0.1:5176/asset-viewer.html` loaded all four entries, switched LODs and bounds visibility, and exercised orbit and zoom; no browser warnings or errors were captured. The browser tab is left open on the viewer for review. The Escape menu does not exist yet, so its viewer link remains for Phase 10.

## Next work

Continue Phase 6: define versioned serializable map cells and authored paths, build the top-down grid painter for solid/enterable/elevated cells, add deterministic building choice and decoration placement, and support map save/load plus generated-map preview using these placeholders. Preserve seeded reproducibility and route clearance; test invalid maps and save/load round trips.

## Open design issues

`tracker.md` retains capture-point and death/ticket policies for Phase 9, progression/class rules for Phase 10, performance targets for Phase 13, and plane ability rules for Phase 16. Phase 4 tuning values are provisional and remain recorded there.

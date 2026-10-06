# Latest handoff

## Current status

Phase 7 has two review candidates ready: the Honk-47 and Corner cafe. The asset viewer now uses the same Honk-47 model builder as the combat range, frames each asset from its bounds, and labels close/far LODs by detail. The cafe has a two-sided striped awning, storefront windows, a door, and sign details; its building-shell collider is unchanged. Reload animation now lowers and reinserts the magazine in stages.

`npm run check` passes: 72 tests across 16 files, strict typecheck, and production build. Browser inspection confirmed both candidates in `/asset-viewer.html`, the updated rifle in the combat range, and the generated city preview. No human visual approval is recorded.

## Next step

Review the Honk-47 and Corner cafe in the asset viewer at `http://127.0.0.1:5180/asset-viewer.html` (choose each in the Asset menu). Ask for palette, silhouette, scale, or detail revisions. Keep Phase 7 open until the user confirms the visual direction; then continue to Phase 8.

Placeholders still tracked in `tracker.md`: Pastel row house, Tall townhouse, Street lamp, Street tree, Cafe kiosk, Plaza fountain, Street bicycle, and Tactical bird placeholder.

## Open design issues

`tracker.md` retains capture-point and death/ticket policies for Phase 9, progression/class rules for Phase 10, performance targets for Phase 13, and plane ability rules for Phase 16. Phase 4 combat values and Phase 6 map/generator defaults remain provisional.

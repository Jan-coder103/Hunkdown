# Latest handoff

On 2026-10-11 removed the chicken's rear backpack/goggles/vest/pouches/straps and colored belly patch at the user's explicit request. Tail feathers remain. Both LODs have bare golden torsos; far now uses one merged mesh. Removed the unused third-person teamMark rig property. First-person wing bands/cuffs remain; third-person colored team recognition patches are intentionally gone.

Verification: `npm run check` passed (206 tests / 32 files, typecheck, build). Updated asset coverage for removed attachments, preserved tail and one-mesh far budget. Inspected front/rear in the in-app viewer at http://127.0.0.1:5191/asset-viewer.html with no warnings/errors; viewer left on rear close view. Existing bundle warning 562.14 kB. Human approval and sustained performance profiling remain open.

Next: user visual review. Existing death-screen loadout editing and user-provided audio remain outstanding.

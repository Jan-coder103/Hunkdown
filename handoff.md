# Latest handoff

On 2026-10-08, prepared GitHub Pages hosting requested by the user. `.github/workflows/pages.yml` tests, typechecks, builds, and deploys on main pushes. `npm run build:pages` uses `/Hunkdown/`; local dev/build retain `/`. All tool links and browser audio requests respect Vite BASE_URL. README documents deployment and preview. GitHub Pages source switched to workflow through the API. Public repository uses standard free Actions runner.

Verification: `npm run check` passed with 195 tests across 31 files, strict type checking, and build; Pages build also passed. New tests verify manifest and clip requests under local and hosted bases. Existing bundle warning remains 561.71 kB. Live deployment verification pending. No gameplay change or human approval claimed.

Next: verify workflow/site after push. Prior gameplay review remains: human lean/aim/firing and movement/death/range review, death-screen loadout editing, and user-provided audio. Preserve seeded maps and simulation/render boundaries.

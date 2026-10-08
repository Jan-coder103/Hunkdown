# Operation Honkdown

Massive battles. Total bird-brained chaos. A bright low-poly tactical chicken FPS built with TypeScript and Three.js, aiming for 100+ bots and ridiculous physics.

The main page opens the ready room, where you can enter the shooting range or choose Midtown or Garden District and join a match with 50 friendly and 50 enemy bots. The range has nine reusable targets at 10 m, 15 m, and 20 m, three firing lanes, cover and movement practice, hit statistics, and a reset control. The implemented match loop includes the countdown, central capture point, tickets, player death/respawn, teammate revives, leaderboards, and local XP/credit rewards. Combat includes the code-generated Honk-47, reloads, grenades, recoil, and destructible street props and house panels.

The asset viewer at `/asset-viewer.html` previews the generated content, bounds, collision metadata, and close/far detail tiers. The grid map editor at `/map-editor.html` supports seeded city previews and JSON save/load. Read `agent.md` first when working with a coding agent; the original concept is in `idea_notes.md`.

## Local development

Use Node.js 22.19+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For reproducible installs after a lockfile exists, use `npm ci`.

```sh
npm test
npm run typecheck
npm run build
npm run check
npm run preview
```

Click the scene to capture the mouse. Use WASD to move, Space to jump, Shift to sprint, C to crouch/slide, Q/E to lean, right mouse to aim, left mouse to fire, R to reload, and G to equip grenades. Hold F within 2.5 m of a current friendly corpse for four seconds to revive. Escape pauses the game; its menu includes settings and an asset-viewer link. The shooting range is available directly from the ready room, and the bot spectator preview can be entered from the range.

This build still needs human review of controls, visuals, balance, and comedy. Enterable-house production visuals/LODs, cheaper off-screen simulation, and death-screen loadout editing remain unfinished. Audio infrastructure exists, but the build is silent until user-provided clips are mapped in `public/audio/manifest.json`. The giant bird ability is planned. See `plan.md` for acceptance criteria and `tracker.md` for verification evidence and outstanding work.

## GitHub Pages

The playable site is https://jan-coder103.github.io/Hunkdown/. Pushes to `main` automatically run tests, type checking, and a Pages build, then deploy `dist/` through `.github/workflows/pages.yml`. Repository Settings → Pages must use GitHub Actions as its source.

`npm run dev` and `npm run build` keep the normal local `/` base. `npm run build:pages` builds with `/Hunkdown/`; preview it with `npm run preview -- --base=/Hunkdown/` and open `/Hunkdown/`. Tool links and audio use Vite's base URL. Browser saves stay on each browser/origin; export map drafts separately when moving PCs.

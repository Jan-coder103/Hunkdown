# Operation Honkdown

Massive battles. Total bird-brained chaos. A bright low-poly tactical chicken FPS built with TypeScript and Three.js, aiming for 100+ bots and ridiculous physics.

The current page is a Phase 4 combat practice range with the Phase 3 movement test map, a code-generated Honk-47, hitscan targets, reloads, and throwable grenades. It is a feature playground, not yet a complete match. Read `agent.md` first when working with a coding agent; the original concept is in `idea_notes.md`.

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

The development page opens directly into the combat practice range. Mouse look and firing require pointer lock; keyboard movement, R reload, and G grenade equip are shown in the HUD. The asset viewer, map editor, bots, and playable match are planned features. See `plan.md` for acceptance criteria and `tracker.md` for current evidence and open decisions.

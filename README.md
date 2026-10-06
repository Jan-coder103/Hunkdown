# Operation Honkdown

Massive battles. Total bird-brained chaos. A bright low-poly tactical chicken FPS built with TypeScript and Three.js, aiming for 100+ bots and ridiculous physics.

This repository currently contains the Phase 1 foundation. Gameplay starts in Phase 2. Read `agent.md` first when working with a coding agent; the original concept is in `idea_notes.md`.

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

The development page shows foundation status only. The asset viewer, map editor, and playable match are planned features. See `plan.md` for acceptance criteria and `tracker.md` for current evidence and open decisions.

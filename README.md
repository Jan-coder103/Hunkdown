# Operation Honkdown

Massive battles. Total bird-brained chaos. A bright low-poly tactical chicken FPS built with TypeScript and Three.js, aiming for 100+ bots and ridiculous physics.

The main page is a combat practice range with the Phase 3 movement test map, a code-generated Honk-47, hitscan targets, reloads, and throwable grenades. The separate Phase 5 asset viewer is available at `/asset-viewer.html`; it previews the generated placeholder set, bounds, collision metadata, and both visual LODs. This is a feature playground, not yet a complete match. Read `agent.md` first when working with a coding agent; the original concept is in `idea_notes.md`.

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

The development page opens directly into the combat practice range. Mouse look and firing require pointer lock; keyboard movement, R reload, and G grenade equip are shown in the HUD. The viewer is a separate page until the Escape menu is added in Phase 10. The map editor, bots, and playable match are still planned. See `plan.md` for acceptance criteria and `tracker.md` for current evidence and open decisions.

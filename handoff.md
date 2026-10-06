# Latest handoff

Phase 9 now includes a rendered bird's-eye preview alongside the existing combat practice range. The `Watch 16-bot skirmish` button builds a seeded Midtown map, runs eight friendly and eight enemy bots, and renders their simulation positions, team colors, damage/death poses, and short-lived shot tracers. Toggle back to restore the practice range. Rendering is in `src/game/bots/bot-skirmish-view.ts`; the preview map is in `src/game/bots/skirmish-showcase.ts`.

`npm run check` passes: 97 tests across 21 files, strict typecheck, and production build. Browser verification switched between the two views and observed live team counts, eliminations, and tracers. A 60 FPS / 7.7 ms work sample was observed, but this is not a formal performance test or a 100+ bot claim. The production build still reports a 514.84 kB shared registry/Three.js chunk warning.

Before continuing Phase 9 match outcomes and lifecycle, resolve the objective capture/contest rule, death/revive/corpse timing, and ticket exhaustion policy listed in `tracker.md`. Then implement countdown, respawn/revive, ticket accounting, and round outcomes. No match lifecycle is active in the preview. Human playtests of bot tactics and Phases 1–8 remain open.

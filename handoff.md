# Latest handoff

Phase 9 now has a data-only skirmish runner in `src/game/bots/bot-simulation.ts`. It chooses deterministic opposing spawns from cells connected to the center objective, follows seeded nav waypoints with map collision and ramp surfaces, checks sight against generated building/door colliders, and sends bot fire through the Honk-47 controller and shared hitscan resolver. Waypoints persist until bots reach cell centers, including passage through enterable-house doors.

`npm run check` passes: 95 tests across 20 files, strict typecheck, and production build. The existing 505.04 kB Honk-47 bundle warning remains. The runner is not wired to the browser game, so there has been no manual bot-match playtest or 100+ bot profiling.

Next: wire the skirmish runner into a rendered match. Before match outcomes, respawn, revive, corpse cleanup, or ticket logic, get the user's decisions on objective contest/capture and lifecycle/ticket policy; proposals are recorded in `tracker.md`. Human review of Phases 1–8 remains pending.

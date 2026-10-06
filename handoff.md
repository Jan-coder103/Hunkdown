# Latest handoff

Phase 9 now includes a central capture point, bot death/revive/respawn lifecycle, corpse cleanup, ticket accounting, and match outcomes. The approved defaults are 30 seconds of capture control (contests and neutral time pause, earned progress persists), 20-second respawn eligibility, a 4-second revive at team spawn for 50% health, 30-second corpse cleanup, and 200 tickets per side. Initial spawns are free; respawns cost one ticket; revives cost none; zero tickets ends the match. Simultaneous exhaustion is a draw.

The bird's-eye preview HUD shows objective state and tickets. Dead bodies render separately from their bot identity, so a respawn does not duplicate or move the old corpse. The match exposes `beginRevive(targetId, reviverId)` and `cancelRevive(targetId)`; player F-interaction and player death UI remain Phase 10 work. Bot respawns restore full health and initial weapon ammunition.

`npm run check` passes: 107 tests across 24 files, strict typecheck, and production build. The existing 514.84 kB shared registry/Three.js chunk warning remains. The in-app browser at `http://127.0.0.1:5184/` showed the 20-second countdown followed by active 16-bot combat and the new HUD, with a sample 60 FPS / 7.3 ms frame-work reading. This was not a 100+ bot performance test. Human gameplay review remains open.

Next: proceed to Phase 10 UI/UX and progression shell, integrating player revive interaction and player death/respawn presentation while keeping the match lifecycle simulation-owned. Keep 100+ bot profiling and human bot-tactics playtest tracked.

# Latest handoff

Phase 9 has started. `src/game/bots/navigation.ts` builds seeded A* routes from the generated door/slope-aware graph, finds building-shielded cover, and avoids occupied next cells. `src/game/bots/bot-brain.ts` produces objective, engage, cover, and retreat intents with visible-enemy filtering and intentionally imperfect aim. The brain leaves movement, weapon cadence, and lifecycle mutations to their owning systems.

Behavior tests are in `tests/bot-ai.test.ts`. `npm run check` passes: 90 tests across 19 files, strict typecheck, and production build. The existing 505.04 kB Honk-47 bundle warning remains. No live bot-match integration or in-browser bot playtest exists yet.

Next: implement the match simulation around these intents and map-derived spawn/visibility data. Before coding match outcomes, get the user's decisions on objective capture/contest/ticket-zero behavior and death/revive/respawn/ticket timing; proposals are in `tracker.md`. Human review of Phases 1–8, including the Phase 7 rifle/cafe and Phase 8 chicken visuals, remains pending.

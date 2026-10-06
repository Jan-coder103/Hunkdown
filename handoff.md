# Latest handoff

The Phase 9 browser preview now runs a 20-second fixed-step round countdown before bots move or fire. `RoundCountdown` and `BotSkirmishMatch` are in `src/game/match/`; the skirmish view exposes countdown/active status to the HUD. The countdown advances only during engine simulation steps, so pausing also pauses the round clock.

`npm run check` passes: 100 tests across 23 files, strict typecheck, and production build. Tests cover exact completion over 1,200 60 Hz steps and verify bots remain stationary before round start. Browser verification showed 20 seconds on entry, then active combat with live eliminations. A 60 FPS / 7.4 ms work sample was observed, not a formal performance test or a 100+ bot claim. The production build still reports a 514.84 kB shared registry/Three.js chunk warning.

Next, resolve the objective capture/contest rule, death/revive/corpse timing, and ticket exhaustion policy in `tracker.md` before implementing objective outcomes or lifecycle/ticket rules. The preview still has no human player or round outcomes. Human playtests of bot tactics and Phases 1–8 remain open.

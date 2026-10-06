# Current progress

Updated: 2026-10-06.

## Summary

- Phase 1: technically complete; human review pending.
- Phase 2: technically complete; human review pending.
- Phase 3: technically complete; human movement review pending.
- Phases 4–17: not started.
- User verification: none yet.
- Skipped features: none. Future additions remain outside base scope as stated in the plan.

## Phase 1

Technical acceptance is complete. Human review of the foundation and plan remains pending; see Foundation verification below.

## Phase 2

- [x] Create Three.js renderer, blank scene, perspective camera, lighting, resize handling, and explicit disposal.
- [x] Add bounded fixed-step simulation and pass interpolation alpha to rendering.
- [x] Add keyboard lifecycle with held/pressed state and focus/visibility cleanup.
- [x] Add deterministic seeded randomness, running/paused/disposed states, and pause/resume behavior.
- [x] Add frame, simulation, and fixed-step diagnostics.
- [x] Add behavior tests, rerun the full suite, type checking, and production build.
- [x] Verify the browser scene and Escape/Resume behavior.
- [ ] Human review of the engine shell.

## Active phase — 3

- [x] Build the flat movement playground with test walls, low obstacles, and a traversable ramp plus matching collision surfaces.
- [x] Implement fixed-step WASD movement, jumping, held sprint, default hold crouch, sprint-to-slide, Q/E lean, aim FOV and 80% look sensitivity, collision, ramp traversal, and render interpolation.
- [x] Add pointer-lock mouse look and held right-mouse aim with blur/visibility recovery and explicit listener cleanup.
- [x] Add configurable class-gated boosted double jump and wall jump; the Movement Test Class enables both for evaluation.
- [x] Add behavior tests for collision/ramp traversal, frame-rate consistency, movement/capabilities, camera interpolation, pointer lock lifecycle, and playground resource disposal.
- [x] Run `npm run check`: 39 tests across 12 files passed; strict typecheck and production build passed. Vite emitted a non-blocking bundle-size warning (506.67 kB minified JS).
- [x] Browser page rendered at `http://127.0.0.1:5174/` at about 60 FPS. Escape paused simulation (0 fixed steps); Resume returned it to Running.
- [ ] Human review of movement feel and visual playground.

Browser limitation: pointer-lock acquisition was attempted by clicking the scene and using Resume in the in-app browser, but `document.pointerLockElement` remained `null`; the in-app browser automation did not provide a successful pointer-lock session. As a result, mouse look, aim, held movement/jump, collision, slope traversal, and focus recovery have not been manually playtested in-browser. Their logic is covered by automated tests, but interactive acceptance remains open.

## Decisions to resolve before affected features

1. **Objective:** notes call the mode capture the flag, but describe one central capture point ending the round. Planning uses a central capture-point mode. Confirm capture duration, contested behavior, decay, and tie resolution before Phase 9.
2. **Death timing:** notes require respawn after 20 seconds and bodies remaining for 30 seconds. Proposed rule: 20-second respawn eligibility, revive available only before respawn, visual corpse cleanup at 30 seconds. A revive removes the corpse immediately. Confirm before Phase 9; never create a duplicate live bird.
3. **Tickets:** 200 per team, one ticket per respawn, none for revives. Proposed initial spawns cost no tickets and tickets reaching zero end the round immediately; confirm edge cases before Phase 9.
4. **Progression/classes:** classes, skill tree effects, XP/money formulas, unlock costs, and persistence/reset behavior need definition before Phase 10.
5. **Performance:** bot count minimum is 100; FPS, reference hardware, resolution, and supported browsers need agreement before Phase 13 acceptance.
6. **Plane ability:** kill threshold, duration, cooldown, return-to-player behavior, and rewards need agreement before Phase 16.

## Revision queue

None yet. Record failures, deferred checks, user feedback, and relevant reproduction details here as work proceeds.

## Phase 2 verification

- `npm run check`: passed (21 tests across 8 files, strict type checking, production build).
- Browser: Codex in-app browser at `http://127.0.0.1:5174/`; blank scene and live diagnostics rendered. Escape opened the pause overlay, and the Resume button returned the engine to Running. The displayed frame rate was about 60 FPS.
- Automated lifecycle checks repeat start/dispose three times and verify animation-frame cancellation, keyboard listener removal, and view disposal. SceneView tests verify resize updates, zero-size hosts, and disposal.
- Browser viewport resizing and console logs were not checked in this pass.
- Human review and user verification remain pending.

## Foundation verification

- Node.js 22.19.0; Vite 8.3.3; Vitest 5.0.3; Three.js r180; TypeScript 5.9.x.
- `npm run check`: passed (1 initial test, strict type checking, production build).
- Dependency install audit: zero reported vulnerabilities after updating test tooling.
- Browser: Codex in-app browser at `http://127.0.0.1:5173/`; visible foundation page renders correctly and captured warning/error logs are empty.
- Revalidated 2026-10-06: `npm ci --offline` completed from the lockfile (70 packages added; zero reported vulnerabilities), and `npm run check` passed (1 test, typecheck, production build). The foundation page rendered in the Codex in-app browser at `http://127.0.0.1:5174/` because port 5173 was already occupied; its heading, Phase 1 status, 100+ bot target, Three.js version, and visual direction were visible.
- No gameplay or performance playtest applies yet. No user verification has been claimed.
- Network installation and local server required elevated execution because the sandbox blocks registry DNS and listening sockets; both succeeded. The reserved `.git` directory also required elevated Git initialization/writes.

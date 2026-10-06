# Verification workflow

## Automated gates

After every feature:

1. Add meaningful behavior tests for the feature, including failure/edge cases.
2. Run `npm test` to rerun all earlier tests as well.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. Correct failures, update the tracker/handoff, and commit the validated change.

`npm run check` runs all three automated gates. Use `npm run test:watch` while developing. Do not substitute a successful build for behavior verification.

## Test strategy by phase

- Engine: fixed-step accumulation, pause, resize and lifecycle cleanup.
- Movement: collision, jump eligibility, slope handling, sensitivity and frame-rate invariance.
- Combat: ammo/cooldowns, occlusion, damage, death and invalid transitions.
- Content/tools: registry validation, disposal, seeded generation, versioned map validation/round-trips, door-aware paths, slope connectivity, decoration clearance, and browser checks of the grid painter and generated preview.
- Bots/match: reachability, targeting, crowd behavior, countdown, revive/respawn/ticket edge cases, capture/tie rules.
- UI/progression: complete state transitions, reward idempotency, saved-data recovery.
- Physics/performance: bounded debris, collision updates, cheap/detailed simulation transitions, 100+ bot stress tests and memory trends.
- Sound/ability: concurrency limits, missing assets, activation/exit, damage and match end.

Use seeded simulations and fake clocks where useful. Add browser automation once an interactive engine exists; avoid tests that only assert the presence of source text. The foundation has a small shared project configuration test as its initial suite.

## Manual and human checks

Browser checks establish visible operation, pointer lock, inputs, focus recovery, canvas resizing, menus, and console errors. Human playtests evaluate shooting/movement feel, visual quality, comedy, balance, and enjoyment. Record browser/device/resolution for performance runs. Report unsupported or unavailable checks honestly.

Record automated results, manual evidence, and explicit user approval separately in `tracker.md`. Never mark a phase tested or user-verified based only on generated code. For completed phases, compact their status while retaining unresolved issues.

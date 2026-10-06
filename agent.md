# Operation Honkdown — agent entry point

A bright, low-poly, single-player FPS with tactical chickens, chaotic physics, and 100+ bots. Build the game in English using TypeScript and Three.js; the human reviews the work and directs development.

Read these files before working:

1. `idea_notes.md` — original creative brief; preserve it as the source of intent.
2. `plan.md` — ordered phases, implementation steps, and acceptance criteria.
3. `tracker.md` — current progress, skipped work, unresolved decisions, and verification status.
4. `handoff.md` — last agent's work and the next concrete starting point.
5. `docs/game-design.md` — consolidated gameplay rules and controls.
6. `docs/architecture.md` — code layout, data boundaries, and technical direction.
7. `docs/testing.md` — automated checks and human review procedure.

Work on the requested task; otherwise continue the earliest incomplete phase in `tracker.md`. Keep scope small enough for review. Follow the phase order unless the user redirects it. Do not silently drop requirements or count placeholders as finished features.

For every implemented feature, add meaningful automated coverage and rerun the entire existing test suite. Run type checking and the production build too. Verify interactive behavior manually when possible; state explicitly what has not been checked. Tests must cover behavior, not merely repeat implementation details.

After implementing, testing, and correcting a feature, update `tracker.md` and replace `handoff.md` with a concise current handoff, then commit to Git. Never label work user-verified without explicit human confirmation. Completed phases can be summarized compactly; keep detailed tracking for current work and unresolved issues. Keep `plan.md` free of temporary progress notes.

Use typed, code-generated assets. Each weapon belongs in its own file in `src/content/weapons/` and follows a shared schema; discover definitions at startup. Keep simulation separate from rendering so off-screen battles continue. Keep the two visual LOD tiers separate from simulation detail. Preserve seeded map generation, navigation clearance, and the 100+ bot performance goal throughout development.

Do not install downloaded art or sound as if licensed or approved. The user will supply sound files later. Record design assumptions and ask about consequential ambiguity before committing to gameplay rules that would be costly to reverse.

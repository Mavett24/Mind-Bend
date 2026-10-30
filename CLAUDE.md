# Working on Mind Bend

Read before changing anything:

- `DESIGN.md` is the single source of truth for visuals and motion. Use its tokens, never raw values.
- `docs/PRODUCT.md` for scope and principles. `docs/games/<game>.md` before touching a game.
- Log any product or design decision in `docs/DECISIONS.md` (what, why, what we gave up). Update `CHANGELOG.md` and tick `docs/ROADMAP.md` with each change.

Code rules:

- `src/engine/` and every generator and solver stay pure TypeScript: no React, no DOM, no `Math.random`. Use the seeded RNG from `src/engine/rng.ts`.
- Every generator gets a test that runs many seeds per tier and asserts exactly one solution.
- Animate only transform and opacity. Respect `prefers-reduced-motion`.
- Writing style in docs and UI copy: no em dashes.

Commands: `npm run dev`, `npm test`, `npm run lint`, `npm run build`.

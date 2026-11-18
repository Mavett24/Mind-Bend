# Contributing

Thanks for wanting to help. Bug reports, puzzle ideas and pull requests are all welcome.

## Before you start

- **Bugs and ideas:** open an issue with the templates. For a board that looks wrong, include the challenge link (it carries the seed, so the exact board can be reproduced).
- **Bigger changes:** open an issue first so we can agree on the approach before you write code.
- **Security or privacy issues:** don't open a public issue, see [`SECURITY.md`](SECURITY.md).

## Setup

Node 20.9 or later (`.nvmrc` pins 22).

```bash
npm install
npm run dev     # http://localhost:3000
npm run check   # lint, typecheck and tests
```

## House rules

- `DESIGN.md` is the source of truth for visuals and motion. Use its tokens, not raw values.
- Read the game's spec in `docs/games/` before changing a game.
- `src/engine/` and every generator and solver stay pure TypeScript: no React, no DOM, no `Math.random`. Use the seeded RNG in `src/engine/rng.ts`.
- Every generator has a test that runs many seeds per tier and asserts exactly one solution. New generators need one too.
- Animate only transform and opacity, and respect `prefers-reduced-motion`.
- Product or design decisions go in `docs/DECISIONS.md` (what, why, what we gave up). Add a line to `CHANGELOG.md` under the next version.
- Docs and UI copy: plain words, no em dashes.

## Pull requests

Keep them focused on one change, fill in the template, and make sure `npm run check` and `npm run build` pass. CI runs both on every PR.

By contributing you agree that your code is released under the [MIT licence](LICENSE).

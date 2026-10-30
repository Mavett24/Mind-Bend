# Mind Bend

Logic puzzles, memory games and trivia in one app, with daily challenges, infinite practice and adaptive difficulty.

**Live:** https://mind-bend.vercel.app

Every board is generated from a seed and checked for a single solution, so you never play the same puzzle twice and you can share any board with a link.

## Games

| Game | Skill | Status |
|------|-------|--------|
| path | Route planning | live |
| balance | Binary deduction | live |
| blocks | Spatial partitioning | planned |
| weave | Word finding | planned |
| recall | Visual working memory | planned |
| trivia | Knowledge and estimation | planned |

## Docs

| File | What it holds |
|------|---------------|
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Brief, principles, modes, scope |
| [`DESIGN.md`](DESIGN.md) | Design system: tokens, components, motion, voice |
| [`docs/games/`](docs/games/) | One spec per game: rules, generation, difficulty |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Every product and design decision, with the reason |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phases and what ships in each |
| [`CHANGELOG.md`](CHANGELOG.md) | What changed, release by release |

## Stack

Next.js · TypeScript · Tailwind CSS v4 · Motion · Vitest · Vercel

```
src/
  app/          routes and layout
  components/   shared UI (game card, buttons, pickers)
  engine/       pure TypeScript: seeded RNG, seeds, difficulty, rating, storage
  games/        one folder per game: generator, solver, board UI
```

The engine has no React or DOM dependencies, so every generator and solver is unit tested.

## Run it

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # engine and generator tests
npm run build     # production build
```

## Credits

Game mechanics inspired by LinkedIn Games (Zip, Tango, Patches, Wend), Dialed and Lessgames. All names, visuals, puzzles and code here are original.

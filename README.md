# Mind Bend

Logic puzzles, memory games and trivia in one app, with daily challenges, infinite practice and adaptive difficulty.

**Live:** https://mind-bend.vercel.app

Every board is generated from a seed and checked for a single solution, so you never play the same puzzle twice and you can share any board with a link.

## Games

| Game | Skill | Status |
|------|-------|--------|
| path | Route planning | live |
| balance | Binary deduction | live |
| blocks | Spatial partitioning | live |
| sudoku | Number logic | live |
| weave | Word finding | live |
| recall | Visual working memory | live |
| trivia | Knowledge and estimation | live |

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

## Content

Word lists and trivia data are built by `scripts/build-data.mjs` into `public/data/`. Sources and licences: [`scripts/DATA_SOURCES.md`](scripts/DATA_SOURCES.md). In short: SCOWL word lists, OpenTriviaQA questions (CC BY-SA 4.0, so the question files are shared under the same licence), World Bank data (CC BY 4.0), mledoze/countries (ODbL), GeoNames (CC BY 4.0), LDNOOBW offensive-word list (CC BY 4.0).

## Credits

Game mechanics inspired by LinkedIn Games (Zip, Tango, Patches, Wend), Dialed and Lessgames. All names, visuals, puzzles and code here are original. Content credits above.

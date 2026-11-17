# Third-party notices

The Mind Bend code is [MIT](LICENSE). It ships with data and depends on packages that have their own licences, listed here.

## Data in `public/data/`

| Folder | What | Source | Licence | Notice |
|--------|------|--------|---------|--------|
| `chess/` | Tactics puzzles | [Lichess puzzle database](https://database.lichess.org/#puzzles), via [mcognetta/lichess-combined-puzzle-game-db](https://github.com/mcognetta/lichess-combined-puzzle-game-db) | CC0 1.0 | none required |
| `trivia/` (questions) | Quiz questions, adapted | [OpenTriviaQA](https://github.com/uberspot/OpenTriviaQA) | CC BY-SA 4.0 | [`public/data/trivia/LICENSE.md`](public/data/trivia/LICENSE.md) |
| `trivia/higher-lower.json` | Country and city figures | World Bank (CC BY 4.0), [mledoze/countries](https://github.com/mledoze/countries) (ODbL 1.0), [GeoNames](https://www.geonames.org/) (CC BY 4.0) | ODbL 1.0 as a whole | [`public/data/trivia/LICENSE.md`](public/data/trivia/LICENSE.md) |
| `../flags/` | Country flags in higher or lower, rendered to WebP by `scripts/build-flags.mjs` | [flag-icons](https://github.com/lipis/flag-icons), Copyright (c) 2013 Panayiotis Lipiridis | MIT | the flag-icons package (`node_modules/flag-icons/LICENSE`) |
| `weave/` | English word lists | [SCOWL](http://wordlist.aspell.net/) by Kevin Atkinson, via npm `wordlist-english` | SCOWL licence (permissive, notice required) | [`public/data/weave/SCOWL-COPYRIGHT.txt`](public/data/weave/SCOWL-COPYRIGHT.txt) |

Offensive words are filtered out of the word lists and questions with the [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) list (CC BY 4.0, via npm `naughty-words`). The list itself is used at build time and is not shipped.

How the data is built and filtered: [`scripts/DATA_SOURCES.md`](scripts/DATA_SOURCES.md).

## Packages shipped in the app

| Package | Licence |
|---------|---------|
| [Next.js](https://github.com/vercel/next.js) | MIT |
| [React](https://github.com/facebook/react) | MIT |
| [Motion](https://github.com/motiondivision/motion) | MIT |
| [chess.js](https://github.com/jhlywa/chess.js) | BSD-2-Clause, Copyright (c) Jeff Hlywa |
| [Geist and Geist Mono](https://github.com/vercel/geist-font) fonts | SIL Open Font License 1.1 |

Build and test tools (Tailwind CSS, TypeScript, ESLint, Vitest) are development dependencies and are not shipped. Full licence texts come with each package in `node_modules`.

## Names and trademarks

Mind Bend is an independent project. It is not affiliated with, endorsed by or sponsored by LinkedIn, Dialed, Lessgames, Chess.com or Lichess. Their names appear in the docs only to credit the games that inspired the mechanics, and remain the trademarks of their owners. All names, visuals, puzzles and code in this repository are original, apart from the data credited above.

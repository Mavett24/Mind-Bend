# Data sources

`scripts/build-data.mjs` turns these sources into the static files in `public/data/`. Output is deterministic.

## Download into a source folder

```bash
SRC=./.data-src && mkdir -p $SRC/otqa
for c in general science-technology geography world history movies music sports animals literature humanities; do
  curl -sL -o $SRC/otqa/$c.txt https://raw.githubusercontent.com/uberspot/OpenTriviaQA/master/categories/$c
done
curl -sL -o $SRC/population.csv https://raw.githubusercontent.com/datasets/population/main/data/population.csv
curl -sL -o $SRC/gdp.csv https://raw.githubusercontent.com/datasets/gdp/main/data/gdp.csv
curl -sL -o $SRC/countries.json https://raw.githubusercontent.com/mledoze/countries/master/countries.json
node scripts/build-data.mjs $SRC
```

## Chess puzzles

Download the Lichess puzzle database, decompress it and build the bands into `public/data/chess/`:

```bash
curl -sL -o $SRC/lichess_db_puzzle.csv.zst https://database.lichess.org/lichess_db_puzzle.csv.zst
zstd -d $SRC/lichess_db_puzzle.csv.zst
node scripts/build-chess.mjs $SRC/lichess_db_puzzle.csv
```

The script also reads ndjson (one puzzle per line, bare or as `{ "puzzle": {...} }`). The v0.8 set was built from the first 51,200 puzzles of the database as mirrored in [mcognetta/lichess-combined-puzzle-game-db](https://github.com/mcognetta/lichess-combined-puzzle-game-db) (CC0), because database.lichess.org wasn't reachable from the build machine. Running it on the full CSV gives up to 2,000 per band in every band.

## Sources and licences

| Data | Source | Licence | Used for |
|------|--------|---------|----------|
| English words by frequency | [SCOWL](http://wordlist.aspell.net/) via npm `wordlist-english` | MIT-style (SCOWL copyright notice in the package) | weave hidden words and dictionary |
| Offensive words | [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) via npm `naughty-words` | CC BY 4.0 | filtering words and questions |
| Trivia questions | [OpenTriviaQA](https://github.com/uberspot/OpenTriviaQA) | CC BY-SA 4.0 | trivia categories |
| Country population | [datasets/population](https://github.com/datasets/population), World Bank | PDDL / CC BY 4.0 | higher or lower |
| Country GDP | [datasets/gdp](https://github.com/datasets/gdp), World Bank | CC BY 4.0 | higher or lower |
| Country names and area | [mledoze/countries](https://github.com/mledoze/countries) | ODbL 1.0 | higher or lower |
| City populations | [GeoNames](https://www.geonames.org/) via npm `all-the-cities` | CC BY 4.0 | higher or lower |
| Chess puzzles | [Lichess puzzle database](https://database.lichess.org/#puzzles) | CC0 | chess |

The trivia question files in `public/data/trivia/` are an adaptation of OpenTriviaQA and are shared under CC BY-SA 4.0.

## Filtering

- Words: letters only, offensive words removed. Hidden words skip plurals and inflections whose stem is also a word.
- Chess puzzles: rating deviation 90 or less, popularity 80+, 200+ plays, 1 to 6 player moves, every move legal in chess.js, up to 2,000 per 200-point band. Sampling within a band is by a hash of the puzzle id, so the output doesn't depend on file order.
- Questions: 12 to 170 characters, exactly 4 distinct options, one matching answer, no "all of the above" options, nothing time-sensitive ("currently", "as of", "latest"), no politically contested facts, nothing that refers to an image, offensive words removed, deduplicated, up to 900 per category.
- Known limitation: OpenTriviaQA has small typos (often missing apostrophes) and uneven difficulty. Questions are not hand-checked.

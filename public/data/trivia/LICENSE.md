# Licences for the trivia data

The files in this folder are not covered by the MIT licence of the Mind Bend code.

## Question files

`arts.json`, `film.json`, `general.json`, `geography.json`, `history.json`, `mixed.json`, `music.json`, `nature.json` and `science.json`

These are an adaptation of [OpenTriviaQA](https://github.com/uberspot/OpenTriviaQA) by uberspot and contributors, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Changes: questions were filtered (length, four distinct options, nothing time-sensitive or politically contested, no image references, offensive words removed), deduplicated, regrouped into categories and converted to JSON. These adapted files are shared under the same licence, CC BY-SA 4.0.

## Higher or lower

`higher-lower.json` combines four sources:

| Set | Source | Licence |
|-----|--------|---------|
| population | World Bank, via [datasets/population](https://github.com/datasets/population) | CC BY 4.0 |
| gdp | World Bank, via [datasets/gdp](https://github.com/datasets/gdp) | CC BY 4.0 |
| area, and the country names used in every set | [mledoze/countries](https://github.com/mledoze/countries) | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) |
| cities | [GeoNames](https://www.geonames.org/), via npm `all-the-cities` | CC BY 4.0 |

Because it draws on mledoze/countries, `higher-lower.json` is a derived database made available under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Contains information from mledoze/countries, which is made available under the ODbL. The World Bank and GeoNames figures inside it remain under CC BY 4.0 and are credited above.

How these files are built: [`scripts/DATA_SOURCES.md`](https://github.com/Mavett24/Mind-Bend/blob/main/scripts/DATA_SOURCES.md).

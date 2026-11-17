#!/usr/bin/env node
/**
 * Builds the static content for weave and trivia into public/data/.
 *
 *   node scripts/build-data.mjs <source-dir>
 *
 * <source-dir> holds the downloaded raw sources listed in scripts/DATA_SOURCES.md.
 * npm sources (word lists, offensive-word list, cities) come from devDependencies.
 * Output is deterministic, so re-running produces the same files.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error("usage: node scripts/build-data.mjs <source-dir>  (see scripts/DATA_SOURCES.md)");
  process.exit(1);
}
const out = (path, data) => {
  const file = join(root, "public", "data", path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data));
  console.log(`  ${path}  ${(JSON.stringify(data).length / 1024).toFixed(0)} KB`);
};

// Small deterministic PRNG so sampling is reproducible.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (arr, r) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------------------------------------------------------------- offensive words

const naughty = require("naughty-words/en.json")
  .map((w) => w.toLowerCase())
  .filter((w) => /^[a-z]+$/.test(w));
const naughtySet = new Set(naughty);
const naughtyRe = new RegExp(`\\b(${naughty.filter((w) => w.length >= 4).join("|")})\\b`, "i");

// ---------------------------------------------------------------- weave

console.log("weave");
const words = (level) =>
  require(`wordlist-english/english-words-${level}.json`).filter((w) => /^[a-z]+$/.test(w) && !naughtySet.has(w));
const l10 = words(10);
const l20 = words(20);
const l35 = words(35);
const l40 = words(40);
const l50 = words(50);

// Prefer base forms for hidden words: skip plurals and inflections whose stem is also a word.
const all = new Set([...l10, ...l20, ...l35, ...l40, ...l50]);
const undouble = (stem) => (stem.length > 2 && stem.at(-1) === stem.at(-2) ? stem.slice(0, -1) : stem);
const isInflection = (w) => {
  const stemIs = (cut, add = "") => w.length > cut + 2 && (all.has(w.slice(0, -cut) + add) || all.has(undouble(w.slice(0, -cut)) + add));
  return (
    (w.endsWith("s") && stemIs(1)) ||
    (w.endsWith("es") && stemIs(2)) ||
    (w.endsWith("ies") && stemIs(3, "y")) ||
    (w.endsWith("ed") && (stemIs(2) || stemIs(1))) ||
    (w.endsWith("ied") && stemIs(3, "y")) ||
    (w.endsWith("ing") && (stemIs(3) || stemIs(3, "e"))) ||
    (w.endsWith("er") && (stemIs(2) || stemIs(1))) ||
    (w.endsWith("ier") && stemIs(3, "y")) ||
    (w.endsWith("est") && (stemIs(3) || stemIs(2))) ||
    (w.endsWith("iest") && stemIs(4, "y")) ||
    (w.endsWith("ly") && stemIs(2))
  );
};
const targets = (list, min, max) => [...new Set(list)].filter((w) => w.length >= min && w.length <= max && !isInflection(w)).sort();

out("weave/words.json", {
  // Hidden words by tier. Easy to hard use the most common words, expert less common ones.
  targets: {
    easy: targets(l10, 3, 5),
    medium: targets([...l10, ...l20], 4, 6),
    hard: targets([...l10, ...l20], 4, 8),
    expert: targets(l35, 5, 8),
  },
  // Every word a player can find, 3 to 8 letters.
  valid: [...all].filter((w) => w.length >= 3 && w.length <= 8).sort(),
});

// ---------------------------------------------------------------- trivia: categories

console.log("trivia questions");
const CATEGORY_FILES = {
  general: ["general"],
  science: ["science-technology"],
  geography: ["geography", "world"],
  history: ["history"],
  film: ["movies"],
  music: ["music"],
  sport: ["sports"],
  nature: ["animals"],
  arts: ["literature", "humanities"],
};
const PER_CATEGORY = 900;
const TIME_SENSITIVE =
  /\b(currently|current|as of|nowadays|recent|recently|latest|this year|last year|today|still|newest|will be|is now|so far|to date|record holder)\b/i;
const CONTESTED = /\b(israel|palestin\w*|taiwan|kosovo|crimea|western sahara|jerusalem|kashmir)\b/i;
const VISUAL = /\b(pictured|picture|image|photo|shown|below|above|following clip)\b/i;
const META_OPTION = /^(all|none|both|neither) of (the |these )?(above|these|them)?|^all of the$/i;

function parseOtqa(text) {
  const out = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const qLines = [];
    let answer = null;
    const options = [];
    for (const line of lines) {
      if (line.startsWith("#Q")) qLines.push(line.slice(2).trim());
      else if (line.startsWith("^")) answer = line.slice(1).trim();
      else if (/^[A-F] /.test(line)) options.push(line.slice(2).trim());
      else if (!answer && options.length === 0) qLines.push(line);
    }
    if (qLines.length && answer && options.length) out.push({ q: qLines.join(" ").replace(/\s+/g, " "), answer, options });
  }
  return out;
}

const keep = (item) => {
  const { q, answer, options } = item;
  if (q.length < 12 || q.length > 170) return false;
  if (options.length !== 4 || new Set(options.map((o) => o.toLowerCase())).size !== 4) return false;
  if (options.filter((o) => o === answer).length !== 1) return false;
  if (options.some((o) => o.length > 48 || META_OPTION.test(o))) return false;
  const text = `${q} ${options.join(" ")}`;
  return !TIME_SENSITIVE.test(text) && !CONTESTED.test(text) && !VISUAL.test(q) && !naughtyRe.test(text);
};

const seen = new Set();
const counts = {};
const mixed = [];
for (const [cat, files] of Object.entries(CATEGORY_FILES)) {
  let pool = [];
  for (const f of files) pool.push(...parseOtqa(readFileSync(join(src, "otqa", `${f}.txt`), "utf8")));
  pool = pool.filter(keep).filter((item) => {
    const key = item.q.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const picked = shuffle(pool, rng(cat.length * 7919 + 17)).slice(0, PER_CATEGORY);
  const questions = picked.map(({ q, answer, options }) => ({ q, o: options, a: options.indexOf(answer) }));
  counts[cat] = questions.length;
  out(`trivia/${cat}.json`, questions);
  mixed.push(...questions.slice(0, 150).map((x) => ({ ...x, c: cat })));
}
out("trivia/mixed.json", shuffle(mixed, rng(42)));

// ---------------------------------------------------------------- trivia: higher or lower

console.log("trivia higher or lower");
const countries = JSON.parse(readFileSync(join(src, "countries.json"), "utf8")).filter((c) => c.independent && c.unMember);
const byCca3 = new Map(countries.map((c) => [c.cca3, c]));
const byCca2 = new Map(countries.map((c) => [c.cca2, c]));
const nameOf = (c) => c.name.common;

function latestByCountry(csvText, minYear) {
  const rows = csvText.trim().split("\n").slice(1);
  const latest = new Map();
  for (const row of rows) {
    // Country names can contain commas inside quotes; the last three fields are code, year, value.
    const parts = row.split(",");
    const value = Number(parts.pop());
    const year = Number(parts.pop());
    const code = parts.pop();
    if (!byCca3.has(code) || !Number.isFinite(value) || year < minYear) continue;
    const prev = latest.get(code);
    if (!prev || year > prev.year) latest.set(code, { year, value });
  }
  return latest;
}

const population = latestByCountry(readFileSync(join(src, "population.csv"), "utf8"), 2020);
const gdp = latestByCountry(readFileSync(join(src, "gdp.csv"), "utf8"), 2020);
const yearOf = (m) => Math.max(...[...m.values()].map((v) => v.year));

const cities = require("all-the-cities")
  .filter((c) => c.population >= 1_000_000 && byCca2.has(c.country) && ["PPLC", "PPLA", "PPLA2", "PPL"].includes(c.featureCode))
  .sort((a, b) => b.population - a.population);
const cityNames = new Set();
const cityItems = [];
for (const c of cities) {
  const key = `${c.name}|${c.country}`;
  if (cityNames.has(key)) continue;
  cityNames.add(key);
  cityItems.push({ name: c.name, sub: nameOf(byCca2.get(c.country)), value: c.population, code: c.country.toLowerCase() });
}

const hl = [
  {
    id: "population",
    prompt: "Which country has more people?",
    unit: "people",
    source: `World Bank, ${yearOf(population)}`,
    items: [...population].filter(([, v]) => v.value >= 100_000).map(([code, v]) => ({ name: nameOf(byCca3.get(code)), value: Math.round(v.value), code: byCca3.get(code).cca2.toLowerCase() })),
  },
  {
    id: "gdp",
    prompt: "Which country has the bigger economy?",
    unit: "US$ GDP",
    source: `World Bank, ${yearOf(gdp)}`,
    items: [...gdp].filter(([, v]) => v.value >= 1e9).map(([code, v]) => ({ name: nameOf(byCca3.get(code)), value: Math.round(v.value), code: byCca3.get(code).cca2.toLowerCase() })),
  },
  {
    id: "area",
    prompt: "Which country is bigger?",
    unit: "km²",
    source: "mledoze/countries (ODbL)",
    items: countries.filter((c) => c.area >= 1000).map((c) => ({ name: nameOf(c), value: Math.round(c.area), code: c.cca2.toLowerCase() })),
  },
  {
    id: "cities",
    prompt: "Which city has more people?",
    unit: "people",
    source: "GeoNames (CC BY 4.0)",
    items: cityItems,
  },
];
for (const cat of hl) cat.items.sort((a, b) => a.name.localeCompare(b.name));
out("trivia/higher-lower.json", hl);

console.log("\ncounts", JSON.stringify(counts), "higher-lower", hl.map((c) => `${c.id}:${c.items.length}`).join(" "));

/**
 * Builds the chess puzzle set into public/data/chess/ from the Lichess puzzle database (CC0).
 *
 *   node scripts/build-chess.mjs <source> [perBand]
 *
 * <source> is either the official CSV (lichess_db_puzzle.csv, decompressed) or an ndjson file
 * with one puzzle object per line, bare or wrapped as { puzzle: {...} }. See DATA_SOURCES.md.
 *
 * Output: one JSON file per 200-point rating band, plus an index. Each puzzle is a tuple
 * [id, fen, moves, rating, themes]. `fen` is the position before the opponent's setup move,
 * `moves` are UCI moves starting with that setup move, exactly as Lichess stores them.
 * Output is deterministic for a given source.
 */
import { createReadStream, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { createInterface } from "node:readline";
import { Chess } from "chess.js";

const [src, perBandArg] = process.argv.slice(2);
if (!src) {
  console.error("usage: node scripts/build-chess.mjs <lichess csv or ndjson> [perBand]");
  process.exit(1);
}
const PER_BAND = Number(perBandArg) || 2000;
const BAND = 200;
const MIN_RATING = 400;
const MAX_RATING = 3000;
const OUT = "public/data/chess";

// Quality: settled rating, liked by players, played enough to trust both.
const MAX_DEVIATION = 90;
const MIN_POPULARITY = 80;
const MIN_PLAYS = 200;
// Longest line we serve: 6 player moves. Longer lines are rare and tiring on a phone.
const MAX_PLAYER_MOVES = 6;

const CSV_HEADER = ["PuzzleId", "FEN", "Moves", "Rating", "RatingDeviation", "Popularity", "NbPlays", "Themes", "GameUrl", "OpeningTags"];

function parseLine(line) {
  if (!line.trim()) return null;
  if (line.startsWith("{")) {
    const o = JSON.parse(line);
    return o.puzzle ?? o;
  }
  if (line.startsWith("PuzzleId")) return null;
  const cols = line.split(",");
  return Object.fromEntries(CSV_HEADER.map((h, i) => [h, cols[i]]));
}

/** Plays every move with chess.js. Returns false if any move is illegal. */
function legal(fen, moves) {
  try {
    const game = new Chess(fen);
    for (const uci of moves) {
      game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    }
    return true;
  } catch {
    return false;
  }
}

/** Cheap deterministic hash, so the per-band sample doesn't depend on file order. */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const bands = new Map();
let read = 0;
let kept = 0;
const rl = createInterface({ input: createReadStream(src), crlfDelay: Infinity });
for await (const line of rl) {
  const p = parseLine(line);
  if (!p) continue;
  read++;
  const rating = Number(p.Rating);
  const moves = String(p.Moves).trim().split(/\s+/);
  const playerMoves = Math.floor(moves.length / 2);
  if (
    !(rating >= MIN_RATING && rating < MAX_RATING) ||
    Number(p.RatingDeviation) > MAX_DEVIATION ||
    Number(p.Popularity) < MIN_POPULARITY ||
    Number(p.NbPlays) < MIN_PLAYS ||
    moves.length % 2 !== 0 ||
    playerMoves < 1 ||
    playerMoves > MAX_PLAYER_MOVES ||
    !legal(p.FEN, moves)
  ) {
    continue;
  }
  const band = Math.floor(rating / BAND) * BAND;
  if (!bands.has(band)) bands.set(band, []);
  bands.get(band).push([p.PuzzleId, p.FEN, moves.join(" "), rating, String(p.Themes ?? "").trim()]);
  kept++;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const index = [];
for (const band of [...bands.keys()].sort((a, b) => a - b)) {
  const all = bands.get(band).sort((a, b) => hash(a[0]) - hash(b[0]));
  const sample = all.slice(0, PER_BAND).sort((a, b) => a[3] - b[3] || (a[0] < b[0] ? -1 : 1));
  writeFileSync(`${OUT}/${band}.json`, JSON.stringify(sample));
  index.push({ band, count: sample.length });
}
writeFileSync(`${OUT}/index.json`, JSON.stringify({ band: BAND, bands: index }));
console.log(`read ${read}, passed filters ${kept}, wrote ${index.reduce((n, b) => n + b.count, 0)} across ${index.length} bands`);
console.log(index.map((b) => `${b.band}:${b.count}`).join(" "));

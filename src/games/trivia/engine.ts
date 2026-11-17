/**
 * trivia: two modes, ten questions each.
 *   higher or lower: pick the larger of two real values (population, GDP, area, city size)
 *   categories: four-option multiple choice
 * Pure TypeScript given the data. See docs/games/trivia.md.
 */
import { createRng } from "@/engine/rng";
import { boardSeed, type BoardKey } from "@/engine/seed";
import type { Tier } from "@/engine/difficulty";

export const QUESTIONS_PER_GAME = 10;

export const CATEGORIES = [
  { id: "mixed", label: "mixed" },
  { id: "general", label: "general" },
  { id: "science", label: "science" },
  { id: "geography", label: "geography" },
  { id: "history", label: "history" },
  { id: "film", label: "film" },
  { id: "music", label: "music" },
  { id: "sport", label: "sport" },
  { id: "nature", label: "nature" },
  { id: "arts", label: "arts & books" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

export interface BankQuestion {
  q: string;
  o: string[];
  a: number;
  c?: string;
}

export interface HLItem {
  name: string;
  sub?: string;
  value: number;
  /** ISO 3166-1 alpha-2, lower case: the country, or the city's country. Picks the flag (D-064). */
  code?: string;
}

export interface HLCategory {
  id: string;
  prompt: string;
  unit: string;
  source: string;
  items: HLItem[];
}

/** The board: just the key. Modes and categories are chosen on the board, then built from data with this seed. */
export interface TriviaPuzzle {
  key: BoardKey;
}

interface TierConfig {
  /** Seconds per question. */
  seconds: number;
  /** Options shown in categories mode (Easy drops one wrong answer). */
  options: number;
  /** Higher or lower: allowed ratio between the two values, [min, max). */
  ratio: [number, number];
}

const CONFIG: Record<Tier, TierConfig> = {
  easy: { seconds: 20, options: 3, ratio: [3, Infinity] },
  medium: { seconds: 15, options: 4, ratio: [1.5, 3] },
  hard: { seconds: 12, options: 4, ratio: [1.15, 1.5] },
  expert: { seconds: 8, options: 4, ratio: [1.02, 1.15] },
};

export const TRIVIA_PAR_MS: Record<Tier, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
export const secondsFor = (tier: Tier) => CONFIG[tier].seconds;

/**
 * Countdown readout for the time left on a question, in tenths: "12" and ".4".
 * Rounds up, so a fresh 15 second question reads 15.0 and 0.0 only shows once time is up.
 */
export function countdownParts(msLeft: number): [string, string] {
  const tenths = Math.max(0, Math.ceil(msLeft / 100));
  return [String(Math.floor(tenths / 10)), `.${tenths % 10}`];
}

// ---------------------------------------------------------------- building a game

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  category?: string;
}

export function buildQuiz(bank: readonly BankQuestion[], key: BoardKey, category: CategoryId): QuizQuestion[] {
  const cfg = CONFIG[key.tier];
  const rng = createRng(`${boardSeed(key)}:quiz:${category}`);
  return rng
    .shuffle(bank)
    .slice(0, QUESTIONS_PER_GAME)
    .map((item) => {
      const correct = item.o[item.a];
      const wrong = rng.shuffle(item.o.filter((_, i) => i !== item.a)).slice(0, cfg.options - 1);
      const options = rng.shuffle([correct, ...wrong]);
      return { q: item.q, options, answer: options.indexOf(correct), category: item.c };
    });
}

export interface HLPair {
  category: string;
  prompt: string;
  unit: string;
  source: string;
  left: HLItem;
  right: HLItem;
  /** 0 when left is larger, 1 when right is. */
  answer: 0 | 1;
}

/** Ten pairs, cycling through the categories, with value ratios inside the tier's band. */
export function buildHigherLower(categories: readonly HLCategory[], key: BoardKey): HLPair[] {
  const cfg = CONFIG[key.tier];
  const rng = createRng(`${boardSeed(key)}:higher-lower`);
  const order = rng.shuffle(categories);
  const usedNames = new Set<string>();
  const pairs: HLPair[] = [];

  for (let i = 0; pairs.length < QUESTIONS_PER_GAME && i < QUESTIONS_PER_GAME * 50; i++) {
    const cat = order[pairs.length % order.length];
    const fresh = cat.items.filter((it) => !usedNames.has(`${cat.id}:${it.name}`));
    const left = rng.pick(fresh);
    const partners = fresh.filter((it) => {
      if (it === left || it.value === left.value) return false;
      const ratio = Math.max(it.value, left.value) / Math.min(it.value, left.value);
      return ratio >= cfg.ratio[0] && ratio < cfg.ratio[1];
    });
    if (partners.length === 0) continue;
    const right = rng.pick(partners);
    usedNames.add(`${cat.id}:${left.name}`);
    usedNames.add(`${cat.id}:${right.name}`);
    pairs.push({
      category: cat.id,
      prompt: cat.prompt,
      unit: cat.unit,
      source: cat.source,
      left,
      right,
      answer: left.value > right.value ? 0 : 1,
    });
  }
  return pairs;
}

/**
 * Points for one answer: 0 if wrong or out of time, otherwise 0.7 for being right
 * plus up to 0.3 for speed. Ten perfect, instant answers make 10.
 */
export function answerPoints(correct: boolean, msLeft: number, msTotal: number): number {
  if (!correct || msLeft <= 0) return 0;
  return Math.round((0.7 + 0.3 * Math.min(1, msLeft / msTotal)) * 100) / 100;
}

export function totalPoints(points: readonly number[]): number {
  return Math.round(points.reduce((a, b) => a + b, 0) * 100) / 100;
}

// ---------------------------------------------------------------- formatting

/** "1.4 billion", "36.2 million", "512,000" */
export function formatValue(value: number, unit: string): string {
  const money = unit.startsWith("US$");
  const fmt = (n: number, word: string) => `${n >= 100 ? Math.round(n) : n.toFixed(1)} ${word}`;
  let text: string;
  if (value >= 1e12) text = fmt(value / 1e12, "trillion");
  else if (value >= 1e9) text = fmt(value / 1e9, "billion");
  else if (value >= 1e6) text = fmt(value / 1e6, "million");
  else text = Math.round(value).toLocaleString("en-US");
  if (money) return `$${text}`;
  return unit === "people" ? `${text} people` : `${text} ${unit}`;
}

// ---------------------------------------------------------------- data loading (client)

const cache = new Map<string, Promise<unknown>>();

function load<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const p = fetch(path).then((r) => {
      if (!r.ok) throw new Error(`trivia data ${path}: ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return cache.get(path) as Promise<T>;
}

export const loadQuestions = (category: CategoryId) => load<BankQuestion[]>(`/data/trivia/${category}.json`);
export const loadHigherLower = () => load<HLCategory[]>("/data/trivia/higher-lower.json");

export const generateTrivia = (key: BoardKey): TriviaPuzzle => ({ key });

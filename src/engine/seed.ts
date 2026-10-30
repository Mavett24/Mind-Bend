import { dailyTier, type Tier } from "./difficulty";

export type Mode = "daily" | "practice" | "challenge";

/** A board is fully described by these three values. */
export interface BoardKey {
  gameId: string;
  tier: Tier;
  seed: string;
}

/** YYYY-MM-DD in UTC, so everyone in the world shares the same daily board. */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** ISO weekday in UTC: 1 = Monday ... 7 = Sunday. */
export function utcIsoWeekday(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

export function dailyBoard(gameId: string, date: Date): BoardKey {
  return {
    gameId,
    tier: dailyTier(utcIsoWeekday(date)),
    seed: `daily-${utcDateKey(date)}`,
  };
}

const ALPHABET = "0123456789abcdefghijkmnpqrstuvwxyz"; // no l or o, easier to read aloud

/**
 * A short random seed for practice boards, e.g. "k3f9x2".
 * Uses crypto randomness so seeds don't collide, then everything downstream is deterministic.
 */
export function randomSeed(length = 6): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

const SEED_PATTERN = /^[a-z0-9-]{1,32}$/;

export function isValidSeed(seed: unknown): seed is string {
  return typeof seed === "string" && SEED_PATTERN.test(seed);
}

/** The string every generator hashes. Including game and tier means one seed gives different boards per game. */
export function boardSeed(key: BoardKey): string {
  return `${key.gameId}:${key.tier}:${key.seed}`;
}

/** Query string for a challenge link: /play/path?t=hard&s=k3f9x2 */
export function challengeQuery(key: BoardKey): string {
  return new URLSearchParams({ t: key.tier, s: key.seed }).toString();
}

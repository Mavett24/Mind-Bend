"use client";

/**
 * Loads the puzzle set from public/data/chess/ on demand, one 200-point band at a time, and keeps
 * what it has fetched for the rest of the visit. A band is about 90 KB over the wire.
 */
import { bandsAround, fromTuple, type ChessPuzzle, type PuzzleTuple } from "./engine";

interface Index {
  band: number;
  bands: { band: number; count: number }[];
}

let index: Promise<Index> | null = null;
const bands = new Map<number, Promise<ChessPuzzle[]>>();

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function loadIndex(): Promise<Index> {
  index ??= getJson<Index>("/data/chess/index.json").catch((e) => {
    index = null;
    throw e;
  });
  return index;
}

export function loadBand(band: number): Promise<ChessPuzzle[]> {
  let p = bands.get(band);
  if (!p) {
    p = getJson<PuzzleTuple[]>(`/data/chess/${band}.json`)
      .then((rows) => rows.map(fromTuple))
      .catch((e) => {
        bands.delete(band);
        throw e;
      });
    bands.set(band, p);
  }
  return p;
}

/** Every puzzle within about 200 points of `target`. */
export async function loadPool(target: number): Promise<ChessPuzzle[]> {
  const { bands: list } = await loadIndex();
  const wanted = bandsAround(target, list.map((b) => b.band));
  return (await Promise.all(wanted.map(loadBand))).flat();
}

/** One puzzle by its band and id, for challenge links. */
export async function loadPuzzle(band: number, id: string): Promise<ChessPuzzle | null> {
  try {
    return (await loadBand(band)).find((p) => p.id === id) ?? null;
  } catch {
    return null;
  }
}

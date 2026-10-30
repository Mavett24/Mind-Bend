"use client";

/**
 * The browser side of score history: load (migrating v0.6 totals once), append, import,
 * and a React hook that stays in sync across tabs. All maths lives in src/engine/history.ts.
 */
import { useSyncExternalStore } from "react";
import { GAMES } from "@/games/registry";
import { emptyHistory, merge, sanitize, type GameRecord, type HistoryData, type Legacy } from "@/engine/history";
import { readJson, writeJson, STORAGE_PREFIX } from "@/engine/storage";

const KEY = "history";
const MIGRATED = "history-migrated";

let cache: HistoryData | null = null;
const listeners = new Set<() => void>();

function migrateLegacy(): Record<string, Legacy> {
  const legacy: Record<string, Legacy> = {};
  for (const g of GAMES) {
    const old = readJson<Partial<Legacy> | null>(`stats:${g.id}`, null);
    if (!old || typeof old.rating !== "number" || !old.played) continue;
    legacy[g.id] = {
      rating: old.rating,
      played: Number(old.played) || 0,
      solved: Number(old.solved) || 0,
      bestMs: old.bestMs ?? {},
      bestPoints: old.bestPoints ?? {},
      dailyDone: Array.isArray(old.dailyDone) ? old.dailyDone : [],
    };
  }
  return legacy;
}

function load(): HistoryData {
  const stored = sanitize(readJson<unknown>(KEY, null));
  if (stored) return stored;
  const data = emptyHistory();
  if (!readJson(MIGRATED, false)) {
    data.legacy = migrateLegacy();
    writeJson(KEY, data);
    writeJson(MIGRATED, true);
  }
  return data;
}

export function getHistory(): HistoryData {
  if (!cache) cache = load();
  return cache;
}

function commit(next: HistoryData) {
  cache = next;
  writeJson(KEY, next);
  for (const l of listeners) l();
}

export function addRecord(record: GameRecord): HistoryData {
  const current = getHistory();
  if (current.records.some((r) => r.id === record.id)) return current;
  const next = { ...current, records: [...current.records, record] };
  commit(next);
  return next;
}

/** Adds another device's history to this one. Returns how many games were new. */
export function importHistory(other: HistoryData): number {
  const before = getHistory();
  const next = merge(before, other);
  commit(next);
  return next.records.length - before.records.length;
}

export function resetHistory() {
  commit(emptyHistory());
}

export function newRecordId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `${Date.now().toString(36)}-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_PREFIX + KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Null during the server render and hydration, the live history after. */
export function useHistory(): HistoryData | null {
  return useSyncExternalStore(subscribe, getHistory, () => null);
}

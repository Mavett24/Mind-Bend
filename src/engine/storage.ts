/**
 * Safe localStorage wrapper. Storage can be missing (server render),
 * blocked (private mode, disabled site data) or throw on quota.
 * Every call degrades to an in-memory fallback instead of crashing.
 */

export const STORAGE_PREFIX = "mb:v1:";
const PREFIX = STORAGE_PREFIX;
const memory = new Map<string, string>();

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    const probe = `${PREFIX}probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const fullKey = PREFIX + key;
  try {
    const raw = storage()?.getItem(fullKey) ?? memory.get(fullKey) ?? null;
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  const fullKey = PREFIX + key;
  const raw = JSON.stringify(value);
  memory.set(fullKey, raw);
  try {
    storage()?.setItem(fullKey, raw);
  } catch {
    // Quota or blocked storage: the in-memory copy keeps the session working.
  }
}

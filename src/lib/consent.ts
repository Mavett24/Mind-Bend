/**
 * Cookie consent rules (D-053), kept free of the DOM so they can be tested in node.
 * The browser side (store, gtag loader, cookie clearing) lives in src/lib/analytics.ts.
 */

/** Bump when the banner text or what we collect changes: everyone is asked again. */
export const CONSENT_VERSION = 1;

/** A choice is remembered for 12 months, then the banner asks again. */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/** GA cookies live 13 months instead of Google's default 2 years. In seconds, for gtag. */
export const GA_COOKIE_EXPIRES_S = 13 * 30 * 24 * 60 * 60;

export type ConsentChoice = "granted" | "denied";

export interface ConsentRecord {
  v: number;
  choice: ConsentChoice;
  /** ISO timestamp of the click, so we can show and prove when the choice was made. */
  at: string;
}

export function makeRecord(choice: ConsentChoice, now: Date): ConsentRecord {
  return { v: CONSENT_VERSION, choice, at: now.toISOString() };
}

/** A stored record still counts only if it is well formed, on the current version and under 12 months old. */
export function currentChoice(raw: unknown, now: Date): ConsentChoice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ConsentRecord>;
  if (r.v !== CONSENT_VERSION) return null;
  if (r.choice !== "granted" && r.choice !== "denied") return null;
  const at = typeof r.at === "string" ? Date.parse(r.at) : NaN;
  if (!Number.isFinite(at)) return null;
  const age = now.getTime() - at;
  if (age < 0 || age > CONSENT_MAX_AGE_MS) return null;
  return r.choice;
}

/** Names of the Google Analytics cookies in a `document.cookie` string: `_ga` and `_ga_<stream>`. */
export function gaCookieNames(cookieString: string): string[] {
  return cookieString
    .split(";")
    .map((part) => part.split("=")[0]?.trim() ?? "")
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));
}

/**
 * Domains a cookie may have been set on for this host. gtag sets its cookies on the widest
 * domain the browser accepts, so deleting one means trying the host and every parent.
 * `mind-bend.vercel.app` → host-only, `mind-bend.vercel.app`, `vercel.app`. A domain the
 * browser refuses (a public suffix) makes the delete a harmless no-op.
 */
export function cookieDomains(hostname: string): (string | null)[] {
  const parts = hostname.split(".");
  const domains: (string | null)[] = [null];
  for (let i = 0; i < parts.length - 1; i++) domains.push(parts.slice(i).join("."));
  return domains;
}

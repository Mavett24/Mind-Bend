"use client";

/**
 * Google Analytics behind consent (D-053).
 *
 * - Nothing from Google is in the page until the visitor clicks accept: no script, no request,
 *   no cookie. That is Basic consent mode.
 * - After accept, Consent Mode v2 starts with every signal denied and grants only
 *   `analytics_storage`. The three ad signals stay denied for good: Mind Bend runs no ads.
 * - Reject after an accept denies storage, deletes the GA cookies and reloads, so gtag is gone.
 * - GA only exists where `NEXT_PUBLIC_GA_ID` is set, which on Vercel is Production only.
 */
import { useSyncExternalStore } from "react";
import { readJson, writeJson } from "@/engine/storage";
import {
  GA_COOKIE_EXPIRES_S,
  cookieDomains,
  currentChoice,
  gaCookieNames,
  makeRecord,
  type ConsentChoice,
} from "./consent";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const analyticsEnabled = /^G-[A-Z0-9]+$/.test(GA_ID);

const KEY = "consent";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/* ---------- consent store ---------- */

interface ConsentState {
  /** null until the visitor has chosen (or their choice expired). */
  choice: ConsentChoice | null;
  /** The banner is open: no valid choice yet, or reopened from "cookie settings". */
  open: boolean;
}

const SERVER_STATE: ConsentState = { choice: null, open: false };
let state: ConsentState | null = null;
const listeners = new Set<() => void>();

function load(): ConsentState {
  const choice = currentChoice(readJson<unknown>(KEY, null), new Date());
  return { choice, open: analyticsEnabled && choice === null };
}

function getState(): ConsentState {
  if (!state) state = load();
  return state;
}

function set(next: ConsentState) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_STATE);
}

/** Reopen the banner from the footer link. */
export function openConsentSettings() {
  if (!analyticsEnabled) return;
  set({ ...getState(), open: true });
}

/** Close the reopened banner without changing anything. Only possible once a choice exists. */
export function closeConsentSettings() {
  const s = getState();
  if (s.choice) set({ ...s, open: false });
}

export function chooseConsent(choice: ConsentChoice) {
  const previous = getState().choice;
  writeJson(KEY, makeRecord(choice, new Date()));
  set({ choice, open: false });

  if (choice === "granted") {
    loadAnalytics();
    return;
  }
  // Reject, or withdrawal of an earlier accept: stop gtag writing and delete what it wrote.
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  clearGaCookies();
  // If gtag ran in this page, reload so the script is gone, not just paused.
  if (previous === "granted" || loaded) window.location.reload();
}

/* ---------- gtag ---------- */

let loaded = false;

/** Inject gtag. Call only after a granted choice. Safe to call more than once. */
export function loadAnalytics() {
  if (!analyticsEnabled || loaded || typeof window === "undefined") return;
  loaded = true;

  window.dataLayer = window.dataLayer ?? [];
  // gtag must push the `arguments` object itself, not an array copy, or GA ignores the command.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  const gtag = window.gtag;

  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  gtag("consent", "update", { analytics_storage: "granted" });
  gtag("js", new Date());
  gtag("config", GA_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: GA_COOKIE_EXPIRES_S,
    cookie_flags: "SameSite=Lax;Secure",
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
}

export function clearGaCookies() {
  const names = gaCookieNames(document.cookie);
  for (const name of names) {
    for (const domain of cookieDomains(window.location.hostname)) {
      const scope = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${scope}`;
    }
  }
}

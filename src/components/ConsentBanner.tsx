"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { analyticsEnabled, chooseConsent, clearGaCookies, closeConsentSettings, loadAnalytics, useConsent } from "@/lib/analytics";
import { dur, ease } from "@/lib/motion";
import { Button } from "./Button";

/**
 * The cookie choice (D-053). A card at the bottom of the screen that never blocks play, with
 * accept and reject as identical pills. It opens on a first visit, when a choice is over 12
 * months old or the text changed, and from "cookie settings" in the footer.
 */
export function ConsentBanner() {
  const { choice, open } = useConsent();
  const reopened = open && choice !== null;
  const ref = useRef<HTMLDivElement>(null);

  // Start GA for a returning visitor who accepted; sweep up stale GA cookies for everyone else.
  useEffect(() => {
    if (!analyticsEnabled) return;
    if (choice === "granted") loadAnalytics();
    else clearGaCookies();
  }, [choice]);

  // Opened on purpose from the footer: move focus to it. On a first visit focus stays put.
  useEffect(() => {
    if (reopened) ref.current?.focus();
  }, [reopened]);

  if (!analyticsEnabled) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          tabIndex={-1}
          role="region"
          aria-labelledby="consent-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: dur.base, ease: ease.out }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && reopened) closeConsentSettings();
          }}
          className="surface fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[520px] flex-col gap-4 rounded-card p-5 outline-none md:p-6"
        >
          <div className="flex flex-col gap-1.5">
            <h2 id="consent-title" className="text-caption uppercase text-ash">
              cookies{reopened && <span className="text-steel"> · now {choice === "granted" ? "accepted" : "rejected"}</span>}
            </h2>
            <p className="text-body text-fog">
              Can we use Google Analytics to see which games people play? It sets two cookies for 13 months and the data goes to Google. Your
              games stay in this browser either way.{" "}
              <Link href="/privacy" className="text-paper underline decoration-slate underline-offset-4 hover:decoration-paper">
                privacy
              </Link>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" arrow={false} onClick={() => chooseConsent("denied")}>
              reject
            </Button>
            <Button variant="ghost" arrow={false} onClick={() => chooseConsent("granted")}>
              accept
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

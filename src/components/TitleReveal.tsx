"use client";

import { motion, useReducedMotion } from "motion/react";
import { dur, ease } from "@/lib/motion";

/** Signature moment 1: a title that enters letter by letter. */
export function TitleReveal({ text, className = "" }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span className={`inline-flex ${className}`} aria-label={text} role="text">
      {[...text].map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          aria-hidden
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.slow, ease: ease.out, delay: i * 0.024 }}
          className="inline-block whitespace-pre"
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

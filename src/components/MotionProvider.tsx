"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Every Motion animation in the app follows the OS reduced-motion setting (D-052): transforms
 * are dropped and opacity changes stay, which is the DESIGN.md §6 rule. Components that swap a
 * movement for something else (the wrong-move shake becomes an ember fade) still check
 * `useReducedMotion` themselves.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

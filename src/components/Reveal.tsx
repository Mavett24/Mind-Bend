"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { dur, ease, reveal } from "@/lib/motion";

/**
 * Scroll reveal (D-052): the element rises and fades in the first time it comes on screen.
 * Items in the same row are staggered left to right by where they actually sit in their parent,
 * so the stagger follows the layout at every breakpoint without knowing the column count.
 * Anything already on screen at load plays straight away.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
  "aria-labelledby": labelledBy,
}: {
  children: ReactNode;
  className?: string;
  /** extra delay in seconds, on top of the row stagger */
  delay?: number;
  as?: "div" | "section" | "li";
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: reveal.amount });
  const [rowDelay, setRowDelay] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const p = parent.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = p.width > 0 ? (r.left - p.left) / p.width : 0;
    setRowDelay(Math.max(0, Math.min(1, x)) * reveal.rowStagger);
  }, []);

  const Tag = motion[as];
  return (
    <Tag
      ref={ref as never}
      className={className}
      aria-labelledby={labelledBy}
      initial={{ opacity: 0, y: reveal.rise }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: reveal.rise }}
      transition={{ duration: dur.slow, ease: ease.out, delay: delay + rowDelay }}
    >
      {children}
    </Tag>
  );
}

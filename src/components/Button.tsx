"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { dur, ease, press } from "@/lib/motion";

type Variant = "primary" | "ghost" | "ember";

const styles: Record<Variant, string> = {
  primary: "bg-paper text-void font-medium hover:bg-white disabled:bg-slate disabled:text-ash",
  ember: "bg-ember text-void font-medium hover:bg-ember-hover disabled:bg-slate disabled:text-ash",
  ghost: "bg-white/[0.06] text-paper shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-white/[0.1] disabled:text-steel",
};

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  arrow?: boolean;
}

export function Button({ variant = "primary", arrow = true, className = "", children, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: press.button }}
      transition={{ duration: dur.fast, ease: ease.spring }}
      className={`group inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 font-mono text-[15px] transition-colors duration-[var(--dur-fast)] disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...rest}
    >
      {children as React.ReactNode}
      {arrow && (
        <span
          aria-hidden
          className="inline-block transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1 group-disabled:translate-x-0"
        >
          →
        </span>
      )}
    </motion.button>
  );
}

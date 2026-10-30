"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { dur, ease } from "@/lib/motion";

type Variant = "primary" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-ember text-void font-bold shadow-[var(--shadow-subtle)] hover:bg-ember-hover disabled:bg-slate disabled:text-ash",
  ghost: "border border-slate text-paper hover:border-fog disabled:text-steel disabled:border-iron",
};

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  arrow?: boolean;
}

export function Button({ variant = "primary", arrow = true, className = "", children, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: dur.fast, ease: ease.spring }}
      className={`group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-mono text-[15px] transition-colors duration-[var(--dur-fast)] disabled:cursor-not-allowed ${styles[variant]} ${className}`}
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

"use client";

import { motion } from "motion/react";
import { dur, ease } from "@/lib/motion";

interface Option<T extends string> {
  value: T;
  label: string;
  /** Small ember marker on the segment, e.g. the suggested tier. */
  marked?: boolean;
}

interface SegmentedProps<T extends string> {
  id: string;
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/**
 * Tier picker and mode toggle (D-045). A stroked track so it reads as a control, and a filled
 * chip on the active segment that slides between options on the spring curve.
 */
export function Segmented<T extends string>({ id, label, options, value, onChange, disabled }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={`flex w-full gap-1 rounded-control border border-slate bg-white/[0.03] p-1 transition-opacity duration-[var(--dur-fast)] ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`relative flex h-9 flex-1 items-center justify-center rounded-cell text-caption uppercase transition-colors duration-[var(--dur-fast)] ${
              active ? "text-paper" : "text-ash enabled:hover:bg-white/[0.04] enabled:hover:text-paper"
            } disabled:cursor-not-allowed`}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId={`seg-${id}`}
                transition={{ duration: dur.base, ease: ease.spring }}
                className="absolute inset-0 rounded-cell bg-slate shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_3px_rgba(0,0,0,0.4)]"
              />
            )}
            <span className="relative">{opt.label}</span>
            {opt.marked && <span aria-label="suggested" className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-ember" />}
          </button>
        );
      })}
    </div>
  );
}

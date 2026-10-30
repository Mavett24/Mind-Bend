"use client";

import { motion } from "motion/react";
import { dur, ease } from "@/lib/motion";

interface Option<T extends string> {
  value: T;
  label: string;
  /** Small marker under the label, e.g. the suggested tier. */
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

/** Tier picker and mode toggle. The ember indicator slides between segments on the spring curve. */
export function Segmented<T extends string>({ id, label, options, value, onChange, disabled }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex w-full border border-iron">
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`relative flex h-10 flex-1 items-center justify-center text-caption uppercase tracking-wide transition-colors duration-[var(--dur-fast)] ${
              i > 0 ? "border-l border-iron" : ""
            } ${active ? "text-paper" : "text-steel hover:text-fog"} disabled:cursor-not-allowed`}
          >
            {opt.label}
            {opt.marked && (
              <span aria-label="suggested" className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-fog" />
            )}
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={{ duration: dur.base, ease: ease.spring }}
                className="absolute inset-x-0 bottom-0 h-[2px] bg-ember"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

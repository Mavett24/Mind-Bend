"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

export const HINT_COOLDOWN_MS = 5000;

interface HintButtonProps {
  onHint: () => void;
  count: number;
  disabled?: boolean;
  cooldownMs?: number;
}

/**
 * Shared hint control. After each hint it locks for `cooldownMs` and a fill sweeps
 * across the pill to show when the next one is ready (scaleX only).
 */
export function HintButton({ onHint, count, disabled = false, cooldownMs = HINT_COOLDOWN_MS }: HintButtonProps) {
  const [coolingUntil, setCoolingUntil] = useState(0);
  const [now, setNow] = useState(0);
  const cooling = coolingUntil > now;

  useEffect(() => {
    if (!coolingUntil) return;
    const id = setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t >= coolingUntil) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [coolingUntil]);

  const press = () => {
    if (disabled || cooling) return;
    onHint();
    const t = performance.now();
    setNow(t);
    setCoolingUntil(t + cooldownMs);
  };

  const secondsLeft = Math.ceil((coolingUntil - now) / 1000);

  return (
    <button
      type="button"
      onClick={press}
      disabled={disabled || cooling}
      aria-label={cooling ? `hint available in ${secondsLeft} seconds` : `hint${count ? `, ${count} used` : ""}`}
      className="relative inline-flex h-10 min-w-[104px] items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-slate px-4 font-mono text-[14px] text-paper transition-colors duration-[var(--dur-fast)] hover:border-fog disabled:cursor-not-allowed disabled:text-steel"
    >
      {cooling && (
        <motion.span
          key={coolingUntil}
          aria-hidden
          className="absolute inset-0 origin-left bg-iron"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: cooldownMs / 1000, ease: "linear" }}
        />
      )}
      <span className="relative">
        {cooling ? `hint · ${secondsLeft}s` : `hint${count ? ` · ${count}` : ""}`}
      </span>
    </button>
  );
}

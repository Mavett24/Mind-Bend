"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/** "42.31" under a minute, "1:42.31" above. Returns the significant part and the dimmed fraction separately. */
export function splitTime(ms: number): [string, string] {
  const totalCs = Math.max(0, Math.floor(ms / 10));
  const cs = totalCs % 100;
  const totalS = Math.floor(totalCs / 100);
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  const whole = m > 0 ? `${m}:${String(s).padStart(2, "0")}` : String(s);
  return [whole, `.${String(cs).padStart(2, "0")}`];
}

/** Dialed-style number: significant part in paper, fraction dimmed. */
export function TimeDisplay({ ms, className = "" }: { ms: number; className?: string }) {
  const [whole, fraction] = splitTime(ms);
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {whole}
      <span className="text-ash">{fraction}</span>
    </span>
  );
}

/** Signature moment 6: counts from 0 to the value, decelerating. Instant with reduced motion. */
export function CountUpTime({ ms, durationMs = 900, className = "" }: { ms: number; durationMs?: number; className?: string }) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? ms : 0);
  const frame = useRef(0);

  useEffect(() => {
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced motion skips the animation
      setValue(ms);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 4;
      setValue(ms * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [ms, durationMs, reduced]);

  return <TimeDisplay ms={value} className={className} />;
}

/** Live game clock, ticking every 100ms from `startedAt` until `stoppedAt` is set. */
export function GameClock({ startedAt, stoppedAt }: { startedAt: number; stoppedAt: number | null }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    if (stoppedAt !== null) return;
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [stoppedAt]);
  const elapsed = (stoppedAt ?? now) - startedAt;
  const [whole] = splitTime(elapsed);
  const shown = elapsed < 60_000 ? `0:${whole.padStart(2, "0")}` : whole;
  return (
    <span className="font-mono text-heading-lg tabular-nums" aria-label={`time ${shown}`}>
      {shown}
    </span>
  );
}

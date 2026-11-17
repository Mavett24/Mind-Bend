"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { dur } from "@/lib/motion";

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
    <span className={`font-num ${className}`}>
      {whole}
      <span className="text-ash">{fraction}</span>
    </span>
  );
}

/** Animates 0 → value, decelerating, once `active` is true. Instant with reduced motion. */
export function useCountUp(target: number, durationMs: number, active = true): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const frame = useRef(0);
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced motion skips the animation
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(target * (1 - (1 - t) ** 4));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, durationMs, reduced, active]);
  return value;
}

/** Signature moment 6: the score counts up from zero. */
export function CountUpTime({ ms, durationMs = 900, className = "" }: { ms: number; durationMs?: number; className?: string }) {
  return <TimeDisplay ms={useCountUp(ms, durationMs)} className={className} />;
}

/** A 0 to 10 score as "7.42", decimals dimmed. */
export function PointsDisplay({ points, className = "" }: { points: number; className?: string }) {
  const [whole, fraction] = Math.max(0, points).toFixed(2).split(".");
  return (
    <span className={`font-num ${className}`}>
      {whole}
      <span className="text-ash">.{fraction}</span>
    </span>
  );
}

export function CountUpPoints({ points, durationMs = 900, className = "" }: { points: number; durationMs?: number; className?: string }) {
  return <PointsDisplay points={useCountUp(points, durationMs)} className={className} />;
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
    <span className="font-num text-heading-lg" aria-label={`time ${shown}`}>
      {shown}
    </span>
  );
}

/** A stat that counts up from zero the first time it scrolls into view (D-052). */
export function CountUpStat({ value, format, className = "" }: { value: number; format: (v: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const shown = useCountUp(value, dur.count * 1000, seen);
  return (
    <span ref={ref} className={`font-num ${className}`} aria-label={format(value)}>
      <span aria-hidden>{format(shown)}</span>
    </span>
  );
}

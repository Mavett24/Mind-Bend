"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";

type TabId = "today" | "games" | "stats";

/** Width of each rounded end of the blob: half the 52px tab height, so the ends are true semicircles. */
const CAP = 26;
/** The middle strip is drawn at this width and scaled, so it never animates layout (DESIGN.md §6). */
const MID_BASE = 100;
/** Springs for the two edges (D-070): the leading edge snaps, the trailing one catches up, so the blob stretches toward the new tab and settles. */
const LEAD = { type: "spring", stiffness: 640, damping: 46, mass: 0.9 } as const;
const TRAIL = { type: "spring", stiffness: 260, damping: 26, mass: 1 } as const;
/** On the home page, games is active once its section's top passes this share of the viewport. */
const GAMES_LINE = 0.45;

/**
 * Floating dock on phones (D-068, D-070): three tabs and nothing else. Navigation only, so the page's
 * own primary action (play, next daily) never competes with it. It slides away on game pages, which
 * are focused screens with their own close button and primary action, and comes back on home and stats.
 *
 * The active tab sits on a blob that morphs between tabs: its two edges move on separate springs,
 * built from two semicircle caps and a scaled middle strip so only transforms animate.
 */
export function Dock() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const onHome = pathname === "/";
  const homeSection = useHomeSection(onHome);
  const away = pathname.startsWith("/play");
  const active: TabId | null = onHome ? homeSection.section : pathname.startsWith("/stats") ? "stats" : away ? "games" : null;

  const trackRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<TabId, HTMLAnchorElement | null>>>({});
  const left = useMotionValue(0);
  const right = useMotionValue(0);
  const [ready, setReady] = useState(false);

  const register = useCallback((id: TabId, el: HTMLAnchorElement | null) => {
    tabRefs.current[id] = el;
  }, []);

  const edgesOf = useCallback((id: TabId) => {
    const el = tabRefs.current[id];
    return el ? { l: el.offsetLeft, r: el.offsetLeft + el.offsetWidth } : null;
  }, []);

  // First placement: no animation, straight onto the active tab.
  useLayoutEffect(() => {
    if (ready || !active) return;
    const e = edgesOf(active);
    if (!e) return;
    left.jump(e.l);
    right.jump(e.r);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the blob can only be placed after the tabs are measured
    setReady(true);
  }, [active, ready, edgesOf, left, right]);

  // Later changes: the edge on the side you're heading leads, the other trails.
  useEffect(() => {
    if (!ready || !active) return;
    const e = edgesOf(active);
    if (!e) return;
    if (reduced) {
      left.jump(e.l);
      right.jump(e.r);
      return;
    }
    const goingRight = e.l > left.get();
    const a = animate(left, e.l, goingRight ? TRAIL : LEAD);
    const b = animate(right, e.r, goingRight ? LEAD : TRAIL);
    return () => {
      a.stop();
      b.stop();
    };
  }, [active, ready, reduced, edgesOf, left, right]);

  // Keep the blob on its tab if the dock resizes (rotation, font load). Reads the active tab from a
  // ref so the observer isn't re-attached on every switch: attaching fires it, which would snap the blob.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    let width = track.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (track.offsetWidth === width) return;
      width = track.offsetWidth;
      const e = activeRef.current ? edgesOf(activeRef.current) : null;
      if (!e) return;
      left.jump(e.l);
      right.jump(e.r);
    });
    ro.observe(track);
    return () => ro.disconnect();
  }, [edgesOf, left, right]);

  /** On the home page, today and games scroll instead of navigating, and the blob moves on tap. */
  function onTab(id: TabId, event: React.MouseEvent<HTMLAnchorElement>) {
    if (!onHome || id === "stats") return;
    event.preventDefault();
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    homeSection.pin(id);
    if (id === "today") {
      window.scrollTo({ top: 0, behavior });
      history.replaceState(history.state, "", "/");
    } else {
      document.getElementById("games")?.scrollIntoView({ behavior, block: "start" });
      history.replaceState(history.state, "", "/#games");
    }
  }

  return (
    <nav aria-label="Main" data-away={away || undefined} aria-hidden={away || undefined} inert={away} className="dock fixed inset-x-0 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 mx-auto w-fit sm:hidden">
      <div
        ref={trackRef}
        className="relative grid h-16 grid-cols-3 items-center gap-1 rounded-full bg-[linear-gradient(var(--color-surface-top),var(--color-surface-bottom))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(255,255,255,0.05),0_12px_32px_rgba(0,0,0,0.6)]"
      >
        <Blob left={left} right={right} visible={ready && active !== null} />

        <Tab id="today" label="today" on={active === "today"} fallback={!ready} register={register} href="/" onClick={onTab}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
            <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <rect x="3" y="4.5" width="14" height="12.5" rx="2.6" />
              <path d="M6.8 2.6v3.2M13.2 2.6v3.2" />
            </g>
            <rect x="8.4" y="10" width="3.2" height="3.2" rx="0.9" fill="currentColor" />
          </svg>
        </Tab>
        <Tab id="games" label="games" on={active === "games"} fallback={!ready} register={register} href="/#games" onClick={onTab}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
            <g fill="currentColor">
              <rect x="3" y="3" width="6" height="6" rx="1.6" />
              <rect x="11" y="3" width="6" height="6" rx="1.6" />
              <rect x="3" y="11" width="6" height="6" rx="1.6" />
              <rect x="11" y="11" width="6" height="6" rx="1.6" opacity="0.45" />
            </g>
          </svg>
        </Tab>
        <Tab id="stats" label="stats" on={active === "stats"} fallback={!ready} register={register} href="/stats" onClick={onTab}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
            <g fill="currentColor">
              <rect x="3" y="10" width="3.2" height="7" rx="1" />
              <rect x="8.4" y="6" width="3.2" height="11" rx="1" />
              <rect x="13.8" y="3" width="3.2" height="14" rx="1" />
            </g>
          </svg>
        </Tab>
      </div>
    </nav>
  );
}

/** Two semicircle caps and a middle strip, all on one vertical gradient so the joins never show. */
function Blob({ left, right, visible }: { left: MotionValue<number>; right: MotionValue<number>; visible: boolean }) {
  const capRightX = useTransform(right, (r) => r - CAP);
  // The strip overlaps each cap by 1px so no seam opens on subpixel positions.
  const midX = useTransform(left, (l) => l + CAP - 1);
  const midScale = useTransform([left, right], ([l, r]: number[]) => Math.max(0, r - l - 2 * CAP + 2) / MID_BASE);
  const part = "dock-blob absolute left-0 top-1.5 h-[52px]";

  return (
    <motion.div aria-hidden className="pointer-events-none absolute inset-0" initial={false} animate={{ opacity: visible ? 1 : 0 }} transition={{ duration: 0.2 }}>
      <motion.span className={`${part} rounded-l-full`} style={{ x: left, width: CAP }} />
      <motion.span className={part} style={{ x: midX, scaleX: midScale, width: MID_BASE, originX: 0 }} />
      <motion.span className={`${part} rounded-r-full`} style={{ x: capRightX, width: CAP }} />
    </motion.div>
  );
}

interface TabProps {
  id: TabId;
  href: string;
  label: string;
  on: boolean;
  /** Before the blob is measured (server render, first paint), the active tab carries a plain chip. */
  fallback: boolean;
  register: (id: TabId, el: HTMLAnchorElement | null) => void;
  onClick: (id: TabId, event: React.MouseEvent<HTMLAnchorElement>) => void;
  children: React.ReactNode;
}

function Tab({ id, href, label, on, fallback, register, onClick, children }: TabProps) {
  return (
    <Link
      ref={(el) => register(id, el)}
      href={href}
      onClick={(e) => onClick(id, e)}
      aria-current={on ? "page" : undefined}
      className={`relative flex h-[52px] w-[76px] flex-col items-center justify-center gap-1 rounded-full font-mono text-[11px] font-medium leading-3 transition-[transform,color] duration-[var(--dur-base)] ease-[var(--ease-out)] active:scale-[0.94] ${
        on ? "text-paper" : "text-ash"
      } ${on && fallback ? "dock-blob" : ""}`}
    >
      {/* The icon springs up a touch when its tab becomes active. */}
      <motion.span
        className="flex h-5 w-5 items-center justify-center"
        initial={false}
        animate={{ scale: on ? 1 : 0.92, y: on ? -1 : 0 }}
        transition={{ type: "spring", stiffness: 520, damping: 18 }}
      >
        {children}
      </motion.span>
      {label}
    </Link>
  );
}

/**
 * Which part of the home page you're looking at: today (the hero and your card) or the games grid.
 * A tap pins the target for the length of the smooth scroll, so the blob moves at once instead of
 * following the scroll past the line.
 */
function useHomeSection(enabled: boolean) {
  const [section, setSection] = useState<"today" | "games">("today");
  const pinnedUntil = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      if (performance.now() < pinnedUntil.current) return;
      const el = document.getElementById("games");
      if (!el) return;
      setSection(el.getBoundingClientRect().top < window.innerHeight * GAMES_LINE ? "games" : "today");
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  const pin = useCallback((id: "today" | "games") => {
    pinnedUntil.current = performance.now() + 900;
    setSection(id);
  }, []);

  return { section, pin };
}

/**
 * Opening a game card (D-073). The card's colour grows from the tile to the whole screen with a
 * clip-path reveal, the route changes underneath, and once the start screen has mounted the colour
 * fades into its wash. Web Animations API: compositor friendly, no React state, interruptible.
 */
import type { GameId } from "@/games/registry";

/** iOS-like drawer curve: quick out of the gate, long soft landing. */
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const GROW_MS = 380;
const FADE_MS = 260;
/** If the start screen never says it's ready (slow network, error), clear the colour anyway. */
const SAFETY_MS = 2500;

let current: { el: HTMLDivElement; grow: Animation; done: boolean } | null = null;

export function openCard(tile: HTMLElement, id: GameId, navigate: () => void) {
  clear();
  const r = tile.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const radius = parseFloat(getComputedStyle(tile).borderTopLeftRadius) || 24;

  const el = document.createElement("div");
  el.className = "card-open-overlay";
  el.setAttribute("aria-hidden", "true");
  el.style.setProperty("--deep", `var(--color-deep-${id})`);
  el.style.setProperty("--deeper", `var(--color-deeper-${id})`);
  document.body.appendChild(el);

  const from = `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px round ${radius}px)`;
  const grow = el.animate([{ clipPath: from }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], { duration: GROW_MS, easing: EASE, fill: "forwards" });
  // Fade the colour in as it starts to grow, so the card's content dissolves into it instead of vanishing in one frame.
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: "ease-out", fill: "backwards" });
  current = { el, grow, done: false };
  // Change the route once the colour is opaque, so the old page never shows through as a flash.
  window.setTimeout(navigate, 150);
  window.setTimeout(cardOpenDone, SAFETY_MS);
}

/** Called by the start screen once it has mounted: the colour hands off to the page's own wash. */
export function cardOpenDone() {
  const c = current;
  if (!c || c.done) return;
  c.done = true;
  c.grow.finished
    .catch(() => {})
    .then(() => c.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: "ease-out", fill: "forwards" }).finished)
    .catch(() => {})
    .finally(() => {
      c.el.remove();
      if (current === c) current = null;
    });
}

function clear() {
  if (!current) return;
  current.el.remove();
  current = null;
}

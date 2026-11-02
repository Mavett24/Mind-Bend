"use client";

import { shake } from "./motion";

/**
 * Signature moment 7, the wrong-move shake (DESIGN.md §6, D-052), for board cells.
 *
 * Runs on the Web Animations API with `composite: "add"`, so the shake adds to whatever transform
 * the cell already has (a placement spring, a solve bounce) instead of fighting it, and never
 * blocks input. Under reduced motion the cell dips in opacity instead of moving.
 *
 * `unit` converts px to the element's own coordinate space: SVG boards draw one cell per user unit,
 * so they pass user units per screen pixel.
 */
export function shakeElements(elements: Iterable<Element>, { reduced, unit = 1 }: { reduced: boolean; unit?: number }) {
  const ms = shake.duration * 1000;
  for (const el of elements) {
    if (reduced) {
      el.animate([{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], { duration: ms, easing: "ease-out" });
    } else {
      el.animate(
        shake.x.map((x) => ({ transform: `translateX(${x * unit}px)` })),
        { duration: ms, easing: "linear", composite: "add" },
      );
    }
  }
}

/** Shake every element inside `root` tagged `data-shake="<key>"` for one of `keys`. */
export function shakeKeys(root: Element | null, keys: Iterable<number | string>, opts: { reduced: boolean; unit?: number }) {
  if (!root) return;
  const els: Element[] = [];
  for (const k of keys) els.push(...root.querySelectorAll(`[data-shake="${k}"]`));
  shakeElements(els, opts);
}

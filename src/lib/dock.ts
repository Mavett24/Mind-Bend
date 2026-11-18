"use client";

import { useEffect } from "react";

/**
 * Hide the floating dock while `active` (D-068): a board in play gets the whole screen. Marks
 * <html data-playing>, which globals.css uses to slide the dock away. Cleans up on unmount.
 */
export function useHideDock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const el = document.documentElement;
    el.dataset.playing = "";
    return () => {
      delete el.dataset.playing;
    };
  }, [active]);
}

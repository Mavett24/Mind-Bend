"use client";

/**
 * Glue between the game screens and analytics (D-062). Events are built in ./events.ts and
 * sent by ./analytics.ts, which drops them unless the visitor accepted analytics.
 */
import { createContext, useContext, useEffect, useRef } from "react";
import type { GameRecord, HistoryData } from "@/engine/history";
import { sendEvents } from "./analytics";
import { gameAbandon, hintUsed, recordEvents, shareChallenge, type PlayContext } from "./events";
import { addRecord, getHistory } from "./history";
import { scoringOf } from "./profile";

/** Adds a finished or abandoned game to the history and sends its events. Use instead of addRecord. */
export function recordGame(record: GameRecord): HistoryData {
  const before = getHistory();
  const after = addRecord(record);
  if (after !== before) sendEvents(recordEvents(record, before, after, scoringOf));
  return after;
}

/** The board being played, for events fired deep inside a board (hints). */
export const PlayTracking = createContext<PlayContext | null>(null);

/** Call from the hint button: sends hint_used for the board in context. */
export function useTrackHint(): (number: number) => void {
  const ctx = useContext(PlayTracking);
  return (number) => {
    if (ctx) sendEvents(hintUsed(ctx, number));
  };
}

/** Sends the share event after a challenge link is copied, or shown to copy by hand. */
export function trackShare(game: string, method: "clipboard" | "prompt") {
  sendEvents(shareChallenge(game, method));
}

/**
 * Closing or reloading the page mid-board never reaches the in-app quit (React doesn't unmount),
 * so it would vanish from GA. This sends game_abandon on pagehide instead. It does not touch the
 * history: the page may come back from the back-forward cache and the board carry on.
 * `state` returns the board in progress and when its clock started, or null when nothing is in progress.
 */
export function useAbandonOnClose(state: () => { ctx: PlayContext; startedAt: number } | null, minMs: number) {
  const read = useRef(state);
  useEffect(() => {
    read.current = state;
  });
  useEffect(() => {
    let sentFor: number | null = null;
    const onHide = () => {
      const s = read.current();
      if (!s || sentFor === s.startedAt) return;
      const timeMs = performance.now() - s.startedAt;
      if (timeMs < minMs) return;
      sentFor = s.startedAt;
      sendEvents(gameAbandon(s.ctx, timeMs, "page_close"));
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [minMs]);
}

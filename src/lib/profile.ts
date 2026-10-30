"use client";

import { useMemo } from "react";
import { GAMES, type GameId } from "@/games/registry";
import { MODULES } from "@/games/modules";
import { focus, gameSummary, overall, skills, type Focus, type GameSummary, type HistoryData, type Overall, type SkillScore } from "@/engine/history";
import { useHistory } from "./history";
import { useToday } from "./useToday";

export interface Profile {
  data: HistoryData;
  games: Record<GameId, GameSummary>;
  overall: Overall;
  skills: SkillScore[];
  focus: Focus | null;
  /** True once anything has been played on this device. */
  returning: boolean;
  now: number;
}

const NAMES = Object.fromEntries(GAMES.map((g) => [g.id, g.name]));

export const scoringOf = (id: string) => MODULES[id as GameId]?.scoring ?? "time";

export function buildProfile(data: HistoryData, now: number): Profile {
  const games = Object.fromEntries(GAMES.map((g) => [g.id, gameSummary(data, g.id, scoringOf(g.id))])) as Record<GameId, GameSummary>;
  const list = Object.values(games);
  const o = overall(data, now);
  return {
    data,
    games,
    overall: o,
    skills: skills(list),
    focus: focus(list, NAMES, now),
    returning: o.games > 0,
    now,
  };
}

/** Everything the UI shows about the player. Null until the client has read storage. */
export function useProfile(): Profile | null {
  const data = useHistory();
  const today = useToday();
  return useMemo(() => (data && today ? buildProfile(data, today.getTime()) : null), [data, today]);
}

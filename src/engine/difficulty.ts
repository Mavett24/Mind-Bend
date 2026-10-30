export const TIERS = ["easy", "medium", "hard", "expert"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
  expert: "expert",
};

/**
 * Each tier has a nominal rating. A player's skill rating is compared with it
 * to suggest the tier that keeps them challenged but not stuck.
 */
export const TIER_RATING: Record<Tier, number> = {
  easy: 800,
  medium: 1100,
  hard: 1400,
  expert: 1700,
};

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}

/** The highest tier whose nominal rating sits at or below the player's rating plus a small stretch. */
export function suggestTier(rating: number): Tier {
  const STRETCH = 100;
  let suggested: Tier = "easy";
  for (const tier of TIERS) {
    if (TIER_RATING[tier] <= rating + STRETCH) suggested = tier;
  }
  return suggested;
}

/**
 * Daily boards ramp through the week like a crossword: easy early in the
 * week, expert on Sunday. Uses ISO weekday (1 = Monday ... 7 = Sunday).
 */
export function dailyTier(isoWeekday: number): Tier {
  const ramp: Tier[] = ["easy", "easy", "medium", "medium", "hard", "hard", "expert"];
  return ramp[(Math.max(1, Math.min(7, isoWeekday)) - 1) as number];
}

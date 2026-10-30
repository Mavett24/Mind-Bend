"use client";

import { useEffect, useState } from "react";

/**
 * The current date, resolved on the client only.
 * Returns null during the server render so daily content never mismatches on hydration.
 */
export function useToday(): Date | null {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the date must come from the client clock
    setToday(new Date());
  }, []);
  return today;
}

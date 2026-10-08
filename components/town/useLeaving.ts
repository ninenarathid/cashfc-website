import { useEffect, useRef, useState } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { Leaving } from "@/lib/town/leaving";

/**
 * The goes at this page's boards that were shut by their member (lib/town/leaving): each is written down as left a
 * moment later, unless its board's own end comes first; whatever still waits when the page goes is written down then.
 */
export function useLeaving(keeper: Keeper): Leaving {
  const to = useRef(keeper);
  useEffect(() => { to.current = keeper; }, [keeper]);
  const [leaving] = useState(() => new Leaving((play) => to.current.record(play)));
  useEffect(() => () => leaving.flush(), [leaving]);
  return leaving;
}

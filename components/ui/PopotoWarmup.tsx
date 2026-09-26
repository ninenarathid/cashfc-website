"use client";

import { useEffect } from "react";
import { warmPopoto } from "@/components/ui/PopotoIcon";

/**
 * Asks for every popoto pose once the page has settled. See warmPopoto.
 *
 * In the root layout, so it happens once per visit rather than on whichever
 * page happens to have a button on it — the bell, on every page, can need the
 * heart at any time.
 */
export default function PopotoWarmup() {
  useEffect(() => {
    // After what the page needs to draw itself, not before: nobody presses a
    // button in the first frame. Safari has no idle callback, so a short wait.
    const w = window as unknown as {
      requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => void warmPopoto(), { timeout: 2000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = setTimeout(() => void warmPopoto(), 400);
    return () => clearTimeout(id);
  }, []);
  return null;
}

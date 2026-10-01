"use client";

import { useSyncExternalStore } from "react";
import type { Identity } from "./room";

/**
 * Whether this tab is in Cash Town, for the parts of the site that are not
 * the town: the dock that keeps you in it while you look at other pages, and
 * the town's page itself, which picks up where you are instead of starting
 * over. Kept apart from the town's own code, which is a chunk of its own that
 * only those who walk in ever download; this file is all every page pays.
 *
 * The tab also remembers being in town (sessionStorage: this tab only, gone
 * with it), so a reload, or a link that loads a whole new page, puts you back
 * where you were, microphone and all. Only for a moment, though: a record not
 * touched for RESUME_MS is not resumed, so a browser that reopens yesterday's
 * tabs never walks anybody into town, or turns a microphone on, without them.
 */

export interface TownRecord {
  me: Identity;
  voice: boolean;
  muted: boolean;
  /** When this tab was last in town, ms since the epoch. */
  seenAt: number;
  /** The dev-only test room, never set in production. */
  testTopic?: string;
  cap?: number;
}

export const RESUME_MS = 60_000;
const KEY = "cashTown:session";

/** The stay this tab is in, as much as the rest of the site needs to know. */
export interface ActiveTown {
  me: Identity;
  testTopic?: string;
  cap?: number;
}

let active: ActiveTown | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Called by the town's session as it starts, and with null as it ends. */
export function setTownActive(town: ActiveTown | null) {
  active = town;
  for (const f of subs) f();
}

/** The stay this tab is in, or null. */
export function useTownActive(): ActiveTown | null {
  return useSyncExternalStore(subscribe, () => active, () => null);
}

export function rememberTown(record: TownRecord | null) {
  try {
    if (record) sessionStorage.setItem(KEY, JSON.stringify(record));
    else sessionStorage.removeItem(KEY);
  } catch { /* storage blocked: nothing to resume from, and nothing else lost */ }
}

/** What to resume, if this tab was in town a moment ago. */
export function resumable(now = Date.now()): TownRecord | null {
  let raw: string | null;
  try { raw = sessionStorage.getItem(KEY); } catch { return null; }
  return readRecord(raw, now);
}

/** A stored record, checked field by field, or null when it is stale or not ours. */
export function readRecord(raw: string | null, now: number): TownRecord | null {
  if (!raw) return null;
  let r: Partial<TownRecord>;
  try { r = JSON.parse(raw) as Partial<TownRecord>; } catch { return null; }
  const me = r?.me as Partial<Identity> | undefined;
  if (!me || typeof me.id !== "string" || !me.id || typeof me.name !== "string") return null;
  if (typeof r.seenAt !== "number" || now - r.seenAt > RESUME_MS || r.seenAt > now + 5_000) return null;
  return {
    me: {
      id: me.id,
      name: me.name,
      face: typeof me.face === "string" ? me.face : null,
      color: typeof me.color === "string" && /^#[0-9a-f]{6}$/i.test(me.color) ? me.color : "#6aa9e0",
    },
    voice: r.voice === true,
    muted: r.muted === true,
    seenAt: r.seenAt,
    testTopic: typeof r.testTopic === "string" ? r.testTopic : undefined,
    cap: typeof r.cap === "number" && r.cap > 0 ? r.cap : undefined,
  };
}

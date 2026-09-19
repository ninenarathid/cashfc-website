"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Data that is already there when the page arrives.
 *
 * Every page on this site is a server component, so the roster, the collections
 * and the achievements are rendered before the navigation even commits. What is
 * not, is everything that lives in Supabase: the parties, the popoto counts, the
 * gallery, whose birthday it is. Those are fetched from an effect after the new
 * page mounts, which is one paint too late — and with a view transition running
 * it is worse than late, because the page finishes sliding into view and *then*
 * fills in underneath the reader's eye.
 *
 * So: one cache, shared by everything, outliving any page. Three things follow
 * from it.
 *
 *   · A component reads the cache while it is deciding its first state, not in
 *     an effect afterwards. Coming back to a page you have already seen, the
 *     data is simply there on frame one.
 *   · Anything can fill the cache before it is needed. The nav warms the page
 *     under the cursor, so by the time the click lands the answer has usually
 *     already arrived.
 *   · A second component asking the same question while the first is still
 *     waiting joins that request instead of starting another.
 *
 * Stale-while-revalidate, deliberately. A cached answer is shown at once and
 * quietly checked again in the background; a party board that is forty seconds
 * old and instant is worth more than one that is perfect and arrives after a
 * spinner. Anything that must be exact after a write — a party you just joined —
 * should drop its key rather than lean on this.
 */

type Entry = {
  value?: unknown;
  at?: number;
  /** In flight, so a second asker waits on this rather than starting again. */
  promise?: Promise<unknown>;
};

const store = new Map<string, Entry>();

/** How long an answer is served without checking again. */
const FRESH_MS = 30_000;

/** What is known right now, without asking anybody. */
export function peek<T>(key: string): T | undefined {
  return store.get(key)?.value as T | undefined;
}

/** Whether what is known is recent enough to leave alone. */
function fresh(e: Entry | undefined): boolean {
  return !!e && e.at !== undefined && Date.now() - e.at < FRESH_MS;
}

/**
 * Ask, or join the asking already under way, or do nothing because the answer
 * is recent. Safe to call as often as you like — that is the point of it.
 */
export function warm<T>(key: string, load: () => Promise<T>): Promise<T> {
  const e = store.get(key);
  if (fresh(e)) return Promise.resolve(e!.value as T);
  if (e?.promise) return e.promise as Promise<T>;

  const promise = load().then(
    (value) => {
      store.set(key, { value, at: Date.now() });
      return value;
    },
    (err) => {
      // A failed request must not be remembered as an answer, or the page would
      // hold on to the emptiness until something else happened to refill it.
      store.delete(key);
      throw err;
    },
  );
  store.set(key, { ...e, promise });
  return promise;
}

/** Forget one answer, for after a write that makes it wrong. */
export function forget(key: string) {
  store.delete(key);
}

/**
 * The cached answer, and a fetch for when there is not one.
 *
 * Returns what is known immediately — `undefined` only on the first visit of a
 * session, which is the one time a reader has to see a page fill in. Everything
 * after that, including every navigation back, is complete on arrival.
 */
export function useWarm<T>(key: string, load: () => Promise<T>): T | undefined {
  const [value, setValue] = useState<T | undefined>(() => peek<T>(key));

  // The loader is rebuilt on every render by most callers; keeping it in a ref
  // means the effect below depends on the key alone and does not re-run because
  // a closure was recreated.
  const loader = useRef(load);
  loader.current = load;

  useEffect(() => {
    let alive = true;
    void warm<T>(key, () => loader.current())
      .then((v) => { if (alive) setValue(v); })
      .catch(() => { /* the caller keeps whatever it already had */ });
    return () => { alive = false; };
  }, [key]);

  return value;
}

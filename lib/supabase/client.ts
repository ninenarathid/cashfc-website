"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./config";

/**
 * Every request of a page that has the town's farm says which farm it has (lib/town/farm-map, the owner's switch between
 * the old farm and the editor's, supabase v323): the database refuses a write to the farm's plots, pots, things on the
 * ground and purses from a page that has the other farm than the one it holds now ("farm-moved": that page loads again),
 * so that no page left open across the switch plants on a tile that is another bed now. A page without the town says
 * nothing, and nothing of it is refused.
 */
const withFarm: typeof fetch = (input, init) => {
  const farm = (globalThis as { __cashTownFarmUsed?: string }).__cashTownFarmUsed;
  if (!farm) return fetch(input, init);
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
  headers.set("x-town-farm", farm);
  return fetch(input, { ...init, headers });
};

export function createClient() {
  if (!supabaseConfigured) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: withFarm } });
}

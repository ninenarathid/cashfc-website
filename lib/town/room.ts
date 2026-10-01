"use client";

import { createClient as createSupabase, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * The town's room: who is here and where they are going (presence), and the
 * messages that introduce two microphones (broadcast). Nothing in it is kept;
 * a room is as long as somebody is in it.
 *
 * Its name comes from the database (town_topic, v101), which tells it only to
 * admins, and the channel is private, so Realtime checks the same rule on
 * every join. Both, because Supabase only promises private channels are
 * enforced when public access is switched off for the whole project, and the
 * party board and the bell still use public ones. (Tried on 2026-10-01: a
 * public channel of the same name hears nothing from the private one, so the
 * secret name is the second lock rather than the only one.)
 */

export interface Townsfolk {
  id: string;
  name: string;
  face: string | null;
  color: string;
  /** Where they are walking to, in tiles. */
  x: number;
  y: number;
  /** Where they set off from. */
  fx: number;
  fy: number;
  voice: boolean;
  muted: boolean;
  /** When they sent this, by their clock. Only compared with their own. */
  at: number;
}

/**
 * `reconnecting` is the ordinary hiccup (a sleepy tab, a dropped Wi-Fi): the
 * client is already trying again and the town keeps working meanwhile. The
 * last three are the ones a person has to do something about.
 */
export type RoomStatus = "connecting" | "ready" | "reconnecting" | "needs-migration" | "denied" | "error";

export interface RoomHandlers {
  onPeople(people: Townsfolk[]): void;
  onSignal(from: string, data: unknown): void;
  onStatus(status: RoomStatus, detail?: string): void;
}

export interface Room {
  update(state: Townsfolk): Promise<void>;
  signal(to: string, data: unknown): void;
  /** Make sure the room still lists me; track again if it lost me. */
  check(): void;
  leave(): Promise<void>;
}

/**
 * A Supabase client of the town's own, for its realtime connection.
 *
 * Its own socket rather than the site's, so the town can keep it alive in a
 * tab nobody is looking at: browsers slow a hidden tab's timers to once a
 * minute, the keep-alive misses its turn, and the server hangs up — which is
 * what members saw as Aqua vanishing until a reload. `worker: true` sends the
 * keep-alive from a Web Worker, which browsers do not slow down.
 *
 * It signs in with whatever session the site has, asked afresh on every
 * keep-alive, so a private channel never rejoins on an expired token.
 */
export function townClient(site: SupabaseClient | null, onBeat?: (status: string) => void): SupabaseClient {
  return createSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: async () => {
      if (!site) return null;
      const { data } = await site.auth.getSession();
      return data.session?.access_token ?? null;
    },
    realtime: { worker: true, heartbeatCallback: onBeat ? (s) => onBeat(String(s)) : undefined },
  });
}

export async function joinTown(
  supabase: SupabaseClient,
  me: Townsfolk,
  h: RoomHandlers,
  opts: { testTopic?: string; cancelled?: () => boolean } = {},
): Promise<Room | null> {
  // A tick before anything else, so a page that mounts and unmounts at once
  // (React's development double-mount, or a quick back-and-forth) can call
  // the first join off before it opens a channel.
  await Promise.resolve();
  if (opts.cancelled?.()) return null;

  let topic = opts.testTopic ?? null;
  if (!topic) {
    const { data, error } = await supabase.rpc("town_topic");
    if (error) {
      // PGRST202: the function is not there, so v101 has not been run.
      h.onStatus(error.code === "PGRST202" ? "needs-migration" : "reconnecting", error.message);
      return null;
    }
    if (!data) { h.onStatus("denied"); return null; }
    topic = data as string;
    // A private channel is checked against the signed-in member's token.
    try { await supabase.realtime.setAuth(); } catch { /* the callback supplies it anyway */ }
  }
  if (opts.cancelled?.()) return null;

  // The client hands back an existing channel for the same name, already
  // subscribed, which cannot take new listeners. Close any left over first.
  for (const old of supabase.getChannels()) {
    if (old.topic === `realtime:${topic}`) await supabase.removeChannel(old);
  }
  if (opts.cancelled?.()) return null;

  const channel: RealtimeChannel = supabase.channel(topic, {
    config: {
      private: !opts.testTopic,
      presence: { key: me.id },
      broadcast: { self: false, ack: false },
    },
  });

  let latest = me;
  let leaving = false;

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState<Townsfolk>();
    const people: Townsfolk[] = [];
    for (const metas of Object.values(state)) {
      // The same person in two tabs: the newest state wins.
      const newest = [...metas].sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0];
      if (newest) {
        const { presence_ref: _ref, ...p } = newest as Townsfolk & { presence_ref?: string };
        people.push(p);
      }
    }
    h.onPeople(people);
  });

  channel.on("broadcast", { event: "rtc" }, ({ payload }) => {
    const p = payload as { from?: string; to?: string; data?: unknown };
    if (p?.to === me.id && p.from) h.onSignal(p.from, p.data);
  });

  // Called again after every rejoin, which is when the room has forgotten me
  // and I must say where I am once more.
  channel.subscribe(async (status, err) => {
    if (leaving) return;
    if (status === "SUBSCRIBED") {
      await channel.track(latest);
      h.onStatus("ready");
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      const text = err?.message ?? status;
      h.onStatus(/unauthori[sz]ed|denied|policy|permission/i.test(text) ? "denied" : "reconnecting", text);
    } else if (status === "CLOSED") {
      h.onStatus("reconnecting");
    }
  });

  return {
    async update(state) {
      latest = state;
      await channel.track(state);
    },
    signal(to, data) {
      void channel.send({ type: "broadcast", event: "rtc", payload: { from: me.id, to, data } });
    },
    check() {
      if (channel.state !== "joined") return;
      const mine = channel.presenceState()[me.id];
      if (!mine || mine.length === 0) void channel.track(latest);
    },
    async leave() {
      leaving = true;
      // Only if it is still ours: a newer join may already have replaced it.
      if (!supabase.getChannels().includes(channel)) return;
      try { await channel.untrack(); } catch { /* already gone */ }
      await supabase.removeChannel(channel);
    },
  };
}

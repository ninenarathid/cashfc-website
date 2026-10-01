"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * The town's room: who is here and where they are going (presence), and the
 * messages that introduce two microphones (broadcast). Nothing in it is kept;
 * a room is as long as somebody is in it.
 *
 * Its name comes from the database (town_topic, v101), which tells it only to
 * admins, and the channel is private, so Realtime checks the same rule on
 * every join. Both, because Supabase only promises private channels are
 * enforced when public access is switched off for the whole project, and the
 * party board and the bell still use public ones. The introductions carry
 * network addresses; they are not for anybody outside.
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

export type RoomStatus = "connecting" | "ready" | "needs-migration" | "denied" | "error" | "closed";

export interface RoomHandlers {
  onPeople(people: Townsfolk[]): void;
  onSignal(from: string, data: unknown): void;
  onStatus(status: RoomStatus, detail?: string): void;
}

export interface Room {
  update(state: Townsfolk): Promise<void>;
  signal(to: string, data: unknown): void;
  leave(): Promise<void>;
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
  h.onStatus("connecting");

  let topic = opts.testTopic ?? null;
  if (!topic) {
    const { data, error } = await supabase.rpc("town_topic");
    if (error) {
      // PGRST202: the function is not there, so v101 has not been run.
      h.onStatus(error.code === "PGRST202" ? "needs-migration" : "error", error.message);
      return null;
    }
    if (!data) { h.onStatus("denied"); return null; }
    topic = data as string;
    // A private channel is checked against the signed-in member's token.
    try { await supabase.realtime.setAuth(); } catch { /* the client keeps its own */ }
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

  channel.subscribe(async (status, err) => {
    if (status === "SUBSCRIBED") {
      await channel.track(latest);
      h.onStatus("ready");
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      const text = err?.message ?? status;
      h.onStatus(/unauthori[sz]ed|denied|policy/i.test(text) ? "denied" : "error", text);
    } else if (status === "CLOSED") {
      h.onStatus("closed");
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
    async leave() {
      // Only if it is still ours: a newer join may already have replaced it.
      if (!supabase.getChannels().includes(channel)) return;
      try { await channel.untrack(); } catch { /* already gone */ }
      await supabase.removeChannel(channel);
    },
  };
}

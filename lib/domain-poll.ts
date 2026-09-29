"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface DomainPoll {
  id: number;
  opens_at: string;
  closes_at: string;
  closed: boolean;
}

export interface DomainChoice {
  id: number;
  domain: string;
}

/** True once an admin has ended it, or once its time is up. */
export const domainPollOver = (p: DomainPoll | null): boolean =>
  !!p && (p.closed || new Date(p.closes_at) <= new Date());

/**
 * The open round, its names, this member's vote, and the totals.
 *
 * Built the way lib/poll.ts is, for the same reasons: the votes table only
 * ever shows somebody their own row, so totals come from a function; and they
 * are not fetched until this member has voted or the round is over, because a
 * running score in front of somebody who has not chosen yet is a nudge.
 *
 * The names are an admin's, put on by scripts/domain-poll.mjs when the round
 * opens. The first round let members add their own; this one is the run-off
 * between the names that came out of it.
 */
export function useDomainPoll() {
  const supabase = useMemo(() => createClient(), []);
  const [poll, setPoll] = useState<DomainPoll | null>(null);
  const [choices, setChoices] = useState<DomainChoice[]>([]);
  const [mine, setMine] = useState<number | null>(null);
  const [tally, setTally] = useState<Record<number, number> | null>(null);
  const [me, setMe] = useState<string | null>(null);
  /** Signed in, and holding a character somebody has proved is theirs. */
  const [eligible, setEligible] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const readTally = useCallback(async (id: number) => {
    if (!supabase) return;
    const { data } = await supabase.rpc("domain_poll_tally", { p_poll: id });
    const out: Record<number, number> = {};
    for (const r of (data ?? []) as { choice_id: number; votes: number }[]) {
      out[r.choice_id] = Number(r.votes);
    }
    setTally(out);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    void (async () => {
      // Newest open round only.
      const { data } = await supabase.from("domain_polls")
        .select("id, opens_at, closes_at, closed")
        .eq("closed", false).lte("opens_at", new Date().toISOString())
        .order("opens_at", { ascending: false }).limit(1).maybeSingle();
      const p = (data as DomainPoll | null) ?? null;
      setPoll(p);
      if (!p) { setReady(true); return; }

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setMe(uid);
      const [names, prof, vote] = await Promise.all([
        supabase.from("domain_choices").select("id, domain")
          .eq("poll_id", p.id).order("created_at"),
        uid ? supabase.from("profiles")
          .select("character_id, character_verified_at").eq("id", uid).maybeSingle()
          : null,
        uid ? supabase.from("domain_votes")
          .select("choice_id").eq("poll_id", p.id).eq("profile_id", uid).maybeSingle()
          : null,
      ]);
      setChoices((names.data ?? []) as DomainChoice[]);
      const pr = prof?.data as { character_id: number | null;
                                 character_verified_at: string | null } | null | undefined;
      setEligible(!!pr?.character_id && !!pr?.character_verified_at);
      const voted = (vote?.data as { choice_id: number } | null | undefined)?.choice_id ?? null;
      setMine(voted);
      if (voted != null || domainPollOver(p)) await readTally(p.id);
      setReady(true);
    })();
  }, [supabase, readTally]);

  const vote = useCallback(async (choiceId: number) => {
    if (!supabase || !poll || !me || busy || choiceId === mine) return;
    setBusy(true);
    // upsert, so changing your mind replaces your vote rather than being
    // refused by the one-each key.
    const { error } = await supabase.from("domain_votes")
      .upsert({ poll_id: poll.id, profile_id: me, choice_id: choiceId,
                voted_at: new Date().toISOString() },
              { onConflict: "poll_id,profile_id" });
    if (!error) {
      setMine(choiceId);
      await readTally(poll.id);
    }
    setBusy(false);
  }, [supabase, poll, me, busy, mine, readTally]);

  return { poll, choices, mine, tally, eligible, signedIn: !!me, ready, busy, vote };
}

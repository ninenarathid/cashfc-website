"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PollOption { key: string; th: string; en: string }

export interface Poll {
  id: number;
  question: string;
  question_en: string | null;
  note: string | null;
  note_en: string | null;
  options: PollOption[];
  closes_at: string | null;
  closed: boolean;
}

/** True once an admin has ended it, or once its two days are up. */
export const pollOver = (p: Poll | null): boolean =>
  !!p && (p.closed || (!!p.closes_at && new Date(p.closes_at) <= new Date()));

const COLUMNS = "id, question, question_en, note, note_en, options, closes_at, closed";

/**
 * The open question, this member's answer to it, and the totals.
 *
 * Totals come from a function rather than from the votes table, because the
 * table only ever shows somebody their own row. How the FC voted is worth
 * publishing; who voted which way is not, and a poll about whose name a potato
 * lands under is exactly the kind where that matters.
 *
 * They are also not fetched until this member has voted or the poll has closed.
 * A running score in front of somebody who has not answered yet is not
 * information, it is a nudge.
 */
export function usePoll() {
  const supabase = useMemo(() => createClient(), []);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [tally, setTally] = useState<Record<string, number> | null>(null);
  const [me, setMe] = useState<string | null>(null);
  /** Signed in, and holding a character somebody has proved is theirs. */
  const [eligible, setEligible] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const readTally = useCallback(async (id: number) => {
    if (!supabase) return;
    const { data } = await supabase.rpc("poll_tally", { p_poll: id });
    const out: Record<string, number> = {};
    for (const r of (data ?? []) as { choice: string; votes: number }[]) {
      out[r.choice] = Number(r.votes);
    }
    setTally(out);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    void (async () => {
      // Newest first, one at a time: a second open poll would be two questions
      // sharing one card, and nobody has asked for that.
      const { data } = await supabase.from("polls").select(COLUMNS)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const p = (data as Poll | null) ?? null;
      setPoll(p);
      if (!p) { setReady(true); return; }

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setMe(uid);
      if (uid) {
        const [{ data: prof }, { data: vote }] = await Promise.all([
          supabase.from("profiles")
            .select("character_id, character_verified_at").eq("id", uid).maybeSingle(),
          supabase.from("poll_votes")
            .select("choice").eq("poll_id", p.id).eq("profile_id", uid).maybeSingle(),
        ]);
        const pr = prof as { character_id: number | null;
                             character_verified_at: string | null } | null;
        setEligible(!!pr?.character_id && !!pr?.character_verified_at);
        setMine((vote as { choice: string } | null)?.choice ?? null);
        if (vote || pollOver(p)) await readTally(p.id);
      } else if (pollOver(p)) {
        await readTally(p.id);
      }
      setReady(true);
    })();
  }, [supabase, readTally]);

  const vote = useCallback(async (choice: string) => {
    if (!supabase || !poll || !me || busy) return;
    setBusy(true);
    // upsert, so changing your mind while it is open replaces your answer
    // rather than being refused by the one-each key.
    const { error } = await supabase.from("poll_votes")
      .upsert({ poll_id: poll.id, profile_id: me, choice },
              { onConflict: "poll_id,profile_id" });
    if (!error) {
      setMine(choice);
      await readTally(poll.id);
    }
    setBusy(false);
  }, [supabase, poll, me, busy, readTally]);

  return { poll, mine, tally, eligible, signedIn: !!me, ready, busy, vote };
}

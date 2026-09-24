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
  /** A year of it, in US dollars. Null when whoever suggested it did not say. */
  price_usd: number | null;
  added_by: string;
  /** The suggester's character, for the line under the name. */
  by: string | null;
}

/** How many names one member may put on a round. v94 holds the same number. */
export const CHOICES_EACH = 3;

/** True once an admin has ended it, or once its three days are up. */
export const domainPollOver = (p: DomainPoll | null): boolean =>
  !!p && (p.closed || new Date(p.closes_at) <= new Date());

// The same pattern as the check on domain_choices.domain.
const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]([a-z0-9-]*[a-z0-9])?$/;

/**
 * What somebody typed, as a registrar would write it, or null if it is not a
 * domain at all.
 *
 * People paste addresses, not names — "https://CashFC.com/" is the same answer
 * as "cashfc.com", and two rows for it would split its votes. The browser's own
 * URL parser does the rest: it lower-cases, drops a port, and turns a Thai name
 * into the punycode a registrar actually sells.
 */
export function tidyDomain(raw: string): string | null {
  const typed = raw.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/[/?#].*$/, "").replace(/\.$/, "");
  if (!typed) return null;
  let host: string;
  try { host = new URL(`http://${typed}`).hostname; } catch { return null; }
  return host.length >= 4 && host.length <= 253 && DOMAIN_RE.test(host) ? host : null;
}

/** Why adding a name did not work, for the line under the form. */
export type AddRefusal = "invalid" | "taken" | "refused";

interface ChoiceRow {
  id: number;
  domain: string;
  price_usd: number | string | null;
  added_by: string;
  profiles: { character_name: string | null; display_name: string | null } | null;
}

/**
 * The open round, its names, this member's vote, and the totals.
 *
 * Built the way lib/poll.ts is, for the same reasons: the votes table only
 * ever shows somebody their own row, so totals come from a function; and they
 * are not fetched until this member has voted or the round is over, because a
 * running score in front of somebody who has not chosen yet is a nudge.
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

  const readChoices = useCallback(async (id: number) => {
    if (!supabase) return;
    const { data } = await supabase.from("domain_choices")
      .select("id, domain, price_usd, added_by, profiles(character_name, display_name)")
      .eq("poll_id", id).order("created_at");
    setChoices(((data ?? []) as unknown as ChoiceRow[]).map((r) => ({
      id: r.id,
      domain: r.domain,
      price_usd: r.price_usd == null ? null : Number(r.price_usd),
      added_by: r.added_by,
      by: r.profiles?.character_name ?? r.profiles?.display_name ?? null,
    })));
  }, [supabase]);

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
      // Newest open round only. A table that is not there yet (v94 not run)
      // comes back as an error, which is simply no card.
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
      const [, prof, vote] = await Promise.all([
        readChoices(p.id),
        uid ? supabase.from("profiles")
          .select("character_id, character_verified_at").eq("id", uid).maybeSingle()
          : null,
        uid ? supabase.from("domain_votes")
          .select("choice_id").eq("poll_id", p.id).eq("profile_id", uid).maybeSingle()
          : null,
      ]);
      const pr = prof?.data as { character_id: number | null;
                                 character_verified_at: string | null } | null | undefined;
      setEligible(!!pr?.character_id && !!pr?.character_verified_at);
      const voted = (vote?.data as { choice_id: number } | null | undefined)?.choice_id ?? null;
      setMine(voted);
      if (voted != null || domainPollOver(p)) await readTally(p.id);
      setReady(true);
    })();
  }, [supabase, readChoices, readTally]);

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

  const add = useCallback(async (
    raw: string, price: number | null,
  ): Promise<AddRefusal | null> => {
    if (!supabase || !poll || !me) return "refused";
    const domain = tidyDomain(raw);
    if (!domain) return "invalid";
    if (choices.some((c) => c.domain === domain)) return "taken";
    setBusy(true);
    const { error } = await supabase.from("domain_choices")
      .insert({ poll_id: poll.id, domain, price_usd: price, added_by: me });
    if (!error) await readChoices(poll.id);
    setBusy(false);
    if (!error) return null;
    // 23505 is somebody else getting the same name in first.
    if (error.code === "23505") { await readChoices(poll.id); return "taken"; }
    return error.code === "23514" ? "invalid" : "refused";
  }, [supabase, poll, me, choices, readChoices]);

  /** False when somebody else has already voted for it, which keeps it on. */
  const takeBack = useCallback(async (choiceId: number): Promise<boolean> => {
    if (!supabase || !poll || !me) return false;
    setBusy(true);
    const { data } = await supabase.from("domain_choices")
      .delete().eq("id", choiceId).select("id");
    const gone = !!data?.length;
    if (gone) {
      if (mine === choiceId) setMine(null);
      await readChoices(poll.id);
      if (tally) await readTally(poll.id);
    }
    setBusy(false);
    return gone;
  }, [supabase, poll, me, mine, tally, readChoices, readTally]);

  const addedByMe = me ? choices.filter((c) => c.added_by === me).length : 0;

  return {
    poll, choices, mine, tally, me, eligible, signedIn: !!me, ready, busy,
    addedByMe, vote, add, takeBack,
  };
}

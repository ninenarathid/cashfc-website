"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The notifications addressed to "the admins" rather than to a person.
 *
 * Three of the kinds in the bell are not news about somebody's own evening: a
 * prize waiting to be handed over, a question under one, and a member writing
 * in. They arrive for whoever happens to hold the flag, they are work, and the
 * work is done on the admin page — so that is where they are now read, and the
 * bell goes back to being personal (see AdminInbox).
 *
 * Only for a real admin. A member's bell never had prize_claim or prize_ask in
 * it, and feedback reaching a member is the answer to something they wrote,
 * which is as personal as a notification gets.
 *
 * The one edge this deliberately accepts: an admin who writes feedback of their
 * own and is answered gets that answer in the admin inbox rather than in their
 * bell, because both sides of a feedback thread are the same kind and only the
 * feedback table knows which is which. It is still read, one page away, and the
 * alternative is a column and a migration for two rows a year.
 */
/**
 * Kinds nobody but an admin is ever sent.
 *
 * The prize thread has two sides and they are different kinds: the winner is
 * told prize_win and prize_done, the admins prize_claim and prize_ask (v87).
 * So these two can leave the bell for everybody, without asking the database
 * who is reading — which matters, because asking is a second query that can
 * be slow, fail, or answer after the bell has already drawn itself. It did:
 * the first version of this waited for that answer, and four claims rang the
 * bell of the one person the move was meant to spare.
 */
export const ADMIN_ONLY_KINDS = ["prize_claim", "prize_ask"] as const;

/**
 * And the kind that is the admins' only when an admin is reading it.
 *
 * Both halves of a feedback thread are `feedback`: the copy that goes to every
 * admin when somebody writes in, and the copy that goes back to the author
 * when one of them answers. A member's is the answer to something they wrote,
 * which is as personal as a notification gets, so this one is filtered by who
 * is reading and not by kind alone.
 */
export const ADMIN_WHEN_ADMIN_KINDS = ["feedback"] as const;

/** Everything the admin inbox holds. */
export const ADMIN_KINDS = [...ADMIN_ONLY_KINDS, ...ADMIN_WHEN_ADMIN_KINDS];

export const ADMIN_KIND_SET: ReadonlySet<string> = new Set(ADMIN_KINDS);

/** What the bell leaves out, for a reader who is or is not an admin. */
export function bellHides(realAdmin: boolean): readonly string[] {
  return realAdmin ? ADMIN_KINDS : ADMIN_ONLY_KINDS;
}

/**
 * The same list as PostgREST wants it, for `.in` and `.not(…, "in", …)`.
 *
 * Written once here rather than spelled out at each of the four queries that
 * need it: the day a fourth kind is added, a list that was copied is a list
 * where one copy is still three long, and the symptom would be a notification
 * appearing in both places, or in neither.
 */
export const listOf = (kinds: readonly string[]) => `(${kinds.join(",")})`;
export const ADMIN_KIND_LIST = listOf(ADMIN_KINDS);

/**
 * How many of the admins' notifications nobody has read yet.
 *
 * The point of moving them was a bell that is only ever about you; the cost is
 * that a prize claim now arrives somewhere nobody is looking. So the count is
 * offered back where an admin already goes — beside the way in to the admin
 * page — rather than as a second bell, which is the thing this was getting rid
 * of. Zero for everybody else, and for an admin with the powers switched off.
 *
 * Polled rather than subscribed: it is one counted query a minute for two
 * people, and the panel behind it is not a thing anybody watches by the second.
 */
export function useAdminUnread(on: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) { setN(0); return; }
    const supabase = createClient();
    if (!supabase) return;
    let live = true;
    const count = async () => {
      const { count: got } = await supabase.from("notifications")
        .select("id", { count: "exact", head: true })
        .in("kind", ADMIN_KINDS as unknown as string[]).is("read_at", null);
      if (live) setN(got ?? 0);
    };
    void count();
    const id = setInterval(() => { if (!document.hidden) void count(); }, 60_000);
    return () => { live = false; clearInterval(id); };
  }, [on]);
  return n;
}

"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Party } from "@/lib/party";
import type { PersonOption } from "@/lib/people";
import { inviteMembers } from "@/lib/party-db";
import { useAvatarOverrides } from "@/lib/avatars";
import { useLang } from "@/lib/i18n";

/**
 * Asking somebody to come, from the party itself.
 *
 * Inviting used to live only in the edit form, which is the whole listing —
 * the fight, the time, the loot rule, the write-up — opened to add one name.
 * A lead reading the party and thinking "Pyro would come" had to go into a
 * form built for changing the evening in order to do something that changes
 * nothing about it. So the same invitation is here, where the list of who is
 * coming and who has been asked already is.
 *
 * The same write as the form (inviteMembers), and the same meaning: an
 * invitation is a question, not a seat. The person answers it and picks their
 * own place. Somebody not on the site is the exception, as it is in the form —
 * there is no account to do the answering, so they arrive in the party.
 */
export default function InviteBox(
  { party, people, supabase, userId, onDone, onError }: {
    party: Party;
    people: PersonOption[];
    supabase: SupabaseClient;
    userId: string;
    onDone: () => void | Promise<void>;
    onError: (m: string) => void;
  },
) {
  const { t } = useLang();
  const overrides = useAvatarOverrides();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  /*
   * Everybody with any standing in the party already: seated, flexing, asked,
   * or asking. None of them is somebody to invite — and the table refuses a
   * second row for the same character anyway, which would surface as an error
   * about a constraint rather than as the name simply not being offered.
   */
  const taken = useMemo(() => new Set(
    [...Object.values(party.seats), ...(party.floating ?? []),
     ...(party.invites ?? []), ...(party.requests ?? [])]
      .map((w) => w.characterId).filter((x): x is number => x != null),
  ), [party]);

  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return people.filter((p) => !taken.has(p.id) && p.name.toLowerCase().includes(s))
      .slice(0, 8);
  }, [q, people, taken]);

  // Where the lead suggested nothing, the invitation says so: wherever they
  // like. A party with seats lets them pick one when they answer.
  const ask = async (w: { characterId: number | null; name: string;
                          avatar: string | null; confirmedAt?: string | null }) => {
    setBusy(true);
    const r = await inviteMembers(supabase, userId, party.id, [{
      ...w, seat: null, flex: { all: true },
    }]);
    setBusy(false);
    if (r.error) { onError(r.error); return; }
    setQ("");
    await onDone();
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
              className="self-start rounded-lg border border-accent/60 bg-accent/10 px-3 py-1.5 text-[15px] text-accent hover:bg-accent/20">
        + {t("party.inviteSomebody")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-accent/40 bg-accent/[0.05] p-2.5">
      <div className="flex items-center gap-2">
        <span className="font-data text-[13.5px] uppercase tracking-[0.14em] text-accent">
          {t("party.inviteSomebody")}
        </span>
        <button type="button" onClick={() => { setOpen(false); setQ(""); }}
                aria-label={t("pf.cancel")}
                className="ml-auto text-[15px] text-muted hover:text-ink">
          ✕
        </button>
      </div>

      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
             placeholder={t("pf.addFlexer")}
             className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-muted" />

      {found.map((p) => {
        const src = overrides[p.id] || p.avatar;
        return (
          <button key={p.id} type="button" disabled={busy}
                  onClick={() => void ask({
                    characterId: p.id, name: p.name, avatar: p.avatar ?? null,
                  })}
                  className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-left hover:border-accent/60 disabled:opacity-50">
            {src
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={src} alt="" width={30} height={30}
                     className="size-[30px] rounded-full object-cover" />
              : <span className="size-[30px] rounded-full bg-card" />}
            <span className="text-[15.5px] text-ink">{p.name}</span>
            <span className="ml-auto text-[14px] text-accent">{t("party.inviteThem")}</span>
          </button>
        );
      })}

      {/* Nobody on the site by that name: somebody's friend from another FC.
          Added as the form adds them, straight into the party, because there
          is no account behind the name to answer an invitation. */}
      {q.trim().length >= 2 && !found.length && (
        <button type="button" disabled={busy}
                onClick={() => void ask({
                  characterId: null, name: q.trim(), avatar: null,
                  confirmedAt: new Date().toISOString(),
                })}
                className="flex items-center gap-2 rounded-lg border border-dashed border-line px-2.5 py-2 text-left hover:border-accent/60 disabled:opacity-50">
          <span className="grid size-[30px] shrink-0 place-items-center rounded-full border border-dashed border-line text-[14px] text-muted">
            ?
          </span>
          <span className="flex flex-col">
            <span className="text-[14.5px] text-ink">{t("pf.addNamed", { name: q.trim() })}</span>
            <span className="text-[13px] text-muted">{t("pf.outsiderHint")}</span>
          </span>
        </button>
      )}
    </div>
  );
}

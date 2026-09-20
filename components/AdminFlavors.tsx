"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import ImagePicker from "@/components/ImagePicker";
import { fmtDate } from "@/lib/dates";
import AdminRareSwitch, { type TierOdds } from "@/components/AdminRareSwitch";
import { FlavorArt, TierBadge } from "@/components/PopotoRare";
import { TIER_LOOK, type RareTier } from "@/lib/popoto-rare";
import {
  AuthorField, QuoteFields, joinBody, splitBody, type Author,
} from "@/components/PopotoQuoteFields";

interface FlavorRow {
  id: number;
  name: string;
  name_en: string | null;
  tier: RareTier;
  color: string;
  image_url: string | null;
  active: boolean;
}

/** One popoto of this flavour that was actually sent. */
interface Sent {
  id: number;
  senderId: string | null;
  receiver: number;
  at: string;
  openedAt: string | null;
}

interface Quote {
  id: number;
  flavor_id: number;
  body: string;
  author_character_id: number | null;
  author_name: string;
}

/** Everything the form edits: the flavour, and the one line that goes with it. */
interface Draft {
  name: string;
  nameEn: string;
  tier: RareTier;
  color: string;
  image: string | null;
  th: string;
  en: string;
  who: Author | null;
}

const TIERS: RareTier[] = ["rare", "super", "ultra"];
const EMPTY: Draft = {
  name: "", nameEn: "", tier: "rare", color: "#f08a24", image: null, th: "", en: "", who: null,
};

/**
 * The flavours a rare popoto can turn out to be, each with its one line. See v77.
 *
 * One flavour, one line, edited together: the line is about the flavour, so
 * there is one place to look for both. The database still keeps lines in their
 * own table (the roll picks from it); here that is one active line a flavour.
 *
 * Grouped by tier, because the tier is the first thing the roll decides and
 * the question an admin has is how full each tier is. A flavour with no line
 * is never picked, and says so on its card.
 *
 * A flavour without a picture still works — the potato tinted to its colour
 * — so a flavour can be added tonight and drawn properly later.
 */
export default function AdminFlavors(
  { memberOptions }: {
    /** For picking who wrote a line. */
    memberOptions: { id: number; name: string }[];
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [rows, setRows] = useState<FlavorRow[]>([]);
  const [quotes, setQuotes] = useState<Record<number, Quote>>({});
  const [sent, setSent] = useState<Record<number, Sent[]>>({});
  const [senders, setSenders] = useState<Record<string, { name: string; charId: number | null }>>({});
  /** Which flavour's list of who gave it to whom is open. */
  const [showSent, setShowSent] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [addKey, setAddKey] = useState(0);
  /**
   * How the rares are split between the tiers, read from the switch below and
   * shown beside each tier's flavours — so "5% of rares" is never last year's
   * number. The old fixed split until it has answered. See v86.
   */
  const [odds, setOdds] = useState<TierOdds>({ rare: 70, super: 25, ultra: 5 });

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const [{ data, error }, { data: bl, error: be }] = await Promise.all([
      supabase.from("popoto_flavors")
        .select("id, name, name_en, tier, color, image_url, active")
        .order("created_at", { ascending: true }),
      supabase.from("popoto_blessings")
        .select("id, flavor_id, body, author_character_id, author_name")
        .eq("active", true)
        .order("created_at", { ascending: true }),
    ]);
    if (error || be) { setErr((error ?? be)!.message); return; }
    setRows((data ?? []) as FlavorRow[]);
    const q: Record<number, Quote> = {};
    for (const r of (bl ?? []) as Quote[]) q[r.flavor_id] ??= r;
    setQuotes(q);
    /*
     * Every rare that has gone out, newest first: who sent it, who has it, and
     * whether they have opened it. The number on a card is the length of its
     * list, so the count and the list can never disagree.
     */
    const { data: k } = await supabase.from("kudos")
      .select("id, rare_flavor_id, sender_id, receiver_character_id, created_at, rare_opened_at")
      .not("rare_flavor_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000);
    const rowsK = (k ?? []) as {
      id: number; rare_flavor_id: number; sender_id: string | null;
      receiver_character_id: number; created_at: string; rare_opened_at: string | null;
    }[];
    const by: Record<number, Sent[]> = {};
    for (const r of rowsK) {
      (by[r.rare_flavor_id] ??= []).push({
        id: r.id, senderId: r.sender_id, receiver: r.receiver_character_id,
        at: r.created_at, openedAt: r.rare_opened_at,
      });
    }
    setSent(by);

    // The senders' names. A popoto is sent by an account rather than by a
    // character, so the name comes from the profile, not the member list.
    const ids = [...new Set(rowsK.map((r) => r.sender_id).filter((x): x is string => !!x))];
    const who: Record<string, { name: string; charId: number | null }> = {};
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles")
        .select("id, character_id, character_name, display_name, discord_username").in("id", ids);
      for (const pr of (ps ?? []) as { id: string; character_id: number | null;
        character_name: string | null; display_name: string | null; discord_username: string | null }[]) {
        who[pr.id] = {
          name: pr.character_name ?? pr.display_name ?? pr.discord_username ?? "—",
          charId: pr.character_id,
        };
      }
    }
    setSenders(who);
  }, [supabase]);
  useEffect(() => { void refresh(); }, [refresh]);

  /*
   * The flavour first, then its line. The line is written to the row it
   * already has, so a gift already sent keeps pointing at the same line;
   * emptied, the line is retired rather than deleted, for the same reason.
   * Lines beyond the first (from before one flavour had one line) are retired
   * too, so the line on the card is the only one that can be received.
   */
  const save = async (flavorId: number | null, d: Draft): Promise<boolean> => {
    if (!supabase) return false;
    setErr(null);
    const fields = {
      name: d.name.trim(), name_en: d.nameEn.trim() || null,
      tier: d.tier, color: d.color, image_url: d.image,
    };
    let id = flavorId;
    if (id == null) {
      const { data, error } = await supabase.from("popoto_flavors").insert(fields).select("id").single();
      if (error) { setErr(error.message); return false; }
      id = (data as { id: number }).id;
    } else {
      const { error } = await supabase.from("popoto_flavors").update(fields).eq("id", id);
      if (error) { setErr(error.message); return false; }
    }

    const body = joinBody(d.th, d.en);
    const had = quotes[id];
    let error: { message: string } | null = null;
    if (body && d.who) {
      const line = {
        body, author_character_id: d.who.id, author_name: d.who.name.trim(), active: true,
      };
      if (had) {
        ({ error } = await supabase.from("popoto_blessings").update(line).eq("id", had.id));
      } else {
        const { data: u } = await supabase.auth.getUser();
        ({ error } = await supabase.from("popoto_blessings")
          .insert({ ...line, flavor_id: id, created_by: u.user?.id ?? null }));
      }
    } else if (had) {
      ({ error } = await supabase.from("popoto_blessings").update({ active: false }).eq("id", had.id));
    }
    if (!error) {
      let others = supabase.from("popoto_blessings").update({ active: false })
        .eq("flavor_id", id).eq("active", true);
      if (had) others = others.neq("id", had.id);
      if (body && d.who && had) ({ error } = await others);
    }
    if (error) { setErr(error.message); await refresh(); return false; }
    await refresh();
    return true;
  };

  const toggle = async (r: FlavorRow) => {
    if (!supabase) return;
    setErr(null);
    const { error } = await supabase.from("popoto_flavors").update({ active: !r.active }).eq("id", r.id);
    if (error) setErr(error.message);
    await refresh();
  };

  const ready = rows.filter((r) => r.active && quotes[r.id]).length;
  const byChar = new Map(memberOptions.map((m) => [m.id, m.name]));
  const nameOf = (charId: number) => byChar.get(charId) ?? `#${charId}`;
  const senderName = (g: Sent) => {
    const who = g.senderId ? senders[g.senderId] : null;
    if (!who) return "\u2014";
    // Somebody who sent it to their own character is worth seeing as that.
    return who.charId === g.receiver ? `${who.name} (${t("adm.flavorSelf")})` : who.name;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* The switch first: whether any of this can be received at all. */}
      <AdminRareSwitch ready={ready} onOdds={setOdds} />
      <h3 className="font-display text-[17px] font-semibold">{t("adm.flavors")}</h3>
      <p className="text-read leading-relaxed text-muted">{t("adm.flavorsWhy")}</p>

      {/* ── a new flavour ──────────────────────────────────────────────── */}
      {supabase && (
        <FlavorForm key={addKey} initial={EMPTY} supabase={supabase} memberOptions={memberOptions}
                    submitLabel={t("adm.flavorAdd")}
                    onSubmit={async (d) => {
                      if (await save(null, d)) setAddKey((k) => k + 1);
                    }} />
      )}

      {err && <p className="text-read text-chili">{err}</p>}

      {/* ── by tier ────────────────────────────────────────────────────── */}
      {TIERS.map((x) => {
        const inTier = rows.filter((r) => r.tier === x);
        // Ready means it can actually be received: in use, with a line in it.
        const live = inTier.filter((r) => r.active && quotes[r.id]).length;
        return (
          <section key={x} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TierBadge tier={x} />
              <span className="text-ui text-muted">
                {t("adm.flavorTierOdds", { pct: odds[x] })}
              </span>
            </div>
            {!live && (
              <p className="rounded-lg border border-dashed border-line px-3 py-2 text-ui text-muted">
                {t(x === "rare" ? "adm.flavorEmptyRare" : "adm.flavorEmpty")}
              </p>
            )}
            <div className="flex flex-wrap items-start gap-2">
              {inTier.map((r) => {
                const q = quotes[r.id];
                const parts = q ? splitBody(q.body) : null;
                if (editing === r.id && supabase) {
                  return (
                    <FlavorForm key={r.id} supabase={supabase} memberOptions={memberOptions}
                                initial={{
                                  name: r.name, nameEn: r.name_en ?? "", tier: r.tier, color: r.color,
                                  image: r.image_url, th: parts?.th ?? "", en: parts?.en ?? "",
                                  who: q ? { id: q.author_character_id, name: q.author_name } : null,
                                }}
                                editingTier={r.tier} sent={(sent[r.id]?.length ?? 0) > 0}
                                submitLabel={t("adm.save")}
                                onCancel={() => setEditing(null)}
                                onSubmit={async (d) => { if (await save(r.id, d)) setEditing(null); }} />
                  );
                }
                return (
                  <div key={r.id}
                       className={`flex w-[19rem] flex-col gap-2 rounded-lg border px-3 py-2.5 ${
                         r.active ? "bg-card" : "border-dashed opacity-60"}`}
                       style={{ borderColor: r.active ? `${r.color}88` : undefined }}>
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-12 shrink-0 place-items-center rounded-md bg-bg/40">
                        <FlavorArt flavor={{ tier: r.tier, name: r.name, nameEn: r.name_en,
                                             color: r.color, image: r.image_url }} size={40} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-lead font-medium leading-snug text-ink">{r.name}</span>
                        <span className={`text-ui leading-snug ${r.name_en ? "text-ink/80" : "text-gold"}`}>
                          {r.name_en || t("adm.flavorNoEn")}
                        </span>
                        {(sent[r.id]?.length ?? 0) > 0 ? (
                          <button type="button"
                                  onClick={() => setShowSent(showSent === r.id ? null : r.id)}
                                  className="mt-0.5 self-start text-meta text-muted underline decoration-dotted underline-offset-2 hover:text-accent">
                            {t("adm.flavorGiven", { n: sent[r.id].length })}
                            {" "}{showSent === r.id ? "\u25b4" : "\u25be"}
                          </button>
                        ) : (
                          <span className="mt-0.5 text-meta text-muted">
                            {t("adm.flavorGiven", { n: 0 })}
                          </span>
                        )}
                      </span>
                    </div>

                    {parts ? (
                      <div className="flex flex-col gap-0.5 rounded-md bg-bg/40 px-2.5 py-2">
                        {parts.th
                          ? <p className="text-read leading-snug text-ink">“{parts.th}”</p>
                          : <p className="text-ui text-gold">{t("adm.quoteNoTh")}</p>}
                        {parts.en
                          ? <p className="text-ui italic leading-snug text-ink/75">“{parts.en}”</p>
                          : <p className="text-ui text-gold">{t("adm.quoteNoEn")}</p>}
                        <span className="mt-0.5 text-meta text-gold">— {q!.author_name}</span>
                      </div>
                    ) : (
                      <p className="rounded-md border border-dashed border-gold/50 px-2.5 py-2 text-ui text-gold">
                        {t("adm.quoteNone")}
                      </p>
                    )}

                    {/* Who gave it to whom, and whether it has been opened. */}
                    {showSent === r.id && (
                      <ul className="flex max-h-56 list-none flex-col gap-1 overflow-y-auto rounded-md bg-bg/40 px-2.5 py-2 text-meta">
                        {sent[r.id].map((g) => (
                          <li key={g.id}
                              className="flex flex-wrap items-baseline gap-x-1.5 border-b border-line/60 pb-1 last:border-0 last:pb-0">
                            <span className="text-muted">{senderName(g)}</span>
                            <span className="text-muted">{"\u2192"}</span>
                            <span className="font-medium text-ink">{nameOf(g.receiver)}</span>
                            <span className="ml-auto text-muted">{fmtDate(g.at)}</span>
                            <span className={g.openedAt ? "text-jade" : "text-gold"}>
                              {g.openedAt ? t("adm.flavorOpened") : t("adm.flavorUnopened")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 text-ui">
                      <button type="button" onClick={() => setEditing(r.id)}
                              className="rounded-md border border-line px-2.5 py-0.5 text-muted hover:border-accent hover:text-accent">
                        ✎ {t("adm.edit")}
                      </button>
                      <button type="button" onClick={() => void toggle(r)}
                              className={`ml-auto rounded-md border px-2 py-0.5 ${
                                r.active ? "border-jade/50 text-jade" : "border-line text-muted"}`}>
                        {r.active ? t("adm.flavorActive") : t("adm.flavorOff")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * A flavour and its line, for adding one or for editing one in place of its
 * card. Nothing is written until the button, so a half-typed name or line is
 * never what somebody rolls.
 */
function FlavorForm(
  { initial, supabase, memberOptions, submitLabel, onSubmit, onCancel, editingTier, sent }: {
    initial: Draft;
    supabase: SupabaseClient;
    memberOptions: { id: number; name: string }[];
    submitLabel: string;
    onSubmit: (d: Draft) => Promise<void>;
    onCancel?: () => void;
    /** The tier it has now, when editing, to say what moving it does. */
    editingTier?: RareTier;
    /** Somebody already has this flavour: say that their gift keeps what it had. */
    sent?: boolean;
  },
) {
  const { t } = useLang();
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const hasLine = !!joinBody(d.th, d.en);
  // A line needs somebody who wrote it; a flavour can be saved without a line.
  const ok = !!d.name.trim() && (!hasLine || !!d.who);

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    await onSubmit(d);
    setBusy(false);
  };

  const inputCls = "rounded-lg border border-line bg-surface px-3 py-2 text-lead text-ink placeholder:text-muted";

  return (
    <div className={`flex w-full flex-col gap-2.5 rounded-lg bg-card p-3 ${
           onCancel ? "border-2 sm:w-[28rem]" : "border border-line"}`}
         style={onCancel ? { borderColor: d.color } : undefined}>
      <div className="flex items-start gap-3">
        <span className="grid size-16 shrink-0 place-items-center rounded-lg border border-line bg-bg/40">
          <FlavorArt flavor={{ tier: d.tier, name: d.name, nameEn: d.nameEn, color: d.color, image: d.image }}
                     size={52} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input value={d.name} maxLength={40} onChange={(e) => set("name", e.target.value)}
                 placeholder={t("adm.flavorName")} className={`${inputCls} w-full`} />
          <input value={d.nameEn} maxLength={40} onChange={(e) => set("nameEn", e.target.value)}
                 placeholder={t("adm.flavorNameEn")} className={`${inputCls} w-full`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TIERS.map((x) => (
          <button key={x} type="button" onClick={() => set("tier", x)}
                  className={`rounded-full border-2 p-0.5 ${d.tier === x ? "" : "border-transparent opacity-60 hover:opacity-100"}`}
                  style={d.tier === x ? { borderColor: TIER_LOOK[x].color } : undefined}>
            <TierBadge tier={x} />
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-read text-muted">
          {t("adm.flavorColor")}
          <input type="color" value={d.color} onChange={(e) => set("color", e.target.value)}
                 className="h-8 w-12 cursor-pointer rounded border border-line bg-transparent" />
        </label>
      </div>
      {editingTier && d.tier !== editingTier && (
        <p className="text-ui text-gold">{t("adm.flavorTierMoved")}</p>
      )}

      <ImagePicker supabase={supabase} value={d.image} onChange={(v) => set("image", v)} />

      <div className="flex flex-col gap-2 border-t border-line pt-2.5">
        <span className="text-read font-medium text-ink">{t("adm.quote")}</span>
        <QuoteFields th={d.th} en={d.en} onTh={(v) => set("th", v)} onEn={(v) => set("en", v)} />
        <AuthorField who={d.who} onWho={(v) => set("who", v)} memberOptions={memberOptions} />
        {!hasLine && <p className="text-ui text-gold">{t("adm.quoteNone")}</p>}
        {hasLine && !d.who && <p className="text-ui text-gold">{t("adm.quoteNeedAuthor")}</p>}
      </div>

      {sent && <p className="text-ui text-muted">{t("adm.flavorSentKept")}</p>}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy}
                  className="rounded-lg border border-line px-3 py-1.5 text-read text-muted hover:text-ink">
            {t("adm.cancel")}
          </button>
        )}
        <button type="button" onClick={() => void submit()} disabled={!ok || busy}
                className="rounded-lg border border-accent bg-accent/15 px-4 py-1.5 text-read text-accent hover:bg-accent/25 disabled:opacity-40">
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

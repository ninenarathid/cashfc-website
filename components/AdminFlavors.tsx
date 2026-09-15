"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import ImagePicker from "@/components/ImagePicker";
import AdminRareSwitch from "@/components/AdminRareSwitch";
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
  const [given, setGiven] = useState<Record<number, number>>({});
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [addKey, setAddKey] = useState(0);

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
    const { data: k } = await supabase.from("kudos")
      .select("rare_flavor_id").not("rare_flavor_id", "is", null).limit(5000);
    const n: Record<number, number> = {};
    for (const r of (k ?? []) as { rare_flavor_id: number }[]) {
      n[r.rare_flavor_id] = (n[r.rare_flavor_id] ?? 0) + 1;
    }
    setGiven(n);
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

  return (
    <div className="flex flex-col gap-4">
      {/* The switch first: whether any of this can be received at all. */}
      <AdminRareSwitch ready={ready} />
      <h3 className="font-display text-[17px] font-semibold">{t("adm.flavors")}</h3>
      <p className="text-[13px] leading-relaxed text-muted">{t("adm.flavorsWhy")}</p>

      {/* ── a new flavour ──────────────────────────────────────────────── */}
      {supabase && (
        <FlavorForm key={addKey} initial={EMPTY} supabase={supabase} memberOptions={memberOptions}
                    submitLabel={t("adm.flavorAdd")}
                    onSubmit={async (d) => {
                      if (await save(null, d)) setAddKey((k) => k + 1);
                    }} />
      )}

      {err && <p className="text-[13px] text-chili">{err}</p>}

      {/* ── by tier ────────────────────────────────────────────────────── */}
      {TIERS.map((x) => {
        const inTier = rows.filter((r) => r.tier === x);
        // Ready means it can actually be received: in use, with a line in it.
        const live = inTier.filter((r) => r.active && quotes[r.id]).length;
        return (
          <section key={x} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TierBadge tier={x} />
              <span className="text-[12.5px] text-muted">
                {t("adm.flavorTierOdds", { pct: x === "rare" ? 70 : x === "super" ? 25 : 5 })}
              </span>
            </div>
            {!live && (
              <p className="rounded-lg border border-dashed border-line px-3 py-2 text-[12.5px] text-muted">
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
                                editingTier={r.tier} sent={(given[r.id] ?? 0) > 0}
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
                        <span className="text-[14px] font-medium leading-snug text-ink">{r.name}</span>
                        <span className={`text-[12.5px] leading-snug ${r.name_en ? "text-ink/80" : "text-gold"}`}>
                          {r.name_en || t("adm.flavorNoEn")}
                        </span>
                        <span className="mt-0.5 text-[11.5px] text-muted">
                          {t("adm.flavorGiven", { n: given[r.id] ?? 0 })}
                        </span>
                      </span>
                    </div>

                    {parts ? (
                      <div className="flex flex-col gap-0.5 rounded-md bg-bg/40 px-2.5 py-2">
                        {parts.th
                          ? <p className="text-[13px] leading-snug text-ink">“{parts.th}”</p>
                          : <p className="text-[12px] text-gold">{t("adm.quoteNoTh")}</p>}
                        {parts.en
                          ? <p className="text-[12.5px] italic leading-snug text-ink/75">“{parts.en}”</p>
                          : <p className="text-[12px] text-gold">{t("adm.quoteNoEn")}</p>}
                        <span className="mt-0.5 text-[11.5px] text-gold">— {q!.author_name}</span>
                      </div>
                    ) : (
                      <p className="rounded-md border border-dashed border-gold/50 px-2.5 py-2 text-[12px] text-gold">
                        {t("adm.quoteNone")}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
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

  const inputCls = "rounded-lg border border-line bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-muted";

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
        <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
          {t("adm.flavorColor")}
          <input type="color" value={d.color} onChange={(e) => set("color", e.target.value)}
                 className="h-8 w-12 cursor-pointer rounded border border-line bg-transparent" />
        </label>
      </div>
      {editingTier && d.tier !== editingTier && (
        <p className="text-[12px] text-gold">{t("adm.flavorTierMoved")}</p>
      )}

      <ImagePicker supabase={supabase} value={d.image} onChange={(v) => set("image", v)} />

      <div className="flex flex-col gap-2 border-t border-line pt-2.5">
        <span className="text-[13px] font-medium text-ink">{t("adm.quote")}</span>
        <QuoteFields th={d.th} en={d.en} onTh={(v) => set("th", v)} onEn={(v) => set("en", v)} />
        <AuthorField who={d.who} onWho={(v) => set("who", v)} memberOptions={memberOptions} />
        {!hasLine && <p className="text-[12px] text-gold">{t("adm.quoteNone")}</p>}
        {hasLine && !d.who && <p className="text-[12px] text-gold">{t("adm.quoteNeedAuthor")}</p>}
      </div>

      {sent && <p className="text-[12px] text-muted">{t("adm.flavorSentKept")}</p>}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy}
                  className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted hover:text-ink">
            {t("adm.cancel")}
          </button>
        )}
        <button type="button" onClick={() => void submit()} disabled={!ok || busy}
                className="rounded-lg border border-accent bg-accent/15 px-4 py-1.5 text-[13px] text-accent hover:bg-accent/25 disabled:opacity-40">
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

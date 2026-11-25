"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/lib/admin";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import {
  CATEGORIES, CATEGORY_LABEL, DEFAULT_SOURCE, EXPANSIONS, GUIDE_COLUMNS, LIMITS, isCategory, isSlug, slugify,
  type Category, type GuideRow,
} from "@/lib/guides";

/**
 * The shelf: every guide that is open to read, newest expansion first.
 *
 * Admins also see the drafts, marked, and a button to start a new one, which
 * opens straight into editing.
 */
export default function GuideShelf() {
  const { t } = useLang();
  const { isAdmin, realAdmin, ready } = useAdmin();
  const [rows, setRows] = useState<GuideRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [making, setMaking] = useState(false);

  const load = useCallback(async () => {
    const sb = createClient();
    if (!sb) { setFailed(true); return; }
    const { data, error } = await sb.from("guides").select(GUIDE_COLUMNS)
      .order("sort").order("name");
    if (error) { setFailed(true); return; }
    setFailed(false);
    setRows(data as GuideRow[]);
  }, []);

  useEffect(() => { if (ready) void load(); }, [ready, realAdmin, load]);

  const order = (x: string) => {
    const i = EXPANSIONS.indexOf(x);
    return i < 0 ? EXPANSIONS.length : i;
  };
  const expansions = [...new Set((rows ?? []).map((g) => g.expansion))].sort((a, b) => order(a) - order(b));

  return (
    <main className="pt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="site-title font-display font-semibold">{t("guide.title")}</h1>
        {isAdmin && (
          <button type="button" onClick={() => setMaking(true)}
                  className="min-h-10 rounded-lg bg-accent px-3.5 text-read font-semibold text-bg">
            + {t("guide.new")}
          </button>
        )}
      </div>
      <p className="mt-1 text-read text-muted">{t("guide.seatHint")}</p>

      {rows === null && !failed && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-full" rounded="rounded-xl" />)}
        </div>
      )}
      {failed && (
        <div className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-muted">
          {t("guide.loadFail")}{" "}
          <button type="button" onClick={() => void load()} className="text-accent underline underline-offset-2">
            {t("guide.retry")}
          </button>
        </div>
      )}
      {rows && rows.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-line p-10 text-center text-muted">
          {t("guide.empty")}
        </div>
      )}

      {expansions.map((x) => (
        <section key={x} className="mt-6">
          <h2 className="font-display text-lg font-semibold">{x}</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(rows ?? [])
              .filter((g) => g.expansion === x)
              .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)
                || a.sort - b.sort || a.name.localeCompare(b.name))
              .map((g) => (
                <Link key={g.id} href={`/guides/${g.slug}`}
                      className="block rounded-xl border border-line bg-surface px-3.5 py-3 no-underline transition-colors hover:border-accent">
                  <div className="flex items-center gap-2 font-data text-meta uppercase tracking-[0.14em] text-muted">
                    {CATEGORY_LABEL[g.category]}
                    {g.patch && <span className="normal-case tracking-normal">· {g.patch}</span>}
                    {!g.published && (
                      <span className="rounded-full border border-chili/60 px-1.5 normal-case tracking-normal text-chili">
                        {t("guide.draftTag")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-title font-semibold text-ink">{g.short ?? g.name}</div>
                  {g.short && <div className="truncate text-ui text-muted">{g.name}</div>}
                </Link>
              ))}
          </div>
        </section>
      ))}

      {making && <NewGuide existing={rows ?? []} onClose={() => setMaking(false)} />}
    </main>
  );
}

const field = "min-h-10 w-full rounded-lg border border-line bg-card px-3 py-2 text-read text-ink outline-none focus:border-accent";

function NewGuide({ existing, onClose }: { existing: GuideRow[]; onClose: () => void }) {
  const { t } = useLang();
  const router = useRouter();
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState<Category>("savage");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const autoSlug = slugify(short || name);
  const s = slugTouched ? slug : autoSlug;
  const taken = existing.some((g) => g.slug === s);

  const create = async () => {
    if (!isSlug(s)) { setErr(t("guide.slugBad")); return; }
    if (taken) { setErr(t("guide.slugTaken")); return; }
    const sb = createClient();
    if (!sb) return;
    setBusy(true); setErr(null);
    const { error } = await sb.from("guides").insert({
      slug: s, name: name.trim(), short: short.trim() || null, category,
      expansion: EXPANSIONS[0], published: false,
      // The FC plays game8's plans (the owner, 2026-11-25); a guide that
      // follows another one changes it in its details.
      source_name: DEFAULT_SOURCE,
    });
    setBusy(false);
    if (error) { setErr(error.code === "23505" ? t("guide.slugTaken") : t("guide.saveFail", { msg: error.message })); return; }
    router.push(`/guides/${s}?edit=1`);
  };

  return (
    <Modal open sticky onOpenChange={(v) => { if (!v && !busy) onClose(); }} title={t("guide.new")}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <label className="flex flex-col gap-1 text-ui text-muted">{t("guide.f.short")}
          <input className={field} value={short} maxLength={LIMITS.short} placeholder="M9S" autoFocus
                 onChange={(e) => setShort(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-ui text-muted">{t("guide.f.name")}
          <input className={field} value={name} maxLength={LIMITS.name} required
                 placeholder="AAC Heavyweight M1 (Savage)"
                 onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-ui text-muted">{t("guide.f.category")}
            <select className={field} value={category}
                    onChange={(e) => isCategory(e.target.value) && setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-ui text-muted">{t("guide.f.slug")}
            <input className={`${field} font-data`} value={s} maxLength={LIMITS.slug}
                   onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }} />
          </label>
        </div>
        {err && <p role="alert" className="text-ui text-chili">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-line px-3.5 text-read text-ink">
            {t("guide.cancel")}
          </button>
          <button type="submit" disabled={busy || !name.trim() || !s}
                  className="min-h-10 rounded-lg bg-accent px-4 text-read font-semibold text-bg disabled:opacity-40">
            {t("guide.create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

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
  type Category, type DutyOption, type GuideRow,
} from "@/lib/guides";

/**
 * The shelf: every guide that is open to read, newest expansion first.
 *
 * Admins also see the drafts, marked, and a button to start a new one, which
 * opens straight into editing.
 */
/** The type's colour where a guide has no banner: the party finder's own. */
const TINT: Record<Category, string> = {
  savage: "#d19a66", extreme: "#e06c75", ultimate: "#c678dd", chaotic: "#61afef", other: "#8b93a1",
};

export default function GuideShelf({ duties = [] }: { duties?: DutyOption[] }) {
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
          {/* minmax(0, 1fr) on a phone too: the banner's ratio and its floor
              of 120px asked for 376px, more than a 360px phone has. */}
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(rows ?? [])
              .filter((g) => g.expansion === x)
              .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)
                || a.sort - b.sort || a.name.localeCompare(b.name))
              .map((g) => (
                <GuideCard key={g.id} g={g} art={duties.find((d) => d.key === g.content_key)} />
              ))}
          </div>
        </section>
      ))}

      {making && <NewGuide existing={rows ?? []} onClose={() => setMaking(false)} />}
    </main>
  );
}

/**
 * One guide on the shelf, wearing its fight's banner (the owner, 2026-11-25:
 * "เอา banner แบบ party finder มาใส่"): the game's own duty picture in its
 * own shape, darkened toward the bottom where the words sit, exactly as the
 * party finder's window draws it. A guide with no fight tied to it gets its
 * type's colour instead.
 */
function GuideCard({ g, art }: { g: GuideRow; art?: DutyOption }) {
  const { t } = useLang();
  return (
    <Link href={`/guides/${g.slug}`}
          style={{
            backgroundImage: art?.art ? `url(${art.art})` : undefined,
            backgroundPosition: art?.focus ?? "center",
            backgroundColor: `color-mix(in srgb, ${TINT[g.category]} 22%, var(--color-bg))`,
          }}
          className="group relative flex aspect-[1128/360] min-h-[120px] min-w-0 items-end overflow-hidden rounded-xl border border-line bg-cover no-underline transition-[border-color,transform] duration-150 hover:border-accent active:scale-[.99] site-dark:border-transparent">
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/5" />
      {!g.published && (
        <span className="absolute right-2.5 top-2.5 rounded-full border border-chili/70 bg-black/60 px-2 py-0.5 text-label text-white">
          {t("guide.draftTag")}
        </span>
      )}
      <span className="relative z-[1] flex min-w-0 flex-col px-3.5 pb-3 pt-6">
        <span className="font-data text-meta uppercase tracking-[0.14em] text-white/75 drop-shadow">
          {CATEGORY_LABEL[g.category]}
          {g.patch && <span className="normal-case tracking-normal"> · {g.patch}</span>}
        </span>
        <span className="text-xl font-bold leading-tight text-white drop-shadow">{g.short ?? g.name}</span>
        {g.short && <span className="truncate text-ui text-white/85 drop-shadow">{g.name}</span>}
      </span>
    </Link>
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

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/ConfirmDialog";
import FocusPicture from "@/components/guides/FocusPicture";
import {
  CATEGORIES, CATEGORY_LABEL, EXPANSIONS, GUIDE_COLUMNS, LIMITS, RING_DEFAULT, SEATS,
  STEP_COLUMNS, cleanStep, fitPicture, isCategory, isSlug, newPicturePath, pictureUrl, seatColor,
  togglePoint, withSeat, type DutyOption, type GuideRow, type Point, type Seat, type StepRow,
} from "@/lib/guides";

/**
 * Making a guide, in the page that shows it.
 *
 * The owner's word, 2026-11-25: he makes them himself, in the site. So the
 * whole of it is: a picture per step (any picture — a RaidPlan, the game's own
 * strategy board, a screenshot), then for each seat a tap where they stand and
 * a line. The seat bar above is the same one readers use, so what is being
 * placed is exactly what that seat will see.
 *
 * Steps save themselves a moment after the last change: tapping eight seats'
 * spots onto a picture is a dozen small edits, and a Save button after each is
 * how one of them gets lost. The guide's own details are a form with a Save,
 * because changing its address moves the page.
 */
export default function GuideEditor({
  guide, steps, seat, onSeat, onGuide, onSteps, duties = [],
}: {
  guide: GuideRow;
  /** The party finder's fights, for which one this guide is for. */
  duties?: DutyOption[];
  steps: StepRow[];
  seat: Seat;
  onSeat: (s: Seat) => void;
  onGuide: (g: GuideRow) => void;
  onSteps: (fn: (prev: StepRow[]) => StepRow[]) => void;
}) {
  const { t } = useLang();
  const [userId, setUserId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<StepRow | null>(null);
  const ordered = [...steps].sort((a, b) => a.sort - b.sort || a.id - b.id);

  useEffect(() => {
    void createClient()?.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const add = async () => {
    const sb = createClient();
    if (!sb) return;
    setAdding(true); setErr(null);
    const last = ordered[ordered.length - 1];
    const { data, error } = await sb.from("guide_steps").insert({
      guide_id: guide.id,
      sort: (last?.sort ?? 0) + 1,
      phase: null,
      // A new step carries on the big mechanic of the one before it: the
      // usual reason to add a step is the next part of the same thing.
      mech: last?.mech ?? null,
      name: t("guide.s.name"),
      ring: last?.ring ?? RING_DEFAULT,
    }).select(STEP_COLUMNS).single();
    setAdding(false);
    if (error || !data) { setErr(t("guide.saveFail", { msg: error?.message ?? "?" })); return; }
    const row = cleanStep(data as StepRow);
    onSteps((prev) => [...prev, row]);
  };

  const move = async (id: number, by: -1 | 1) => {
    const i = ordered.findIndex((s) => s.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    const next = [...ordered];
    [next[i], next[j]] = [next[j], next[i]];
    const renumbered = next.map((s, k) => ({ ...s, sort: k + 1 }));
    onSteps(() => renumbered);
    const sb = createClient();
    if (!sb) return;
    const changed = renumbered.filter((s) => ordered.find((o) => o.id === s.id)?.sort !== s.sort);
    const results = await Promise.all(changed.map((s) =>
      sb.from("guide_steps").update({ sort: s.sort }).eq("id", s.id)));
    const bad = results.find((r) => r.error);
    if (bad?.error) setErr(t("guide.saveFail", { msg: bad.error.message }));
  };

  const remove = async (step: StepRow) => {
    setAsk(null);
    const sb = createClient();
    if (!sb) return;
    const { error } = await sb.from("guide_steps").delete().eq("id", step.id);
    if (error) { setErr(t("guide.saveFail", { msg: error.message })); return; }
    onSteps((prev) => prev.filter((s) => s.id !== step.id));
    if (step.picture) void sb.storage.from("guides").remove([step.picture]);
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <GuideInfo guide={guide} onGuide={onGuide} duties={duties} />

      {ordered.map((s, i) => (
        <StepEditor key={s.id} step={s} n={i + 1} seat={seat} onSeat={onSeat} userId={userId}
                    first={i === 0} last={i === ordered.length - 1}
                    onSaved={(row) => onSteps((prev) => prev.map((x) => (x.id === row.id ? { ...row, sort: x.sort } : x)))}
                    onMove={(by) => void move(s.id, by)}
                    onDelete={() => setAsk(s)} />
      ))}

      {err && <p role="alert" className="text-read text-chili">{err}</p>}

      <button type="button" onClick={() => void add()} disabled={adding}
              className="min-h-12 rounded-xl border border-dashed border-accent/60 text-read font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50">
        + {t("guide.addStep")}
      </button>

      {ask && (
        <ConfirmDialog message={t("guide.s.deleteAsk")} confirmLabel={t("guide.s.delete")} danger
                       onConfirm={() => void remove(ask)} onCancel={() => setAsk(null)} />
      )}
    </div>
  );
}

/* ── the guide's own details ─────────────────────────────────────────────── */

const field = "min-h-10 w-full rounded-lg border border-line bg-card px-3 py-2 text-read text-ink outline-none focus:border-accent";
const labelCls = "flex flex-col gap-1 text-ui text-muted";

function GuideInfo(
  { guide, onGuide, duties }: { guide: GuideRow; onGuide: (g: GuideRow) => void; duties: DutyOption[] },
) {
  const { t } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(!guide.published);
  const [d, setD] = useState(guide);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const dirty = JSON.stringify(d) !== JSON.stringify(guide);
  const set = <K extends keyof GuideRow>(k: K, v: GuideRow[K]) => { setD((x) => ({ ...x, [k]: v })); setMsg(null); };
  const opt = (s: string) => (s.trim() ? s.trim() : null);

  const save = async () => {
    if (!isSlug(d.slug)) { setMsg({ ok: false, text: t("guide.slugBad") }); return; }
    const sb = createClient();
    if (!sb) return;
    setBusy(true);
    const { data, error } = await sb.from("guides").update({
      slug: d.slug, name: d.name.trim(), short: opt(d.short ?? ""), expansion: d.expansion,
      category: d.category, patch: opt(d.patch ?? ""), source_name: opt(d.source_name ?? ""),
      source_url: opt(d.source_url ?? ""), note: opt(d.note ?? ""), published: d.published,
      content_key: d.content_key || null,
    }).eq("id", guide.id).select(GUIDE_COLUMNS).single();
    setBusy(false);
    if (error || !data) {
      setMsg({ ok: false, text: error?.code === "23505" ? t("guide.slugTaken") : t("guide.saveFail", { msg: error?.message ?? "?" }) });
      return;
    }
    const g = data as GuideRow;
    setD(g); onGuide(g);
    setMsg({ ok: true, text: t("guide.saved") });
    if (g.slug !== guide.slug) router.replace(`/guides/${g.slug}`);
  };

  const remove = async () => {
    setAskDelete(false);
    const sb = createClient();
    if (!sb) return;
    const pics = await sb.from("guide_steps").select("picture").eq("guide_id", guide.id);
    const { error } = await sb.from("guides").delete().eq("id", guide.id);
    if (error) { setMsg({ ok: false, text: t("guide.saveFail", { msg: error.message }) }); return; }
    const paths = (pics.data ?? []).map((r) => (r as { picture: string | null }).picture).filter((p): p is string => !!p);
    if (paths.length) await sb.storage.from("guides").remove(paths);
    router.push("/guides");
  };

  return (
    <section className="rounded-xl border border-line bg-surface">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
              className="flex min-h-11 w-full items-center justify-between px-3.5 text-left text-read font-semibold text-ink">
        {t("guide.info")}
        <span aria-hidden className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="grid gap-3 border-t border-line p-3.5 sm:grid-cols-2">
          <label className={labelCls}>{t("guide.f.name")}
            <input className={field} value={d.name} maxLength={LIMITS.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className={labelCls}>{t("guide.f.short")}
            <input className={field} value={d.short ?? ""} maxLength={LIMITS.short} onChange={(e) => set("short", e.target.value)} />
          </label>
          <label className={labelCls}>{t("guide.f.slug")}
            <input className={`${field} font-data`} value={d.slug} maxLength={LIMITS.slug}
                   onChange={(e) => set("slug", e.target.value.toLowerCase())} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>{t("guide.f.category")}
              <select className={field} value={d.category}
                      onChange={(e) => isCategory(e.target.value) && set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </label>
            <label className={labelCls}>{t("guide.f.patch")}
              <input className={field} value={d.patch ?? ""} maxLength={12} onChange={(e) => set("patch", e.target.value)} />
            </label>
          </div>
          <label className={labelCls}>{t("guide.f.expansion")}
            <select className={field} value={d.expansion} onChange={(e) => set("expansion", e.target.value)}>
              {[...new Set([d.expansion, ...EXPANSIONS])].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className={`${labelCls} sm:col-span-2`}>{t("guide.f.duty")}
            <select className={field} value={d.content_key ?? ""}
                    onChange={(e) => set("content_key", e.target.value || null)}>
              <option value="">{t("guide.f.noDuty")}</option>
              {d.content_key && !duties.some((x) => x.key === d.content_key) && (
                <option value={d.content_key}>{d.content_key}</option>
              )}
              {duties.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
          </label>
          <label className={labelCls}>{t("guide.f.sourceName")}
            <input className={field} value={d.source_name ?? ""} maxLength={LIMITS.sourceName}
                   onChange={(e) => set("source_name", e.target.value)} />
          </label>
          <label className={`${labelCls} sm:col-span-2`}>{t("guide.f.sourceUrl")}
            <input className={field} type="url" inputMode="url" value={d.source_url ?? ""} maxLength={LIMITS.sourceUrl}
                   onChange={(e) => set("source_url", e.target.value)} />
          </label>
          <label className={`${labelCls} sm:col-span-2`}>{t("guide.f.note")}
            <textarea className={`${field} min-h-20`} value={d.note ?? ""} maxLength={LIMITS.guideNote}
                      onChange={(e) => set("note", e.target.value)} />
          </label>
          <label className="flex min-h-11 items-center gap-2.5 text-read text-ink sm:col-span-2">
            <input type="checkbox" className="size-5 accent-[var(--color-accent)]" checked={d.published}
                   onChange={(e) => set("published", e.target.checked)} />
            {t("guide.f.published")}
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="button" onClick={() => void save()} disabled={!dirty || busy || !d.name.trim()}
                    className="min-h-10 rounded-lg bg-accent px-4 text-read font-semibold text-bg disabled:opacity-40">
              {busy ? t("guide.saving") : t("guide.save")}
            </button>
            {msg && <span role="status" className={`text-ui ${msg.ok ? "text-jade" : "text-chili"}`}>{msg.text}</span>}
            <button type="button" onClick={() => setAskDelete(true)}
                    className="ml-auto min-h-10 rounded-lg border border-chili/50 px-3 text-ui text-chili hover:bg-chili/10">
              {t("guide.deleteGuide")}
            </button>
          </div>
        </div>
      )}
      {askDelete && (
        <ConfirmDialog message={t("guide.deleteGuideAsk", { name: guide.short ?? guide.name })}
                       confirmLabel={t("guide.deleteGuide")} danger
                       onConfirm={() => void remove()} onCancel={() => setAskDelete(false)} />
      )}
    </section>
  );
}

/* ── one step ────────────────────────────────────────────────────────────── */

type Status = "idle" | "dirty" | "saving" | "saved" | "error";

/** Turns a picked file into a WebP no larger than PICTURE_MAX, with its size. */
async function shrink(file: File, max?: number): Promise<{ blob: Blob; w: number; h: number; ext: "webp" | "jpg" }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => no(new Error("not-image"));
      i.src = url;
    });
    const { w, h } = fitPicture(img.naturalWidth, img.naturalHeight, max);
    if (!w || !h) throw new Error("not-image");
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    const as = (type: string, q: number) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, q));
    // WebP where the browser can write it; an older Safari hands back a PNG.
    const webp = await as("image/webp", 0.88);
    if (webp && webp.type === "image/webp") return { blob: webp, w, h, ext: "webp" };
    const jpg = await as("image/jpeg", 0.9);
    if (!jpg) throw new Error("no picture");
    return { blob: jpg, w, h, ext: "jpg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function StepEditor({
  step, n, seat, onSeat, userId, first, last, onSaved, onMove, onDelete,
}: {
  step: StepRow;
  n: number;
  seat: Seat;
  onSeat: (s: Seat) => void;
  userId: string | null;
  first: boolean;
  last: boolean;
  onSaved: (row: StepRow) => void;
  onMove: (by: -1 | 1) => void;
  onDelete: () => void;
}) {
  const { t } = useLang();
  const [d, setD] = useState(step);
  const [status, setStatus] = useState<Status>("idle");
  const [why, setWhy] = useState("");
  const [upErr, setUpErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const refFile = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(d);
  latest.current = d;

  const spot = d.spots[seat] ?? {};
  const points = spot.at ?? [];
  const color = seatColor(seat);
  const placed = SEATS.filter((s) => d.spots[s]?.at?.length).length;

  const save = async (row: StepRow) => {
    if (!row.name.trim()) { setWhy(t("guide.s.name")); setStatus("error"); return; }
    const sb = createClient();
    if (!sb) return;
    setStatus("saving");
    const { data, error } = await sb.from("guide_steps").update({
      phase: row.phase?.trim() || null, mech: row.mech?.trim() || null,
      name: row.name.trim(), note: row.note?.trim() || null,
      picture: row.picture, pic_w: row.pic_w, pic_h: row.pic_h, ring: row.ring, spots: row.spots,
      refs: row.refs.map((r) => ({ path: r.path, w: r.w, h: r.h, ...(r.say?.trim() ? { say: r.say.trim() } : {}) })),
    }).eq("id", row.id).select(STEP_COLUMNS).single();
    if (error || !data) { setWhy(error?.message ?? "?"); setStatus("error"); return; }
    // Only "saved" if nothing changed while it was on its way.
    if (latest.current === row) setStatus("saved");
    onSaved(cleanStep(data as StepRow));
  };

  const change = (next: StepRow) => {
    setD(next);
    setStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 700);
  };

  // Whatever is waiting goes now if the editor closes.
  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); void save(latest.current); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const place = (at: Point) => {
    // A tap inside a circle already there takes it away.
    const near = Math.max(3, d.ring);
    change({ ...d, spots: withSeat(d.spots, seat, { ...spot, at: togglePoint(points, at, near) }) });
  };

  const pick = async (file: File | undefined) => {
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) { setUpErr(t("guide.s.notPicture")); return; }
    const sb = createClient();
    if (!sb) return;
    setUploading(true); setUpErr(null);
    try {
      const out = await shrink(file);
      const path = newPicturePath(userId, out.ext);
      const { error } = await sb.storage.from("guides").upload(path, out.blob, {
        contentType: out.ext === "webp" ? "image/webp" : "image/jpeg", upsert: false, cacheControl: "31536000",
      });
      if (error) throw error;
      const old = d.picture;
      const next = { ...d, picture: path, pic_w: out.w, pic_h: out.h };
      if (timer.current) clearTimeout(timer.current);
      setD(next);
      await save(next);
      if (old && old !== path) void sb.storage.from("guides").remove([old]);
    } catch (e) {
      const m = (e as Error).message;
      setUpErr(m === "not-image" ? t("guide.s.notPicture") : t("guide.s.uploadFail", { msg: m }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /** A reference picture: up to 1000 wide is plenty for something shown small. */
  const pickRef = async (file: File | undefined) => {
    if (!file || !userId || d.refs.length >= LIMITS.refs) return;
    if (!file.type.startsWith("image/")) { setUpErr(t("guide.s.notPicture")); return; }
    const sb = createClient();
    if (!sb) return;
    setUploading(true); setUpErr(null);
    try {
      const out = await shrink(file, 1000);
      const path = newPicturePath(userId, out.ext);
      const { error } = await sb.storage.from("guides").upload(path, out.blob, {
        contentType: out.ext === "webp" ? "image/webp" : "image/jpeg", upsert: false, cacheControl: "31536000",
      });
      if (error) throw error;
      change({ ...latest.current, refs: [...latest.current.refs, { path, w: out.w, h: out.h }] });
    } catch (e) {
      const m = (e as Error).message;
      setUpErr(m === "not-image" ? t("guide.s.notPicture") : t("guide.s.uploadFail", { msg: m }));
    } finally {
      setUploading(false);
      if (refFile.current) refFile.current.value = "";
    }
  };

  const dropRef = (i: number) => {
    const gone = d.refs[i];
    change({ ...d, refs: d.refs.filter((_, k) => k !== i) });
    if (gone) void createClient()?.storage.from("guides").remove([gone.path]);
  };

  const icon = "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line text-title text-ink hover:border-accent hover:text-accent disabled:opacity-30";

  return (
    <article className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-center font-data text-meta text-muted">{n}</span>
        <input className={`${field} font-semibold ${!d.name.trim() ? "border-chili" : ""}`} value={d.name}
               maxLength={LIMITS.name} aria-label={t("guide.s.name")} placeholder={t("guide.s.name")}
               onChange={(e) => change({ ...d, name: e.target.value })} />
      </div>
      <div className="flex items-center gap-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <input className={`${field} text-ui`} value={d.phase ?? ""} maxLength={LIMITS.phase}
                 aria-label={t("guide.s.phase")} placeholder={t("guide.s.phase")}
                 onChange={(e) => change({ ...d, phase: e.target.value })} />
          <input className={`${field} text-ui`} value={d.mech ?? ""} maxLength={LIMITS.mech}
                 aria-label={t("guide.s.mech")} placeholder={t("guide.s.mech")}
                 onChange={(e) => change({ ...d, mech: e.target.value })} />
        </div>
        <button type="button" className={icon} disabled={first} onClick={() => onMove(-1)}
                aria-label={t("guide.s.up")} title={t("guide.s.up")}>↑</button>
        <button type="button" className={icon} disabled={last} onClick={() => onMove(1)}
                aria-label={t("guide.s.down")} title={t("guide.s.down")}>↓</button>
        <button type="button" className={`${icon} hover:!border-chili hover:!text-chili`} onClick={onDelete}
                aria-label={t("guide.s.delete")} title={t("guide.s.delete")}>✕</button>
      </div>

      <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-4">
      <div className="flex flex-col gap-2.5">
      {d.picture ? (
        <div className="relative">
          <FocusPicture picture={d.picture} w={d.pic_w} h={d.pic_h} points={points}
                        ring={d.ring} color={color} alt={d.name} onPoint={place}>
            {/* The other seats, small, so the spots are placed against each other. */}
            {SEATS.filter((s) => s !== seat).flatMap((s) => (d.spots[s]?.at ?? []).map(([x, y], i) => (
              <span key={`${s}${i}`}
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded px-1 font-data text-label font-bold leading-tight text-white opacity-80 shadow"
                    style={{ left: `${x}%`, top: `${y}%`, backgroundColor: seatColor(s) }}>{s}</span>
            )))}
          </FocusPicture>
        </div>
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-line text-ui text-muted">
          {t("guide.s.noPicture")}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
               onChange={(e) => void pick(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || !userId}
                className="min-h-10 rounded-lg border border-line px-3 text-read text-ink hover:border-accent hover:text-accent disabled:opacity-50">
          {uploading ? t("guide.s.uploading") : d.picture ? t("guide.s.change") : t("guide.s.pick")}
        </button>
        {d.picture && (
          <label className="flex min-h-10 flex-1 items-center gap-2 text-ui text-muted">
            <span className="shrink-0">{t("guide.s.ring")}</span>
            <input type="range" min={LIMITS.ringMin} max={LIMITS.ringMax} value={d.ring}
                   onChange={(e) => change({ ...d, ring: Number(e.target.value) })}
                   className="min-w-0 flex-1 accent-[var(--color-accent)]" />
          </label>
        )}
      </div>
      {upErr && <p role="alert" className="text-ui text-chili">{upErr}</p>}
      </div>

      <div className="flex flex-col gap-2.5">

      {d.picture && (
        <p className="flex flex-wrap justify-between gap-x-3 text-read text-muted">
          <span>{t("guide.s.tap", { seat })}</span>
          <span className="text-ink/80">{t("guide.s.placed", { n: placed })}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-1" role="group" aria-label={t("guide.seat")}>
        {SEATS.map((s) => {
          const has = !!d.spots[s]?.at?.length || !!d.spots[s]?.say;
          const on = s === seat;
          return (
            <button key={s} type="button" onClick={() => onSeat(s)} aria-pressed={on}
                    className={`min-h-11 min-w-11 rounded-md border px-2 font-data text-meta font-semibold sm:min-h-9 ${on ? "text-white" : has ? "border-line text-ink" : "border-dashed border-line text-muted"}`}
                    style={on ? { backgroundColor: seatColor(s), borderColor: seatColor(s) } : undefined}>
              {s}{has && !on ? " ✓" : ""}
            </button>
          );
        })}
      </div>
      <label className={labelCls}>
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
          {t("guide.s.say", { seat })}
        </span>
        <input className={field} value={spot.say ?? ""} maxLength={LIMITS.say}
               onChange={(e) => change({ ...d, spots: withSeat(d.spots, seat, { ...spot, say: e.target.value }) })} />
      </label>
      <label className={labelCls}>{t("guide.s.note")}
        <textarea className={`${field} min-h-16`} value={d.note ?? ""} maxLength={LIMITS.stepNote}
                  onChange={(e) => change({ ...d, note: e.target.value })} />
      </label>

      {/* What to watch for in the game, each with a line. */}
      <div className="flex flex-col gap-2">
        <span className="text-ui text-muted">{t("guide.s.refs")}</span>
        {d.refs.map((r, i) => (
          <div key={r.path} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pictureUrl(r.path) ?? undefined} alt="" width={r.w} height={r.h}
                 className="h-12 w-20 shrink-0 rounded-md border border-line bg-black object-cover" />
            <input className={field} value={r.say ?? ""} maxLength={LIMITS.refSay}
                   aria-label={t("guide.s.refSay")} placeholder={t("guide.s.refSay")}
                   onChange={(e) => change({ ...d, refs: d.refs.map((x, k) => (k === i ? { ...x, say: e.target.value } : x)) })} />
            <button type="button" className={`${icon} hover:!border-chili hover:!text-chili`}
                    onClick={() => dropRef(i)} aria-label={t("guide.s.removeRef")} title={t("guide.s.removeRef")}>✕</button>
          </div>
        ))}
        <input ref={refFile} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
               onChange={(e) => void pickRef(e.target.files?.[0])} />
        {d.refs.length < LIMITS.refs && (
          <button type="button" onClick={() => refFile.current?.click()} disabled={uploading || !userId}
                  className="min-h-10 self-start rounded-lg border border-dashed border-line px-3 text-read text-ink hover:border-accent hover:text-accent disabled:opacity-50">
            + {t("guide.s.addRef")}
          </button>
        )}
      </div>
      <div className="min-h-5 text-right text-meta" role="status">
        {status === "dirty" && <span className="text-muted">{t("guide.unsaved")}</span>}
        {status === "saving" && <span className="text-muted">{t("guide.saving")}</span>}
        {status === "saved" && <span className="text-jade">{t("guide.saved")}</span>}
        {status === "error" && <span className="text-chili">{t("guide.saveFail", { msg: why })}</span>}
      </div>
      </div>
      </div>
    </article>
  );
}

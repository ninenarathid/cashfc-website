"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/lib/admin";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import Skeleton from "@/components/ui/Skeleton";
import FocusPicture from "@/components/guides/FocusPicture";
import SeatBar, { useSeat } from "@/components/guides/SeatBar";
import PartyIcon from "@/components/party/PartyIcon";
import ImageLightbox from "@/components/ui/ImageLightbox";
import PictureViewer from "@/components/guides/PictureViewer";
import {
  CATEGORY_LABEL, GUIDE_COLUMNS, STEP_COLUMNS, cleanStep, inPhases, partyFor, pictureUrl, seatColor,
  type Block, type DutyOption, type GuideRow, type Seat, type StepRow,
} from "@/lib/guides";

/** The editor is admins' only, so nobody else downloads it. */
const GuideEditor = dynamic(() => import("@/components/guides/GuideEditor"), {
  ssr: false,
  loading: () => <Skeleton className="mt-4 h-64 w-full" rounded="rounded-xl" />,
});

type Load =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error" }
  | { kind: "ok"; guide: GuideRow; steps: StepRow[] };

/**
 * One fight, read by your own seat.
 *
 * Pick a seat once at the top, and every picture below lights up only where
 * that seat stands, with that seat's line under it. The picture is the same
 * for everybody; a tap on it shows the whole of it, undimmed, for the moment
 * somebody wants to see where the rest of the party is going.
 */
export default function GuideScreen({ slug, duties = [] }: { slug: string; duties?: DutyOption[] }) {
  const { t } = useLang();
  const { isAdmin, realAdmin, ready } = useAdmin();
  const [seat, setSeat] = useSeat();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [editing, setEditing] = useState(false);

  const fetchGuide = useCallback(async () => {
    const sb = createClient();
    if (!sb) { setLoad({ kind: "error" }); return; }
    const g = await sb.from("guides").select(GUIDE_COLUMNS).eq("slug", slug).maybeSingle();
    if (g.error) { setLoad({ kind: "error" }); return; }
    if (!g.data) { setLoad({ kind: "missing" }); return; }
    const guide = g.data as GuideRow;
    const s = await sb.from("guide_steps").select(STEP_COLUMNS)
      .eq("guide_id", guide.id).order("sort").order("id");
    if (s.error) { setLoad({ kind: "error" }); return; }
    setLoad({ kind: "ok", guide, steps: (s.data as StepRow[]).map(cleanStep) });
  }, [slug]);

  // Again once the session is known: a draft is only handed to an admin.
  useEffect(() => { if (ready) void fetchGuide(); }, [ready, realAdmin, fetchGuide]);

  // A guide just made on the shelf opens straight into editing.
  useEffect(() => {
    if (isAdmin && new URLSearchParams(window.location.search).get("edit") === "1") setEditing(true);
  }, [isAdmin]);

  if (load.kind === "loading") {
    return (
      <main className="pt-7">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <Skeleton className="mt-5 h-[46px] w-full max-w-xl" rounded="rounded-lg" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Skeleton className="aspect-square w-full" rounded="rounded-xl" />
          <Skeleton className="hidden aspect-square w-full sm:block" rounded="rounded-xl" />
        </div>
      </main>
    );
  }

  if (load.kind !== "ok") {
    return (
      <main className="pt-7">
        <BackLink />
        <div className="mt-5 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
          {load.kind === "missing" ? t("guide.notFound") : t("guide.loadFail")}
          {load.kind === "error" && (
            <div className="mt-3">
              <button type="button" onClick={() => { setLoad({ kind: "loading" }); void fetchGuide(); }}
                      className="rounded-lg border border-line px-3 py-1.5 text-read text-ink hover:border-accent hover:text-accent">
                {t("guide.retry")}
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  const { guide, steps } = load;
  // Functional, because several steps save themselves at once while editing.
  const setGuide = (g: GuideRow) => setLoad((l) => (l.kind === "ok" ? { ...l, guide: g } : l));
  const setSteps = (fn: (prev: StepRow[]) => StepRow[]) =>
    setLoad((l) => (l.kind === "ok" ? { ...l, steps: fn(l.steps) } : l));

  return (
    <main className="pt-7">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-3xl font-bold">{guide.short ?? guide.name}</h1>
            {guide.short && <span className="text-title text-muted">{guide.name}</span>}
          </div>
          <div className="mt-0.5 text-ui text-muted">
            {[guide.expansion, CATEGORY_LABEL[guide.category], guide.patch && `patch ${guide.patch}`]
              .filter(Boolean).join(" · ")}
          </div>
          {guide.source_name && <Source name={guide.source_name} url={guide.source_url} />}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
        {/* Straight to the party finder's form with this fight chosen. */}
        {guide.content_key && !editing && (
          <Link href={partyFor(guide.content_key)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-accent bg-accent/15 px-3.5 text-read font-semibold text-accent no-underline hover:bg-accent/25 site-dark:border-transparent site-dark:bg-gold site-dark:text-bg site-dark:hover:bg-ink">
            <PartyIcon size={16} />
            {t("guide.makeParty")}
          </Link>
        )}
        {isAdmin && (
          <button type="button" onClick={() => setEditing((v) => !v)} aria-pressed={editing}
                  className={`min-h-10 shrink-0 rounded-lg border px-3.5 text-read font-semibold transition-colors ${editing ? "border-accent bg-accent text-bg" : "border-line text-ink hover:border-accent hover:text-accent"}`}>
            {editing ? t("guide.doneEdit") : `✎ ${t("guide.edit")}`}
          </button>
        )}
        </div>
      </div>

      {!guide.published && (
        <p className="mt-3 rounded-xl border border-chili/50 bg-chili/10 px-3.5 py-2 text-read text-ink/90">
          {t("guide.draftTitle")}
        </p>
      )}
      {guide.note && !editing && (
        <p className="mt-3 whitespace-pre-line text-read leading-relaxed text-ink/90">{guide.note}</p>
      )}

      {/* While editing, each step has its own seat buttons beside its picture,
          with a tick on the seats already placed; two seat bars would be one too many. */}
      {!(editing && isAdmin) && (
        <>
          <p className="mb-2 mt-4 text-ui text-muted">{t("guide.seatHint")}</p>
          <SeatBar seat={seat} onSeat={setSeat} />
        </>
      )}

      {editing && isAdmin ? (
        <GuideEditor guide={guide} steps={steps} seat={seat} onSeat={setSeat} duties={duties}
                     onGuide={setGuide} onSteps={setSteps} />
      ) : (
        <Steps steps={steps} seat={seat} />
      )}
    </main>
  );
}

function BackLink() {
  const { t } = useLang();
  return (
    <Link href="/guides"
          className="mb-3 inline-flex items-center gap-1.5 text-read text-muted no-underline transition-colors hover:text-accent">
      <span aria-hidden>←</span> {t("guide.all")}
    </Link>
  );
}

/** "Strategy from <link>", with the link where the language puts it. */
function Source({ name, url }: { name: string; url: string | null }) {
  const { t } = useLang();
  const [before, after = ""] = t("guide.source", { name: "\u0000" }).split("\u0000");
  return (
    <p className="mt-1 text-ui text-muted">
      {before}
      {url && /^https:\/\//.test(url) ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
           className="text-accent underline decoration-accent/40 underline-offset-2">{name}</a>
      ) : name}
      {after}
    </p>
  );
}

function Steps({ steps, seat }: { steps: StepRow[]; seat: Seat }) {
  const { t } = useLang();
  const [view, setView] = useState<number | null>(null);
  if (steps.length === 0) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-line p-10 text-center text-muted">
        {t("guide.noSteps")}
      </div>
    );
  }
  // One number per thing on the page: a step on its own, or a big mechanic
  // (whose parts are numbered inside it).
  let n = 0;
  const groups = inPhases(steps);
  // Every picture in reading order, for the large viewer's ‹ ›.
  const pictured = groups.flatMap((g) => g.blocks.flatMap((b) => b.steps)).filter((s) => s.picture);
  const open = (id: number) => setView(Math.max(0, pictured.findIndex((s) => s.id === id)));
  return (
    <div className="mt-4 flex flex-col gap-6">
      {view !== null && (
        <PictureViewer steps={pictured} at={view} seat={seat} onMove={setView} onClose={() => setView(null)} />
      )}
      {groups.map((group, gi) => (
        <section key={gi}>
          {group.phase && (
            <h2 className="mb-2.5 font-display text-lg font-semibold">{group.phase}</h2>
          )}
          {/* minmax(0, 1fr) on a phone too: a lone column of auto width grew to
              the pictures' drawn width (1200px) and took the page with it. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.blocks.map((b) => (b.mech
              ? <MechBox key={`m${b.steps[0].id}`} block={b} seat={seat} n={++n} onOpen={open} />
              : <StepCard key={b.steps[0].id} step={b.steps[0]} seat={seat} label={String(++n)} onOpen={open} />))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * A big mechanic: one box, its parts in order.
 *
 * The owner, 2026-11-25: some mechanics are a long run of small ones in the
 * same place, and they read as one thing. Across the page's width on a wide
 * screen; on a phone the parts sit in a row to swipe through, the next one
 * showing at the edge so it is plain there is more.
 */
function MechBox(
  { block, seat, n, onOpen }: { block: Block; seat: Seat; n: number; onOpen: (id: number) => void },
) {
  const { t } = useLang();
  const k = block.steps.length;
  return (
    <section className="min-w-0 rounded-xl border border-accent/35 bg-surface/60 p-2.5 sm:col-span-2 sm:p-3">
      <h3 className="flex flex-wrap items-baseline gap-x-2 px-0.5">
        <span className="font-data text-meta text-muted">{n}</span>
        <span className="text-head font-semibold text-ink">{block.mech}</span>
        <span className="text-ui text-muted">{t("guide.parts", { n: k })}</span>
      </h3>
      {k > 1 && <p className="mt-0.5 px-0.5 text-meta text-muted sm:hidden">{t("guide.swipe")}</p>}
      <ol className="-mx-2.5 mt-2 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-2.5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {block.steps.map((s, i) => (
          <li key={s.id} className={`${k > 1 ? "w-[86%]" : "w-full"} shrink-0 snap-start sm:w-auto`}>
            <StepCard step={s} seat={seat} label={k > 1 ? `${i + 1}/${k}` : ""} flat onOpen={onOpen} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepCard(
  { step, seat, label, flat = false, onOpen }:
  { step: StepRow; seat: Seat; label: string; flat?: boolean; onOpen: (id: number) => void },
) {
  const { t } = useLang();
  // The ring can be switched off to see the picture as it is (the owner,
  // 2026-11-25), per picture, and only on a picture that has one.
  const [ringOff, setRingOff] = useState(false);
  const [openRef, setOpenRef] = useState<number | null>(null);
  const spot = step.spots[seat];
  const points = spot?.at ?? [];
  const color = seatColor(seat);
  const refUrls = step.refs.map((r) => pictureUrl(r.path)).filter((u): u is string => !!u);

  return (
    <article className={`min-w-0 ${flat ? "h-full rounded-lg border border-line bg-bg/40 p-2" : "rounded-xl border border-line bg-surface p-2.5 sm:p-3"}`}>
      <h3 className="mb-2 flex items-baseline gap-2 px-0.5">
        {label && <span className="font-data text-meta text-muted">{label}</span>}
        <span className="text-title font-semibold text-ink">{step.name}</span>
      </h3>

      {/* A tap opens it large (PictureViewer), still lit on your spot, with
          the whole picture one more tap away. */}
      {step.picture && (
        <div className="relative">
          <button type="button" onClick={() => onOpen(step.id)} aria-label={t("guide.enlarge")}
                  className="group relative block w-full cursor-zoom-in rounded-lg text-left">
            <FocusPicture picture={step.picture} w={step.pic_w} h={step.pic_h} points={points}
                          ring={step.ring} color={color} focus={!ringOff} alt={step.name} />
            <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-line bg-bg/80 px-3 py-1.5 text-ui text-ink/90 backdrop-blur-sm transition-colors group-hover:border-accent">
              <span aria-hidden>⤢</span>
              {t("guide.enlarge")}
            </span>
          </button>
          {/* Beside the enlarge button rather than in it: a button may not
              hold another, and the two do different things. */}
          {points.length > 0 && (
            <button type="button" onClick={() => setRingOff((v) => !v)} aria-pressed={!ringOff}
                    className="absolute bottom-2 left-2 inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-bg/80 px-3 py-1.5 text-ui text-ink/90 backdrop-blur-sm transition-colors hover:border-accent">
              <span aria-hidden className="inline-block size-2.5 rounded-full border-2"
                    style={{ borderColor: color, backgroundColor: ringOff ? "transparent" : color }} />
              {ringOff ? t("guide.ringOn") : t("guide.ringOff")}
            </button>
          )}
        </div>
      )}

      {/* A step with no picture is words only (a raid-wide, a rule of thumb):
          it says nothing about a spot it never had. */}
      {spot?.say ? (
        <p className="mt-2.5 flex items-start gap-2 px-0.5 text-lead font-semibold leading-snug text-ink">
          <span className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-data text-label font-bold text-white"
                style={{ backgroundColor: color }}>{seat}</span>
          <span className="min-w-0 break-words">{spot.say}</span>
        </p>
      ) : points.length === 0 && step.picture ? (
        <p className="mt-2.5 px-0.5 text-ui text-muted">{t("guide.noSpot", { seat })}</p>
      ) : null}
      {step.note && (
        <p className="mt-1.5 whitespace-pre-line px-0.5 text-read leading-relaxed text-muted">{step.note}</p>
      )}

      {/* What to watch for in the game: the boss's pose, an object at the
          edge. Small, under the plan, and a tap opens it large. */}
      {step.refs.length > 0 && (
        <div className="mt-2.5 px-0.5">
          <div className="mb-1 text-meta font-semibold text-muted">{t("guide.watch")}</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {step.refs.map((r, i) => (
              <button key={i} type="button" onClick={() => setOpenRef(i)}
                      className="w-28 shrink-0 text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pictureUrl(r.path) ?? undefined} alt={r.say ?? t("guide.watch")}
                     width={r.w} height={r.h} loading="lazy" decoding="async"
                     className="aspect-video w-full rounded-md border border-line bg-black object-cover" />
                {r.say && <span className="mt-1 block text-meta leading-snug text-ink/85">{r.say}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {openRef !== null && refUrls.length > 0 && (
        <ImageLightbox images={refUrls} at={Math.min(openRef, refUrls.length - 1)}
                       onMove={setOpenRef} onClose={() => setOpenRef(null)} />
      )}
    </article>
  );
}

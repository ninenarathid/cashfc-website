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
import {
  CATEGORY_LABEL, GUIDE_COLUMNS, STEP_COLUMNS, cleanStep, inPhases, partyFor, seatColor,
  type DutyOption, type GuideRow, type Seat, type StepRow,
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
  if (steps.length === 0) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-line p-10 text-center text-muted">
        {t("guide.noSteps")}
      </div>
    );
  }
  let n = 0;
  return (
    <div className="mt-4 flex flex-col gap-6">
      {inPhases(steps).map((group, gi) => (
        <section key={gi}>
          {group.phase && (
            <h2 className="mb-2.5 font-display text-lg font-semibold">{group.phase}</h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {group.steps.map((s) => <StepCard key={s.id} step={s} seat={seat} n={++n} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function StepCard({ step, seat, n }: { step: StepRow; seat: Seat; n: number }) {
  const { t } = useLang();
  const [whole, setWhole] = useState(false);
  const spot = step.spots[seat];
  const points = spot?.at ?? [];
  const color = seatColor(seat);

  return (
    <article className="rounded-xl border border-line bg-surface p-2.5 sm:p-3">
      <h3 className="mb-2 flex items-baseline gap-2 px-0.5">
        <span className="font-data text-meta text-muted">{n}</span>
        <span className="text-title font-semibold text-ink">{step.name}</span>
      </h3>

      {points.length > 0 ? (
        <button type="button" onClick={() => setWhole((v) => !v)} aria-pressed={whole}
                aria-label={whole ? t("guide.showMine") : t("guide.showAll")}
                className="group relative block w-full rounded-lg text-left">
          <FocusPicture picture={step.picture} w={step.pic_w} h={step.pic_h} points={points}
                        ring={step.ring} color={color} focus={!whole} alt={step.name} />
          <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-line bg-bg/80 px-3 py-1.5 text-ui text-ink/90 backdrop-blur-sm">
            <span aria-hidden>{whole ? "◎" : "⤢"}</span>
            {whole ? t("guide.showMine") : t("guide.showAll")}
          </span>
        </button>
      ) : (
        <FocusPicture picture={step.picture} w={step.pic_w} h={step.pic_h} points={[]}
                      ring={step.ring} color={color} alt={step.name} />
      )}

      {spot?.say ? (
        <p className="mt-2.5 flex items-start gap-2 px-0.5 text-lead font-semibold leading-snug text-ink">
          <span className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-data text-label font-bold text-white"
                style={{ backgroundColor: color }}>{seat}</span>
          <span className="min-w-0 break-words">{spot.say}</span>
        </p>
      ) : points.length === 0 ? (
        <p className="mt-2.5 px-0.5 text-ui text-muted">{t("guide.noSpot", { seat })}</p>
      ) : null}
      {step.note && (
        <p className="mt-1.5 whitespace-pre-line px-0.5 text-read leading-relaxed text-muted">{step.note}</p>
      )}
    </article>
  );
}

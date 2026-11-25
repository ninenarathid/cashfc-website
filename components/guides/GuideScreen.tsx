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
import Tabs from "@/components/ui/Tabs";
import PictureViewer from "@/components/guides/PictureViewer";
import GuideRewards from "@/components/guides/GuideRewards";
import GuideNeeds from "@/components/guides/GuideNeeds";
import RoleText from "@/components/guides/RoleText";
import GuideTalk from "@/components/guides/GuideTalk";
import { GuideCheatsheet, GuideMacro } from "@/components/guides/GuideExtras";
import type { PersonOption } from "@/lib/people";
import {
  CATEGORY_LABEL, GUIDE_COLUMNS, REWARD_COLUMNS, STEP_COLUMNS, cleanPanels, cleanRefs, cleanReward, cleanStep, inLang, inPhases, partyFor, pictureUrl, plansOf, seatAmong, seatColor, seatsFor, stepsUnder, videosOf,
  type Block, type DutyOption, type GuideRow, type RewardRow, type Seat, type StepRow,
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
  | { kind: "ok"; guide: GuideRow; steps: StepRow[]; rewards: RewardRow[] };

/**
 * One fight, read by your own seat.
 *
 * Pick a seat once at the top, and every picture below lights up only where
 * that seat stands, with that seat's line under it. The picture is the same
 * for everybody; a tap on it shows the whole of it, undimmed, for the moment
 * somebody wants to see where the rest of the party is going.
 */
export default function GuideScreen(
  { slug, duties = [], people = [] }: { slug: string; duties?: DutyOption[]; people?: PersonOption[] },
) {
  const { t, lang } = useLang();
  const { isAdmin, realAdmin, ready } = useAdmin();
  const [mySeat, setSeat] = useSeat();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [editing, setEditing] = useState(false);

  const fetchGuide = useCallback(async () => {
    const sb = createClient();
    if (!sb) { setLoad({ kind: "error" }); return; }
    const g = await sb.from("guides").select(GUIDE_COLUMNS).eq("slug", slug).maybeSingle();
    if (g.error) { setLoad({ kind: "error" }); return; }
    if (!g.data) { setLoad({ kind: "missing" }); return; }
    const raw = g.data as GuideRow;
    const guide = {
      ...raw, unlock_pics: cleanRefs(raw.unlock_pics),
      cheat_pics: cleanRefs(raw.cheat_pics), cheat_pics_en: cleanRefs(raw.cheat_pics_en),
      cheat_panels: cleanPanels(raw.cheat_panels),
    };
    const s = await sb.from("guide_steps").select(STEP_COLUMNS)
      .eq("guide_id", guide.id).order("sort").order("id");
    if (s.error) { setLoad({ kind: "error" }); return; }
    // What the fight gives (v347). A database without it answers with an
    // error, read as "no rewards": the guide itself still shows.
    const rw = await sb.from("guide_rewards").select(REWARD_COLUMNS)
      .eq("guide_id", guide.id).order("sort").order("id");
    const rewards = rw.error ? [] : (rw.data as RewardRow[]).map(cleanReward);
    setLoad({ kind: "ok", guide, steps: (s.data as StepRow[]).map(cleanStep), rewards });
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

  const { guide, steps, rewards } = load;
  // A party of four is read by its own four seats; an H2 reads it as its healer.
  const seats = seatsFor(guide.content_key);
  const seat = seatAmong(mySeat, seats);
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
          <Videos list={videosOf(steps)} />
        </div>
        {/* As wide as the screen and no wider, so the buttons wrap on a phone. */}
        <div className="flex min-w-0 max-w-full flex-wrap gap-2">
        {/* Straight to what lies past the fight: the rewards and the talk.
            The cheatsheet and the macro are at the top already. */}
        {!editing && ([
          [rewards.length > 0, "#rewards", "guide.rewardsJump"],
          [true, "#talk", "guide.talkJump"],
        ] as const).filter(([on]) => on).map(([, href, key]) => (
          <a key={href} href={href}
             className="inline-flex min-h-10 items-center rounded-lg border border-line px-3.5 text-read text-ink no-underline hover:border-accent hover:text-accent">
            {t(key)}
          </a>
        ))}
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
      {!editing && <GuideNeeds guide={guide} />}
      {(guide.note || guide.note_en) && !editing && (
        <p className="mt-3 text-read leading-relaxed text-ink/90"><RoleText text={inLang(lang, guide.note, guide.note_en)} seat={seat} /></p>
      )}

      {/* While editing, each step has its own seat buttons beside its picture,
          with a tick on the seats already placed; two seat bars would be one too many. */}
      {!(editing && isAdmin) && (
        <>
          <div className="mt-4"><SeatBar seat={seat} seats={seats} onSeat={setSeat} /></div>
        </>
      )}

      {editing && isAdmin ? (
        <GuideEditor guide={guide} steps={steps} seat={seat} onSeat={setSeat} duties={duties}
                     onGuide={setGuide} onSteps={setSteps} />
      ) : (
        <>
          {/* The cheatsheet and the macro first (the owner, 2026-11-25: "ควรอยู่
              ด้านบน"): what somebody wants just before a pull. Under the role
              bar, so the cheatsheet is lit for the seat picked there. */}
          <GuideCheatsheet guide={guide} seat={seat} />
          <GuideMacro guide={guide} />
          <Steps steps={steps} seat={seat} guideId={guide.id} />
          <GuideRewards rewards={rewards} />
          <GuideTalk guideId={guide.id} people={people} />
        </>
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

/**
 * "Pictures from videos by Nukemaru · Hamukatsu": every video a picture on
 * the page was taken from, each a link (the owner, 2026-11-25: "เขียน credit
 * แนบลิงค์ให้ด้วย"). Each picture also names its own under it.
 */
function Videos({ list }: { list: { by: string; url: string }[] }) {
  const { t } = useLang();
  if (list.length === 0) return null;
  return (
    <p className="mt-0.5 text-ui text-muted">
      {t("guide.videos")}{" "}
      {list.map((v, i) => (
        <span key={v.url}>
          {i > 0 && " · "}
          <a href={v.url} target="_blank" rel="noopener noreferrer"
             className="text-accent underline decoration-accent/40 underline-offset-2">{v.by}</a>
        </span>
      ))}
    </p>
  );
}

const PLANS_KEY = (guideId: number) => `cashfc_guide_plans_${guideId}`;

/**
 * Which way of playing each mechanic this reader picked (v350), by the
 * mechanic's name, kept per guide in this browser: somebody whose party plays
 * the shortcut picks it once.
 */
function usePlans(guideId: number): [Record<string, string>, (mech: string, plan: string) => void] {
  const [chosen, setChosen] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(PLANS_KEY(guideId)) ?? "{}");
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        setChosen(Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string")) as Record<string, string>);
      }
    } catch { /* private window, or something else wrote there */ }
  }, [guideId]);
  const choose = useCallback((mech: string, plan: string) => {
    setChosen((prev) => {
      const next = { ...prev, [mech]: plan };
      try { window.localStorage.setItem(PLANS_KEY(guideId), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [guideId]);
  return [chosen, choose];
}

function Steps({ steps, seat, guideId }: { steps: StepRow[]; seat: Seat; guideId: number }) {
  const { t, lang } = useLang();
  const [view, setView] = useState<number | null>(null);
  const [chosen, choose] = usePlans(guideId);
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
  // What each block shows: a mechanic played two ways shows the reader's way.
  const shown = (b: Block) => (b.mech ? stepsUnder(b.steps, chosen[b.mech] ?? null) : b.steps);
  // Every picture in reading order, for the large viewer's ‹ ›.
  const pictured = groups.flatMap((g) => g.blocks.flatMap(shown)).filter((s) => s.picture);
  const open = (id: number) => setView(Math.max(0, pictured.findIndex((s) => s.id === id)));
  return (
    <div className="mt-4 flex flex-col gap-6">
      {view !== null && (
        <PictureViewer steps={pictured} at={view} seat={seat} onMove={setView} onClose={() => setView(null)} />
      )}
      {groups.map((group, gi) => (
        <section key={gi}>
          {group.phase && (
            <h2 className="mb-2.5 font-display text-lg font-semibold">
              {inLang(lang, group.phase, group.blocks[0]?.steps[0]?.phase_en)}
            </h2>
          )}
          {/* minmax(0, 1fr) on a phone too: a lone column of auto width grew to
              the pictures' drawn width (1200px) and took the page with it. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.blocks.map((b) => (b.mech
              ? <MechBox key={`m${b.steps[0].id}`} block={b} seat={seat} n={++n} onOpen={open}
                         plan={chosen[b.mech] ?? null} onPlan={(p) => choose(b.mech as string, p)} />
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
  { block, seat, n, onOpen, plan, onPlan }:
  { block: Block; seat: Seat; n: number; onOpen: (id: number) => void; plan: string | null; onPlan: (plan: string) => void },
) {
  const { t, lang } = useLang();
  // Played two ways (the owner, 2026-11-25: "ทำเป็น tab เลือกวิธีเล่นได้สองแผน
  // ใน mech นั้นๆ"): a tab a way, game8's first, the steps both share in each.
  const plans = plansOf(block.steps);
  const pick = plans.some((p) => p.plan === plan) ? (plan as string) : plans[0]?.plan ?? "";
  const k = stepsUnder(block.steps, pick || null).length;
  const parts = (list: StepRow[]) => (
    <ol className="-mx-2.5 mt-2 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-2.5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
      {list.map((s, i) => (
        <li key={s.id} className={`${list.length > 1 ? "w-[86%]" : "w-full"} shrink-0 snap-start sm:w-auto`}>
          <StepCard step={s} seat={seat} label={list.length > 1 ? `${i + 1}/${list.length}` : ""} flat onOpen={onOpen} />
        </li>
      ))}
    </ol>
  );
  return (
    <section className="min-w-0 rounded-xl border border-accent/35 bg-surface/60 p-2.5 sm:col-span-2 sm:p-3">
      <h3 className="flex flex-wrap items-baseline gap-x-2 px-0.5">
        <span className="font-data text-meta text-muted">{n}</span>
        <span className="text-head font-semibold text-ink">{inLang(lang, block.mech, block.steps[0]?.mech_en)}</span>
        <span className="text-ui text-muted">{k === 1 ? t("guide.partOne") : t("guide.parts", { n: k })}</span>
      </h3>
      {plans.length > 0 ? (
        <>
          <p className="mt-1 px-0.5 text-meta text-muted">{t("guide.plans")}</p>
          <Tabs className="mt-1" value={pick} onValueChange={onPlan}
                tabs={plans.map((p) => {
                  const list = stepsUnder(block.steps, p.plan);
                  return {
                    key: p.plan,
                    label: inLang(lang, p.plan, p.plan_en),
                    body: (
                      <>
                        {list.length > 1 && <p className="px-0.5 text-meta text-muted sm:hidden">{t("guide.swipe")}</p>}
                        {parts(list)}
                      </>
                    ),
                  };
                })} />
        </>
      ) : (
        <>
          {k > 1 && <p className="mt-0.5 px-0.5 text-meta text-muted sm:hidden">{t("guide.swipe")}</p>}
          {parts(block.steps)}
        </>
      )}
    </section>
  );
}

function StepCard(
  { step, seat, label, flat = false, onOpen }:
  { step: StepRow; seat: Seat; label: string; flat?: boolean; onOpen: (id: number) => void },
) {
  const { t, lang } = useLang();
  // The ring can be switched off to see the picture as it is (the owner,
  // 2026-11-25), per picture, and only on a picture that has one.
  const [ringOff, setRingOff] = useState(false);
  const [openRef, setOpenRef] = useState<number | null>(null);
  const spot = step.spots[seat];
  const points = spot?.at ?? [];
  const color = seatColor(seat);
  const name = inLang(lang, step.name, step.name_en);
  const note = inLang(lang, step.note, step.note_en);
  const say = inLang(lang, spot?.say, spot?.say_en);
  const refUrls = step.refs.map((r) => pictureUrl(r.path)).filter((u): u is string => !!u);

  return (
    <article className={`min-w-0 ${flat ? "h-full rounded-lg border border-line bg-bg/40 p-2" : "rounded-xl border border-line bg-surface p-2.5 sm:p-3"}`}>
      <h3 className="mb-2 flex items-baseline gap-2 px-0.5">
        {label && <span className="font-data text-meta text-muted">{label}</span>}
        <span className="text-title font-semibold text-ink">{name}</span>
      </h3>

      {/* A tap on the picture opens it large (PictureViewer), still lit on
          your spot, with the whole picture one more tap away. Nothing sits on
          the picture (the owner, 2026-11-26: "เอา ปิดวง กับ ดูภาพใหญ่ ออกจาก
          ภาพเลยดีกว่ามันบังภาพ"), and no enlarge button at all: the picture is
          that button ("click ที่ภาพ มันเป็นการดูภาพใหญ่อยู่แล้ว ... เอาออกได้").
          The ring switch is under it, on a picture that has a ring. */}
      {step.picture && (
        <div>
          <button type="button" onClick={() => onOpen(step.id)} aria-label={t("guide.enlarge")}
                  className="block w-full cursor-zoom-in rounded-lg text-left">
            <FocusPicture picture={step.picture} w={step.pic_w} h={step.pic_h} points={points}
                          ring={step.ring} color={color} focus={!ringOff} alt={name} />
          </button>
          {points.length > 0 && (
            <button type="button" onClick={() => setRingOff((v) => !v)} aria-pressed={!ringOff}
                    className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-ui text-ink/90 transition-colors hover:border-accent">
              <span aria-hidden className="inline-block size-2.5 rounded-full border-2"
                    style={{ borderColor: color, backgroundColor: ringOff ? "transparent" : color }} />
              {ringOff ? t("guide.ringOn") : t("guide.ringOff")}
            </button>
          )}
        </div>
      )}

      {/* The seat's own line, where the step has one. Nothing where it has
          none: "no fixed spot here" under every such picture was taken out
          (the owner, 2026-11-25: "เอาข้อความนี้ออกเลย"). */}
      {say && (
        <p className="mt-2.5 flex items-start gap-2 px-0.5 text-lead font-semibold leading-snug text-ink">
          <span className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-data text-label font-bold text-white"
                style={{ backgroundColor: color }}>{seat}</span>
          <span className="min-w-0 break-words">{say}</span>
        </p>
      )}
      {note && (
        <p className="mt-1.5 px-0.5 text-read leading-relaxed text-muted"><RoleText text={note} seat={seat} /></p>
      )}

      {/* What to watch for in the game: the boss's pose, an object at the
          edge. The card's full width and the picture's own shape, nothing
          cropped (the owner, 2026-11-25: "ช่วยแสดงภาพให้ใหญ่กว่านี้ ให้คนที่
          อ่านไม่ต้องกดดูภาพใหญ่ก็รู้เรื่อง"); a tap still opens it large. */}
      {step.refs.length > 0 && (
        <div className="mt-3 px-0.5">
          <div className="mb-1.5 text-ui font-semibold text-muted">{t("guide.watch")}</div>
          <div className="flex flex-col gap-3">
            {step.refs.map((r, i) => (
              <figure key={i} className="min-w-0">
                <button type="button" onClick={() => setOpenRef(i)} aria-label={t("guide.enlarge")}
                        className="block w-full cursor-zoom-in rounded-lg text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pictureUrl(r.path) ?? undefined} alt={inLang(lang, r.say, r.say_en) || t("guide.watch")}
                       width={r.w} height={r.h} loading="lazy" decoding="async"
                       style={{ aspectRatio: `${r.w} / ${r.h}` }}
                       className="block h-auto w-full rounded-lg border border-line bg-black" />
                </button>
                {(r.say || r.say_en || r.by) && (
                  <figcaption className="mt-1.5 text-ui leading-snug text-ink/85">
                    {inLang(lang, r.say, r.say_en)}
                    {/* Whose picture it is, a link back to the moment in their
                        video; outside the button, as a link may not sit in one. */}
                    {r.by && (r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                         className="mt-0.5 block w-fit font-data text-label text-muted underline decoration-line underline-offset-2 hover:text-accent">
                        {t("guide.refBy", { by: r.by })} ↗
                      </a>
                    ) : (
                      <span className="mt-0.5 block font-data text-label text-muted">{t("guide.refBy", { by: r.by })}</span>
                    ))}
                  </figcaption>
                )}
              </figure>
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

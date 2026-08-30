"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Arena, { type Mark } from "@/components/guides/Arena";
import Timeline from "@/components/guides/Timeline";
import { useLang } from "@/lib/i18n";
import {
  SLOTS, SLOT_LABEL, TAG_LABEL, TAG_TONE, planMarks, say, slotGroup,
  type Guide, type Mechanic, type Slot, type Spot, type Step, type Variant,
} from "@/lib/guides/types";

/**
 * A fight, read one beat at a time — or answered one beat at a time.
 *
 * Two modes over one set of facts. Reading shows where everybody stands and what
 * this seat in particular has to do; the quiz hides the positions, rolls a
 * variant and asks the reader to click where they would be. Neither is a
 * separate feature: the spot the diagram draws is the answer the quiz checks, so
 * a guide cannot be right in one mode and wrong in the other.
 *
 * A mechanic is a short sequence rather than a picture. Ether Letting is "take
 * your marker to the edge" and then "come back to the middle" — two places to
 * stand, and drawing only one of them is how a guide ends up correct and
 * useless. Each beat is its own diagram and its own question.
 *
 * Reading is never gated. Somebody opening a guide has usually just wiped and
 * wants one mechanic before the next pull; making them pass a test first breaks
 * the guide at the moment it is needed. The gate belongs to the quiz, where
 * being made to get it right is the point.
 */

const KEY = "cashfc_guide_slot";
/** Which preset, remembered per fight: a group plays the same one every week. */
const PLAN_KEY = (slug: string) => `cashfc_guide_plan_${slug}`;
/** How close counts. Two units of a twenty-unit arena — generous on purpose:
 *  the question is whether somebody knows where to be, not whether they can aim. */
const TOLERANCE = 2;

const dist = (a: Spot, b: Spot) => Math.hypot(a.x - b.x, a.y - b.y);

export default function GuideView({ guide }: { guide: Guide }) {
  const { t, lang } = useLang();
  const [slot, setSlot] = useState<Slot>("MT");
  const [mode, setMode] = useState<"read" | "quiz">("read");
  const [at, setAt] = useState(0);
  const [beat, setBeat] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [pick, setPick] = useState<Spot | null>(null);
  const [tries, setTries] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [score, setScore] = useState({ right: 0, asked: 0 });

  // Remembered per browser. Which seat somebody plays is the one thing they
  // should never have to say twice.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY) as Slot | null;
      if (saved && SLOTS.includes(saved)) setSlot(saved);
    } catch { /* private window; MT it is */ }
  }, []);
  const chooseSlot = (s: Slot) => {
    setSlot(s);
    try { window.localStorage.setItem(KEY, s); } catch { /* ignore */ }
  };

  // Remembered per fight rather than globally: a group brings one preset to
  // M9S and a different one to the next boss, and being asked again every
  // visit is how a reader ends up reading positions off the wrong marks.
  const plans = guide.arena.plans ?? [];
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PLAN_KEY(guide.slug));
      if (saved) setPlanId(saved);
    } catch { /* private window; the first plan it is */ }
  }, [guide.slug]);
  const choosePlan = (id: string) => {
    setPlanId(id);
    try { window.localStorage.setItem(PLAN_KEY(guide.slug), id); } catch { /* ignore */ }
  };

  // The marks the diagram draws. A preset is converted here rather than by
  // hand, so a set can be pasted in exactly as the game exported it.
  const waymarks = useMemo(
    () => planMarks(guide.arena, planId), [guide.arena, planId]);
  const shownPlan = plans.find((p) => p.id === planId) ?? plans[0];

  const steps = useMemo(
    () => guide.phases.flatMap((p) => p.mechanics.map((m) => ({ phase: p, m }))),
    [guide]);

  const here = steps[Math.min(at, steps.length - 1)];
  const mech: Mechanic | undefined = here?.m;

  // A mechanic may be on the timeline with nothing written under it yet, in
  // which case there is no variant, no diagram and nothing to ask.
  const variant: Variant | undefined = useMemo(() => {
    const vs = mech?.variants;
    if (!vs?.length) return undefined;
    return vs.find((v) => v.id === variantId) ?? vs[0];
  }, [mech, variantId]);

  const step: Step | undefined = variant?.steps[Math.min(beat, variant.steps.length - 1)];

  const roll = useCallback((m: Mechanic) => {
    const vs = m.variants ?? [];
    const one = vs[Math.floor(Math.random() * vs.length)];
    setVariantId(one?.id ?? null);
    setBeat(0); setPick(null); setTries(0); setReveal(false);
  }, []);

  // A new mechanic in quiz mode is a new question, which means a new roll: the
  // same fight asked twice should not be the same test.
  useEffect(() => {
    if (mode === "quiz" && mech) roll(mech);
    else { setBeat(0); setPick(null); setTries(0); setReveal(false); }
  }, [mode, at, mech, roll]);

  // Each beat is its own question, so answering one clears the last answer.
  useEffect(() => { setPick(null); setTries(0); setReveal(false); }, [beat]);

  if (!mech || !here) return null;

  const answer = step?.safe[slot] ?? null;
  const correct = !!pick && !!answer && dist(pick, answer) <= TOLERANCE;
  const showAnswers = mode === "read" || correct || reveal || !answer;

  const marks: Mark[] = showAnswers && step
    ? SLOTS.flatMap((s) => {
        const spot = step.safe[s];
        return spot ? [{ slot: s, at: spot, you: s === slot }] : [];
      })
    : [];

  function answered(spot: Spot) {
    if (mode !== "quiz" || correct || reveal || !answer) return;
    setPick(spot);
    setTries((n) => n + 1);
    if (dist(spot, answer) <= TOLERANCE) {
      setScore((s) => ({ right: s.right + 1, asked: s.asked + 1 }));
    }
  }

  const beats = variant?.steps.length ?? 0;
  const lastBeat = beat >= beats - 1;
  const nextBeat = () => setBeat((n) => Math.min(n + 1, beats - 1));
  const next = () => {
    if (!lastBeat) { nextBeat(); return; }
    setAt((n) => Math.min(n + 1, steps.length - 1));
  };
  const prev = () => {
    if (beat > 0) { setBeat((n) => n - 1); return; }
    setAt((n) => Math.max(n - 1, 0));
  };
  const blocked = mode === "quiz" && !showAnswers;

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* ── Who you are, and what you are here for ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-xl border border-line bg-surface p-3">
        <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
          {t("guide.slot")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SLOTS.map((s) => (
            <button key={s} onClick={() => chooseSlot(s)} aria-pressed={s === slot}
                    title={t("guide.group", { g: slotGroup(s) })}
                    className={`rounded-md border px-2.5 py-1 font-data text-[12px] transition-colors ${
                      s === slot ? "border-accent bg-accent/15 text-accent"
                                 : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {SLOT_LABEL[s]}
            </button>
          ))}
        </div>
        <span className="font-data text-[11px] text-muted">
          {t("guide.group", { g: slotGroup(slot) })}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {(["read", "quiz"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
                    className={`rounded-md border px-3 py-1 text-[12.5px] transition-colors ${
                      mode === m ? "border-accent bg-accent/15 text-accent"
                                 : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {t(m === "read" ? "guide.read" : "guide.quiz")}
            </button>
          ))}
        </div>
      </div>

      <Timeline guide={guide} at={at} onPick={(i) => { setAt(i); setBeat(0); }} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]">
        {/* ── The floor ── */}
        <div className="rounded-xl border border-line bg-surface p-3">
          {/* Which set of marks the diagram is drawn on. Only asked when the
              fight actually has more than one, because a choice of one is not
              a choice — it is a row of chrome above every guide. */}
          {plans.length > 1 && (
            <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
                {t("guide.plan")}
              </span>
              {plans.map((p) => (
                <button key={p.id} onClick={() => choosePlan(p.id)}
                        aria-pressed={p.id === shownPlan?.id}
                        title={p.note ? say(p.note, lang) : undefined}
                        className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                          p.id === shownPlan?.id
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {say(p.name, lang)}
                </button>
              ))}
              {shownPlan?.note && (
                <span className="text-[11.5px] text-muted">{say(shownPlan.note, lang)}</span>
              )}
            </div>
          )}

          <Arena arena={guide.arena} danger={step?.danger ?? []} marks={marks}
                 boss={{ x: 0, y: 0 }} waymarks={waymarks}
                 pick={mode === "quiz" ? pick : null}
                 answer={mode === "quiz" && showAnswers ? answer : null}
                 tolerance={TOLERANCE}
                 onPick={mode === "quiz" && answer ? answered : undefined} />

          {/* ── The beats of this one mechanic ── */}
          {beats > 1 && variant && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {variant.steps.map((st, i) => (
                <button key={st.id}
                        onClick={() => { if (mode === "read" || i <= beat) setBeat(i); }}
                        disabled={mode === "quiz" && i > beat}
                        aria-current={i === beat}
                        className={`rounded-md border px-2.5 py-1 text-[11.5px] transition-colors disabled:opacity-40 ${
                          i === beat ? "border-accent bg-accent/15 text-accent"
                                     : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {say(st.label, lang)}
                </button>
              ))}
            </div>
          )}

          {mode === "quiz" && step && (
            <p className="mt-1.5 text-center text-[12px] text-muted">
              {!answer ? t("guide.noSpot", { slot: SLOT_LABEL[slot] })
                : correct ? t("guide.right")
                : reveal ? t("guide.shown")
                : t("guide.ask", { slot: SLOT_LABEL[slot] })}
            </p>
          )}
        </div>

        {/* ── What is happening ── */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-surface p-3.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-display text-[15px] font-semibold">{mech.name}</h2>
              {(mech.cast || mech.at) && (
                <span className="font-data text-[11.5px] text-muted">
                  {mech.cast && <span className="opacity-70">{mech.cast} → </span>}
                  {mech.at}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11.5px] text-muted">{say(here.phase.name, lang)}</div>
            {(mech.tags?.length ?? 0) > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {mech.tags!.map((t) => (
                  <span key={t} className={`rounded-full border px-2 py-0.5 text-[10.5px] ${TAG_TONE[t]}`}>
                    {TAG_LABEL[t]}
                  </span>
                ))}
              </div>
            )}

            {mode === "read" && mech.what && (
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink/90">{say(mech.what, lang)}</p>
            )}

            {/* Known skill, unwritten strategy. Said plainly rather than left as
                an empty panel, because a reader has to be able to tell "nothing
                happens here" from "nobody has written this down yet". */}
            {!variant && (
              <p className="mt-2 rounded-lg border border-dashed border-line px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
                {t("guide.unwritten")}
              </p>
            )}

            {/* The beat: what is happening, then what this seat does about it. */}
            {(mode === "read" || showAnswers) && step && (
              <div className="mt-2 rounded-lg border border-line bg-card px-3 py-2">
                <div className="font-data text-[10.5px] uppercase tracking-[0.14em] text-accent">
                  {say(step.label, lang)}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink/90">{say(step.say, lang)}</p>
                {step.per?.[slot] && (
                  <p className="mt-2 rounded-md border border-accent/40 bg-accent/5 px-2.5 py-1.5 text-[13px] leading-relaxed text-ink">
                    <b className="text-accent">{SLOT_LABEL[slot]}</b> — {say(step.per[slot], lang)}
                  </p>
                )}
              </div>
            )}

            {mode === "quiz" && variant && step && (
              <>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink/90">
                  {say(variant.tell, lang)}
                </p>
                {!showAnswers && (
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                    {say(step.label, lang)}
                  </p>
                )}
                {pick && !correct && !reveal && (
                  <p className="mt-2 rounded-lg border border-chili/40 bg-chili/5 px-3 py-2 text-[12.5px] leading-relaxed text-chili">
                    {say(step.wrong, lang) || t("guide.notThere")}
                  </p>
                )}
                {tries >= 2 && !correct && !reveal && (
                  <button onClick={() => { setReveal(true); setScore((s) => ({ ...s, asked: s.asked + 1 })); }}
                          className="mt-2 rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent">
                    {t("guide.giveUp")}
                  </button>
                )}
              </>
            )}

            {(mode === "read" || showAnswers) && lastBeat && mech.dies && (
              <p className="mt-2 rounded-lg border border-chili/40 bg-chili/5 px-3 py-2 text-[12.5px] leading-relaxed text-ink/85">
                <b className="text-chili">{t("guide.dies")}</b> {say(mech.dies, lang)}
              </p>
            )}

            {mode === "read" && (mech.variants?.length ?? 0) > 1 && variant && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
                  {t("guide.variants")}
                </span>
                {mech.variants!.map((v) => (
                  <button key={v.id} onClick={() => { setVariantId(v.id); setBeat(0); }}
                          className={`rounded-lg border px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${
                            v.id === variant.id
                              ? "border-accent bg-accent/10 text-ink"
                              : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                    {say(v.tell, lang)}
                  </button>
                ))}
              </div>
            )}

            {mech.clip && (
              <video src={mech.clip} autoPlay loop muted playsInline
                     className="mt-2.5 w-full rounded-lg border border-line" />
            )}
            {mech.image && !mech.clip && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mech.image} alt="" className="mt-2.5 w-full rounded-lg border border-line" />
            )}
          </div>

          {/* ── Getting about ── */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={prev} disabled={at === 0 && beat === 0}
                    className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent disabled:opacity-40">
              {t("guide.prev")}
            </button>
            <button onClick={next}
                    disabled={(lastBeat && at >= steps.length - 1) || blocked}
                    title={blocked ? t("guide.gate") : undefined}
                    className="rounded-lg border border-accent bg-accent/15 px-3 py-1.5 text-[13px] text-accent hover:bg-accent/25 disabled:opacity-40">
              {t("guide.next")}
            </button>
            <span className="font-data text-[11.5px] text-muted">
              {at + 1}/{steps.length}
              {beats > 1 && ` · ${beat + 1}/${beats}`}
            </span>
            {mode === "quiz" && (
              <span className="ml-auto font-data text-[11.5px] text-muted">
                {t("guide.scored", { r: score.right, a: score.asked })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Arena, { type Mark } from "@/components/guides/Arena";
import {
  SLOTS, SLOT_LABEL, SLOT_ROLE, slotGroup,
  type Guide, type Mechanic, type Slot, type Spot, type Variant,
} from "@/lib/guides/types";

/**
 * A fight, read one mechanic at a time — or answered one mechanic at a time.
 *
 * Two modes over one set of facts. Reading shows the safe spots; the quiz hides
 * them, picks a variant at random and asks the reader to click where they would
 * stand. Neither is a separate feature: the safe spot the diagram draws is the
 * answer the quiz checks, so a guide cannot be right in one mode and wrong in
 * the other.
 *
 * Reading is never gated. Somebody opening a guide has usually just wiped and
 * wants one mechanic before the next pull, and making them pass a test to see it
 * would break the guide at exactly the moment it is needed. The gate belongs to
 * the quiz, where being made to get it right is the point.
 *
 * Everything is keyed by party slot rather than by role, because that is how the
 * strategies these are read from are written: "MT group takes the first towers"
 * cannot be said in a vocabulary where both tanks are the same word.
 */

const KEY = "cashfc_guide_slot";
/** How close counts. Two units of a twenty-unit arena — generous on purpose:
 *  the question is whether somebody knows where to be, not whether they can aim. */
const TOLERANCE = 2;

const dist = (a: Spot, b: Spot) => Math.hypot(a.x - b.x, a.y - b.y);

export default function GuideView({ guide }: { guide: Guide }) {
  const [slot, setSlot] = useState<Slot>("MT");
  const [mode, setMode] = useState<"read" | "quiz">("read");
  const [at, setAt] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
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

  /** Every mechanic in order, flattened, with the phase it belongs to. */
  const steps = useMemo(
    () => guide.phases.flatMap((p) => p.mechanics.map((m) => ({ phase: p, m }))),
    [guide]);

  const step = steps[Math.min(at, steps.length - 1)];
  const mech: Mechanic | undefined = step?.m;

  const variant: Variant | undefined = useMemo(() => {
    if (!mech) return undefined;
    return mech.variants.find((v) => v.id === variantId) ?? mech.variants[0];
  }, [mech, variantId]);

  const roll = useCallback((m: Mechanic) => {
    const pickOne = m.variants[Math.floor(Math.random() * m.variants.length)];
    setVariantId(pickOne?.id ?? null);
    setPick(null); setTries(0); setReveal(false);
  }, []);

  // A new mechanic in quiz mode is a new question, which means a new roll of the
  // dice: the same fight asked twice should not be the same test.
  useEffect(() => {
    if (mode === "quiz" && mech) roll(mech);
    else { setPick(null); setTries(0); setReveal(false); }
  }, [mode, at, mech, roll]);

  if (!mech || !variant || !step) return null;

  const answer = variant.safe[slot] ?? null;
  const correct = !!pick && !!answer && dist(pick, answer) <= TOLERANCE;
  const showAnswers = mode === "read" || correct || reveal;

  const marks: Mark[] = showAnswers
    ? SLOTS.flatMap((s) => {
        const spot = variant.safe[s];
        return spot ? [{ role: SLOT_ROLE[s], at: spot, you: s === slot }] : [];
      })
    : [];

  function answered(spot: Spot) {
    if (mode !== "quiz" || correct || reveal) return;
    setPick(spot);
    setTries((n) => n + 1);
    if (answer && dist(spot, answer) <= TOLERANCE) {
      setScore((s) => ({ right: s.right + 1, asked: s.asked + 1 }));
    }
  }

  const next = () => setAt((n) => Math.min(n + 1, steps.length - 1));
  const prev = () => setAt((n) => Math.max(n - 1, 0));

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* ── Who you are, and what you are here for ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-xl border border-line bg-surface p-3">
        <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
          ตำแหน่ง
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SLOTS.map((s) => (
            <button key={s} onClick={() => chooseSlot(s)} aria-pressed={s === slot}
                    title={`กลุ่ม ${slotGroup(s)}`}
                    className={`rounded-md border px-2.5 py-1 font-data text-[12px] transition-colors ${
                      s === slot ? "border-accent bg-accent/15 text-accent"
                                 : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {SLOT_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {(["read", "quiz"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
                    className={`rounded-md border px-3 py-1 text-[12.5px] transition-colors ${
                      mode === m ? "border-accent bg-accent/15 text-accent"
                                 : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {m === "read" ? "อ่าน" : "ทดสอบ"}
            </button>
          ))}
        </div>
      </div>

      {/* ── The timeline: every mechanic, jumpable ── */}
      <div className="flex flex-col gap-1.5">
        {guide.phases.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-1.5">
            <span className="w-full font-data text-[10.5px] uppercase tracking-[0.14em] text-muted sm:w-auto sm:min-w-32">
              {p.name}
            </span>
            {p.mechanics.map((m) => {
              const i = steps.findIndex((x) => x.m.id === m.id);
              return (
                <button key={m.id} onClick={() => setAt(i)}
                        aria-current={i === at}
                        className={`rounded-md border px-2 py-1 text-[11.5px] transition-colors ${
                          i === at ? "border-accent bg-accent/15 text-accent"
                                   : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {m.name.split(" (")[0]}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {/* ── The floor ── */}
        <div className="rounded-xl border border-line bg-surface p-3">
          <Arena arena={guide.arena} danger={variant.danger} marks={marks}
                 boss={{ x: 0, y: 0 }}
                 pick={mode === "quiz" ? pick : null}
                 answer={mode === "quiz" && showAnswers ? answer : null}
                 tolerance={TOLERANCE}
                 onPick={mode === "quiz" ? answered : undefined} />
          {mode === "quiz" && (
            <p className="mt-1 text-center text-[12px] text-muted">
              {correct ? "ถูกต้อง"
                : reveal ? "นี่คือตำแหน่งที่ถูก"
                : `คลิกตำแหน่งที่ ${SLOT_LABEL[slot]} ต้องยืน`}
            </p>
          )}
        </div>

        {/* ── What is happening ── */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-surface p-3.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-display text-[15px] font-semibold">{mech.name}</h2>
              {mech.at && (
                <span className="font-data text-[11.5px] text-muted">{mech.at}</span>
              )}
            </div>
            <div className="mt-0.5 text-[11.5px] text-muted">{step.phase.name}</div>

            {mode === "read" ? (
              <>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink/90">{mech.what}</p>
                <p className="mt-2 rounded-lg border border-chili/40 bg-chili/5 px-3 py-2 text-[12.5px] leading-relaxed text-ink/85">
                  <b className="text-chili">ตายเพราะ</b> {mech.dies}
                </p>
                {mech.variants.length > 1 && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
                      รูปแบบ
                    </span>
                    {mech.variants.map((v) => (
                      <button key={v.id} onClick={() => setVariantId(v.id)}
                              className={`rounded-lg border px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${
                                v.id === variant.id
                                  ? "border-accent bg-accent/10 text-ink"
                                  : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                        {v.tell}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* The tell, and nothing else. In the quiz what you get is what
                    the fight gives you: the thing you can see, and the question
                    of what to do about it. */}
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink/90">
                  {variant.tell}
                </p>
                {pick && !correct && !reveal && (
                  <p className="mt-2 rounded-lg border border-chili/40 bg-chili/5 px-3 py-2 text-[12.5px] leading-relaxed text-chili">
                    {variant.wrong ?? "ยังไม่ใช่ตรงนั้น"}
                  </p>
                )}
                {correct && (
                  <p className="mt-2 rounded-lg border border-jade/40 bg-jade/5 px-3 py-2 text-[12.5px] leading-relaxed text-jade">
                    ถูกต้อง — {mech.what}
                  </p>
                )}
                {tries >= 2 && !correct && !reveal && (
                  <button onClick={() => { setReveal(true); setScore((s) => ({ ...s, asked: s.asked + 1 })); }}
                          className="mt-2 rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent">
                    ยอมแพ้ ขอดูคำตอบ
                  </button>
                )}
                {(correct || reveal) && (
                  <p className="mt-2 rounded-lg border border-chili/40 bg-chili/5 px-3 py-2 text-[12.5px] leading-relaxed text-ink/85">
                    <b className="text-chili">ตายเพราะ</b> {mech.dies}
                  </p>
                )}
              </>
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
            <button onClick={prev} disabled={at === 0}
                    className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent disabled:opacity-40">
              ← ก่อนหน้า
            </button>
            <button onClick={next}
                    disabled={at >= steps.length - 1 || (mode === "quiz" && !showAnswers)}
                    title={mode === "quiz" && !showAnswers ? "ตอบให้ถูกก่อนถึงจะไปต่อได้" : undefined}
                    className="rounded-lg border border-accent bg-accent/15 px-3 py-1.5 text-[13px] text-accent hover:bg-accent/25 disabled:opacity-40">
              ถัดไป →
            </button>
            <span className="font-data text-[11.5px] text-muted">
              {at + 1}/{steps.length}
            </span>
            {mode === "quiz" && (
              <span className="ml-auto font-data text-[11.5px] text-muted">
                {score.right}/{score.asked} ถูก
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

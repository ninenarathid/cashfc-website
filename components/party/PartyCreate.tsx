"use client";

import { useMemo, useState } from "react";
import type {
  ContentDef, Flex, Floater, Loot, Party, PartyBlock, Progress, SeatRule, Shape,
  SlotDef, SlotRole, Spot,
} from "@/lib/party";
import {
  FOOD_MINUTES, ROLE_LABEL, SHAPE_LABEL, canFlex, endsAt, flexLabel,
  foodToMinutes, fmtTime, hasLoot, hasSpot, isFight, lootRulesFor, shapeLabel,
  slotsOf, whoKey,
} from "@/lib/party";
import type { PersonOption } from "@/lib/people";
import PartySeats from "@/components/party/PartySeats";
import ContentPicker from "@/components/party/ContentPicker";
import JobRule, { jobsForRole } from "@/components/party/JobRule";
import JobIcon from "@/components/JobIcon";
import FoodIcon from "@/components/party/FoodIcon";
import { BodyEditor } from "@/components/party/PartyBody";
import ProgressTrack from "@/components/party/ProgressTrack";
import LootPlan from "@/components/party/LootPlan";
import WherePicker from "@/components/party/WherePicker";
import { useAvatarOverrides } from "@/lib/avatars";

/**
 * Putting a party on the board.
 *
 * The form is the party. Rather than ask for a size and then a list of missing
 * roles in words, it draws the seats and lets them be filled in — because which
 * positions are missing is answered by looking at which ones are still empty,
 * and any other way of asking it is a second description of the same thing that
 * can disagree with the first.
 *
 * So: pick what you are doing, pick when, then click seats. The creator is
 * placed first and cannot be removed, since a party with nobody in it is a
 * listing nobody can join.
 */

/**
 * An instant, written the way a datetime-local input wants to read it.
 *
 * The field has no timezone, and the reader's browser may not be in Bangkok:
 * shift so that what it shows is the Thai wall clock, then shift back when it
 * is read. Bangkok is UTC+7 all year, so this is a constant rather than a
 * seasonal case.
 */
function asBangkokLocal(at: Date): string {
  const shifted = new Date(at.getTime() + (7 * 60 + at.getTimezoneOffset()) * 60_000);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getFullYear()}-${two(shifted.getMonth() + 1)}-${two(shifted.getDate())}`
       + `T${two(shifted.getHours())}:${two(shifted.getMinutes())}`;
}

/** The next half hour, which is the earliest anybody realistically means. */
function defaultStart(): string {
  const t = new Date(Date.now() + 60 * 60_000);
  t.setMinutes(t.getMinutes() < 30 ? 30 : 60, 0, 0);
  return asBangkokLocal(t);
}

/**
 * The earliest the field will accept: now.
 *
 * A party in the past is not a party, it is a typo — and the shape of the
 * mistake is always the same, somebody setting next Tuesday and leaving the
 * date on today. `min` stops the picker offering it, and the check on the
 * button catches it being typed anyway, because `min` is a hint to the widget
 * rather than a rule about the value.
 */
const earliest = () => asBangkokLocal(new Date());

/** What the field says is Thai wall-clock time; this is the instant it means. */
function fromBangkokLocal(value: string): string {
  const [date, time] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 7, mm)).toISOString();
}

/**
 * What else the person in this seat can play.
 *
 * Three controls because there are three ways people say it, and flattening
 * them into one would lose the difference: "I will play anything" is not the
 * same offer as "I can tank", and "I can take MT or D2" is narrower still.
 */
function FlexEditor(
  { shape, seatId, value, onChange }: {
    shape: Shape; seatId: string;
    value: Flex; onChange: (f: Flex) => void;
  },
) {
  const roles: SlotRole[] = ["tank", "healer", "dps"];
  // Labels, not ids: in an alliance "MT" means any of the three parties' MT,
  // because which of the three you stand in is the one thing nobody minds.
  // Their own seat is not something they can flex to. Called with no seat at
  // all for somebody who has not taken one, and then every seat is on offer.
  const mine = seatId.replace(/^[ABC]-/, "");
  const seats = [...new Set(slotsOf(shape).map((s) => s.label))]
    .filter((l) => l !== mine);

  const toggle = <T,>(list: T[] | undefined, v: T): T[] => {
    const set = new Set(list ?? []);
    if (!set.delete(v)) set.add(v);
    return [...set];
  };
  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-[3px] text-[11.5px] transition-colors ${
      on ? "border-accent bg-accent/15 text-accent"
         : "border-line text-muted hover:border-muted hover:text-ink"}`;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-data text-[10px] uppercase tracking-[0.12em] text-muted">
          Can also play
        </span>
        <button type="button" className={chip(!!value.all)}
                onClick={() => onChange(value.all ? {} : { all: true })}>
          Anything
        </button>
      </div>

      {/* Hidden once "Anything" is on: it already covers every one of these,
          and leaving them clickable invites somebody to build a narrower
          answer underneath a wider one that overrules it. */}
      {!value.all && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <button key={r} type="button"
                      className={chip(!!value.roles?.includes(r))}
                      onClick={() => onChange({ ...value, roles: toggle(value.roles, r) })}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {seats.map((l) => (
              <button key={l} type="button"
                      className={chip(!!value.seats?.includes(l))}
                      onClick={() => onChange({ ...value, seats: toggle(value.seats, l) })}>
                {l}
              </button>
            ))}
          </div>
        </>
      )}

      {canFlex(value) && (
        <span className="text-[11.5px] text-jade">{flexLabel(value)}</span>
      )}
    </div>
  );
}

export default function PartyCreate(
  { content, people, me, userId, busy = false, onAdd, onCancel }: {
    content: ContentDef[];
    people: PersonOption[];
    /** The creator, who takes the first seat they choose. */
    me: PersonOption;
    /** Their account, which the pictures are filed under. */
    userId: string;
    /** True while the board is writing it down. */
    busy?: boolean;
    onAdd: (p: Party) => void | Promise<void>;
    onCancel: () => void;
  },
) {
  const overrides = useAvatarOverrides();
  const face = (id: number | null | undefined, fallback: string | null) =>
    (id != null && overrides[id]) || fallback || null;

  const [contentKey, setContentKey] = useState(content[0]?.key ?? "");
  const chosen = content.find((c) => c.key === contentKey) ?? content[0];
  const [note, setNote] = useState("");
  const [shape, setShape] = useState<Shape | "">("");
  const [start, setStart] = useState(defaultStart);
  const [unit, setUnit] = useState<"hours" | "food">("food");
  const [amount, setAmount] = useState(4);

  /*
   * The size is the content's, unless the content does not fix one.
   *
   * A savage fight is eight people; being asked is being given a chance to be
   * wrong about something the game already decided. A treasure map run really
   * is four or eight, so that one is asked.
   */
  const useShape: Shape = chosen?.fixedShape
    ? chosen.shape
    : ((shape || chosen?.shape || "full") as Shape);

  const [seats, setSeats] = useState<Party["seats"]>({});
  const [closed, setClosed] = useState<string[]>([]);
  const [rules, setRules] = useState<Record<string, SeatRule>>({});
  const [oneEach, setOneEach] = useState(false);
  const [floating, setFloating] = useState<Floater[]>([]);
  const [body, setBody] = useState<PartyBlock[]>([]);
  const [progress, setProgress] = useState<Progress>({ at: "fresh" });
  const [loot, setLoot] = useState<Loot>({ rule: "ltr" });

  /*
   * A rule the new content cannot use is dropped rather than carried over.
   *
   * Picking a savage fight, choosing Book run, then changing to an extreme
   * would otherwise leave the party advertising a rule about tokens that
   * trial does not drop — set once, invisible afterwards, and wrong.
   */
  const okRules = lootRulesFor(chosen?.kind);
  const safeLoot: Loot = okRules.length && !okRules.includes(loot.rule)
    ? { rule: okRules[0] } : loot;
  const [spot, setSpot] = useState<Spot | undefined>(undefined);
  /** The person being added as a floater, before their positions are set. */
  const [adding, setAdding] = useState<Floater | null>(null);
  const [fq, setFq] = useState("");
  const [picking, setPicking] = useState<SlotDef | null>(null);
  const [q, setQ] = useState("");

  const minutes = unit === "food" ? foodToMinutes(amount) : Math.round(amount * 60);

  // Recomputed on every render rather than held in state: "now" moves, and a
  // floor captured when the form opened would let a slow form-filler set a
  // time that had quietly become the past.
  const min = earliest();
  const past = !!start && start < min;

  const draft: Party = useMemo(() => ({
    id: "draft",
    contentKey, note: note.trim() || undefined, body,
    // Only where there is a fight to be partway through.
    progress: isFight(chosen?.kind) ? progress : undefined,
    loot: hasLoot(chosen?.kind) ? safeLoot : undefined,
    spot: hasSpot(chosen?.kind) ? spot : undefined,
    shape: useShape,
    startsAt: fromBangkokLocal(start),
    lengthMinutes: minutes, lengthUnit: unit,
    ownerCharacterId: me.id,
    seats, closed, rules, oneOfEachJob: oneEach, floating,
    createdAt: new Date().toISOString(),
  }), [contentKey, note, useShape, start, minutes, unit, me.id, seats, closed,
       rules, oneEach, floating, body, progress, safeLoot, spot, chosen?.kind]);

  const mySeat = Object.entries(seats).find(([, v]) => v.characterId === me.id)?.[0];
  const iAmFloating = floating.some((f) => f.characterId === me.id);

  /**
   * Somebody who is not on this site, added by typing their name.
   *
   * Offered only once the search has come back with nothing useful, so it is
   * the answer to "they are not here" rather than a shortcut past looking. A
   * name and no id: no page to link to, no picture, and nothing that pretends
   * otherwise.
   */
  const outsider = (name: string) => ({
    characterId: null, name: name.trim(), avatar: null,
    confirmedAt: new Date().toISOString(),
  });

  /** Everybody already in, seated or floating — nobody joins twice. */
  const inParty = useMemo(() => new Set([
    ...Object.values(seats).map(whoKey),
    ...floating.map(whoKey),
  ]), [seats, floating]);

  const suggestions = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return people.filter((p) => !inParty.has(`c${p.id}`)
                    && p.name.toLowerCase().includes(s)).slice(0, 8);
  }, [q, people, inParty]);

  const floatSuggestions = useMemo(() => {
    const s = fq.trim().toLowerCase();
    if (s.length < 2) return [];
    return people.filter((p) => !inParty.has(`c${p.id}`)
                    && p.name.toLowerCase().includes(s)).slice(0, 8);
  }, [fq, people, inParty]);

  function place(slot: SlotDef, p: PersonOption) {
    setSeats((v) => ({
      ...v,
      [slot.id]: {
        characterId: p.id, name: p.name, avatar: p.avatar,
        // The creator is in by definition. Everybody else is invited, and the
        // seat says so until they answer.
        confirmedAt: p.id === me.id ? new Date().toISOString() : null,
      },
    }));
    setQ("");
  }

  function seatOutsider(slot: SlotDef, name: string) {
    if (!name.trim()) return;
    setSeats((v) => ({ ...v, [slot.id]: outsider(name) }));
    setQ("");
  }

  function setFlex(slotId: string, f: Flex) {
    setSeats((v) => ({ ...v, [slotId]: { ...v[slotId], flex: f } }));
  }

  const ready = !!chosen && !!start && !past && minutes > 0
    && (!!mySeat || iAmFloating);
  const sel = "rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink";
  const sitting = picking ? seats[picking.id] : undefined;

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-accent/40 bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[15px] font-semibold">New party</h3>
        <button onClick={onCancel} className="text-[12.5px] text-muted hover:text-ink">
          Cancel
        </button>
      </div>

      <ContentPicker content={content} value={contentKey}
                     onChange={(k) => { setContentKey(k); setShape(""); }} />

      <div className="flex flex-wrap items-center gap-2.5">
        {chosen?.fixedShape ? (
          // Stated, not offered. The size is a fact about the fight, and the
          // form says which fact it has taken rather than leaving a dead
          // control that cannot be moved.
          <span className="rounded-lg border border-line bg-bg/40 px-3 py-2 text-[13px] text-muted">
            {shapeLabel(useShape, chosen?.kind)}
            <span className="ml-1.5 opacity-70">· set by the content</span>
          </span>
        ) : (
          <select value={useShape} onChange={(e) => setShape(e.target.value as Shape)}
                  className={sel} aria-label="Party size">
            {(["light", "cc", "full", "alliance", "open"] as Shape[]).map((s) => (
              <option key={s} value={s}>{SHAPE_LABEL[s]}</option>
            ))}
          </select>
        )}

        <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 140))}
               placeholder="One line for the list — which map, which phase, voice or not"
               className={`${sel} min-w-[16rem] flex-1 placeholder:text-muted`} />
      </div>

      {isFight(chosen?.kind) && (
        <ProgressTrack value={progress} onChange={setProgress} />
      )}

      {/* Asked whatever the progress is: a prog night that unexpectedly kills
          the boss still has to answer this, and one in the morning with a chest
          already open is the worst time to start. */}
      {hasLoot(chosen?.kind) && (
        <LootPlan value={safeLoot} onChange={setLoot} kind={chosen?.kind} />
      )}

      {hasSpot(chosen?.kind) && <WherePicker value={spot} onChange={setSpot} />}

      <BodyEditor body={body} onChange={setBody} userId={userId} />

      {/* ── When, in Thai time, and for how long ──────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-1">
          <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
            Starts (Thai time)
          </span>
          <input type="datetime-local" value={start} min={min}
                 onChange={(e) => setStart(e.target.value)}
                 className={`${sel} ${past ? "border-chili/60" : ""}`} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
            For
          </span>
          <span className="flex items-stretch gap-1.5">
            <input type="number" min={unit === "food" ? 1 : 0.5}
                   step={unit === "food" ? 1 : 0.5} value={amount}
                   onChange={(e) => setAmount(Number(e.target.value) || 0)}
                   className={`${sel} w-20`} />
            {/* Food is first because it is the unit the FC already uses. */}
            <span className="flex items-center gap-1.5">
              {unit === "food" && <FoodIcon size={16} className="text-gold" />}
              <select value={unit} onChange={(e) => setUnit(e.target.value as "hours" | "food")}
                      className={sel} aria-label="Unit">
                <option value="food">food</option>
                <option value="hours">hours</option>
              </select>
            </span>
          </span>
        </label>

        <p className={`pb-2 text-[12px] ${past ? "text-chili" : "text-muted"}`}>
          {past ? "That is already past — pick a later time."
            : <>
                {unit === "food" && (
                  <>
                    <FoodIcon size={12} className="text-gold" /> 1 food
                    {" "}= {FOOD_MINUTES} min ·{" "}
                  </>
                )}
                {fmtTime(draft.startsAt)} → {fmtTime(endsAt(draft))}
              </>}
        </p>
      </div>

      {/* ── Who ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
            {mySeat ? "Seats — click one to fill it, invite somebody, or set their flex"
                    : "Pick your own seat first"}
          </span>
          {/* One switch for the party, not one per seat. Whichever seat was
              left unticked is where the duplicate would land, so a rule that
              is not everywhere is not a rule. */}
          {useShape !== "open" && (
            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <input type="checkbox" checked={oneEach}
                     onChange={(e) => setOneEach(e.target.checked)} />
              One player per job
              <span className="opacity-70">— no two people on the same job</span>
            </label>
          )}
        </div>
        <PartySeats party={draft} onPick={setPicking} kind={chosen?.kind} />
      </div>

      {/* ── People who have not picked a seat ─────────────────────────────── */}
      {/* An open party has no seats, so this list is not "the flexible ones",
          it is everybody. Same control, different question. */}
      <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
              {useShape === "open" ? "Who is coming" : "Flexible — no seat yet"}
            </span>
            <span className="text-[11.5px] text-muted">
              {useShape === "open"
                ? "Nobody is in a party — everybody queues on their own."
                : "They show on every seat they could take, and drop into whichever one is left."}
            </span>
          </div>

          {floating.map((f) => (
            <div key={f.characterId ?? f.name}
                 className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface px-2 py-1.5">
              {face(f.characterId, f.avatar) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={face(f.characterId, f.avatar)!} alt="" width={34} height={34}
                     className="size-[34px] rounded-full border border-line object-cover" />
              ) : (
                <span className={`grid size-[34px] place-items-center rounded-full text-[13px] text-muted ${
                        f.characterId == null
                          ? "border border-dashed border-line" : "border border-line"}`}>
                  {f.characterId == null ? "?" : ""}
                </span>
              )}
              <span className="text-[13px] text-ink">{f.name}</span>
              {f.characterId == null && (
                <span className="font-data text-[9.5px] uppercase tracking-[0.1em] text-muted">
                  outside the FC
                </span>
              )}
              <span className="font-data text-[10px] uppercase tracking-[0.1em] text-jade">
                {useShape === "open" ? "" : flexLabel(f.flex) ?? "no positions yet"}
              </span>
              <button onClick={() => setAdding(f)}
                      className="ml-auto text-[11.5px] text-muted underline hover:text-ink">
                change
              </button>
              <button onClick={() => setFloating((v) => v.filter((x) => x !== f))}
                      className="text-[11.5px] text-chili hover:underline">
                remove
              </button>
            </div>
          ))}

          {adding ? (
            <div className="flex flex-col gap-2">
              {useShape !== "open" && (
                <>
                  <span className="text-[12.5px] text-ink">
                    What can {adding.name} play?
                  </span>
                  <FlexEditor shape={useShape} seatId=""
                              value={adding.flex}
                              onChange={(fx) => setAdding({ ...adding, flex: fx })} />
                </>
              )}
              <div className="flex gap-2">
                <button disabled={useShape !== "open" && !canFlex(adding.flex)}
                        onClick={() => {
                          setFloating((v) => [
                            ...v.filter((x) => whoKey(x) !== whoKey(adding)),
                            adding,
                          ]);
                          setAdding(null);
                        }}
                        className="rounded-lg border border-accent bg-accent/15 px-3 py-1 text-[12.5px] text-accent disabled:opacity-40">
                  Done
                </button>
                <button onClick={() => setAdding(null)}
                        className="text-[12.5px] text-muted hover:text-ink">
                  Cancel
                </button>
              </div>
              {useShape !== "open" && !canFlex(adding.flex) && (
                <span className="text-[11.5px] text-muted">
                  Pick at least one thing they can play, or put them in a seat
                  instead.
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-2">
                {!mySeat && !iAmFloating && (
                  <button onClick={() => setAdding({
                            characterId: me.id, name: me.name, avatar: me.avatar,
                            flex: useShape === "open" ? { all: true } : {},
                            confirmedAt: new Date().toISOString(),
                          })}
                          className="rounded-lg border border-accent bg-accent/15 px-3 py-1 text-[12.5px] text-accent">
                    {useShape === "open" ? "I am coming" : "I will flex"}
                  </button>
                )}
              </div>
              <input value={fq} onChange={(e) => setFq(e.target.value)}
                     placeholder="Add somebody who can flex…"
                     className={`${sel} w-full placeholder:text-muted`} />
              {fq.trim().length >= 2 && !floatSuggestions.length && (
                <button onClick={() => {
                          setAdding({ ...outsider(fq),
                                      flex: useShape === "open" ? { all: true } : {} });
                          setFq("");
                        }}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-line px-2.5 py-2 text-left hover:border-accent/60">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-line text-[13px] text-muted">
                    ?
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] text-ink">
                      Add &ldquo;{fq.trim()}&rdquo;
                    </span>
                    <span className="text-[11.5px] text-muted">
                      Somebody from outside the FC, or not on this site
                    </span>
                  </span>
                </button>
              )}
              {floatSuggestions.map((p) => (
                <button key={p.id}
                        onClick={() => {
                          setAdding({
                            characterId: p.id, name: p.name, avatar: p.avatar,
                            flex: useShape === "open" ? { all: true } : {},
                            confirmedAt: null,
                          });
                          setFq("");
                        }}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface">
                  {face(p.id, p.avatar) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={face(p.id, p.avatar)!} alt="" width={36} height={36}
                         className="size-9 rounded-full border border-line object-cover" />
                  ) : <span className="size-9 rounded-full border border-line" />}
                  <span className="text-[13px] text-ink">{p.name}</span>
                </button>
              ))}
            </div>
          )}
      </div>

      {picking && (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-card p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-ink">
              {sitting ? `${sitting.name} — ${picking.label}` : `Who is in ${picking.label}?`}
            </span>
            <button onClick={() => setPicking(null)}
                    className="text-[12px] text-muted hover:text-ink">close</button>
          </div>

          {sitting ? (
            <>
              {/* Which job they are on. Needed before "one player per job"
                  means anything: a party where nobody has said what they are
                  playing has no duplicates to avoid. */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-data text-[10px] uppercase tracking-[0.12em] text-muted">
                  Playing
                </span>
                {jobsForRole(picking.role).map((job) => (
                  <button key={job} type="button"
                          onClick={() => setSeats((v) => ({
                            ...v,
                            [picking.id]: {
                              ...v[picking.id],
                              job: v[picking.id].job === job ? null : job,
                            },
                          }))}
                          title={job}
                          className={`rounded-full border p-1 transition-colors ${
                            sitting.job === job ? "border-accent bg-accent/15"
                              : "border-line opacity-60 hover:opacity-100"}`}>
                    <JobIcon job={job} size={22} />
                  </button>
                ))}
              </div>

              <FlexEditor shape={useShape} seatId={picking.id}
                          value={sitting.flex ?? {}}
                          onChange={(f) => setFlex(picking.id, f)} />
              {sitting.characterId !== me.id && (
                <button onClick={() => {
                          setSeats((v) => { const n = { ...v }; delete n[picking.id]; return n; });
                          setPicking(null);
                        }}
                        className="self-start rounded-lg border border-chili/50 px-3 py-1 text-[12.5px] text-chili hover:bg-chili/10">
                  Take them out of this seat
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {!mySeat && (
                  <button onClick={() => place(picking, me)}
                          className="rounded-lg border border-accent bg-accent/15 px-3 py-1 text-[12.5px] text-accent">
                    That is me
                  </button>
                )}
                {closed.includes(picking.id) ? (
                  <button onClick={() => setClosed((v) => v.filter((id) => id !== picking.id))}
                          className="rounded-lg border border-line px-3 py-1 text-[12.5px] text-muted hover:text-ink">
                    Look for somebody after all
                  </button>
                ) : (
                  <button onClick={() => { setClosed((v) => [...v, picking.id]); setPicking(null); }}
                          className="rounded-lg border border-line px-3 py-1 text-[12.5px] text-muted hover:text-ink">
                    Not looking for this seat
                  </button>
                )}
              </div>
              {/* What the seat is advertising for. On an empty seat only:
                  a rule about who may sit here is a question about the seat,
                  and once somebody is in it the answer is their name. */}
              <JobRule party={draft} slot={picking}
                       value={rules[picking.id] ?? {}}
                       onChange={(r) => setRules((v) => ({ ...v, [picking.id]: r }))} />

              <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
                     placeholder="Search the roster…"
                     className={`${sel} w-full placeholder:text-muted`} />
              {suggestions.map((p) => (
                <button key={p.id} onClick={() => place(picking, p)}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface">
                  {face(p.id, p.avatar) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={face(p.id, p.avatar)!} alt="" width={36} height={36}
                         className="size-9 rounded-full border border-line object-cover" />
                  ) : <span className="size-9 rounded-full border border-line" />}
                  <span className="text-[13px] text-ink">{p.name}</span>
                  {p.guest && <span className="text-[11px] text-muted">guest</span>}
                </button>
              ))}
              {/* Nobody on the site by that name. Offered after the search
                  rather than beside it, so it reads as the answer to "they are
                  not in here" instead of a way round looking. */}
              {q.trim().length >= 2 && !suggestions.length && (
                <button onClick={() => seatOutsider(picking, q)}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-line px-2.5 py-2 text-left hover:border-accent/60">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-line text-[13px] text-muted">
                    ?
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] text-ink">
                      Add &ldquo;{q.trim()}&rdquo;
                    </span>
                    <span className="text-[11.5px] text-muted">
                      Somebody from outside the FC, or not on this site
                    </span>
                  </span>
                </button>
              )}

              <p className="text-[11.5px] text-muted">
                Anybody you place is invited, not booked — the seat says
                &ldquo;awaiting reply&rdquo; until they accept, the same as a photo tag.
                Somebody from outside is taken at your word.
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button disabled={!ready || busy}
                onClick={() => void onAdd({ ...draft, id: "new" })}
                className="rounded-lg border border-accent bg-accent/15 px-4 py-1.5 text-[13px] text-accent hover:bg-accent/25 disabled:opacity-40">
          {busy ? "Putting it up…" : "Put it on the board"}
        </button>
        {!mySeat && !iAmFloating && (
          <span className="text-[12px] text-muted">
            Take a seat, or say you will flex.
          </span>
        )}
      </div>
    </div>
  );
}

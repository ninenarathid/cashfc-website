"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PersonOption } from "@/lib/people";
import type {
  ContentDef, ContentSeed, LootRule, Party, PartyComment, ProgressAt, SlotRole,
} from "@/lib/party";
import type { DutyArt } from "@/lib/duty";
import {
  KIND_COLOR, KIND_ICON, KIND_LABEL, KIND_ORDER, ROLE_COLOR, ROLE_LABEL, SHAPE_LABEL,
  LOOT_LABEL, PROGRESS_LABEL, catalogue, dayKey, endsAt, fmtDay, fmtFood, shapeLabel,
  fmtLength, fmtTime, hasBody, lootText, needsByRole, progressText,
  resolveParty, slotsOf, spotText,
} from "@/lib/party";
import { createClient } from "@/lib/supabase/client";
import { addComment, createParty, loadParties } from "@/lib/party-db";
import PartySeats, { NeedLine, seatState } from "@/components/party/PartySeats";
import { OneEachMark } from "@/components/party/JobRule";
import TagIcon from "@/components/TagIcon";
import FoodIcon from "@/components/party/FoodIcon";
import { PartyBody } from "@/components/party/PartyBody";
import { ProgressChip } from "@/components/party/ProgressTrack";
import { LootChip } from "@/components/party/LootPlan";
import { SpotChip } from "@/components/party/WherePicker";
import PartyComments from "@/components/party/PartyComments";
import { useAvatarOverrides } from "@/lib/avatars";
import PartyCreate from "@/components/party/PartyCreate";

/**
 * Who is running what, and when.
 *
 * The FC arranges everything in Discord, where a party posted on Tuesday is
 * eight messages up by Wednesday and the only way to know whether it still
 * needs a healer is to read the replies. This is the same information as a list
 * that can be filtered: what, when, and which seats are still open.
 *
 * Built on the member board's chrome on purpose — the chip row, the search box,
 * the panel of narrowing controls underneath. Not to save work: it is the same
 * question ("who, out of many, matches what I want?") and somebody who has used
 * one page should not have to learn a second set of controls to use the other.
 *
 * Who may look is not decided here. This draws a board for whoever is handed to
 * it, and PartyFinder is the one that says who that may be — so the view can be
 * rendered and looked at without an admin session, which is the only way it
 * could be checked at all while the page is shut.
 */

type Sort = "soon" | "new" | "open";
type When = "" | "today" | "3d" | "week";

const EMPTY = {
  role: "" as SlotRole | "", when: "" as When, mine: false, openOnly: false,
  prog: "" as ProgressAt | "",
  loot: "" as LootRule | "",
};

export default function PartyBoard(
  { people, extremes, savage, ultimates, alliances, criterions, art, me, userId }: {
    people: PersonOption[];
    extremes: ContentSeed[];
    savage: ContentSeed[];
    ultimates: ContentSeed[];
    alliances: ContentSeed[];
    criterions: ContentSeed[];
    art: DutyArt;
    /** Whoever is reading, for "I am in it" and for taking a seat. */
    me: PersonOption | null;
    /** Their account, which is what the tables are written as. */
    userId: string | null;
  },
) {
  // Chosen pictures over Lodestone portraits, the same order as everywhere else.
  const overrides = useAvatarOverrides();
  const face = (id: number | null | undefined, fallback: string | null) =>
    (id != null && overrides[id]) || fallback || null;

  const content = useMemo(
    () => catalogue({ extremes, savage, ultimates, alliances, criterions, art }),
    [extremes, savage, ultimates, alliances, criterions, art]);
  const byKey = useMemo(
    () => Object.fromEntries(content.map((c) => [c.key, c])) as Record<string, ContentDef>,
    [content]);

  const [supabase] = useState(createClient);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>("soon");
  const [adv, setAdv] = useState(EMPTY);

  // The sample board, once there is a roster to build it from.
  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setParties(await loadParties(supabase));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void refresh(); }, [refresh]);

  const kindCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of parties) {
      const k = byKey[p.contentKey]?.kind;
      if (k) c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [parties, byKey]);

  /*
   * Everything the reader has narrowed to, except by progress and by loot.
   *
   * Split out because those two controls have to know whether they are worth
   * offering, and they cannot ask a list they have already filtered — a board
   * showing only farm parties would report that progress is worth filtering on
   * because it is, circularly, filtered on. This is the list they are choosing
   * from, which is the honest thing to ask.
   */
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const horizon = adv.when === "today" ? 1 : adv.when === "3d" ? 3 : adv.when === "week" ? 7 : 0;

    const out = parties.filter((p) => {
      // Gone by is gone: a party that finished an hour ago is history, and the
      // board is for what is still to come.
      if (new Date(endsAt(p)).getTime() < now) return false;

      const c = byKey[p.contentKey];
      if (kinds.size && (!c || !kinds.has(c.kind))) return false;

      if (q) {
        const hay = [c?.name, c?.short, c?.badge, c?.duty, p.note,
                     progressText(p.progress), lootText(p.loot), spotText(p.spot),
                     ...Object.values(p.seats).map((s) => s.name)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (horizon) {
        const days = (new Date(p.startsAt).getTime() - now) / 86_400_000;
        if (days > horizon) return false;
      }

      if (adv.role) {
        if (!needsByRole(p)[adv.role]) return false;
      }
      if (adv.openOnly && !slotsOf(p.shape).some((s) => seatState(p, s.id) === "open")) {
        // "Open" means a seat somebody could take. A hunt train has none and is
        // always joinable, so it stays.
        if (p.shape !== "open") return false;
      }
      if (adv.mine && me) {
        const inIt = p.ownerCharacterId === me.id
          || Object.values(p.seats).some((s) => s.characterId === me.id);
        if (!inIt) return false;
      }
      return true;
    });

    return out;
  }, [parties, byKey, query, kinds, adv, me]);

  const anyProgress = useMemo(() => base.some((p) => p.progress), [base]);
  const anyLoot = useMemo(() => base.some((p) => p.loot), [base]);

  const shown = useMemo(() => {
    // The most useful pair of filters on the page: somebody who wants a farm
    // run and somebody who wants to learn the fight are looking for opposite
    // things in the same list.
    const out = base.filter((p) =>
      (!adv.prog || p.progress?.at === adv.prog)
      && (!adv.loot || p.loot?.rule === adv.loot));

    const openCount = (p: Party) =>
      slotsOf(p.shape).filter((s) => seatState(p, s.id) === "open").length;

    return [...out].sort((a, b) =>
      sort === "new" ? b.createdAt.localeCompare(a.createdAt)
      : sort === "open" ? openCount(b) - openCount(a)
                          || a.startsAt.localeCompare(b.startsAt)
      : a.startsAt.localeCompare(b.startsAt));
  }, [base, adv.prog, adv.loot, sort]);

  /** Grouped by the day they fall on in Bangkok, which is how people read a schedule. */
  const days = useMemo(() => {
    const m = new Map<string, Party[]>();
    for (const p of shown) {
      const k = dayKey(p.startsAt);
      (m.get(k) ?? m.set(k, []).get(k)!).push(p);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);

  /*
   * A filter for something nothing on the board has is a control that can only
   * ever empty the list.
   *
   * Progress and loot belong to a handful of kinds -- loot to savage and
   * extreme alone -- so on an evening of hunt trains and photo shoots both
   * controls are questions about nothing. They come back the moment somebody
   * puts up a fight, and are counted from what is actually listed rather than
   * from what the model allows, so they follow the board rather than the code.
   */
  // A filter left set on a control that has just gone away would keep filtering
  // invisibly, which is the worst way for a list to be empty.
  useEffect(() => {
    if ((!anyProgress && adv.prog) || (!anyLoot && adv.loot)) {
      setAdv((v) => ({
        ...v,
        prog: anyProgress ? v.prog : "",
        loot: anyLoot ? v.loot : "",
      }));
    }
  }, [anyProgress, anyLoot, adv.prog, adv.loot]);

  const advCount = (adv.role ? 1 : 0) + (adv.when ? 1 : 0)
    + (adv.mine ? 1 : 0) + (adv.openOnly ? 1 : 0) + (adv.prog ? 1 : 0)
    + (adv.loot ? 1 : 0);

  const sel = "rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-[22px] font-semibold">
            Party finder
            <span className="rounded-md border border-gold/50 bg-gold/10 px-2 py-[2px] font-data text-[10.5px] uppercase tracking-[0.14em] text-gold">
              WIP
            </span>
          </h1>
          <p className="mt-1 text-[12.5px] text-muted">
            All times are Thai time (UTC+7).
          </p>
        </div>
        {!writing && (
          <button onClick={() => setWriting(true)}
                  className="rounded-lg border border-accent bg-accent/15 px-3.5 py-1.5 text-[13px] text-accent hover:bg-accent/25">
            + New party
          </button>
        )}
      </header>

      {writing && me && userId && (
        <PartyCreate content={content} people={people} me={me} userId={userId}
                     busy={saving}
                     onCancel={() => setWriting(false)}
                     onAdd={async (p) => {
                       setSaving(true);
                       setErr(null);
                       const r = await createParty(supabase!, userId, p);
                       setSaving(false);
                       if ("error" in r) { setErr(r.error); return; }
                       setWriting(false);
                       // Read it back rather than dropping the local copy in:
                       // the row that matters is the one the database kept, and
                       // it is the only one with a real id to comment against.
                       await refresh();
                     }} />
      )}

      {err && (
        <p className="rounded-lg border border-chili/50 bg-chili/10 px-3 py-2 text-[12.5px] text-chili">
          {err}
        </p>
      )}

      {/* ── The chip row, as on the member board ──────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {KIND_ORDER.map((k) => {
          const on = kinds.has(k);
          const n = kindCounts[k] ?? 0;
          return (
            <button key={k}
                    onClick={() => setKinds((v) => {
                      const next = new Set(v);
                      if (!next.delete(k)) next.add(k);
                      return next;
                    })}
                    style={on ? { borderColor: KIND_COLOR[k], color: KIND_COLOR[k],
                                  background: `color-mix(in srgb, ${KIND_COLOR[k]} 12%, transparent)` }
                              : undefined}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] transition-colors ${
                      on ? "" : "border-line text-muted hover:border-muted hover:text-ink"} ${
                      !n && !on ? "opacity-45" : ""}`}>
              {KIND_ICON[k] && <TagIcon tag={KIND_ICON[k]!} size={14} />}
              {KIND_LABEL[k]}
              <small className="ml-1.5 font-data opacity-70">{n}</small>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
               placeholder="Search a fight, a note, or somebody already in"
               aria-label="Search parties"
               className={`${sel} min-w-[200px] flex-1 placeholder:text-muted`} />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Sort by" className={sel}>
          <option value="soon">Starting soonest</option>
          <option value="new">Just posted</option>
          <option value="open">Most seats open</option>
        </select>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5">
        {advCount > 0 && (
          <button onClick={() => setAdv(EMPTY)}
                  className="self-end text-[12.5px] text-muted underline hover:text-ink">
            Clear {advCount}
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
            Needs
          </span>
          <select value={adv.role}
                  onChange={(e) => setAdv({ ...adv, role: e.target.value as SlotRole | "" })}
                  className={sel} aria-label="Role wanted">
            <option value="">Any role</option>
            {(Object.keys(ROLE_LABEL) as SlotRole[]).map((r) => (
              <option key={r} value={r}>Wants a {ROLE_LABEL[r]}</option>
            ))}
          </select>

          {anyProgress && (
            <>
              <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
                Progress
              </span>
              <select value={adv.prog}
                      onChange={(e) => setAdv({ ...adv, prog: e.target.value as ProgressAt | "" })}
                      className={sel} aria-label="How far in">
                <option value="">Any progress</option>
                {(Object.keys(PROGRESS_LABEL) as ProgressAt[]).map((k) => (
                  <option key={k} value={k}>{PROGRESS_LABEL[k]}</option>
                ))}
              </select>
            </>
          )}

          {anyLoot && (
            <>
              <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
                Loot
              </span>
              <select value={adv.loot}
                      onChange={(e) => setAdv({ ...adv, loot: e.target.value as LootRule | "" })}
                      className={sel} aria-label="Loot rule">
                <option value="">Any loot rule</option>
                {(Object.keys(LOOT_LABEL) as LootRule[]).map((k) => (
                  <option key={k} value={k}>{LOOT_LABEL[k]}</option>
                ))}
              </select>
            </>
          )}

          <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
            When
          </span>
          <select value={adv.when}
                  onChange={(e) => setAdv({ ...adv, when: e.target.value as When })}
                  className={sel} aria-label="How soon">
            <option value="">Any time</option>
            <option value="today">Within a day</option>
            <option value="3d">Within three days</option>
            <option value="week">Within a week</option>
          </select>

          <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <input type="checkbox" checked={adv.openOnly}
                   onChange={(e) => setAdv({ ...adv, openOnly: e.target.checked })} />
            Still has room
          </label>
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <input type="checkbox" checked={adv.mine}
                   onChange={(e) => setAdv({ ...adv, mine: e.target.checked })} />
            I am in it
          </label>
        </div>
      </div>

      <p className="text-[12.5px] text-muted">
        {shown.length} {shown.length === 1 ? "party" : "parties"}
      </p>

      {/* ── The list, by day ─────────────────────────────────────────────── */}
      {loading && (
        <p className="px-4 py-10 text-center text-[13px] text-muted">Loading…</p>
      )}

      {!loading && days.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[13px] text-muted">
          Nothing matches. Try clearing a filter, or put one up yourself.
        </p>
      )}

      {days.map(([key, list]) => (
        <section key={key} className="flex flex-col gap-2">
          <h2 className="font-data text-[11px] uppercase tracking-[0.14em] text-muted">
            {fmtDay(list[0].startsAt)}
          </h2>
          {list.map((p) => {
            const c = byKey[p.contentKey];
            const tint = c ? KIND_COLOR[c.kind] : "#8b93a1";
            const open = openId === p.id;
            const res = resolveParty(p);
            const inIt = [...Object.values(res.seats), ...res.loose];
            // Whoever put it up, wherever they ended up -- seated, or still
            // floating between two seats they offered for.
            const owner = inIt.find((m) => m.characterId === p.ownerCharacterId);
            return (
              <article key={p.id}
                       className="overflow-hidden rounded-xl border border-line bg-surface">
                {/*
                  * A poster rather than a line of chips.
                  *
                  * The picture is the left rail at full height, and a row with
                  * no picture gets a block in its kind's colour with the game's
                  * own badge on it — so every title starts at the same x. The
                  * old row could not manage that: a thumbnail on some rows and
                  * not others gave a column of eight rows two title columns.
                  *
                  * The time goes on the rail, over the art, where a poster puts
                  * it. Everything that used to be a coloured chip is one muted
                  * line of dots underneath, because those are the terms of the
                  * evening rather than five separate alarms — and the only
                  * coloured thing left is what the party is short of, which is
                  * the one fact a reader is actually deciding on.
                  */}
                <button onClick={() => setOpenId(open ? null : p.id)}
                        className="flex w-full items-stretch text-left hover:bg-card/30">
                  <span style={{
                          backgroundImage: c?.art ? `url(${c.art})` : undefined,
                          backgroundPosition: c?.focus ?? "center",
                          backgroundColor: c?.art ? undefined
                            : `color-mix(in srgb, ${tint} 22%, var(--color-bg))`,
                        }}
                        className="relative flex w-[100px] shrink-0 items-end bg-cover bg-center p-2 sm:w-[124px]">
                    <span aria-hidden
                          className="absolute inset-0 bg-gradient-to-t from-black/85 to-black/25" />
                    {!c?.art && c && (c.icon || KIND_ICON[c.kind]) && (
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90">
                        <TagIcon tag={c.icon ?? KIND_ICON[c.kind]!} size={34} />
                      </span>
                    )}
                    <span className="relative z-[1] font-data text-[18px] font-semibold tabular-nums text-white drop-shadow">
                      {fmtTime(p.startsAt)}
                    </span>
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3.5 py-3">
                    <span className="flex flex-wrap items-baseline gap-2">
                      {c && (c.icon || KIND_ICON[c.kind]) && (
                        <TagIcon tag={c.icon ?? KIND_ICON[c.kind]!} size={17} />
                      )}
                      <span className="font-display text-[16px] font-semibold text-ink">
                        {c?.duty ?? c?.name ?? p.contentKey}
                      </span>
                      {/* The shorthand as a badge beside the name rather than
                          instead of it: the old row printed "Hunt train Hunt
                          train" wherever a content had no separate short form. */}
                      {c?.badge && c.badge !== c.duty && (
                        <span style={{ color: tint,
                                       borderColor: `color-mix(in srgb, ${tint} 45%, transparent)` }}
                              className="rounded border px-1.5 font-data text-[11px] font-bold">
                          {c.badge}
                        </span>
                      )}
                    </span>

                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                      <span className="flex items-center gap-1">
                        {fmtLength(p.lengthMinutes)}
                        {p.lengthUnit === "food" && (
                          <><FoodIcon size={11} className="text-gold" />
                            {fmtFood(p.lengthMinutes)}</>
                        )}
                      </span>
                      <span className="opacity-40">·</span>
                      <span>{shapeLabel(p.shape, c?.kind)}</span>
                      {progressText(p.progress) && (
                        <><span className="opacity-40">·</span>
                          <span>{progressText(p.progress)}</span></>
                      )}
                      {lootText(p.loot) && (
                        <><span className="opacity-40">·</span>
                          <span>{lootText(p.loot)}</span></>
                      )}
                      {p.oneOfEachJob && (
                        <><span className="opacity-40">·</span>
                          <span>one player per job</span></>
                      )}
                      {spotText(p.spot) && (
                        <><span className="opacity-40">·</span>
                          <span>📍 {spotText(p.spot)}</span></>
                      )}
                    </span>

                    {p.note && (
                      <span className="truncate text-[13px] text-ink/70">{p.note}</span>
                    )}
                  </span>

                  <span className="flex shrink-0 flex-col items-end justify-center gap-2 py-3 pr-3.5">
                    <span className="flex items-center gap-2.5">
                      {/* Who is already in it. The strongest reason to join a
                          party is that other people have, and the row said
                          nothing at all about that before. */}
                      <span className="hidden -space-x-2 sm:flex">
                        {inIt.slice(0, 6).map((m, i) => {
                          const src = face(m.characterId, m.avatar);
                          return src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt={m.name} title={m.name}
                                 width={34} height={34}
                                 className="size-[34px] rounded-full border-2 border-surface object-cover" />
                          ) : (
                            <span key={i} title={m.name}
                                  className={`grid size-[34px] place-items-center rounded-full border-2 border-surface text-[12px] text-muted ${
                                    m.characterId == null ? "bg-bg" : "bg-card"}`}>
                              {m.characterId == null ? "?" : ""}
                            </span>
                          );
                        })}
                        {inIt.length > 6 && (
                          <span className="grid size-[34px] place-items-center rounded-full border-2 border-surface bg-card font-data text-[11px] text-muted">
                            +{inIt.length - 6}
                          </span>
                        )}
                      </span>
                      <NeedLine party={p} />
                    </span>

                    <span className="flex items-center gap-2">
                      {!!p.comments?.length && (
                        <span className="font-data text-[11.5px] text-muted">
                          💬 {p.comments.length}
                        </span>
                      )}
                      {owner && face(owner.characterId, owner.avatar) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={face(owner.characterId, owner.avatar)!} alt=""
                             width={32} height={32}
                             className="size-8 rounded-full border border-line object-cover" />
                      )}
                      <span className="text-[12.5px] text-muted">{owner?.name}</span>
                    </span>
                  </span>
                </button>

                {open && (
                  <div className="flex flex-col gap-3 border-t border-line px-3.5 py-3">
                    {/* The write-up first, then who is in it. What the party is
                        doing is the thing somebody opened the row to read; the
                        seats are the answer to whether they can join it. */}
                    {hasBody(p.body) && <PartyBody body={p.body!} />}

                    <PartySeats party={p} kind={c?.kind} />
                    <p className="text-[11.5px] text-muted">
                      {/* The boss, which the row above has no room for: it
                          leads with what people say and what you queue for,
                          and this is the third name the same fight has. */}
                      {c?.name && c.name !== c.badge && c.name !== c.duty && (
                        <>{c.name} · </>
                      )}
                      {fmtDay(p.startsAt)} · {fmtTime(p.startsAt)} → {fmtTime(endsAt(p))}
                      {" "}Thai time
                    </p>

                    <PartyComments comments={p.comments ?? []} me={me}
                                   userId={userId}
                                   onAdd={async (c: PartyComment) => {
                                     // On the screen first: a reply that waits
                                     // for a round trip before appearing reads
                                     // as a reply that did not send.
                                     setParties((v) => v.map((x) => (x.id === p.id
                                       ? { ...x, comments: [...(x.comments ?? []), c] }
                                       : x)));
                                     if (!supabase || !userId) return;
                                     const r = await addComment(supabase, userId, p.id, {
                                       characterId: c.author.characterId,
                                       name: c.author.name,
                                       avatar: c.author.avatar,
                                       text: c.text,
                                       images: c.images ?? [],
                                     });
                                     if ("error" in r) { setErr(r.error); void refresh(); }
                                   }} />
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}

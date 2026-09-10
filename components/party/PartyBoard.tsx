"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PersonOption } from "@/lib/people";
import type {
  ContentDef, ContentSeed, LootRule, Party, PartyComment, PartyStatus,
  ProgressAt, SlotRole,
} from "@/lib/party";
import type { DutyArt } from "@/lib/duty";
import {
  KIND_COLOR, KIND_ICON, KIND_LABEL, KIND_ORDER, ROLE_COLOR, ROLE_LABEL,
  LOOT_LABEL, PROGRESS_LABEL, STATUS_ORDER, catalogue, dayKey, endsAt, fmtDay,
  fmtTime, hasBody, lengthIsEstimate, lootText, mapsText,
  needsByRole, partyStatus, progressText, resolveParty, slotsOf, spotText,
} from "@/lib/party";
import { createClient } from "@/lib/supabase/client";
import { addComment, createParty, loadParties } from "@/lib/party-db";
import { useLiveParties } from "@/lib/party-live";
import type { SuggestRow } from "@/lib/suggest";
import { mapLabel } from "@/lib/treasure";
import { useLang } from "@/lib/i18n";
import { lengthSay, lootLine, shapeSay } from "@/lib/party-i18n";
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
import PartyJoin, { pendingAsks } from "@/components/party/PartyJoin";
import Modal from "@/components/ui/Modal";
import { StatusPill, WhenLine, useNow, statusLabel } from "@/components/party/PartyClock";
import ShareParty, { readDeepLink, writeDeepLink } from "@/components/party/ShareParty";

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

/**
 * Which of the five states to show.
 *
 * "" is the default and means everything that has not finished — the board's
 * job is what is still happening, and a finished party sitting in the list is a
 * row nobody can act on. Ended is not deleted, though: "how did Tuesday go" is
 * a real question, and one of the six settings answers it.
 */
type StatusPick = "" | PartyStatus | "all";

const EMPTY = {
  role: "" as SlotRole | "", when: "" as When, mine: false, openOnly: false,
  prog: "" as ProgressAt | "",
  loot: "" as LootRule | "",
  status: "" as StatusPick,
};


/**
 * One party, opened.
 *
 * A window rather than the row growing downwards. The row had to carry the
 * write-up, the seat grid, the join controls and the whole conversation, which
 * pushed every other party off the screen and made a link to one land on a page
 * that looked exactly like the page without it — the thing you followed the
 * link for was somewhere in the middle of a list, quietly expanded.
 *
 * Now the link arrives at the party. Which is what a link to a party should do,
 * and is the whole reason the address carries an id.
 */
function PartyDetail(
  { party, def, now, me, userId, supabase, refresh, setErr, setParties, onClose }: {
    party: Party;
    def: ContentDef | undefined;
    now: number;
    me: PersonOption | null;
    userId: string | null;
    supabase: ReturnType<typeof createClient>;
    refresh: () => Promise<void>;
    setErr: (m: string | null) => void;
    setParties: React.Dispatch<React.SetStateAction<Party[]>>;
    onClose: () => void;
  },
) {
  const { t } = useLang();
  const tint = def ? KIND_COLOR[def.kind] : "#8b93a1";
  return (
    <Modal open onOpenChange={(v) => { if (!v) onClose(); }}
           title={def?.duty ?? def?.name ?? party.contentKey}
           subtitle={party.lengthUnit === "runs"
             // No end time, because that is the point of counting in runs.
             ? `${fmtDay(party.startsAt)} · ${fmtTime(party.startsAt)}`
             : `${fmtDay(party.startsAt)} · ${fmtTime(party.startsAt)} → ${fmtTime(endsAt(party))}`}>
      <div className="flex flex-col gap-3">
        {/*
          * The still from the fight, across the top.
          *
          * A window has no row above it to have shown this already, and the
          * picture is how people recognise which evening they have opened —
          * the same reason it is on the row and on the content picker.
          */}
        <div style={{
               backgroundImage: def?.art ? `url(${def.art})` : undefined,
               backgroundPosition: def?.focus ?? "center",
               backgroundColor: def?.art ? undefined
                 : `color-mix(in srgb, ${tint} 22%, var(--color-bg))`,
             }}
             className="relative flex h-[110px] items-end overflow-hidden rounded-xl bg-cover">
          <span aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/85 to-black/20" />
          {!def?.art && def && (def.icon || KIND_ICON[def.kind]) && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90">
              <TagIcon tag={def.icon ?? KIND_ICON[def.kind]!} size={38} />
            </span>
          )}
          <span className="relative z-[1] flex w-full flex-wrap items-center gap-2 p-3">
            <span className="font-data text-[20px] font-semibold tabular-nums text-white drop-shadow">
              {fmtTime(party.startsAt)}
            </span>
            <StatusPill status={partyStatus(party, now)} />
            <WhenLine party={party} now={now}
                      className="font-data text-[11.5px] text-white/85 drop-shadow" />
            <span className="ml-auto"><ShareParty id={party.id} /></span>
          </span>
        </div>

        {party.note && (
          <p className="text-[13.5px] text-ink/80">{party.note}</p>
        )}

        {/* The terms of the evening, the way the row says them. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
          <span className="flex items-center gap-1"
                title={lengthIsEstimate(party, def?.kind) ? t("party.estimateWhy") : undefined}>
            {lengthIsEstimate(party, def?.kind) && <span className="opacity-70">~</span>}
            {party.lengthUnit === "food" && <FoodIcon size={11} className="text-gold" />}
            {lengthSay(party, t)}
          </span>
          <span className="opacity-40">·</span>
          <span>{shapeSay(party.shape, def?.kind, t)}</span>
          {progressText(party.progress) && (
            <><span className="opacity-40">·</span>
              <span>{progressText(party.progress)}</span></>
          )}
          {lootLine(party.loot, t) && (
            <><span className="opacity-40">·</span>
              <span>{lootLine(party.loot, t)}</span></>
          )}
          {mapsText(party.maps, mapLabel) && (
            <><span className="opacity-40">·</span>
              <span>🗺 {mapsText(party.maps, mapLabel)}</span></>
          )}
          {spotText(party.spot) && (
            <><span className="opacity-40">·</span>
              <span>📍 {spotText(party.spot)}</span></>
          )}
          {party.oneOfEachJob && (
            <><span className="opacity-40">·</span>
              <span>{t("party.onePerJob")}</span></>
          )}
        </p>

          {/* The write-up first, then who is in it. What the party is
              doing is the thing somebody opened the row to read; the
              seats are the answer to whether they can join it. */}
          {hasBody(party.body) && <PartyBody body={party.body!} />}

          <PartySeats party={party} kind={def?.kind} />

          <PartyJoin party={party} kind={def?.kind} me={me} userId={userId}
                     supabase={supabase}
                     onDone={refresh} onError={setErr} />

          {/* The boss, which neither the title nor the row has room for: the
              title leads with the duty you queue for, and this is the third
              name the same fight has. The clock is in the subtitle already. */}
          <p className="text-[11.5px] text-muted">
            {def?.name && def.name !== def.badge && def.name !== def.duty && (
              <>{def.name} · </>
            )}
            {t("party.thaiTime")}
            {lengthIsEstimate(party, def?.kind) && (
              <> · {t("party.estimateWhy")}</>
            )}
          </p>

          <PartyComments comments={party.comments ?? []} me={me}
                         userId={userId}
                         onReact={(cid, emoji, on, who) =>
                           // Shown at once; the write and the
                           // realtime event follow behind it.
                           setParties((v) => v.map((x) => (x.id === party.id ? {
                             ...x,
                             comments: (x.comments ?? []).map((c) => {
                               if (c.id !== cid) return c;
                               const rs = [...(c.reactions ?? [])];
                               const i = rs.findIndex((r) => r.emoji === emoji);
                               if (on) {
                                 if (i < 0) rs.push({ emoji, by: [who] });
                                 else rs[i] = { ...rs[i], by: [...rs[i].by, who] };
                               } else if (i >= 0) {
                                 const by = rs[i].by.filter(
                                   (w) => w.characterId !== who.characterId);
                                 if (by.length) rs[i] = { ...rs[i], by };
                                 else rs.splice(i, 1);
                               }
                               return { ...c, reactions: rs };
                             }),
                           } : x)))}
                         onAdd={async (c: PartyComment) => {
                           // On the screen first: a reply that waits
                           // for a round trip before appearing reads
                           // as a reply that did not send.
                           setParties((v) => v.map((x) => (x.id === party.id
                             ? { ...x, comments: [...(x.comments ?? []), c] }
                             : x)));
                           if (!supabase || !userId) return;
                           const r = await addComment(supabase, userId, party.id, {
                             characterId: c.author.characterId,
                             name: c.author.name,
                             avatar: c.author.avatar,
                             text: c.text,
                             images: c.images ?? [],
                           });
                           if ("error" in r) { setErr(r.error); void refresh(); }
                         }} />
      </div>
    </Modal>
  );
}

export default function PartyBoard(
  { people, extremes, savage, ultimates, alliances, criterions, art, me, userId,
    openParty, suggest, labels }: {
    people: PersonOption[];
    extremes: ContentSeed[];
    savage: ContentSeed[];
    /** Who plays what, for the seat suggestions. */
    suggest?: SuggestRow[];
    /** The tier's labels, which is how the savage clears are indexed. */
    labels?: string[];
    ultimates: ContentSeed[];
    alliances: ContentSeed[];
    criterions: ContentSeed[];
    art: DutyArt;
    /** Whoever is reading, for "I am in it" and for taking a seat. */
    me: PersonOption | null;
    /** Their account, which is what the tables are written as. */
    userId: string | null;
    /**
     * A party to open on arrival, from /party/[id].
     *
     * Same idea as the `?p=` in the address and handled by the same latch: the
     * page was opened *for* this party, so it stays findable whatever the
     * filters would otherwise have done with it.
     */
    openParty?: string;
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

  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>("soon");
  const [adv, setAdv] = useState(EMPTY);
  const { t } = useLang();

  /*
   * A link to one party.
   *
   * Read once, on the way in, and then held rather than re-read: the id in the
   * address is where the reader arrived, and it goes on being the party they
   * came for even after they have changed a filter that would otherwise have
   * hidden it. Sending somebody a link to Tuesday's raid and having it open on
   * an empty board because Tuesday is over would make the link useless in
   * exactly the case people share one.
   */
  const [pinned, setPinned] = useState<string | null>(openParty ?? null);
  useEffect(() => {
    if (!openParty) setPinned(readDeepLink());
  }, [openParty]);

  const [openId, setOpenIdRaw] = useState<string | null>(null);
  const setOpenId = useCallback((id: string | null) => {
    setOpenIdRaw(id);
    if (!id) setPinned(null);
    // Arriving at /party/11 and closing the window leaves you on the board,
    // not on an address for a party that is no longer open. Anywhere else the
    // id lives in the query and is simply taken out again.
    if (!id && openParty) window.history.replaceState(null, "", "/party");
    else writeDeepLink(id);
  }, [openParty]);
  /*
   * Open whatever the link named, once the board has it — and once only.
   *
   * The board reloads whenever anything on it changes, so without the latch
   * this would fire again on every seat somebody takes anywhere, and snap a
   * reader who had since opened a different party back to the one they arrived
   * on. Which is a page that will not let go of you.
   */
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || !pinned) return;
    if (!parties.some((p) => p.id === pinned)) return;
    landed.current = true;
    setOpenIdRaw(pinned);
  }, [pinned, parties]);

  /*
   * A finished party is not in the usual load at all — the query stops twelve
   * hours back, which is what keeps the common case small. So asking to see
   * ended ones, or following a link to one, is a wider read rather than a
   * filter over what is already here.
   */
  const wide = adv.status === "done" || adv.status === "all" || !!pinned;

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setParties(await loadParties(supabase, wide ? { back: 24 * 30 } : undefined));
    setLoading(false);
  }, [supabase, wide]);

  useEffect(() => { void refresh(); }, [refresh]);

  // And keeps itself current: two people looking at the last open seat should
  // not both take it because neither could see the other.
  useLiveParties(supabase, refresh);

  /** One clock for the board. See PartyClock. */
  const now = useNow(parties);

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
    const horizon = adv.when === "today" ? 1 : adv.when === "3d" ? 3 : adv.when === "week" ? 7 : 0;

    const out = parties.filter((p) => {
      // The party somebody followed a link to is shown whatever else is set.
      if (p.id === pinned) return true;

      const st = partyStatus(p, now);
      // Finished is out of the way by default and one setting away. Everything
      // else on this board is about an evening somebody can still be part of.
      if (adv.status === "") { if (st === "done") return false; }
      else if (adv.status !== "all" && st !== adv.status) return false;

      const c = byKey[p.contentKey];
      if (kinds.size && (!c || !kinds.has(c.kind))) return false;

      if (q) {
        const hay = [c?.name, c?.short, c?.badge, c?.duty, p.note,
                     progressText(p.progress), lootText(p.loot), spotText(p.spot),
                     mapsText(p.maps, mapLabel),
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
  }, [parties, byKey, query, kinds, adv, me, now, pinned]);

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

    /*
     * "Soonest first" has nothing to sort when everything has already
     * happened. Looking at finished parties, the one somebody wants is the one
     * that just finished — so the same setting runs the other way, and a month
     * of history does not open on the oldest night in it.
     */
    const back = adv.status === "done" ? -1 : 1;

    return [...out].sort((a, b) =>
      sort === "new" ? b.createdAt.localeCompare(a.createdAt)
      : sort === "open" ? openCount(b) - openCount(a)
                          || back * a.startsAt.localeCompare(b.startsAt)
      : back * a.startsAt.localeCompare(b.startsAt));
  }, [base, adv.prog, adv.loot, adv.status, sort]);

  /** Grouped by the day they fall on in Bangkok, which is how people read a schedule. */
  const days = useMemo(() => {
    const m = new Map<string, Party[]>();
    for (const p of shown) {
      const k = dayKey(p.startsAt);
      (m.get(k) ?? m.set(k, []).get(k)!).push(p);
    }
    // In the order the list is already in, rather than always oldest first.
    // Sorting the days by their own key would put a month of finished parties
    // above tonight the moment somebody looked at the archive.
    return [...m.entries()];
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
    + (adv.loot ? 1 : 0) + (adv.status ? 1 : 0);

  const sel = "rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-[22px] font-semibold">
            {t("party.title")}
            <span className="rounded-md border border-gold/50 bg-gold/10 px-2 py-[2px] font-data text-[10.5px] uppercase tracking-[0.14em] text-gold">
              WIP
            </span>
          </h1>
          <p className="mt-1 text-[12.5px] text-muted">
            {t("party.times")}
          </p>
        </div>
        {!writing && (
          <button onClick={() => setWriting(true)}
                  className="rounded-lg border border-accent bg-accent/15 px-3.5 py-1.5 text-[13px] text-accent hover:bg-accent/25">
            {t("party.new")}
          </button>
        )}
      </header>

      {writing && me && userId && (
        <PartyCreate content={content} people={people} me={me} userId={userId}
                     busy={saving} suggest={suggest} labels={labels}
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
               placeholder={t("party.search")}
               aria-label={t("party.search")}
               className={`${sel} min-w-[200px] flex-1 placeholder:text-muted`} />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
                aria-label={t("party.sortSoon")} className={sel}>
          <option value="soon">{t("party.sortSoon")}</option>
          <option value="new">{t("party.sortNew")}</option>
          <option value="open">{t("party.sortOpen")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5">
        {advCount > 0 && (
          <button onClick={() => setAdv(EMPTY)}
                  className="self-end text-[12.5px] text-muted underline hover:text-ink">
            {t("party.clearN", { n: advCount })}
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          {/*
            * Where the five states live.
            *
            * First, because it is the one control that decides whether a party
            * is on the board at all rather than which of them are — and because
            * "where did Tuesday's raid go" is answered by the setting a reader
            * meets first.
            */}
          <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
            {t("party.status")}
          </span>
          <select value={adv.status}
                  onChange={(e) => setAdv({ ...adv, status: e.target.value as StatusPick })}
                  className={sel} aria-label={t("party.status")}>
            <option value="">{t("party.stOpenOnly")}</option>
            {STATUS_ORDER.map((k) => (
              <option key={k} value={k}>{statusLabel(k, t)}</option>
            ))}
            <option value="all">{t("party.stEverything")}</option>
          </select>

          <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
            {t("party.needs")}
          </span>
          <select value={adv.role}
                  onChange={(e) => setAdv({ ...adv, role: e.target.value as SlotRole | "" })}
                  className={sel} aria-label={t("party.anyRole")}>
            <option value="">{t("party.anyRole")}</option>
            {(Object.keys(ROLE_LABEL) as SlotRole[]).map((r) => (
              <option key={r} value={r}>{t("party.wantsRole", { role: ROLE_LABEL[r] })}</option>
            ))}
          </select>

          {anyProgress && (
            <>
              <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
                {t("party.progress")}
              </span>
              <select value={adv.prog}
                      onChange={(e) => setAdv({ ...adv, prog: e.target.value as ProgressAt | "" })}
                      className={sel} aria-label={t("party.progress")}>
                <option value="">{t("party.anyProgress")}</option>
                {(Object.keys(PROGRESS_LABEL) as ProgressAt[]).map((k) => (
                  <option key={k} value={k}>{PROGRESS_LABEL[k]}</option>
                ))}
              </select>
            </>
          )}

          {anyLoot && (
            <>
              <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
                {t("party.loot")}
              </span>
              <select value={adv.loot}
                      onChange={(e) => setAdv({ ...adv, loot: e.target.value as LootRule | "" })}
                      className={sel} aria-label={t("party.loot")}>
                <option value="">{t("party.anyLoot")}</option>
                {(Object.keys(LOOT_LABEL) as LootRule[]).map((k) => (
                  <option key={k} value={k}>{LOOT_LABEL[k]}</option>
                ))}
              </select>
            </>
          )}

          <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
            {t("party.when")}
          </span>
          <select value={adv.when}
                  onChange={(e) => setAdv({ ...adv, when: e.target.value as When })}
                  className={sel} aria-label={t("party.when")}>
            <option value="">{t("party.anyTime")}</option>
            <option value="today">{t("party.within1")}</option>
            <option value="3d">{t("party.within3")}</option>
            <option value="week">{t("party.within7")}</option>
          </select>

          <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <input type="checkbox" checked={adv.openOnly}
                   onChange={(e) => setAdv({ ...adv, openOnly: e.target.checked })} />
            {t("party.hasRoom")}
          </label>
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <input type="checkbox" checked={adv.mine}
                   onChange={(e) => setAdv({ ...adv, mine: e.target.checked })} />
            {t("party.imIn")}
          </label>
        </div>
      </div>

      <p className="text-[12.5px] text-muted">
        {shown.length === 1 ? t("party.countOne")
                            : t("party.countMany", { n: shown.length })}
      </p>

      {/* ── The list, by day ─────────────────────────────────────────────── */}
      {loading && (
        <p className="px-4 py-10 text-center text-[13px] text-muted">{t("party.loading")}</p>
      )}

      {!loading && days.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[13px] text-muted">
          {t("party.none")}
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
                    <span className="relative z-[1] flex flex-col">
                      <span className="font-data text-[18px] font-semibold tabular-nums text-white drop-shadow">
                        {fmtTime(p.startsAt)}
                      </span>
                      {/*
                        * The answer to the question the time only poses.
                        * "20:00" says when and not whether that is soon, which
                        * is the arithmetic people do badly across a day
                        * boundary — a party reading "tomorrow 20:00" on a
                        * Tuesday night is one nobody registers is nine hours
                        * away.
                        */}
                      <WhenLine party={p} now={now}
                                className="font-data text-[10.5px] text-white/80 drop-shadow" />
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
                      {/* Last, after the fight has finished naming itself.
                          The badge is part of the title — EX6 and UCOB are what
                          people call these — and a status word wedged between
                          the name and its own shorthand breaks the name in
                          half. */}
                      <StatusPill status={partyStatus(p, now)} />
                    </span>

                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                      <span className="flex items-center gap-1"
                            title={lengthIsEstimate(p, c?.kind) ? t("party.estimateWhy") : undefined}>
                        {/* A map night has no end anybody chose — it runs until
                            the maps are done, and that is a dice roll. Saying
                            so is better than a time that quietly turns out to
                            have been a guess. Same for a party counted in
                            runs, which said as much on purpose. */}
                        {lengthIsEstimate(p, c?.kind) && <span className="opacity-70">~</span>}
                        {p.lengthUnit === "food" && (
                          <FoodIcon size={11} className="text-gold" />
                        )}
                        {lengthSay(p, t)}
                      </span>
                      <span className="opacity-40">·</span>
                      <span>{shapeSay(p.shape, c?.kind, t)}</span>
                      {progressText(p.progress) && (
                        <><span className="opacity-40">·</span>
                          <span>{progressText(p.progress)}</span></>
                      )}
                      {lootLine(p.loot, t) && (
                        <><span className="opacity-40">·</span>
                          <span>{lootLine(p.loot, t)}</span></>
                      )}
                      {p.oneOfEachJob && (
                        <><span className="opacity-40">·</span>
                          <span>{t("party.onePerJob")}</span></>
                      )}
                      {mapsText(p.maps, mapLabel) && (
                        <><span className="opacity-40">·</span>
                          <span>🗺 {mapsText(p.maps, mapLabel)}</span></>
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
                      {/* Somebody is waiting on an answer. Shown on the closed
                          row because a request nobody sees is a request that
                          goes unanswered, and the lead is the one person who
                          has to notice without being told twice. */}
                      {pendingAsks(p) > 0 && (
                        <span className="rounded-full border border-gold/50 bg-gold/10 px-1.5 font-data text-[10.5px] text-gold">
                          ✋ {pendingAsks(p)}
                        </span>
                      )}
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

                {/* The row is a summary now; the party itself opens over it.
                    See PartyDetail. */}
              </article>
            );
          })}
        </section>
      ))}

      {/*
        * Whichever party is open, over the board.
        *
        * One window for the whole page rather than one per row: only ever one
        * is open, and mounting thirty dialogs to keep twenty-nine of them shut
        * is thirty comment threads and thirty seat grids built for nothing.
        */}
      {openId && (() => {
        const p = shown.find((x) => x.id === openId)
          ?? parties.find((x) => x.id === openId);
        if (!p) return null;
        return (
          <PartyDetail party={p} def={byKey[p.contentKey]} now={now}
                       me={me} userId={userId} supabase={supabase}
                       refresh={refresh} setErr={setErr} setParties={setParties}
                       onClose={() => setOpenId(null)} />
        );
      })()}
    </div>
  );
}

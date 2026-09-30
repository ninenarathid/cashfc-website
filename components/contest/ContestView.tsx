"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "@/lib/i18n";
import { useAdmin } from "@/lib/admin";
import { useAvatarOverrides } from "@/lib/avatars";
import { isFcMember, type PersonOption } from "@/lib/people";
import { fmtDateTime } from "@/lib/dates";
import {
  castPopoto, countsShown, inPlay as lookInPlay, isNewEntry, isPending,
  loadBoard, loadContest, phaseOf, placeEntries, saveCaption,
  shuffleFor, thumbUrl, withdrawLook, type Board, type Contest, type ContestEntry,
  type Stage,
} from "@/lib/contest";
import { throwPotato } from "@/components/ui/throwPotato";
import PopotoIcon from "@/components/ui/PopotoIcon";
import { toast } from "@/components/ui/Toast";
import EnterLook from "@/components/contest/EnterLook";
import LookCard from "@/components/contest/LookCard";
import LookDialog from "@/components/contest/LookDialog";
import ContestResults, { type ResultLook } from "@/components/contest/ContestResults";

/**
 * One glamour contest, drawn inside the gallery.
 *
 * The gallery page decides which contest (see GalleryPage); this draws it:
 * the theme and the rules, your own look or the way to enter one, the wall
 * of looks, and once Aqua has announced, the result. Read in the browser like
 * the gallery itself, and everything that decides anything is in the
 * database (v98) — this draws what it is told and asks for the rest.
 *
 * Built around what a member can do at this moment — enter, give popoto, or
 * wait — and saying which in the header, with the next moment the clock will
 * change it.
 */

type Me = { id: string; characterId: number | null; verified: boolean };

export const STAGE_TONE: Record<Stage, string> = {
  draft: "border-chili/60 text-chili",
  soon: "border-steel/60 text-steel",
  entries: "border-jade/60 text-jade",
  both: "border-jade/60 text-jade",
  between: "border-steel/60 text-steel",
  voting: "border-accent/60 text-accent",
  counting: "border-gold/60 text-gold",
  announced: "border-gold/60 text-gold",
};

/** How long until something, in the one unit that reads best for its size. */
function until(ms: number, t: (k: Key, v?: Record<string, string | number>) => string): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return t("contest.in.minutes", { n: min });
  const h = Math.round(min / 60);
  if (h < 24) return t("contest.in.hours", { n: h });
  if (h < 48 && h > 24) return t("contest.in.dayHours", { h: h - 24 });
  return t("contest.in.days", { n: Math.round(h / 24) });
}

export default function ContestView(
  { contestId, memberOptions = [], others = [], onPick }: {
    contestId: number;
    memberOptions?: PersonOption[];
    /** The rest of the contests this reader may see, for the list at the foot. */
    others?: Contest[];
    /** Show another contest, or the gallery again with null. */
    onPick: (id: number | null) => void;
  },
) {
  const { t, lang } = useLang();
  const { isAdmin } = useAdmin();
  const chosen = useAvatarOverrides();
  const [supabase] = useState(createClient);
  const [state, setState] = useState<"loading" | "none" | "ready">("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [contest, setContest] = useState<Contest | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const roster = useMemo(() => {
    const m = new Map<number, { name: string; avatar: string | null }>();
    for (const o of memberOptions) m.set(o.id, { name: o.name, avatar: o.avatar });
    return m;
  }, [memberOptions]);

  // The site's own corner toast: green for a look that got in, the accent for
  // everything the database said no to.
  const say = useCallback((text: string, good = false) => {
    toast({ text, tone: good ? "good" : "accent" });
  }, []);

  // Who is reading, the contest, and everything in it.
  useEffect(() => {
    if (!supabase) { setState("none"); return; }
    let live = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      let who: Me | null = null;
      if (uid) {
        const { data: p } = await supabase.from("profiles")
          .select("character_id, character_verified_at").eq("id", uid).maybeSingle();
        const row = p as { character_id?: number | null; character_verified_at?: string | null } | null;
        who = {
          id: uid,
          characterId: row?.character_id ?? null,
          verified: !!(row?.character_id && row?.character_verified_at),
        };
      }
      const c = await loadContest(supabase, contestId);
      if (!live) return;
      setMe(who);
      if (!c) { setState("none"); return; }
      const b = await loadBoard(supabase, c.id, uid);
      if (!live) return;
      setContest(c);
      setBoard(b);
      setState("ready");
      // A look can be linked to: ?look=12 opens it.
      const want = Number(new URLSearchParams(window.location.search).get("look"));
      if (want && b.entries.some((e) => e.id === want)) setOpen(want);
    })();
    return () => { live = false; };
  }, [supabase, contestId]);

  const reload = useCallback(async () => {
    if (!supabase || !contest) return;
    const [c, b] = await Promise.all([
      loadContest(supabase, contest.id),
      loadBoard(supabase, contest.id, me?.id ?? null),
    ]);
    if (c) setContest(c);
    setBoard(b);
  }, [supabase, contest, me]);

  // The countdown, and a fresh look at the count whenever the page comes back
  // into view — somebody who left it open overnight should not come back to
  // yesterday's numbers.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const back = () => { if (!document.hidden) { setNow(Date.now()); void reload(); } };
    document.addEventListener("visibilitychange", back);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", back); };
  }, [reload]);

  // The address follows the open look, so it can be copied and sent.
  useEffect(() => {
    if (state !== "ready") return;
    const url = new URL(window.location.href);
    if (open) url.searchParams.set("look", String(open)); else url.searchParams.delete("look");
    window.history.replaceState(null, "", url.toString());
  }, [open, state]);

  // One function for the life of the page, so the open look's key listener is
  // bound once rather than again on every render.
  const close = useCallback(() => setOpen(null), []);

  const phase = contest ? phaseOf(contest, now) : null;
  const shown = contest ? countsShown(contest, isAdmin) : false;

  /**
   * A look's byline. While the contest hides names the database has not sent
   * one, so the look goes by its number — the same number for everybody, so
   * "vote for number four" means one look in the whole FC's Discord.
   */
  const whoOf = useCallback((e: ContestEntry) => {
    // An admin is sent the names regardless; with the switch off they read
    // the page as a member does, which is the point of the switch.
    const masked = !!contest?.hide_names && !contest.announced_at && !isAdmin && !e.mine;
    if (e.character_id == null || masked) {
      return { name: t("contest.lookNo", { n: e.number }), avatar: null, anonymous: true };
    }
    const r = roster.get(e.character_id);
    return {
      name: r?.name ?? e.author_name ?? "—",
      avatar: chosen[e.character_id] ?? r?.avatar ?? null,
      anonymous: false,
    };
  }, [roster, chosen, t, contest, isAdmin]);

  // Looks still in the running. Hidden and waiting ones reach only their
  // author and admins, and are drawn for them, but never counted or placed.
  const inPlay = useMemo(() => {
    if (!board || !contest) return [];
    return board.entries.filter((e) => lookInPlay(e, contest));
  }, [board, contest]);

  const placed = useMemo(() => {
    if (!board || !contest?.announced_at) return null;
    return placeEntries(inPlay, board.votes);
  }, [board, contest, inPlay]);
  const placeOf = useMemo(() => new Map((placed ?? []).map((p) => [p.entry.id, p.place])), [placed]);

  const awardsOf = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const a of board?.awards ?? []) {
      const list = m.get(a.entry_id);
      if (list) list.push(a.label); else m.set(a.entry_id, [a.label]);
    }
    return m;
  }, [board]);

  const wall = useMemo(() => {
    if (!board || !contest) return [];
    if (placed) {
      const out = board.entries.filter((e) => !lookInPlay(e, contest));
      return [...placed.map((p) => p.entry), ...out];
    }
    return shuffleFor(board.entries, `${me?.id ?? "anon"}:${contest.id}`);
  }, [board, contest, placed, me]);

  const mine = board?.entries.find((e) => e.mine) ?? null;
  const inPlayIds = useMemo(() => new Set(inPlay.map((e) => e.id)), [inPlay]);
  const used = board ? [...board.mine].filter((id) => inPlayIds.has(id)).length : 0;
  const limit = contest?.vote_limit ?? null;
  const left = limit != null ? Math.max(0, limit - used) : null;

  /** Whether this reader may press a look's button, and if not, why. */
  function voteFor(e: ContestEntry) {
    if (!phase?.canVote || !contest || !lookInPlay(e, contest)) return undefined;
    if (e.mine) return undefined;
    const given = !!board?.mine.has(e.id);
    const why = !me?.verified ? t("contest.signInToVote")
      : !given && left === 0 ? t("contest.leftNone")
      : undefined;
    return {
      disabled: !!why,
      why,
      onToggle: async (button: HTMLButtonElement) => {
        if (!supabase) return;
        const res = await castPopoto(supabase, e.id, !given);
        if ("error" in res) { say(t(res.error)); return; }
        setBoard((b) => {
          if (!b) return b;
          const next = new Set(b.mine);
          if (given) next.delete(e.id); else next.add(e.id);
          const votes = new Map(b.votes);
          if (shown) votes.set(e.id, Math.max(0, (votes.get(e.id) ?? 0) + (given ? -1 : 1)));
          return { ...b, mine: next, votes };
        });
        if (!given) void throwPotato(button, document.getElementById(`look-${e.id}`));
      },
    };
  }

  if (state === "loading") {
    return <div className="mt-5 h-40 animate-pulse rounded-2xl border border-line bg-surface" />;
  }

  // Gone between the list being read and this — deleted, or put back to draft
  // while somebody had it open.
  if (state === "none" || !contest || !board || !phase) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-line p-10 text-center text-read leading-relaxed text-muted">
        {t("contest.none")}
        <div className="mt-3">
          <button onClick={() => onPick(null)} className="text-accent hover:underline">
            {t("contest.tabAll")} →
          </button>
        </div>
      </div>
    );
  }

  const title = lang === "en" && contest.title_en ? contest.title_en : contest.title;
  const body = lang === "en" && contest.body_en ? contest.body_en : contest.body;
  const current = open != null ? board.entries.find((e) => e.id === open) ?? null : null;

  const chips: string[] = [
    t(contest.fc_only ? "contest.rule.fcOnly" : "contest.rule.everyone"),
    t("contest.rule.oneEach"),
    t(contest.allow_mods ? "contest.rule.mods" : "contest.rule.vanilla"),
    t(contest.allow_shaders ? "contest.rule.shaders" : "contest.rule.noShaders"),
    limit != null ? t("contest.rule.limit", { n: limit }) : t("contest.rule.unlimited"),
    t(contest.show_votes ? "contest.rule.liveCount" : "contest.rule.hiddenCount"),
    ...(contest.hide_names ? [t("contest.rule.hiddenNames")] : []),
    ...(contest.needs_approval ? [t("contest.rule.approval")] : []),
  ];

  const resultLook = (id: number): ResultLook | null => {
    const e = board.entries.find((x) => x.id === id);
    if (!e) return null;
    return {
      id, place: placeOf.get(id) ?? 0, votes: board.votes.get(id) ?? 0,
      ...whoOf(e), cover: board.images.get(id)?.[0],
    };
  };
  const podium = (placed ?? []).filter((p) => p.place <= 3 && p.votes > 0)
    .map((p) => resultLook(p.entry.id)).filter(Boolean) as ResultLook[];
  const awardList = board.awards
    .map((a) => { const look = resultLook(a.entry_id); return look ? { label: a.label, look } : null; })
    .filter(Boolean) as { label: string; look: ResultLook }[];

  return (
    <section className="mt-5" aria-labelledby="contest-title">
      {!contest.published_at && (
        <div className="mb-3 rounded-lg border border-chili/40 bg-chili/10 px-3 py-2 text-ui text-chili">
          {t("contest.draft")}
        </div>
      )}

      <header className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="font-data text-meta uppercase tracking-[0.22em] text-accent">{t("contest.eyebrow")}</div>
          {/* The page's heading is the gallery's; a contest is a section of it. */}
          <h2 id="contest-title" className="mt-1 font-display text-2xl font-bold [text-wrap:balance] sm:text-3xl">{title}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-ui font-medium ${STAGE_TONE[phase.stage]}`}>
              {t(`contest.stage.${phase.stage}` as Key)}
            </span>
            {phase.next && (
              <span className="text-ui text-ink">
                {t(`contest.next.${phase.next.what}` as Key, { t: until(phase.next.at - now, t) })}
                <span className="ml-1.5 font-data text-meta text-muted">({fmtDateTime(phase.next.at)})</span>
              </span>
            )}
          </div>

          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-data text-ui">
            <dt className="text-muted">{t("contest.window.entries")}</dt>
            <dd className="text-ink">{fmtDateTime(contest.submit_opens_at)} – {fmtDateTime(contest.submit_closes_at)}</dd>
            <dt className="text-muted">{t("contest.window.voting")}</dt>
            <dd className="text-ink">{fmtDateTime(contest.vote_opens_at)} – {fmtDateTime(contest.vote_closes_at)}</dd>
          </dl>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <li key={c} className="rounded-md border border-line bg-card px-2 py-0.5 text-ui text-muted">{c}</li>
            ))}
          </ul>

          {body && (
            <p className="mt-4 max-w-prose whitespace-pre-wrap text-read leading-relaxed text-ink">{body}</p>
          )}

          {isAdmin && (
            <Link href={`/admin/contest?c=${contest.id}`}
                  className="mt-4 inline-block rounded-lg border border-chili/40 bg-chili/5 px-3 py-1.5 text-ui text-chili no-underline hover:bg-chili/10">
              {t("contest.manage")} →
            </Link>
          )}
        </div>

        {/* Beside the words on a wide screen. On a phone it comes after them
            and is held to a third of the screen: a portrait poster at full
            width stood taller than the screen and pushed every look below it. */}
        {contest.poster_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={contest.poster_url} alt=""
               className="mx-auto max-h-[34vh] w-auto max-w-full rounded-xl border border-line object-contain md:max-h-none md:w-full" />
        )}
      </header>

      {/* Where things stand, without saying who is ahead. */}
      {board.turnout && (
        <p className="mt-5 font-data text-ui text-muted">
          {t("contest.turnout", { entries: board.turnout.entries, voters: board.turnout.voters })}
          {isAdmin && !contest.show_votes && !contest.announced_at && (
            <span className="ml-2 text-chili">· {t("contest.adm.countsNote")}</span>
          )}
        </p>
      )}

      {phase.canVote && limit != null && me?.verified && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
          <span aria-hidden className="flex gap-0.5">
            {Array.from({ length: Math.min(limit, 12) }, (_, i) => (
              <span key={i} className={i < (left ?? 0) ? "" : "opacity-25 grayscale"}><PopotoIcon /></span>
            ))}
          </span>
          <span className="text-ui text-ink">
            {left ? t("contest.left", { n: left, of: limit }) : t("contest.leftNone")}
          </span>
        </div>
      )}

      {/* Your own look, or the way to enter one. */}
      <div className="mt-4">
        {mine ? (
          <button type="button" onClick={() => setOpen(mine.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-accent/40 bg-accent/5 p-2.5 text-left transition-colors hover:border-accent">
            <span className="block size-14 shrink-0 overflow-hidden rounded-lg bg-card">
              {board.images.get(mine.id)?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl(board.images.get(mine.id)![0])} alt="" className="size-full object-cover" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-read font-semibold text-accent">{t("contest.mine")}</span>
              <span className="block truncate text-ui text-muted">
                {mine.hidden ? t("contest.hiddenByAdmin")
                  : isPending(mine, contest) ? t("contest.pendingHint")
                  : mine.caption ?? t("contest.entered")}
              </span>
            </span>
          </button>
        ) : phase.canEnter && supabase ? (
          <EnterLook supabase={supabase} contestId={contest.id}
                     me={me ? { id: me.id, verified: me.verified } : null}
                     fcOnly={contest.fc_only} inFc={isFcMember(me?.characterId)}
                     onEntered={(id) => {
                       say(t(contest.needs_approval ? "contest.enteredPending" : "contest.entered"), true);
                       void reload().then(() => setOpen(id));
                     }} />
        ) : null}
      </div>

      {contest.announced_at && (
        <ContestResults podium={podium} awards={awardList} onOpen={setOpen} />
      )}

      <section className="mt-6">
        {contest.announced_at && (
          <h3 className="mb-3 font-display text-lead font-semibold">{t("contest.allLooks")}</h3>
        )}
        {wall.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {wall.map((e) => {
              const who = whoOf(e);
              const pics = board.images.get(e.id) ?? [];
              return (
                <LookCard key={e.id} id={e.id} cover={pics[0]} pictures={pics.length}
                          name={who.name} avatar={who.avatar} anonymous={who.anonymous}
                          caption={e.caption}
                          votes={shown && lookInPlay(e, contest) ? board.votes.get(e.id) ?? 0 : null}
                          given={board.mine.has(e.id)}
                          place={placeOf.get(e.id) ?? null}
                          awards={contest.announced_at ? awardsOf.get(e.id) ?? [] : []}
                          isNew={lookInPlay(e, contest) && isNewEntry(e, contest, now)}
                          mine={e.mine}
                          hidden={e.hidden}
                          pending={isPending(e, contest)}
                          vote={voteFor(e)}
                          onOpen={() => setOpen(e.id)} />
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-read text-muted">
            {phase.canEnter ? t("contest.beFirst") : t("contest.noEntries")}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section className="mt-10">
          <h3 className="font-display text-lead font-semibold">{t("contest.past")}</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {others.map((c) => {
              const p = phaseOf(c, now);
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => onPick(c.id)}
                          className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-accent">
                    <span className="text-read text-ink">
                      {lang === "en" && c.title_en ? c.title_en : c.title}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-meta ${STAGE_TONE[p.stage]}`}>
                      {t(`contest.stage.${p.stage}` as Key)}
                    </span>
                    <span className="ml-auto font-data text-meta text-muted">{fmtDateTime(c.submit_opens_at)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {current && supabase && (() => {
        const who = whoOf(current);
        const isMine = current.mine;
        return (
          <LookDialog images={board.images.get(current.id) ?? []}
                      name={who.name} avatar={who.avatar}
                      characterId={who.anonymous ? null : current.character_id}
                      caption={current.caption}
                      votes={shown && lookInPlay(current, contest) ? board.votes.get(current.id) ?? 0 : null}
                      given={board.mine.has(current.id)}
                      place={placeOf.get(current.id) ?? null}
                      awards={contest.announced_at ? awardsOf.get(current.id) ?? [] : []}
                      mine={isMine}
                      canEditCaption={isMine && phase.canEnter}
                      canWithdraw={isMine && !contest.announced_at && now < Date.parse(contest.vote_closes_at)}
                      admin={isAdmin}
                      hidden={current.hidden}
                      pending={isPending(current, contest)}
                      vote={voteFor(current)}
                      onApprove={async () => {
                        await supabase.from("contest_entries")
                          .update({ approved_at: new Date().toISOString() }).eq("id", current.id);
                        await reload();
                      }}
                      onSaveCaption={async (text) => {
                        const bad = await saveCaption(supabase, current.id, text);
                        if (!bad) await reload();
                        return bad;
                      }}
                      onWithdraw={async () => {
                        const bad = await withdrawLook(supabase, current.id,
                          board.images.get(current.id) ?? []);
                        if (!bad) { setOpen(null); await reload(); }
                        return bad;
                      }}
                      onSetHidden={async (hidden) => {
                        await supabase.from("contest_entries").update({ hidden }).eq("id", current.id);
                        await reload();
                      }}
                      onClose={close} />
        );
      })()}
    </section>
  );
}

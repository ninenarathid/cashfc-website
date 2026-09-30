import type { SupabaseClient } from "@supabase/supabase-js";
import type { Key } from "@/lib/i18n";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { MAX_UPLOAD_BYTES, uploadOne } from "@/lib/gallery";

/**
 * The glamour contest. See v98.
 *
 * One per festival: an admin — Aqua, mostly — sets a theme and four dates,
 * each member enters one look, everybody with a verified character throws
 * popoto at the looks they like, and Aqua announces the result herself.
 *
 * Everything that decides anything is in the database: whether entries are
 * open, whose picture is whose, how many popoto somebody has left, and who is
 * allowed to see the count. This file only asks. What it does own is the
 * arithmetic the page needs to draw that — which stage a contest is at, the
 * places with their ties, the order a member sees the looks in — and the
 * sentences the database's refusals turn into.
 */

/* ── the rows ────────────────────────────────────────────────────────────── */

export interface Contest {
  id: number;
  title: string;
  title_en: string | null;
  body: string | null;
  body_en: string | null;
  poster_url: string | null;
  submit_opens_at: string;
  submit_closes_at: string;
  vote_opens_at: string;
  vote_closes_at: string;
  /** Null: one popoto per look, on as many looks as you like. */
  vote_limit: number | null;
  show_votes: boolean;
  fc_only: boolean;
  /** Each look waits for an admin before anybody else sees it. */
  needs_approval: boolean;
  /** Who entered which look is kept back until the result. */
  hide_names: boolean;
  allow_mods: boolean;
  allow_shaders: boolean;
  /** Null is a draft, which only admins are sent. */
  published_at: string | null;
  announced_at: string | null;
  created_at: string;
}

/** The columns a contest is read with, in one place so every query agrees. */
export const CONTEST_COLUMNS =
  "id, title, title_en, body, body_en, poster_url, submit_opens_at, "
  + "submit_closes_at, vote_opens_at, vote_closes_at, vote_limit, show_votes, "
  + "fc_only, needs_approval, hide_names, allow_mods, allow_shaders, "
  + "published_at, announced_at, created_at";

/**
 * One look, as contest_looks hands it to this reader (v98).
 *
 * While a contest hides names, `author_id`, `character_id` and `author_name`
 * arrive empty for every look but the reader's own — not left out by the page
 * but never sent — and `number` is what the look is called instead.
 */
export interface ContestEntry {
  id: number;
  contest_id: number;
  /** 1 upwards within the contest, in the order looks came in. Never reused. */
  number: number;
  author_id: string | null;
  character_id: number | null;
  caption: string | null;
  /** Taken down by an admin. Only its author and admins are sent it at all. */
  hidden: boolean;
  /** When an admin let it in; null while it waits, in a contest that asks. */
  approved_at: string | null;
  created_at: string;
  /** Whether this is the reader's own look, told even while names are hidden. */
  mine: boolean;
  /**
   * The author's character name off their profile, for somebody the roster
   * baked into the build does not know yet — a guest who verified this week.
   */
  author_name: string | null;
}

export interface ContestImage {
  id: number;
  entry_id: number;
  path: string;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
  position: number;
}

export interface ContestAward {
  id: number;
  entry_id: number;
  label: string;
  position: number;
}

export const CONTEST_BUCKET = "contest";

/** One look holds this many pictures at most. The database holds the same number. */
export const MAX_PICTURES = 4;

/** Longer than a gallery caption would be odd; the database holds the same number. */
export const MAX_CAPTION = 300;

/**
 * Where a file in the bucket can be seen.
 *
 * A look keeps only the path, never an address, so everything it shows is in
 * this bucket by construction (see v98). Each segment is encoded on its own
 * so the slashes between them stay slashes.
 */
export const fileUrl = (path: string): string =>
  `${SUPABASE_URL}/storage/v1/object/public/${CONTEST_BUCKET}/`
  + path.split("/").map(encodeURIComponent).join("/");

/** The small copy for a grid when there is one, the picture itself otherwise. */
export const thumbUrl = (img: Pick<ContestImage, "path" | "thumb_path">): string =>
  fileUrl(img.thumb_path || img.path);

/** Where a contest lives. */
export const contestPath = (id: number) => `/contest/${id}`;

/** One look, opened in its contest. ContestView reads `?look=` on arrival. */
export const lookPath = (contest: number, entry: number) =>
  `${contestPath(contest)}?look=${entry}`;

/* ── where a contest is ──────────────────────────────────────────────────── */

/**
 * The stage a contest is at, named for what a member can do in it.
 *
 *   draft      not published; only admins see it at all
 *   soon       published, entries not open yet — the theme is out, so people
 *              can start putting a look together
 *   entries    taking looks, voting not open yet
 *   both       taking looks and taking popoto at once, which is what Aqua
 *              asked for: a late look still gets in while the contest runs
 *   between    entries closed, voting not open yet
 *   voting     taking popoto only
 *   counting   everything closed, waiting for Aqua to announce
 *   announced  the result is out
 *
 * The windows can overlap in any way the database allows, so this is worked
 * out from the two of them rather than from a list of steps.
 */
export type Stage =
  | "draft" | "soon" | "entries" | "both" | "between" | "voting" | "counting" | "announced";

/** The next thing the clock will change, for the countdown. */
export type NextChange = "entries-open" | "voting-open" | "entries-close" | "voting-close";

export interface Phase {
  stage: Stage;
  canEnter: boolean;
  canVote: boolean;
  next: { what: NextChange; at: number } | null;
}

export function phaseOf(c: Contest, now: number = Date.now()): Phase {
  if (!c.published_at) return { stage: "draft", canEnter: false, canVote: false, next: null };
  if (c.announced_at) return { stage: "announced", canEnter: false, canVote: false, next: null };

  const so = Date.parse(c.submit_opens_at);
  const sc = Date.parse(c.submit_closes_at);
  const vo = Date.parse(c.vote_opens_at);
  const vc = Date.parse(c.vote_closes_at);
  const canEnter = now >= so && now < sc;
  const canVote = now >= vo && now < vc;

  // Every moment still ahead, the soonest first. Voting opening beats entries
  // closing when both are coming, because it is the one people are waiting for.
  const ahead: { what: NextChange; at: number }[] = [
    { what: "entries-open" as const, at: so },
    { what: "voting-open" as const, at: vo },
    { what: "entries-close" as const, at: sc },
    { what: "voting-close" as const, at: vc },
  ].filter((x) => x.at > now).sort((a, b) => a.at - b.at);
  const next = ahead[0] ?? null;

  const stage: Stage = now < so ? "soon"
    : canEnter && canVote ? "both"
    : canEnter ? "entries"
    : canVote ? "voting"
    : now < vo ? "between"
    : "counting";
  return { stage, canEnter, canVote, next };
}

/** Whether the contest is on at all: published, not finished, not announced. */
export const isLive = (c: Contest, now: number = Date.now()): boolean =>
  !!c.published_at && !c.announced_at && now < Date.parse(c.vote_closes_at);

/**
 * Whether the count is on show to this reader.
 *
 * `admin` is the switch, not the account: an admin browsing as a member sees
 * what a member sees, which is the point of the switch, even though the
 * database would hand them the numbers either way.
 */
export const countsShown = (c: Contest, admin: boolean): boolean =>
  admin || c.show_votes || !!c.announced_at;

/**
 * A look is new for a day, so one entered late is not lost at the bottom.
 *
 * A day from when everybody could first see it: in a contest that checks
 * looks first, that is the approval, and a look approved on the last evening
 * is as new as one entered then.
 */
export const NEW_FOR_MS = 24 * 60 * 60 * 1000;

export const isNewEntry = (e: Pick<ContestEntry, "created_at" | "approved_at">, c: Contest,
                           now: number = Date.now()): boolean =>
  isLive(c, now) && now - Date.parse(e.approved_at ?? e.created_at) < NEW_FOR_MS;

/** Waiting for an admin, in a contest that asks for one. Only its author and admins see it. */
export const isPending = (e: Pick<ContestEntry, "approved_at">, c: Contest): boolean =>
  c.needs_approval && !e.approved_at;

/** Whether a look is in the running: not taken down, not waiting. */
export const inPlay = (e: Pick<ContestEntry, "hidden" | "approved_at">, c: Contest): boolean =>
  !e.hidden && !isPending(e, c);

/* ── order and places ────────────────────────────────────────────────────── */

/**
 * FNV-1a, 32 bits. Small, fast, and the same answer in every browser, which
 * is all an order needs.
 */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The looks in an order of this reader's own.
 *
 * Newest-first would hand the early looks the whole contest to collect popoto
 * and bury the late ones Aqua wants let in; oldest-first the reverse. So each
 * reader gets a shuffle — but a fixed one, keyed on who they are, so coming
 * back to the page finds things where they were. Each look's place comes from
 * its own id, so a new look arriving slots in without moving the others.
 */
export function shuffleFor<T extends { id: number }>(items: T[], seed: string): T[] {
  return [...items]
    .map((it) => ({ it, k: hash(`${seed}:${it.id}`) }))
    .sort((a, b) => a.k - b.k || a.it.id - b.it.id)
    .map((x) => x.it);
}

export interface Placed<T> {
  entry: T;
  votes: number;
  /** 1 for the most popoto. Ties share a place and the next is skipped: 1, 2, 2, 4. */
  place: number;
}

/**
 * The looks by popoto, most first, with their places.
 *
 * Ties share a place rather than being broken by who entered first. Nothing
 * about a tie says one look was better, and Aqua announces the result by hand
 * anyway: a tie at the top is hers to settle, not the database's.
 */
export function placeEntries<T extends { id: number; created_at: string }>(
  entries: T[], votes: ReadonlyMap<number, number>,
): Placed<T>[] {
  const scored = entries.map((entry) => ({ entry, votes: votes.get(entry.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes
      || Date.parse(a.entry.created_at) - Date.parse(b.entry.created_at)
      || a.entry.id - b.entry.id);
  let place = 0;
  let last = Number.NaN;
  return scored.map((s, i) => {
    if (s.votes !== last) { place = i + 1; last = s.votes; }
    return { ...s, place };
  });
}

/* ── the admin form's dates ──────────────────────────────────────────────── */

const two = (n: number) => String(n).padStart(2, "0");

/**
 * An instant as a datetime-local input wants it: the reader's own clock, to
 * the minute. The FC reads times in Thai time and so does whoever is setting
 * them, so the input and the dates on the page agree without either saying so.
 */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
    + `T${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** The other way. An empty or half-typed input is null rather than a guess. */
export function fromLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface ContestDates {
  submit_opens_at: string;
  submit_closes_at: string;
  vote_opens_at: string;
  vote_closes_at: string;
}

/**
 * Where a new contest's dates start, for Aqua to move.
 *
 * Entries from tomorrow for a week, voting from two days in until two days
 * after entries close — the shape she described, with numbers she can change.
 * Each window ends at 23:59 on its last day, the way the FC's posters are
 * written.
 */
export function defaultDates(now: Date = new Date()): ContestDates {
  const day = (n: number, h = 0, m = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n, h, m);
    return d.toISOString();
  };
  return {
    submit_opens_at: day(1),
    submit_closes_at: day(7, 23, 59),
    vote_opens_at: day(3),
    vote_closes_at: day(9, 23, 59),
  };
}

/**
 * What is wrong with a set of dates, as a sentence, or null.
 *
 * The same four checks the table makes, asked first so the form can say which
 * date is the problem instead of passing on a constraint name.
 */
export function datesProblem(d: Partial<ContestDates>): Key | null {
  const so = d.submit_opens_at ? Date.parse(d.submit_opens_at) : NaN;
  const sc = d.submit_closes_at ? Date.parse(d.submit_closes_at) : NaN;
  const vo = d.vote_opens_at ? Date.parse(d.vote_opens_at) : NaN;
  const vc = d.vote_closes_at ? Date.parse(d.vote_closes_at) : NaN;
  if ([so, sc, vo, vc].some(Number.isNaN)) return "contest.adm.errDatesMissing";
  if (sc <= so) return "contest.adm.errEntriesBackwards";
  if (vc <= vo) return "contest.adm.errVotingBackwards";
  if (vo < so) return "contest.adm.errVotingBeforeEntries";
  if (vc < sc) return "contest.adm.errVotingEndsFirst";
  return null;
}

/* ── what a refusal means ────────────────────────────────────────────────── */

/**
 * The database's reasons, as sentences for the reader.
 *
 * Matched on the words each function raises (see v98) and on the one Postgres
 * code worth knowing: 23505 is the unique key, which here only ever means a
 * second look in the same contest.
 */
export function contestError(err: { message?: string; code?: string } | null | undefined): Key {
  if (!err) return "contest.err.generic";
  if (err.code === "23505") return "contest.err.alreadyIn";
  const m = (err.message ?? "").toLowerCase();
  if (m.includes("entries are closed")) return "contest.err.entriesClosed";
  if (m.includes("voting is closed")) return "contest.err.votingClosed";
  if (m.includes("no popoto left")) return "contest.err.noneLeft";
  if (m.includes("not your own")) return "contest.err.ownLook";
  if (m.includes("for the fc")) return "contest.err.fcOnly";
  if (m.includes("verify your character")) return "contest.err.verify";
  if (m.includes("not signed in")) return "contest.err.signIn";
  if (m.includes("needs a picture")) return "contest.err.noPicture";
  if (m.includes("pictures at most")) return "contest.err.tooMany";
  if (m.includes("no such")) return "contest.err.gone";
  return "contest.err.generic";
}

/* ── reading ─────────────────────────────────────────────────────────────── */

/**
 * One contest, or the one that matters now when no id is given.
 *
 * "Now" is the newest by its entries opening — which is the one taking looks
 * or votes while a contest runs, and the latest result once it is over. Admins
 * are sent drafts as well, and a draft is exactly what an admin opening the
 * page wants to look at.
 */
export async function loadContest(
  supabase: SupabaseClient, id: number | null,
): Promise<Contest | null> {
  const q = supabase.from("contests").select(CONTEST_COLUMNS);
  const { data } = id != null
    ? await q.eq("id", id).maybeSingle()
    : await q.order("submit_opens_at", { ascending: false }).limit(1).maybeSingle();
  return (data as Contest | null) ?? null;
}

/** Every contest this reader may see, newest first, for the list of past ones. */
export async function listContests(supabase: SupabaseClient): Promise<Contest[]> {
  const { data } = await supabase.from("contests").select(CONTEST_COLUMNS)
    .order("submit_opens_at", { ascending: false });
  return (data as Contest[] | null) ?? [];
}

export interface Board {
  entries: ContestEntry[];
  images: Map<number, ContestImage[]>;
  /** Popoto per look. Only filled when the count is on show to this reader. */
  votes: Map<number, number>;
  /** The looks this reader has given a popoto to. */
  mine: Set<number>;
  awards: ContestAward[];
  turnout: { entries: number; voters: number; votes: number } | null;
  /** How many messages each look has, not counting ones taken back. See v99. */
  talk: Map<number, number>;
}

/**
 * Everything the page draws for one contest, in one go.
 *
 * The looks come from contest_looks rather than the table, because the table
 * no longer tells anybody who wrote what; the function does, when the contest
 * allows it (v98).
 */
export async function loadBoard(
  supabase: SupabaseClient, contestId: number, me: string | null,
): Promise<Board> {
  const [e, v, t, a, tu] = await Promise.all([
    supabase.rpc("contest_looks", { p_contest: contestId }),
    me
      ? supabase.from("contest_votes").select("entry_id")
          .eq("contest_id", contestId).eq("voter_id", me)
      : Promise.resolve({ data: [] as { entry_id: number }[] }),
    supabase.rpc("contest_tally", { p_contest: contestId }),
    supabase.from("contest_awards").select("id, entry_id, label, position")
      .eq("contest_id", contestId).order("position").order("id"),
    supabase.rpc("contest_turnout", { p_contest: contestId }),
  ]);

  // Numbers come back from a function as whatever JSON made of them; the ids
  // are bigints in the database and plain numbers everywhere on this site.
  const entries: ContestEntry[] = ((e.data ?? []) as ContestEntry[]).map((r) => ({
    ...r,
    id: Number(r.id),
    contest_id: Number(r.contest_id),
    number: Number(r.number),
    character_id: r.character_id == null ? null : Number(r.character_id),
    mine: !!r.mine,
  }));

  const images = new Map<number, ContestImage[]>();
  const talk = new Map<number, number>();
  if (entries.length) {
    const ids = entries.map((x) => x.id);
    // The messages are counted, not read: the card only says there are some,
    // and a look's conversation is fetched when it is opened. A database
    // without v99 answers with an error here, which is simply no counts.
    const [{ data }, { data: said }] = await Promise.all([
      supabase.from("contest_images")
        .select("id, entry_id, path, thumb_path, width, height, position")
        .in("entry_id", ids)
        .order("position", { ascending: true }),
      supabase.from("contest_comments").select("entry_id")
        .in("entry_id", ids).is("deleted_at", null),
    ]);
    for (const img of (data ?? []) as ContestImage[]) {
      const list = images.get(img.entry_id);
      if (list) list.push(img); else images.set(img.entry_id, [img]);
    }
    for (const r of (said ?? []) as { entry_id: number }[]) {
      const id = Number(r.entry_id);
      talk.set(id, (talk.get(id) ?? 0) + 1);
    }
  }

  const votes = new Map<number, number>();
  for (const r of (t.data ?? []) as { entry_id: number; votes: number }[]) {
    votes.set(Number(r.entry_id), Number(r.votes));
  }
  const turn = ((tu.data ?? []) as { entries: number; voters: number; votes: number }[])[0];

  return {
    entries,
    images,
    votes,
    mine: new Set(((v.data ?? []) as { entry_id: number }[]).map((r) => Number(r.entry_id))),
    awards: (a.data ?? []) as ContestAward[],
    turnout: turn
      ? { entries: Number(turn.entries), voters: Number(turn.voters), votes: Number(turn.votes) }
      : null,
    talk,
  };
}

/**
 * Whether the reader's own look is closed to them for talking: a contest
 * hiding names, not yet announced. The same rule contest_talk_open applies
 * (v99), asked here so the box can say so rather than refuse.
 */
export const talkClosedToOwner = (c: Contest, e: Pick<ContestEntry, "mine">): boolean =>
  e.mine && c.hide_names && !c.announced_at;

/* ── writing ─────────────────────────────────────────────────────────────── */

/** Whether a chosen file can go into a look, as a sentence if it cannot. */
export function fileProblem(f: File): Key | null {
  if (!f.type.startsWith("image/")) return "contest.err.notImage";
  if (f.size > MAX_UPLOAD_BYTES) return "contest.err.tooBig";
  return null;
}

/**
 * Entering a look: the files first, then the look and its pictures in one
 * call (contest_enter), so there is never a look with a picture missing.
 *
 * If anything fails after the files are up, they are taken down again. A
 * refused look — a second one, or one a minute after entries closed — would
 * otherwise leave its pictures in the bucket with nothing pointing at them.
 */
export async function enterLook(
  supabase: SupabaseClient, contestId: number, me: string,
  files: File[], caption: string, onUploaded: (n: number) => void,
): Promise<{ id: number } | { error: Key }> {
  const up: { path: string; thumb_path: string | null; width: number | null; height: number | null }[] = [];
  const undo = async () => {
    const paths = up.flatMap((u) => [u.path, ...(u.thumb_path ? [u.thumb_path] : [])]);
    if (paths.length) await supabase.storage.from(CONTEST_BUCKET).remove(paths);
  };

  // The reader's own folder in this contest: a name the database makes from
  // who they are and a secret it keeps, so the address of a picture does not
  // say whose it is (v98). The same every time for the same member.
  const { data: folder } = await supabase.rpc("contest_folder", { p_contest: contestId });
  if (typeof folder !== "string" || !folder) return { error: "contest.err.signIn" };

  for (const f of files.slice(0, MAX_PICTURES)) {
    const res = await uploadOne(supabase, me, f,
      { bucket: CONTEST_BUCKET, folder: `${contestId}/${folder}` });
    if ("error" in res) {
      await undo();
      return {
        error: res.error === "not-image" ? "contest.err.notImage"
          : res.error === "too-big" ? "contest.err.tooBig"
          : contestError({ message: res.error }) === "contest.err.generic"
            ? "contest.err.upload" : contestError({ message: res.error }),
      };
    }
    up.push({ path: res.path, thumb_path: res.thumbPath, width: res.width, height: res.height });
    onUploaded(up.length);
  }

  const { data, error } = await supabase.rpc("contest_enter", {
    p_contest: contestId,
    p_caption: caption.trim().slice(0, MAX_CAPTION) || null,
    p_images: up,
  });
  if (error || data == null) {
    await undo();
    return { error: contestError(error) };
  }
  return { id: Number(data) };
}

/**
 * Giving or taking back a popoto. Answers with how many the reader now has on
 * looks in this contest, which is what "left" is worked out from.
 */
export async function castPopoto(
  supabase: SupabaseClient, entryId: number, give: boolean,
): Promise<{ used: number } | { error: Key }> {
  const { data, error } = await supabase.rpc("contest_vote",
    { p_entry: entryId, p_give: give });
  if (error) return { error: contestError(error) };
  return { used: Number(data) };
}

/** A caption, fixed while looks are still being taken. */
export async function saveCaption(
  supabase: SupabaseClient, entryId: number, caption: string,
): Promise<Key | null> {
  const { error } = await supabase.from("contest_entries")
    .update({ caption: caption.trim().slice(0, MAX_CAPTION) || null }).eq("id", entryId);
  return error ? contestError(error) : null;
}

/**
 * Withdrawing a look, or an admin deleting one.
 *
 * The row goes first. Its pictures are protected while a look uses them —
 * that is what stops a picture being swapped under a look that has votes —
 * so the files can only be taken away once the look is gone. If that second
 * step fails the look is still withdrawn; a stray file costs a few hundred
 * kilobytes and nobody sees it.
 */
export async function withdrawLook(
  supabase: SupabaseClient, entryId: number, pictures: ContestImage[],
): Promise<Key | null> {
  const { error } = await supabase.from("contest_entries").delete().eq("id", entryId);
  if (error) return contestError(error);
  const paths = pictures.flatMap((p) => [p.path, ...(p.thumb_path ? [p.thumb_path] : [])]);
  if (paths.length) await supabase.storage.from(CONTEST_BUCKET).remove(paths);
  return null;
}

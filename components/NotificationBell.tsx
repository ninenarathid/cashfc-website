"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "@/lib/i18n";
import { postPath } from "@/lib/gallery";
import { fmtDateTime } from "@/lib/dates";
import { useAvatarOverrides } from "@/lib/avatars";
import { useAdmin } from "@/lib/admin";
import { EVENT_POSTER, markEntry } from "@/lib/evercold";
import { toast } from "@/components/ui/Toast";

interface Note {
  id: number;
  kind: string;
  /** The account that did it, for their face and the way to their page. */
  actor: string | null;
  actor_name: string | null;
  post_id: number | null;
  /** The party it is about, for the three kinds that are about one. */
  party_id?: number | null;
  body: string | null;
  created_at: string;
  read_at: string | null;
  /** A question that has been answered. It stays; its buttons do not. */
  answered_at?: string | null;
  /** Taken off the bell by its reader. Never off the archive. */
  cleared_at?: string | null;
}

/**
 * A marker no name contains, so the sentence can be cut at it.
 *
 * The wording puts the name in a different place in each language, and there is
 * no reason it should not — so the name is not pulled to the front and glued
 * back on. The translated line is rendered with a marker where the name goes
 * and split there, which leaves the sentence exactly as it was written and the
 * name a link inside it.
 */
const SLOT = "%%WHO%%";

function said(
  line: string, name: string, href: string | null, onGo: () => void,
) {
  // Not every notification names anybody. Appending the name to a line that
  // never asked for one is how "There is a new announcement" became "There is a
  // new announcement Aqua Eleison".
  if (!line.includes(SLOT)) return <>{line}</>;
  const [before, after = ""] = line.split(SLOT);
  const who = href
    ? <Link href={href} onClick={onGo}
            className="font-medium text-ink no-underline hover:text-accent hover:underline">
        {name}
      </Link>
    : <span className="font-medium text-ink">{name}</span>;
  return <>{before}{who}{after}</>;
}

/**
 * A picture, with what happened in the corner of it.
 *
 * For the notifications that had nothing to show but a bare icon. A face for
 * the ones that are somebody doing something — a popoto, a message on the
 * feedback page — because "a popoto happened" is not what the notification
 * says; "Aqua sent you one" is. And the poster for an announcement that has
 * one, because a picture somebody went to the trouble of attaching is a better
 * answer to "which announcement?" than a megaphone.
 *
 * The corner rather than the middle: the picture answers "who" or "which", the
 * badge answers "what", and the first is the one somebody scanning a list is
 * actually reading.
 */
function BadgedThumb(
  { src, badge, href, onGo, round = true }: {
    src: string | null; badge: string; href: string | null; onGo: () => void;
    /** Round for a face; square for a picture, which is not one. */
    round?: boolean;
  },
) {
  const shape = round ? "rounded-full" : "rounded-md";
  const body = (
    <span className="relative block size-16 shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt=""
             className={`size-16 border border-line object-cover ${shape}`} />
      ) : (
        <span className={`block size-16 border border-line bg-card ${shape}`} />
      )}
      <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border border-line bg-surface text-[12px]">
        {badge}
      </span>
    </span>
  );
  return href
    ? <Link href={href} onClick={onGo} className="shrink-0">{body}</Link>
    : <span className="shrink-0">{body}</span>;
}

/** Enough to be worth scrolling, few enough to arrive instantly. */
const SHOW = 20;
/** How many more the archive fetches each time it is scrolled to the end. */
const PAGE = 30;

/**
 * Where each kind of notification leads, and what it looks like.
 *
 * Named rather than chained, because the chain that used to do this ended in
 * "there is a new announcement" and so every kind nobody had added a branch for
 * -- feedback among them -- announced itself as an announcement and linked
 * nowhere. Somebody then went looking through the announcements for a message
 * that was never there. An unknown kind now says only that something happened,
 * which is true, and a new kind is one row here.
 */
const KIND: Record<string, { say: Key; icon: string; href: string }> = {
  // A pin, because that is what a tag is on the photograph itself and on
  // the button that places one. One idea, one mark.
  tag: { say: "notif.tagged", icon: "📍", href: "" },
  comment: { say: "notif.commented", icon: "💬", href: "" },
  // The href is filled in per notification: a potato on your profile leads to
  // your page, and which page that is depends on the character you hold.
  popoto: { say: "notif.popoto", icon: "🥔", href: "" },
  popoto_post: { say: "notif.popotoPost", icon: "🥔", href: "" },
  announcement: { say: "notif.announced", icon: "📣", href: "/" },
  feedback: { say: "notif.feedback", icon: "✉️", href: "/feedback" },
  // The draw. A ticket, because that is what an entry is, and the poster is
  // the picture beside it — this is the one notification with no person in it.
  evercold: { say: "notif.evercold", icon: "🎟️", href: "" },
  /*
   * The party finder. All three lead to the party itself rather than to the
   * board — the board is a list, and a list is where somebody has to start
   * looking again for the thing they were just told about.
   *
   * A raised hand for a request, because that is what it is; an envelope for an
   * invitation; a tick for being let in.
   */
  party_join: { say: "notif.partyJoin", icon: "✋", href: "/party" },
  party_invite: { say: "notif.partyInvite", icon: "✉️", href: "/party" },
  party_ok: { say: "notif.partyOk", icon: "✅", href: "/party" },
  // Somebody said something where you are. The speech bubble, the same mark
  // the tell button wears, because it is the same idea.
  party_talk: { say: "notif.partyTalk", icon: "💬", href: "/party" },
  // The seat you were asked about went to somebody else. Still an invitation,
  // now a different one, which is why it is told rather than withdrawn.
  party_seat_gone: { say: "notif.partySeatGone", icon: "🪑", href: "/party" },
  /*
   * Your own party, filling and emptying, told to you and to nobody else.
   *
   * A lead who asked four people about D4 and went to make dinner used to come
   * back to a party that had changed twice and had to count the seats to find
   * out. The second one is the one that matters: somebody dropping out at ten
   * to eight is the only thing a lead has to act on that evening.
   */
  party_in: { say: "notif.partyIn", icon: "🙌", href: "/party" },
  party_out: { say: "notif.partyOut", icon: "🚪", href: "/party" },
};

/**
 * Where one notification leads.
 *
 * A picture is its own address; a party is an address with the party in it; a
 * popoto given to you leads to the page it was given to, which is the one
 * everybody else sees with the count on it rather than the profile editor. A
 * kind nobody has taught this leads nowhere rather than to the front page
 * pretending to be an answer.
 */
const hrefOf = (
  n: { kind: string; post_id: number | null; party_id?: number | null },
  character: number | null,
  postPath: (id: number) => string,
): string | null => (
  n.kind === "popoto" ? (character != null ? `/member/${character}` : "/profile")
    : n.party_id ? `/party?p=${n.party_id}`
      : n.post_id ? postPath(n.post_id)
        : (KIND[n.kind]?.href || null)
);
/** A bell nobody is looking at can afford to be a minute and a half behind. */
const POLL_MS = 90_000;

/**
 * The count, in the browser tab.
 *
 * The red dot on the bell only works on somebody looking at the site. Most of
 * the time this tab is one of fifteen behind a game, and the tab strip shows a
 * favicon and about twelve characters of title — so the count goes at the very
 * front, where those twelve characters are, in the shape mail and chat have
 * used for twenty years.
 *
 * It does NOT set document.title, which is the obvious way and does not work
 * here. Two earlier attempts, and what each ran into:
 *
 *   Writing it once, on mount. Next rewrites the title on every navigation from
 *   the metadata of the page being opened, so the count survived until the
 *   first click and then was gone for good.
 *
 *   Writing it back whenever the title changed. The <title> node is React's,
 *   and React puts its own text back the moment anything else edits it — the
 *   two then take turns about a hundred and eighty times a second, and the tab
 *   flickers between the two spellings. /members renders six title elements;
 *   `document.title` writes the first, React re-renders it, and round it goes.
 *
 * So this does not touch React's titles at all. It adds one of its own at the
 * front of the head and keeps it there. The document's title is the text of the
 * first <title> in tree order, so ours is the one the tab shows, React goes on
 * managing its own underneath, and neither has to know about the other. The
 * base text is read back out of React's title, so the count rides on whatever
 * the current page calls itself without ever having to be told a page changed.
 */
function useTitleCount(n: number) {
  useEffect(() => {
    if (n <= 0) return;
    const head = document.head;
    const mine = document.createElement("title");
    // Findable in the inspector, so the next person to wonder why there are two
    // has the answer in the element itself.
    mine.dataset.unread = String(n);

    /**
     * What the page calls itself: the first title that is not ours.
     *
     * Searched across the whole document rather than the head, because React
     * does not always put it in the head — on the front page it renders the
     * title in place and hoists it later, and a search of the head alone came
     * back empty there and made the tab read "(4)" with no name after it.
     */
    const base = () => {
      for (const el of document.querySelectorAll("title")) {
        if (el !== mine) return el.textContent ?? "";
      }
      return "";
    };

    let queued = 0;
    const settle = () => {
      queued = 0;
      const name = base();
      // Nothing to count against yet. Stay out of the document rather than
      // show a number on its own, and try again on the next thing that moves.
      if (!name) { mine.remove(); return; }
      // First in the document, or it is not the one being read: the title is
      // the text of the first <title> in tree order, and the head comes before
      // the body.
      if (head.firstChild !== mine) head.insertBefore(mine, head.firstChild);
      const want = `(${n}) ${name}`;
      if (mine.textContent !== want) mine.textContent = want;
    };
    settle();

    // Coalesced, and idempotent: once it is right, running it again writes
    // nothing, so this cannot set off the loop it is watching for.
    const watch = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(settle);
    });
    watch.observe(head, { childList: true, subtree: true, characterData: true });

    return () => {
      watch.disconnect();
      if (queued) cancelAnimationFrame(queued);
      mine.remove();        // and the tab is the page's own title again
    };
  }, [n]);
}

/**
 * Today, as the kudos table reckons it.
 *
 * A popoto is one per person per day and the database enforces that on a `day`
 * column defaulting to current_date, which on this server is UTC. toISOString
 * is UTC too, so these are the same day boundary rather than two that agree
 * most of the time and disagree for seven hours every night.
 */
const todayUtc = () => new Date().toISOString().slice(0, 10);

/**
 * What happened while you were away.
 *
 * A tag is the reason this exists. Somebody putting your name on a picture is a
 * question addressed to you, and before this the only way to find out it had been
 * asked was to happen to open your own profile page. It now comes to you, with
 * the picture attached — nobody should have to go hunting for a photograph to
 * decide whether they want to be named in it — and both answers are here, so the
 * whole exchange is one place and two clicks.
 *
 * Everything else is a sentence and a link: an announcement, somebody talking
 * under a picture of yours. Popoto is deliberately not in here. Five hundred
 * members pressing a button is not five hundred things anybody needs told.
 *
 * The count is what the badge is for; opening the panel marks what is in it as
 * read, because having looked at something is what read means and asking somebody
 * to also click "mark as read" is asking them to do the same thing twice.
 */
export default function NotificationBell() {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const faces = useAvatarOverrides();
  // The switch-adjusted answer rather than the database's: whether an
  // announcement names the admin who wrote it is a matter of what this screen
  // shows, and an admin who turns their powers off asked to see what everybody
  // else sees.
  const { isAdmin } = useAdmin();
  const [me, setMe] = useState<string | null>(null);
  const [character, setCharacter] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [covers, setCovers] = useState<Record<number, string>>({});
  /**
   * The people who did these things: their face, and the page their name goes to.
   *
   * A potato is not a picture, so there was nothing to draw beside it but a
   * generic icon — which said "a potato happened" and not "Aqua sent you one",
   * and the second is the whole content of the notification. Keyed by account
   * rather than by character because that is what the row records.
   */
  const [people, setPeople] = useState<Record<string,
    { characterId: number | null; avatar: string | null }>>({});
  /**
   * The picture on an announcement, by its title.
   *
   * By title because that is the only thing the notification keeps of it — the
   * row has no column pointing at the announcement, and its body is the title.
   * Two announcements with exactly the same title would share a picture here,
   * which is a smaller wrong than adding a column and a migration for a
   * thumbnail.
   */
  const [posters, setPosters] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  /**
   * The ids already accounted for, so a toast is raised once and only for what
   * arrived while somebody was here.
   *
   * Null until the first load has been read: everything in that first page is
   * from before this session, and announcing twenty things somebody has already
   * seen the moment they open a page is worse than announcing none of them.
   */
  const seen = useRef<Set<number> | null>(null);
  /**
   * Characters this account has already given a popoto to today.
   *
   * Read once when the bell loads rather than asked per button: the answer is
   * the same for every row and the panel would otherwise open with a small
   * query for each of them.
   */
  const [given, setGiven] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState<Set<number>>(new Set());
  const [backErr, setBackErr] = useState<string | null>(null);
  /**
   * Everything, for when the twenty in the panel are not far enough back.
   *
   * The panel is a panel: it hangs off a button, it is read standing up, and a
   * list that scrolls for ever inside one is a list nobody finds the bottom of.
   * So it keeps the twenty most recent and the rest live behind a line at the
   * end of it — fetched a page at a time as that list is scrolled, because
   * somebody looking for one thing from three weeks ago should not wait for
   * three weeks of everything first.
   */
  /** How many are cleared, which is only ever used to decide what to offer. */
  const [hidden, setHidden] = useState(0);
  const [past, setPast] = useState<Note[] | null>(null);
  const [morePast, setMorePast] = useState(true);
  const [loadingPast, setLoadingPast] = useState(false);

  /**
   * One page of notifications, with the faces and pictures they need.
   *
   * Shared by the panel and by the archive behind it, because the difference
   * between them is only how many and how far back — everything about what a
   * row needs in order to be drawn is the same, and had it been written twice
   * the second list would have been the one missing a face.
   */
  const page = useCallback(async (
    from: number, take: number,
    /**
     * Whether cleared ones count.
     *
     * The only difference between the bell and the record. The bell is a list
     * of things still wanting attention, so clearing takes them off it; the
     * archive is what happened, and nothing is ever off that.
     */
    { withCleared = false }: { withCleared?: boolean } = {},
  ): Promise<Note[]> => {
    if (!supabase) return [];
    let q = supabase.from("notifications")
      // One string literal, not a concatenation: supabase-js reads this at the
      // type level and cannot parse a value it has to compute.
      // eslint-disable-next-line max-len
      .select("id, kind, actor, actor_name, post_id, party_id, body, created_at, read_at, answered_at, cleared_at");
    if (!withCleared) q = q.is("cleared_at", null);
    const { data } = await q
      .order("created_at", { ascending: false })
      .range(from, from + take - 1);
    const rows = (data as Note[]) ?? [];
    if (!rows.length) return [];

    const actors = [...new Set(rows.map((n) => n.actor).filter(Boolean) as string[])];
    if (actors.length) {
      const { data: who } = await supabase.from("profiles")
        .select("id, character_id, discord_avatar").in("id", actors);
      const by: Record<string, { characterId: number | null; avatar: string | null }> = {};
      for (const r of (who ?? []) as Record<string, unknown>[]) {
        by[r.id as string] = {
          characterId: (r.character_id as number | null) ?? null,
          avatar: (r.discord_avatar as string | null) ?? null,
        };
      }
      // Merged rather than replaced: the archive keeps adding pages, and a
      // fresh map would blank the faces on everything already drawn.
      setPeople((v) => ({ ...v, ...by }));
    }

    if (rows.some((n) => n.kind === "announcement")) {
      const { data: anns } = await supabase.from("announcements")
        .select("title, image_url").not("image_url", "is", null)
        .order("created_at", { ascending: false }).limit(50);
      const by: Record<string, string> = {};
      for (const a of (anns ?? []) as { title: string; image_url: string }[]) {
        // Newest first, so the first of a repeated title wins.
        if (a.title && a.image_url && !(a.title in by)) by[a.title] = a.image_url;
      }
      setPosters((v) => ({ ...v, ...by }));
    }

    // The picture is the answer to "which one?", so it travels with the question.
    const ids = [...new Set(rows.map((n) => n.post_id).filter(Boolean) as number[])];
    if (ids.length) {
      // The small copy, not the picture. These are drawn at 48 pixels square and
      // were being fetched at full size — four notifications open in a dropdown
      // pulled about fourteen megabytes of PNG to fill four thumbnails, on the
      // same connection as whatever the reader clicked next.
      const { data: posts } = await supabase.from("gallery_posts")
        .select("id, image_url, thumb_url").in("id", ids);
      const map: Record<number, string> = {};
      for (const r of (posts ?? []) as
           { id: number; image_url: string; thumb_url?: string | null }[]) {
        map[r.id] = r.thumb_url || r.image_url;
      }
      setCovers((v) => ({ ...v, ...map }));
    }
    return rows;
  }, [supabase]);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: user } = await supabase.auth.getUser();
    const uid = user.user?.id ?? null;
    setMe(uid);
    if (!uid) { setNotes([]); return; }

    const { data: prof } = await supabase.from("profiles")
      .select("character_id, character_verified_at").eq("id", uid).maybeSingle();
    const p = prof as {
      character_id?: number | null; character_verified_at?: string | null;
    } | null;
    setCharacter(p?.character_verified_at ? p.character_id ?? null : null);

    // Who has already had one from me today, so the button can say so before it
    // is pressed rather than after.
    const { data: mine } = await supabase.from("kudos")
      .select("receiver_character_id").eq("sender_id", uid).eq("day", todayUtc());
    setGiven(new Set(((mine ?? []) as { receiver_character_id: number }[])
      .map((k) => k.receiver_character_id)));

    const rows = await page(0, SHOW);
    setNotes(rows);

    // Counted rather than fetched. The archive link only appears when there is
    // something behind the panel, and after a clear the panel is empty — so
    // without this the button that leads to the cleared ones would be hidden by
    // the act of clearing them, which is the one way to make a soft clear feel
    // exactly like a delete.
    const { count } = await supabase.from("notifications")
      .select("id", { count: "exact", head: true }).not("cleared_at", "is", null);
    setHidden(count ?? 0);
  }, [supabase, page]);



  useEffect(() => {
    void load();
    const id = setInterval(() => { if (!document.hidden) void load(); }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  /**
   * Anything new in the list, said in the corner as well as filed in the bell.
   *
   * Watches the list rather than being called by whatever fetched it. Doing it
   * inside the fetch meant the fetch had to depend on the faces and the
   * pictures it had just stored, which changed its identity every time it ran —
   * and the effect that holds the poll and the live subscription depends on the
   * fetch, so the two of them chased each other round, tearing the subscription
   * down and putting it back up on a loop. Watching the result instead breaks
   * the circle: nothing the announcing needs is anything the fetching reads.
   *
   * Unread only, and never on the first pass. The bell is the record of what
   * you missed; this is for what arrives while you are still here, and a page
   * that greets you with six toasts for things you read yesterday has
   * misunderstood which of the two it is.
   */
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(notes.map((n) => n.id));
      return;
    }
    // Oldest first, so two arriving together stack in the order they happened.
    for (const n of [...notes].reverse()) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.read_at) continue;
      const kind = KIND[n.kind];
      const line = n.kind === "announcement"
        ? t("notif.announced")
        : n.kind === "evercold"
          ? t("notif.evercold", { n: n.body ?? "?" })
          : kind ? t(kind.say, { who: n.actor_name ?? "—" }) : t("notif.something");
      const actor = n.actor ? people[n.actor] : undefined;
      const face = actor?.characterId != null
        ? faces[actor.characterId] ?? actor.avatar : actor?.avatar ?? null;
      toast({
        // The toast has one line for both facts, so the event goes in front —
        // it is the thing that makes the sentence after it mean anything.
        text: n.kind === "evercold"
          ? `${t("notif.evercoldEvent")} — ${line}` : line,
        image: n.kind === "evercold" ? EVENT_POSTER
          : n.post_id ? covers[n.post_id] ?? face : face,
        badge: kind?.icon,
        // Green, because earning a ticket is the one thing the bell says that
        // is unambiguously a bit of luck.
        tone: n.kind === "evercold" ? "good" : "accent",
        href: hrefOf(n, character, postPath),
      });
    }
    // Only the list matters. The faces and pictures are read as they are at the
    // moment a row appears, and a toast is not redrawn when one arrives later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  /**
   * Told rather than asked, for the moment somebody is actually here.
   *
   * A minute and a half is fine for a bell nobody is looking at and far too
   * long for "Aqua just sent you a potato" — by the time the poll came round
   * the moment it belonged to has passed. The row is filtered to this account
   * in the subscription and again by the read policy underneath it, so what
   * arrives here is only ever yours.
   *
   * The poll stays as the floor. If the table is not in the realtime
   * publication, or the socket cannot be opened, this is late rather than
   * missing.
   */
  useEffect(() => {
    if (!supabase || !me) return;
    const channel = supabase.channel(`notifications:${me}`)
      .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications",
            filter: `recipient=eq.${me}` },
          () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, me, load]);

  // Clicking anywhere else puts it away, which is what everybody expects of a
  // panel hanging off a button.
  const unread = notes.filter((n) => !n.read_at).length;
  useTitleCount(unread);

  async function reveal() {
    const next = !open;
    setOpen(next);
    if (!next || !supabase || !unread) return;
    const now = new Date().toISOString();
    setNotes((v) => v.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications")
      .update({ read_at: now }).is("read_at", null);
  }

  async function answerTag(postId: number, yes: boolean) {
    if (!supabase || character == null || busy) return;
    setBusy(true);
    if (yes) {
      await supabase.from("gallery_tags")
        .update({ confirmed_at: new Date().toISOString() })
        .eq("post_id", postId).eq("character_id", character);
    } else {
      await supabase.from("gallery_tags")
        .delete().eq("post_id", postId).eq("character_id", character);
    }
    setBusy(false);
    // The database marks it answered; this is only the screen catching up
    // without waiting for a round trip.
    const now = new Date().toISOString();
    const settle = (v: Note[]) => v.map((n) => (n.kind === "tag" && n.post_id === postId
      ? { ...n, answered_at: now } : n));
    setNotes(settle);
    setPast((v) => (v ? settle(v) : v));
    void load();
  }

  /**
   * Take everything off the bell, and keep every word of it.
   *
   * The button that used to be here deleted, and deleting is how nine real
   * notifications were lost with no way to get them back. This one writes a
   * date into a column: the panel stops listing them, the archive goes on
   * listing them, and the rows themselves are untouched.
   *
   * Read as well as cleared. Clearing is somebody saying they have dealt with
   * the lot, and leaving one of them counted as unread afterwards would leave a
   * red dot on a bell with nothing behind it.
   *
   * The screen empties first. The list is already on this machine and the round
   * trip only writes it down, so waiting for the server before believing the
   * button was pressed buys nothing.
   */
  async function clearAll() {
    if (!supabase || !notes.length) return;
    const gone = notes.length;
    setNotes([]);
    setHidden((v) => v + gone);
    const now = new Date().toISOString();
    // No recipient filter: the policy is the filter, and naming the column
    // twice is one more place for the two to disagree.
    const { error } = await supabase.from("notifications")
      .update({ cleared_at: now, read_at: now }).is("cleared_at", null);
    // Put them back rather than leave the panel lying about what the server
    // holds. Nothing was destroyed either way, so this is only the screen
    // catching up with a refusal.
    if (error) void load();
  }

  async function openPast() {
    setOpen(false);
    if (past) return;
    setLoadingPast(true);
    const first = await page(0, PAGE, { withCleared: true });
    setPast(first);
    setMorePast(first.length === PAGE);
    setLoadingPast(false);
  }

  async function morePages() {
    if (loadingPast || !morePast || !past) return;
    setLoadingPast(true);
    const next = await page(past.length, PAGE, { withCleared: true });
    setPast([...past, ...next]);
    setMorePast(next.length === PAGE);
    setLoadingPast(false);
  }

  /**
   * A popoto back to somebody who sent you one, from the notification itself.
   *
   * Only for one that arrived today. A popoto is one per person per day, so
   * yesterday's notification is not something that can be answered any more —
   * the reply would be a new gesture on a new day rather than a reply, and a
   * button that says "send one back" about a Tuesday is a button about nothing.
   *
   * The database has the last word on the one-a-day rule. If it says the row
   * already exists, that is not an error to report: it means the answer is
   * already yes, so the button simply becomes the sentence saying so.
   */
  async function sendBack(characterId: number) {
    if (!supabase || !me || sending.has(characterId)) return;
    setBackErr(null);
    setSending((v) => new Set(v).add(characterId));
    const { error } = await supabase.from("kudos")
      .insert({ sender_id: me, receiver_character_id: characterId });
    setSending((v) => { const n = new Set(v); n.delete(characterId); return n; });
    if (error && error.code !== "23505") {
      setBackErr(error.message);
      return;
    }
    setGiven((v) => new Set(v).add(characterId));
    // Sending one back is giving one, so it earns the day the same as any
    // other. Fired and forgotten: the potato has landed either way.
    void markEntry(supabase, me, character);
  }

  /** Everybody in the panel who sent one today and has not had one back. */
  const owed = (() => {
    const out = new Map<number, string>();
    if (character == null) return out;   // nothing to send one with
    for (const n of notes) {
      if (n.kind !== "popoto") continue;
      if (n.created_at.slice(0, 10) !== todayUtc()) continue;
      const cid = n.actor ? people[n.actor]?.characterId ?? null : null;
      if (cid == null || cid === character || given.has(cid)) continue;
      out.set(cid, n.actor_name ?? "—");
    }
    return out;
  })();

  /** Going somewhere puts away whichever list you were reading. */
  const dismiss = () => { setOpen(false); setPast(null); };

  /**
   * One notification, drawn the same wherever it is read.
   *
   * The panel and the archive are the same list with different ends, so this is
   * a function rather than two copies — the copy that is not the one being
   * looked at is the copy that quietly stops matching.
   */
  const row = (n: Note) => {
    const cover = n.post_id ? covers[n.post_id] : null;
    const kind = KIND[n.kind];
    const href = hrefOf(n, character, postPath);
    /*
     * An announcement is from the admins, and which of them wrote it is not the
     * Free Company's business. It is the other admins' business: they are the
     * ones who need to know whether it was them, and a board where nobody can
     * tell who posted what is a board nobody can correct. So the name is on the
     * line only for somebody who could have written it.
     */
    const say = n.kind === "announcement"
      ? (isAdmin ? ("notif.announcedBy" as const) : ("notif.announced" as const))
      : kind?.say;
    // The one notification with nobody in it: nothing was done to you, you did
    // something, and the poster is what it is about.
    const eventPoster = n.kind === "evercold" ? EVENT_POSTER : null;
    const actor = n.actor ? people[n.actor] : undefined;
    const actorFace = actor?.characterId != null
      ? faces[actor.characterId] ?? actor.avatar : actor?.avatar ?? null;
    const actorHref = actor?.characterId != null
      ? `/member/${actor.characterId}` : null;
    // Neither a popoto nor a message on the feedback page is a picture. What
    // they have instead is the person who sent it, so their face is the
    // thumbnail and what they did sits in the corner of it. Anything with a
    // picture of its own keeps it: a tag is answered by looking at the
    // photograph, and an announcement does not say whose it was.
    const facing = n.kind === "popoto" || n.kind === "popoto_post"
      ? "🥔" : n.kind === "feedback" ? "✉️"
        // Everything the party finder sends is one person doing something to
        // your evening — asking for a seat, saying yes, leaving, speaking in a
        // party you are in. Who it was is the first thing you want, and a
        // column of identical speech bubbles was the one thing it said.
        : n.kind.startsWith("party_") ? (kind?.icon ?? "🔔")
          : null;
    // An announcement with a picture on it shows that picture, squarely,
    // because it is a poster and not a face.
    const poster = n.kind === "announcement" && n.body
      ? posters[n.body] ?? null : eventPoster;
    // Answered tags keep their line and their picture and lose their buttons.
    // Taking the whole notification away took the photograph with it, which is
    // the thing somebody who has just agreed to be named in one is most likely
    // to want next.
    const asking = n.kind === "tag" && character != null && !n.answered_at;
    // A popoto that arrived today, from somebody with a page, and not from
    // yourself: the only case where sending one back is a reply rather than a
    // new gesture on a different day.
    const backTo = n.kind === "popoto"
      && character != null
      && n.created_at.slice(0, 10) === todayUtc()
      && actor?.characterId != null
      && actor.characterId !== character
      ? actor.characterId : null;

    return (
      <div key={n.id}
           className={`flex gap-3.5 border-b border-line px-4 py-3.5 last:border-0 ${
             n.read_at ? "" : "bg-accent/5"}`}>
        {poster ? (
          <BadgedThumb src={poster} badge={n.kind === "evercold" ? "🎟️" : "📣"}
                       round={false} href={href} onGo={dismiss} />
        ) : facing && (actorFace || actorHref) ? (
          <BadgedThumb src={actorFace} badge={facing} href={actorHref}
                       onGo={dismiss} />
        ) : cover ? (
          // The picture answers "which one?", and the badge on it answers what
          // happened to it — a pin for a tag, a speech bubble for a comment.
          // Before this the picture said neither, and the icon that would have
          // said it only ever appeared when there was no picture at all.
          <BadgedThumb src={cover} badge={kind?.icon ?? "🔔"} round={false}
                       href={href} onGo={dismiss} />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-md border border-line text-[20px]">
            {kind?.icon ?? "🔔"}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug text-ink/90">
            {/* The event line takes a count where the others take a name, and
                nobody did it to you — so it is written straight rather than
                threaded through the linked-name machinery. */}
            {n.kind === "evercold"
              ? t("notif.evercold", { n: n.body ?? "?" })
              : say
                ? said(t(say, { who: SLOT }), n.actor_name ?? "—",
                       actorHref, dismiss)
                : t("notif.something")}
          </p>
          {/* The second line is the body everywhere except the event, where the
              body is the number already spoken above and what belongs here is
              which draw earned it. */}
          {n.kind === "evercold" ? (
            <p className="mt-1 font-data text-[11px] uppercase tracking-[0.1em] text-jade">
              {t("notif.evercoldEvent")}
            </p>
          ) : n.body ? (
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted">
              {n.body}
            </p>
          ) : null}
          {backTo != null && (
            <div className="mt-1.5">
              {given.has(backTo) ? (
                // Not a disabled button. There is nothing left to press, and a
                // greyed-out control invites a click that will never do
                // anything — a sentence says the same thing and does not lie.
                <span className="inline-flex items-center gap-1.5 text-[12px] text-jade">
                  🥔 {t("notif.backDone")}
                </span>
              ) : (
                <button onClick={() => sendBack(backTo)}
                        disabled={sending.has(backTo)}
                        className="rounded-md border border-gold/60 bg-gold/10 px-2.5 py-0.5 text-[12px] text-gold transition-colors hover:bg-gold/20 disabled:opacity-50">
                  🥔 {sending.has(backTo) ? t("notif.backSending") : t("notif.back")}
                </button>
              )}
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span className="text-[11.5px] text-muted">{when(n.created_at)}</span>
            {/* Not only for pictures. A notification that names a thing and
                then leaves you to find it is the reason somebody went hunting
                through the wrong page. */}
            {!asking && href && (
              <Link href={href} onClick={dismiss}
                    className="text-[11.5px] text-accent no-underline hover:underline">
                {t("notif.open")}
              </Link>
            )}
          </div>

          {asking && n.post_id && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button onClick={() => answerTag(n.post_id!, true)} disabled={busy}
                      className="rounded-md border border-jade bg-jade/15 px-2.5 py-0.5 text-[12px] text-jade hover:bg-jade/25 disabled:opacity-50">
                {t("gallery.tagConfirm")}
              </button>
              <button onClick={() => answerTag(n.post_id!, false)} disabled={busy}
                      className="rounded-md border border-line px-2.5 py-0.5 text-[12px] text-muted hover:border-chili hover:text-chili disabled:opacity-50">
                {t("gallery.tagDecline")}
              </button>
              {href && (
                <Link href={href} onClick={dismiss}
                      className="px-1 py-0.5 text-[12px] text-accent no-underline hover:underline">
                  {t("notif.look")}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!supabase || !me) return null;

  const when = (iso: string) => fmtDateTime(iso);

  return (
    // A Popover, not a DropdownMenu: the contents are a list of things to read
    // with buttons inside them, and a menu's arrow keys would fight the links
    // and the yes/no buttons on a tag request for control of the same keys.
    <Popover.Root open={open} onOpenChange={(v) => (v ? reveal() : setOpen(false))}>
      <Popover.Trigger aria-label={t("notif.title")}
              className={`relative grid size-9 place-items-center rounded-lg border transition-colors ${
                open ? "border-accent text-accent" : "border-line text-muted hover:border-muted hover:text-ink"}`}>
        <svg viewBox="0 0 24 24" aria-hidden width="18" height="18"
             fill="none" stroke="currentColor" strokeWidth="1.8"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
          <path d="M10.3 20a2 2 0 003.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[17px] place-items-center rounded-full bg-chili px-1 font-data text-[10px] font-semibold text-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={10}
          className="pop-in z-50 w-[min(34rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <span className="font-display text-[13.5px] font-semibold">
              {t("notif.title")}
            </span>
            {notes.length > 0 && (
              // Quiet, and it says on hover that it does not delete — the last
              // button in this corner did, so the promise is worth making
              // before the press rather than after.
              <button onClick={clearAll} title={t("notif.clearTitle")}
                      className="rounded-md px-2 py-0.5 text-[12px] text-muted transition-colors hover:bg-card hover:text-ink">
                {t("notif.clear")}
              </button>
            )}
          </div>

          <div className="max-h-[min(46rem,72vh)] overflow-y-auto">
            {notes.length === 0 && (
              <p className="px-3.5 py-6 text-center text-[12.5px] text-muted">
                {hidden > 0 ? t("notif.emptyCleared") : t("notif.empty")}
              </p>
            )}

            {notes.map(row)}
          </div>

          {/* Everybody at once, when there is more than nothing to answer. The
              same thing as pressing each button in turn, and pressed by
              somebody who has just read a panel full of them. */}
          {owed.size > 0 && (
            <button onClick={() => { for (const cid of owed.keys()) void sendBack(cid); }}
                    disabled={sending.size > 0}
                    className="w-full border-t border-line bg-gold/5 px-3.5 py-2.5 text-center text-[12.5px] text-gold hover:bg-gold/15 disabled:opacity-50">
              🥔 {t("notif.backAll", { n: owed.size })}
            </button>
          )}

          {backErr && (
            <p className="border-t border-line px-3.5 py-2 text-[12px] text-chili">
              {backErr}
            </p>
          )}

          {/* Only when there might be more behind it. Twenty back is a fortnight
              for somebody the FC talks to and a year for somebody it does not,
              so the offer is made by whether the page came back full rather
              than by a guess at how long that is. */}
          {(notes.length >= SHOW || hidden > 0) && (
            <button onClick={openPast}
                    className="w-full border-t border-line px-3.5 py-2.5 text-center text-[12.5px] text-accent hover:bg-card">
              {t("notif.seeAll")}
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>

      {/* Everything, in a window rather than hanging off the button: a list you
          read sitting down wants the room, and the panel is not the place to
          scroll through a year. Fetched a page at a time as it nears the end,
          so opening it costs one page however long the year was. */}
      <Dialog.Root open={past !== null} onOpenChange={(o) => { if (!o) setPast(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="pop-in fixed inset-0 z-[60] bg-bg/80 backdrop-blur-sm" />
          <Dialog.Content
            className="pop-in fixed left-1/2 top-1/2 z-[61] flex max-h-[86vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-line bg-surface shadow-2xl shadow-black/60">
            <Dialog.Title className="border-b border-line px-4 py-3 font-display text-[14px] font-semibold text-ink">
              {t("notif.past")}
            </Dialog.Title>

            <div
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight > el.scrollHeight - 120) void morePages();
              }}
              className="min-h-0 flex-1 overflow-y-auto">
              {past?.length === 0 && !loadingPast && (
                <p className="px-4 py-8 text-center text-[12.5px] text-muted">
                  {t("notif.pastNone")}
                </p>
              )}
              {(past ?? []).map(row)}
              {loadingPast && (
                <p className="px-4 py-3 text-center text-[12px] text-muted">
                  {t("common.loading")}
                </p>
              )}
            </div>

            <Dialog.Close className="border-t border-line px-4 py-2.5 text-[13px] text-muted hover:text-ink">
              {t("common.close")}
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Popover.Root>
  );
}
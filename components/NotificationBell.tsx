"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "@/lib/i18n";
import { postPath } from "@/lib/gallery";
import { eventPath } from "@/lib/events";
import { fmtDateTime } from "@/lib/dates";
import { useAvatarOverrides } from "@/lib/avatars";
import { useAdmin } from "@/lib/admin";
import { EVENT_POSTER, markEntry } from "@/lib/evercold";
import { toast } from "@/components/ui/Toast";
import GiftIcon from "@/components/ui/GiftIcon";
import { RARE_INVENTORY, type RareTier } from "@/lib/popoto-rare";
import { PRIZE_INVENTORY } from "@/lib/prizes";
import { throwPotato } from "@/components/ui/throwPotato";

interface Note {
  id: number;
  kind: string;
  /** The account that did it, for their face and the way to their page. */
  actor: string | null;
  actor_name: string | null;
  post_id: number | null;
  /** The party it is about, for the three kinds that are about one. */
  party_id?: number | null;
  /** The notice it is about, which is the one kind that is. */
  announcement_id?: number | null;
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
  { src, badge, extra, href, onGo, round = true, face = null }: {
    src: string | null; badge: React.ReactNode; href: string | null; onGo: () => void;
    /** A second thing in the other corner — the parcel that came with a popoto. */
    extra?: React.ReactNode;
    /** Round for a face; square for a picture, which is not one. */
    round?: boolean;
    /**
     * Whose face this is, when a popoto can be thrown back at it.
     *
     * A mark rather than a ref: the rows are drawn by one function for the
     * panel and for the archive, and the picture being aimed at is whichever
     * copy is on the screen at the moment of the throw. Asking the page then
     * is the only way that question has one answer.
     */
    face?: number | null;
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
      <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border border-line bg-surface text-ui">
        {badge}
      </span>
      {extra && (
        <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full border border-gold/70 bg-surface shadow-[0_0_8px_rgba(229,204,128,.45)]">
          {extra}
        </span>
      )}
    </span>
  );
  const mark = face == null ? undefined : String(face);
  // Every picture is marked, not only the ones a potato can be thrown at for
  // real: the console command below throws at them, and a panel with nothing
  // to answer today is still a panel the animation has to be looked at in.
  return href
    ? <Link href={href} onClick={onGo} className="shrink-0"
            data-notif-thumb data-potato-face={mark}>
        {body}
      </Link>
    : <span className="shrink-0" data-notif-thumb data-potato-face={mark}>{body}</span>;
}

/** Enough to be worth scrolling, few enough to arrive instantly. */
const SHOW = 20;
/** How many more the archive fetches each time it is scrolled to the end. */
const PAGE = 30;
/**
 * The beat between two potatoes leaving the "send them all back" button.
 *
 * Long enough that they are a handful of separate things thrown and not one
 * potato-shaped blur, short enough that a panel of six is answered in about a
 * second. They overlap in the air, which is what a volley looks like.
 */
const VOLLEY = 190;

/**
 * A row brought into the list before anything is thrown at it.
 *
 * Sending one back to everybody can aim at a row that has been scrolled past,
 * and a potato landing below the panel, on the page behind it, has landed on
 * nothing. Moving the list first also means the person who pressed the button
 * watches each one arrive rather than being told that six went somewhere.
 */
async function intoView(el: Element | null) {
  const list = el?.closest("[data-notif-list]");
  if (!el || !list) return;
  const box = el.getBoundingClientRect();
  const view = list.getBoundingClientRect();
  if (box.top >= view.top && box.bottom <= view.bottom) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  if (!reduce) await new Promise((r) => setTimeout(r, 340));
}

/**
 * The throw with nothing thrown, for looking at it.
 *
 * Local development only. It aims at every picture in whichever list is open
 * rather than only at the people who sent one today, which is the point of it:
 * answering a popoto is the one thing on the site nobody can arrange on their
 * own — somebody else has to have sent you one, this morning — so without this
 * the animation could only be tuned on a day the FC happened to provide.
 *
 * Nothing is written: no popoto, no notification, no day counted towards the
 * draw. What it shows is the flight and the landing, and those are the same
 * ones the real button uses.
 *
 * A row that really can be answered is thrown at from its own "send one back",
 * because that is where its potato would come from if the button were pressed
 * — which is the whole point of a trial. `from` is for the rest: the rows with
 * no such button, which have no launching point of their own and take the one
 * the trial was started from.
 */
async function tryThrow(from: Element | DOMRect, only?: number) {
  const list = document.querySelector("[data-notif-list]");
  const faces = Array.from(list?.querySelectorAll("[data-notif-thumb]") ?? []);
  if (!faces.length) {
    console.warn("Open the bell first: there is nothing on screen to throw at.");
    return;
  }
  for (const face of only == null ? faces : [faces[only] ?? faces[0]]) {
    await intoView(face);
    // The picture is a child of the row, so the row is where its own button is.
    const own = face.parentElement?.querySelector("[data-potato-from]");
    void throwPotato(own ?? from, face);
    await new Promise((r) => setTimeout(r, VOLLEY));
  }
}

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
  // One in a hundred arrives wrapped. Its row leads to the inventory on the
  // edit-profile page, where every parcel is opened (see hrefOf).
  popoto_rare: { say: "notif.popotoRare", icon: "🎁", href: "" },
  /*
   * A prize an admin has to hand over. Four kinds for one thing, because the
   * four sentences are addressed to two different people and lead to two
   * different places: the winner's are answered in their inventory, the
   * admins' in the admin panel. One kind for both sides would have to guess
   * which one is reading, and a bell that guesses wrong sends somebody to a
   * page with nothing on it. See v87.
   */
  prize_win: { say: "notif.prizeWin", icon: "🎉", href: "" },
  prize_done: { say: "notif.prizeDone", icon: "✅", href: "" },
  prize_talk: { say: "notif.prizeTalk", icon: "💬", href: "" },
  prize_claim: { say: "notif.prizeClaim", icon: "🎁", href: "/admin#prizes" },
  prize_ask: { say: "notif.prizeAsk", icon: "💬", href: "/admin#prizes" },
  announcement: { say: "notif.announced", icon: "📣", href: "/" },
  // Somebody answered a notice you posted. The speech bubble, the same mark a
  // reply wears everywhere else on this site. The href is filled in per
  // notification — it leads to the notice, not to the front page.
  event_talk: { say: "notif.eventTalk", icon: "💬", href: "/" },
  feedback: { say: "notif.feedback", icon: "✉️", href: "/feedback" },
  // The draw. A ticket, because that is what an entry is, and the poster is
  // the picture beside it — this is the one notification with no person in it.
  evercold: { say: "notif.evercold", icon: "🎟️", href: "" },
  // The same draw, owning up to a number it sent wrong. Its own kind rather than
  // another entry notice, which would say "today" about a day they may not have
  // given on — and would stop the real notice going out when they next did.
  evercold_fix: { say: "notif.evercoldFix", icon: "🎟️", href: "" },
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
  // Named in one, which is a question addressed to you rather than a line you
  // happen to be able to see. Its own mark, because it is its own thing.
  party_mention: { say: "notif.partyMention", icon: "📣", href: "/party" },
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
  /*
   * An hour to go, to everybody in it.
   *
   * The one party notification with nobody in it: nothing was done to you and
   * nobody did it — the clock came round. So it has no actor, and the line
   * says what is about to happen rather than who.
   */
  party_soon: { say: "notif.partySoon", icon: "⏰", href: "/party" },
  party_out: { say: "notif.partyOut", icon: "🚪", href: "/party" },
  /*
   * A party you said you were looking for has gone up.
   *
   * The one party notification nobody did to you and that is not about a party
   * you are in: you left a note on the board saying what you wanted, and the
   * board is answering it. The telescope, because it is the only one that is
   * the result of looking.
   */
  party_match: { say: "notif.partyMatch", icon: "🔭", href: "/party" },
};

/**
 * Kinds whose actor is nobody in particular to whoever is reading them.
 *
 * A prize thread has two sides and only one of them is a person: the winner
 * is somebody the admins are about to meet in game, and the other side is
 * "the admins", not whichever of them happened to be at the keyboard. The
 * thread itself has always said only "admin" over that side; the bell used to
 * say the name and draw the face, which made one screen anonymous and the
 * other not, which is the same as neither.
 *
 * Read here rather than trusted to the row, so notifications written before
 * v89 — which carry the name, and which notifications_guard quite rightly
 * will not let anybody rewrite — are drawn the new way too.
 *
 * Same argument the announcements make one function down, and the same
 * asymmetry: the notifications that go the other way, to the admins, keep the
 * winner's name, because a queue of unnamed claims is a queue nobody can work.
 */
const FACELESS = new Set(["prize_talk", "prize_done"]);

/**
 * The prize notifications that show the prize, and the ones that show a face.
 *
 * Which picture answers "which one?" depends on who is reading. To a winner,
 * every one of these is about the same thing — the item they are waiting for
 * — and the admin at the other end is deliberately nobody (see FACELESS), so
 * the picture is the prize. To an admin, the queue is people: two rows about
 * two different prizes are easy to tell apart, and two rows about two members
 * are not unless their faces are on them.
 *
 * Both take the kind's own mark in the corner, which is what happened.
 */
const PRIZE_PICTURE = new Set(["prize_win", "prize_talk", "prize_done"]);
const PRIZE_FACE = new Set(["prize_claim", "prize_ask"]);

/** Every prize notification's body is the win it is about, not a line to read. */
const PRIZE_KINDS = new Set([...PRIZE_PICTURE, ...PRIZE_FACE]);

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
  n: {
    kind: string; post_id: number | null; party_id?: number | null;
    announcement_id?: number | null;
  },
  character: number | null,
  postPath: (id: number) => string,
): string | null => (
  // A parcel is opened in one place, the inventory on the edit-profile page.
  n.kind === "popoto_rare" ? RARE_INVENTORY
  // And a prize is claimed in one place, beside it.
  : n.kind.startsWith("prize_") && n.kind !== "prize_claim" && n.kind !== "prize_ask"
    ? PRIZE_INVENTORY
  : n.kind === "popoto"
    ? (character != null ? `/member/${character}` : "/profile")
    : n.party_id ? `/party?p=${n.party_id}`
      : n.announcement_id ? eventPath(n.announcement_id)
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
  /** A won prize's picture, by win id. See PRIZE_PICTURE. */
  const [prizeArt, setPrizeArt] = useState<Record<number, string>>({});
  /**
   * And how loud it is. Only the toast reads this: the bell's own rows are a
   * list to be scanned, and a list where three of the entries are shouting
   * is a list nobody can scan.
   */
  const [prizeTier, setPrizeTier] = useState<Record<number, RareTier>>({});
  /** That picture for one notification, or null when it is not about a prize. */
  const prizePic = useCallback((n: { kind: string; body: string | null }) =>
    (PRIZE_PICTURE.has(n.kind) && n.body ? prizeArt[Number(n.body)] ?? null : null),
  [prizeArt]);
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
      .select("id, kind, actor, actor_name, post_id, party_id, announcement_id, body, created_at, read_at, answered_at, cleared_at");
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

    // And the prize a notification is about, for the same reason: the picture
    // is the answer to "which one?". Fetched here rather than when a row is
    // drawn, so it is already in hand by the time the toast goes up — a
    // notification about winning something that arrives as a blank square is
    // the one moment this has to look like something.
    const won = [...new Set(rows.filter((n) => PRIZE_PICTURE.has(n.kind))
      .map((n) => Number(n.body))
      .filter((id) => Number.isFinite(id) && id > 0))];
    if (won.length) {
      const { data: prizes } = await supabase.from("prize_wins")
        .select("id, prize_icon, prize_tier").in("id", won);
      const map: Record<number, string> = {};
      const tiers: Record<number, RareTier> = {};
      for (const r of (prizes ?? []) as
           { id: number; prize_icon: string | null; prize_tier: string | null }[]) {
        if (r.prize_icon) map[r.id] = r.prize_icon;
        tiers[r.id] = r.prize_tier === "super" || r.prize_tier === "ultra"
          ? r.prize_tier : "rare";
      }
      setPrizeArt((v) => ({ ...v, ...map }));
      setPrizeTier((v) => ({ ...v, ...tiers }));
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
        : n.kind.startsWith("evercold") && kind
          ? t(kind.say, { n: n.body ?? "?" })
          : kind ? t(kind.say, { who: n.actor_name ?? "—" }) : t("notif.something");
      const actor = n.actor && !FACELESS.has(n.kind) ? people[n.actor] : undefined;
      const face = actor?.characterId != null
        ? faces[actor.characterId] ?? actor.avatar : actor?.avatar ?? null;
      toast({
        // The toast has one line for both facts, so the event goes in front —
        // it is the thing that makes the sentence after it mean anything.
        text: n.kind.startsWith("evercold")
          ? `${t("notif.evercoldEvent")} — ${line}` : line,
        image: n.kind.startsWith("evercold") ? EVENT_POSTER
          : prizePic(n) ?? (n.post_id ? covers[n.post_id] ?? face : face),
        // A game item's icon is a square with its corners doing work, so it is
        // shown whole rather than cropped into the circle a face wears.
        square: !!prizePic(n),
        badge: kind?.icon,
        // Green, because earning a ticket is the one thing the bell says that
        // is unambiguously a bit of luck. Gold foil for the wrapped popoto,
        // which is the other: it draws its own card, and it earns it — one
        // popoto in a hundred arrives like this, and the corner of the screen
        // is the only warning anybody gets while they are still on the page.
        /*
         * Green for the draw. Gold foil for the wrapped popoto. And its own
         * card for winning a prize, at the tier the prize was given — it is
         * a real thing somebody is about to hand over in game, which is at
         * least as worth crossing the room for as a potato, and unlike the
         * popoto there is nothing left to spoil by saying how good it is.
         *
         * Only the winning. Being answered and being handed the thing are
         * both good news and neither is the moment.
         */
        tone: n.kind === "popoto_rare" ? "rare"
          : n.kind === "prize_win" ? "prize"
            : n.kind.startsWith("evercold") || n.kind === "prize_done"
              ? "good" : "accent",
        tier: n.kind === "prize_win" && n.body
          ? prizeTier[Number(n.body)] ?? "rare" : undefined,
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
  async function sendBack(characterId: number, from: Element | DOMRect | null) {
    if (!supabase || !me || sending.has(characterId)) return;
    setBackErr(null);
    setSending((v) => new Set(v).add(characterId));
    const { error } = await supabase.from("kudos")
      .insert({ sender_id: me, receiver_character_id: characterId });
    const idle = () =>
      setSending((v) => { const n = new Set(v); n.delete(characterId); return n; });
    if (error && error.code !== "23505") {
      idle();
      setBackErr(error.message);
      return;
    }
    /*
     * And it is thrown, the way it is thrown on somebody's page: out of the
     * button, over in an arc, onto the face of the person who sent you one,
     * which flinches. Answering a potato with a line of green text was the
     * panel describing a gesture instead of making it.
     *
     * After the insert, not on the press: a potato that flew and was then
     * refused would be the panel saying two opposite things a second apart.
     * And the button stays a button until it lands — it is the thing the potato
     * came out of, and swapping it for "sent already" first would take the
     * launching point away mid-throw.
     */
    const face = faceOf(characterId);
    await intoView(face);
    await throwPotato(from, face);
    idle();
    setGiven((v) => new Set(v).add(characterId));
    // Sending one back is giving one, so it earns the day the same as any
    // other. Fired and forgotten: the potato has landed either way.
    void markEntry(supabase, me, character);
  }

  /** The picture a potato thrown from this panel is aimed at. */
  const faceOf = (cid: number) =>
    document.querySelector(`[data-potato-face="${cid}"]`);

  /*
   * The same trial throw, typed instead of pressed: `testBackPotato()` and
   * `testBackAll()` in the console, locally, with the bell open. They aim from
   * the button below, so a throw that was typed still comes out of the place a
   * throw comes out of — and nothing has to be aimed from a corner of the panel
   * that nobody can press.
   */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as {
      testBackPotato?: (i?: number) => Promise<void>;
      testBackAll?: () => Promise<void>;
    };
    // The trial button when the panel is open, a row's own "send one back" when
    // the archive window is the thing being looked at instead.
    const launcher = () =>
      document.querySelector("[data-potato-try]")
      ?? document.querySelector("[data-potato-from]");
    const go = (i?: number) => {
      const from = launcher();
      if (!from) {
        console.warn("Open the bell first: there is no button to throw from.");
        return Promise.resolve();
      }
      return tryThrow(from, i);
    };
    w.testBackPotato = (i = 0) => go(i);
    w.testBackAll = () => go();
    return () => { delete w.testBackPotato; delete w.testBackAll; };
  }, []);

  /** Everybody in the panel who sent one today and has not had one back. */
  const owed = (() => {
    const out = new Map<number, string>();
    if (character == null) return out;   // nothing to send one with
    for (const n of notes) {
      if (n.kind !== "popoto" && n.kind !== "popoto_rare") continue;
      if (n.created_at.slice(0, 10) !== todayUtc()) continue;
      const cid = n.actor ? people[n.actor]?.characterId ?? null : null;
      if (cid == null || cid === character || given.has(cid)) continue;
      out.set(cid, n.actor_name ?? "—");
    }
    return out;
  })();

  /**
   * Everybody at once: a volley, rather than all of them in the same instant.
   *
   * The same as pressing each button in turn, which is what it has always been
   * — but pressed all in one moment they were one event with one animation on
   * top of another, and a potato each to six people looked like less than a
   * potato to one. So they leave a beat apart, land on six different faces, and
   * the ones in front are still in the air when the next goes.
   *
   * Thrown from where the button was standing when it was pressed, not from the
   * button: the last person answered is the one who makes the button disappear,
   * and by then there may still be potatoes to launch.
   */
  async function sendBackAll(from: DOMRect) {
    for (const cid of owed.keys()) {
      void sendBack(cid, from);
      await new Promise((r) => setTimeout(r, VOLLEY));
    }
  }

  /*
   * `testPrizeNotice()` in the console, locally, on any page.
   *
   * A prize notification is the hardest thing on this site to see on purpose:
   * somebody has to send a popoto, it has to come up a winner, and you have
   * to be looking at the page — so the card and the toast were being tuned
   * blind. This pushes one through the real machinery instead of drawing a
   * mock: a row goes into the list the bell already holds, which makes the
   * toast effect below fire as though it had just arrived, and both are then
   * the real components reading the real fields.
   *
   * Nothing is written anywhere. The row exists in this tab until the next
   * poll replaces the list with what the database actually says, which is
   * about a minute and a half and is also how you put it away.
   *
   *   testPrizeNotice()              you won something
   *   testPrizeNotice("prize_talk")  an admin answered
   *   testPrizeNotice("prize_done")  it has been handed over
   *   testPrizeNotice("prize_claim") somebody claimed one (the admin's side)
   *   testPrizeNotice("prize_ask")   they said something about it
   */
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !supabase) return;
    const w = window as unknown as {
      testPrizeNotice?: (kind?: string, tier?: RareTier) => void;
    };
    w.testPrizeNotice = (kind = "prize_win", tier: RareTier = "ultra") => {
      // A real prize's picture where there is one, so the card is the size
      // and shape the real thing will be. The admin's half shows a face
      // instead, which is their own here — it is the only one to hand.
      void supabase.from("prizes").select("icon_url, name")
        .not("icon_url", "is", null).limit(1).maybeSingle()
        .then(({ data }) => {
          const got = data as { icon_url: string | null; name: string } | null;
          // Negative, so it cannot collide with a row the database has and
          // cannot be mistaken for one in anything that logs it.
          const id = -Date.now();
          // Only when there is one: an empty string here would be a picture
          // that fails to load rather than a prize with no picture, and the
          // second of those is a case the row is supposed to handle.
          if (got?.icon_url) setPrizeArt((v) => ({ ...v, [id]: got.icon_url as string }));
          setPrizeTier((v) => ({ ...v, [id]: tier }));
          setNotes((v) => [{
            id, kind, actor: PRIZE_FACE.has(kind) ? me : null,
            actor_name: PRIZE_FACE.has(kind) ? "ตัวอย่างทดสอบ" : null,
            post_id: null, party_id: null, announcement_id: null,
            body: String(id), created_at: new Date().toISOString(),
            read_at: null, answered_at: null, cleared_at: null,
          } as Note, ...v]);
        });
    };
    return () => { delete w.testPrizeNotice; };
  }, [supabase, me]);

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
    const eventPoster = n.kind.startsWith("evercold") ? EVENT_POSTER : null;
    const actor = n.actor && !FACELESS.has(n.kind) ? people[n.actor] : undefined;
    const actorFace = actor?.characterId != null
      ? faces[actor.characterId] ?? actor.avatar : actor?.avatar ?? null;
    const actorHref = actor?.characterId != null
      ? `/member/${actor.characterId}` : null;
    // Neither a popoto nor a message on the feedback page is a picture. What
    // they have instead is the person who sent it, so their face is the
    // thumbnail and what they did sits in the corner of it. Anything with a
    // picture of its own keeps it: a tag is answered by looking at the
    // photograph, and an announcement does not say whose it was.
    // A popoto that came with something: the sender, the potato, and the
    // parcel, which is the part that says this one is not like the others.
    const facing = n.kind === "popoto" || n.kind === "popoto_post" || n.kind === "popoto_rare"
      ? "🥔" : n.kind === "feedback" ? "✉️"
        // Everything the party finder sends is one person doing something to
        // your evening — asking for a seat, saying yes, leaving, speaking in a
        // party you are in. Who it was is the first thing you want, and a
        // column of identical speech bubbles was the one thing it said.
        : n.kind.startsWith("party_") ? (kind?.icon ?? "🔔")
          // The admin's half of a prize: who claimed it, who is asking. Two
          // rows about two members read as one column of speech bubbles
          // unless their faces are on them.
          : PRIZE_FACE.has(n.kind) ? (kind?.icon ?? "🎁")
            : null;
    // An announcement with a picture on it shows that picture, squarely,
    // because it is a poster and not a face.
    const poster = n.kind === "announcement" && n.body
      ? posters[n.body] ?? null : eventPoster;
    // What the winner's half of a prize shows: the thing itself.
    const prize = prizePic(n);
    // Answered tags keep their line and their picture and lose their buttons.
    // Taking the whole notification away took the photograph with it, which is
    // the thing somebody who has just agreed to be named in one is most likely
    // to want next.
    const asking = n.kind === "tag" && character != null && !n.answered_at;
    // A popoto that arrived today, from somebody with a page, and not from
    // yourself: the only case where sending one back is a reply rather than a
    // new gesture on a different day.
    const backTo = (n.kind === "popoto" || n.kind === "popoto_rare")
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
          <BadgedThumb src={poster} badge={n.kind.startsWith("evercold") ? "🎟️" : "📣"}
                       round={false} href={href} onGo={dismiss} />
        ) : facing && (actorFace || actorHref || n.kind === "popoto_rare") ? (
          <BadgedThumb src={actorFace} badge={facing} href={actorHref ?? (n.kind === "popoto_rare" ? href : null)}
                       extra={n.kind === "popoto_rare" ? <GiftIcon size={15} /> : undefined}
                       face={backTo} onGo={dismiss} />
        ) : prize ? (
          // Square and whole: an item icon is not a face, and the corners of
          // one are usually where the thing actually is.
          <BadgedThumb src={prize} badge={kind?.icon ?? "🎁"} round={false}
                       href={href} onGo={dismiss} />
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
          <p className="text-read leading-snug text-ink/90">
            {/* The event line takes a count where the others take a name, and
                nobody did it to you — so it is written straight rather than
                threaded through the linked-name machinery. */}
            {n.kind.startsWith("evercold") && say
              ? t(say, { n: n.body ?? "?" })
              : say
                ? said(t(say, { who: SLOT }), n.actor_name ?? "—",
                       actorHref, dismiss)
                : t("notif.something")}
          </p>
          {/* The second line is the body everywhere except the event, where the
              body is the number already spoken above and what belongs here is
              which draw earned it. */}
          {n.kind.startsWith("evercold") ? (
            <p className="mt-1 font-data text-meta uppercase tracking-[0.1em] text-jade">
              {t("notif.evercoldEvent")}
            </p>
          ) : n.kind === "popoto_rare" ? (
            // The body is which popoto it was — not a thing to read. The second
            // line is the way to the inventory, where every parcel is opened.
            <div className="mt-1.5">
              <Link href={RARE_INVENTORY} onClick={dismiss}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gold/60 bg-gold/15 py-0.5 pl-1.5 pr-2.5 text-ui font-medium text-gold no-underline transition-colors hover:bg-gold/25">
                <GiftIcon size={16} />
                {t("rare.openInInventory")}
              </Link>
            </div>
          ) : PRIZE_KINDS.has(n.kind) ? (
            // The body is which win it was, which is a row id and not a thing
            // to read. The line above already says what happened, and where
            // it leads is the picture and the whole row being a link.
            null
          ) : n.body ? (
            <p className="mt-1 line-clamp-2 text-ui leading-snug text-muted">
              {n.body}
            </p>
          ) : null}
          {backTo != null && (
            <div className="mt-1.5">
              {given.has(backTo) ? (
                // Not a disabled button. There is nothing left to press, and a
                // greyed-out control invites a click that will never do
                // anything — a sentence says the same thing and does not lie.
                <span className="inline-flex items-center gap-1.5 text-ui text-jade">
                  🥔 {t("notif.backDone")}
                </span>
              ) : (
                // The element, not a copy of where it is: this one is still
                // on the screen when its own potato lands.
                <button onClick={(e) => { const btn = e.currentTarget; void sendBack(backTo, btn); }}
                        disabled={sending.has(backTo)} data-potato-from={backTo}
                        className="rounded-md border border-gold/60 bg-gold/10 px-2.5 py-0.5 text-ui text-gold transition-colors hover:bg-gold/20 disabled:opacity-50">
                  🥔 {sending.has(backTo) ? t("notif.backSending") : t("notif.back")}
                </button>
              )}
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span className="text-meta text-muted">{when(n.created_at)}</span>
            {/* Not only for pictures. A notification that names a thing and
                then leaves you to find it is the reason somebody went hunting
                through the wrong page. */}
            {!asking && href && (
              <Link href={href} onClick={dismiss}
                    className="text-meta text-accent no-underline hover:underline">
                {t("notif.open")}
              </Link>
            )}
          </div>

          {asking && n.post_id && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button onClick={() => answerTag(n.post_id!, true)} disabled={busy}
                      className="rounded-md border border-jade bg-jade/15 px-2.5 py-0.5 text-ui text-jade hover:bg-jade/25 disabled:opacity-50">
                {t("gallery.tagConfirm")}
              </button>
              <button onClick={() => answerTag(n.post_id!, false)} disabled={busy}
                      className="rounded-md border border-line px-2.5 py-0.5 text-ui text-muted hover:border-chili hover:text-chili disabled:opacity-50">
                {t("gallery.tagDecline")}
              </button>
              {href && (
                <Link href={href} onClick={dismiss}
                      className="px-1 py-0.5 text-ui text-accent no-underline hover:underline">
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
          <span className="absolute -right-1 -top-1 grid min-w-[17px] place-items-center rounded-full bg-chili px-1 font-data text-label font-semibold text-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={10}
          className="pop-in z-50 w-[min(34rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <span className="font-display text-read font-semibold">
              {t("notif.title")}
            </span>
            {notes.length > 0 && (
              // Quiet, and it says on hover that it does not delete — the last
              // button in this corner did, so the promise is worth making
              // before the press rather than after.
              <button onClick={clearAll} title={t("notif.clearTitle")}
                      className="rounded-md px-2 py-0.5 text-ui text-muted transition-colors hover:bg-card hover:text-ink">
                {t("notif.clear")}
              </button>
            )}
          </div>

          <div data-notif-list className="max-h-[min(46rem,72vh)] overflow-y-auto">
            {notes.length === 0 && (
              <p className="px-3.5 py-6 text-center text-ui text-muted">
                {hidden > 0 ? t("notif.emptyCleared") : t("notif.empty")}
              </p>
            )}

            {notes.map(row)}
          </div>

          {/* Everybody at once, when there is more than nothing to answer. The
              same thing as pressing each button in turn, and pressed by
              somebody who has just read a panel full of them. */}
          {owed.size > 0 && (
            <button onClick={(e) => { void sendBackAll(e.currentTarget.getBoundingClientRect()); }}
                    disabled={sending.size > 0}
                    className="w-full border-t border-line bg-gold/5 px-3.5 py-2.5 text-center text-ui text-gold hover:bg-gold/15 disabled:opacity-50">
              🥔 {t("notif.backAll", { n: owed.size })}
            </button>
          )}

          {/* The throw, to be looked at. Local development only — it is the
              animation and nothing else, and the deployed panel has no such
              button — and it is a button rather than a line typed into the
              console because what is being tried out is a thing that comes out
              of a button when it is pressed. */}
          {process.env.NODE_ENV !== "production" && (
            <button data-potato-try
                    onClick={(e) => { const btn = e.currentTarget; void tryThrow(btn); }}
                    className="w-full border-t border-dashed border-line px-3.5 py-2 text-center font-data text-meta uppercase tracking-[0.1em] text-muted transition-colors hover:bg-card hover:text-ink">
              🥔 throw (dev)
            </button>
          )}

          {backErr && (
            <p className="border-t border-line px-3.5 py-2 text-ui text-chili">
              {backErr}
            </p>
          )}

          {/* Only when there might be more behind it. Twenty back is a fortnight
              for somebody the FC talks to and a year for somebody it does not,
              so the offer is made by whether the page came back full rather
              than by a guess at how long that is. */}
          {(notes.length >= SHOW || hidden > 0) && (
            <button onClick={openPast}
                    className="w-full border-t border-line px-3.5 py-2.5 text-center text-ui text-accent hover:bg-card">
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
            <Dialog.Title className="border-b border-line px-4 py-3 font-display text-lead font-semibold text-ink">
              {t("notif.past")}
            </Dialog.Title>

            <div
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight > el.scrollHeight - 120) void morePages();
              }}
              data-notif-list className="min-h-0 flex-1 overflow-y-auto">
              {past?.length === 0 && !loadingPast && (
                <p className="px-4 py-8 text-center text-ui text-muted">
                  {t("notif.pastNone")}
                </p>
              )}
              {(past ?? []).map(row)}
              {loadingPast && (
                <p className="px-4 py-3 text-center text-ui text-muted">
                  {t("common.loading")}
                </p>
              )}
            </div>

            <Dialog.Close className="border-t border-line px-4 py-2.5 text-read text-muted hover:text-ink">
              {t("common.close")}
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Popover.Root>
  );
}
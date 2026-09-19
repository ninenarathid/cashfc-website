"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PartyComment } from "@/lib/party";
import { REACTIONS, blockId, sameSpeaker } from "@/lib/party";
import type { PersonOption } from "@/lib/people";
import { fmtDateTime } from "@/lib/dates";
import { useAvatarOverrides } from "@/lib/avatars";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { HoverCard } from "@/components/ui/HoverCard";
import { useDropTarget, usePasteImages } from "@/components/ui/DropZone";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import MessageText from "@/components/MessageText";
import Emote from "@/components/ui/Emote";
import { EMOTES } from "@/lib/emotes";
import ConfirmDialog from "@/components/ConfirmDialog";
import MentionInput from "@/components/party/MentionInput";
import { mentionIds, mentionsAll, withMention } from "@/lib/mentions";
import { clips, youtubeSrc } from "@/lib/youtube";

/**
 * A conversation, wherever one happens.
 *
 * The thing a raid lead posts is a plan, and the thing everybody else has is a
 * question about it: can I bring Reaper, is this the old strat, I am ten
 * minutes late. The same is true under a photograph — who is that, where was
 * this, that is the pull we wiped on — and for a long time the two were
 * different code: bubbles with pictures, replies, reactions and a way to take
 * a message back on one page, and a row with a body on it on the other. That
 * difference was never a decision; the party board was built second and got
 * everything the first one had learned, and nobody went back.
 *
 * So this holds the conversation and nothing about where it is. Every message
 * is handed in, every write is handed in, and the two things that still knew
 * — where a dropped screenshot goes and where a reaction is stored — are
 * props. See `upload` and `write`.
 *
 * Pictures on a reply, for the same reason the plan has them: "do you mean
 * this spot?" is a screenshot, not a sentence.
 */
/*
 * The four buttons on a message, all one size.
 *
 * Twenty pixels with a ten-pixel glyph in it was reported as too small to
 * read, and it was: these are symbols rather than words, so the glyph is the
 * whole of what they say. Twenty-eight with thirteen is the size of the emoji
 * in the picker they open, which is the thing they are nearest to.
 */
/**
 * The face on the button that opens the emoji row.
 *
 * Drawn rather than typed. It was "☺", the white smiling face, which is
 * one of the oldest characters in Unicode and looks it — every platform draws
 * it differently, several draw it as a full-colour emoji next to three
 * monochrome symbols, and at twenty pixels it came out as a grey smudge.
 *
 * This is the same weight as the pencil, the cross and the arrow beside it,
 * takes the colour of whatever it is sitting in, and stays sharp at any size.
 */
function ReactFace({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"
         aria-hidden focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <circle cx="9" cy="9.75" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.75" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  );
}

const ctl = (extra: string) =>
  "grid size-9 shrink-0 place-items-center rounded-full border border-line"
  + ` bg-surface text-[20px] leading-none shadow-sm transition-colors ${extra}`;

export default function Messages(
  { comments, people, me, userId, notice, onAdd, onReact, onEdit, onDrop,
    upload, write }: {
    comments: PartyComment[];
    /**
     * Something the clock has to say, at the foot of the conversation.
     *
     * Not a message: nobody wrote it, it is not stored, and it cannot be
     * replied to or reacted to. It is worked out from the time every time the
     * page is drawn, which is the reason it is not a row — a row would need a
     * job to write it, would arrive late, and could be written twice.
     */
    notice?: string;
    /**
     * The roster, for reading names out of a message.
     *
     * Most of the FC is called two words, so "@ followed by a word" would tag
     * half of "@Aqua Eleison" and miss the rest — which name was meant is a
     * question only the roster can answer.
     */
    people: PersonOption[];
    /** Whoever is reading, or null if nobody is signed in. */
    me: PersonOption | null;
    /** Their account, which the pictures are filed under. */
    userId: string | null;
    onAdd: (c: PartyComment) => void | Promise<void>;
    /** Shown immediately; the write follows. Optional so a preview can omit it. */
    onReact?: (commentId: string, emoji: string, on: boolean,
               who: { characterId: number | null; name: string }) => void;
    /**
     * Change what one says, and take one back.
     *
     * Given only where the reader could do either. Both are the author's, and
     * the policy behind them says the same — this decides whether the controls
     * are worth drawing.
     */
    onEdit?: (commentId: string, text: string) => void | Promise<void>;
    onDrop?: (commentId: string) => void | Promise<void>;
    /**
     * Where a dropped screenshot goes, and where a reaction is written.
     *
     * The last two things in here that knew which page they were on. This
     * component is a conversation — bubbles, replies, pictures, reactions —
     * and a conversation under a photograph is the same conversation as one
     * under a raid plan. Everything else was already handed in; these two were
     * imported, and the import was the only reason it could not be.
     */
    upload: (file: File) => Promise<{ url: string } | { error: string }>;
    write: (commentId: string, emoji: string, mine: boolean,
            who: { characterId: number | null; name: string }) => void;
  },
) {
  const { t } = useLang();
  const overrides = useAvatarOverrides();
  const face = (id: number | null, fallback: string | null) =>
    (id != null && overrides[id]) || fallback || null;
  /*
   * A reaction carries who pressed it and not what they look like.
   *
   * The row stores a character id and a name, which is all it needs to count
   * and to say — but the card that opens over it is a list of people, and a
   * list of people on this site has faces on it. The roster is already here
   * for reading names out of a message; this is the same list answering the
   * other direction.
   */
  const facesBy = useMemo(
    () => new Map(people.map((p) => [p.id, p.avatar])), [people]);

  /*
   * Whether this reader may add to the conversation, as against read it.
   *
   * Signed in is not enough. `me` is the reader as a character — the party
   * finder, the gallery and the notices all hand in null for an account that
   * has not verified one — and a message, a reaction or a correction from an
   * account like that is unattributable the moment it is stored. So the same
   * flag decides the box at the foot, the buttons on every bubble, and the
   * writes behind both.
   */
  const mayWrite = !!userId && !!me;

  const [text, setText] = useState("");
  const [shots, setShots] = useState<string[]>([]);
  const [zoom, setZoom] = useState<{ images: string[]; at: number } | null>(null);
  /** The message being rewritten, and what it is being rewritten to. */
  const [fixing, setFixing] = useState<{ id: string; text: string } | null>(null);
  /** The message somebody is being asked about before it goes. */
  const [dropping, setDropping] = useState<string | null>(null);
  /**
   * The message being answered, where one is.
   *
   * Kept beside the draft rather than written into it: "@Aqua" in the text is
   * who is being told, and this is which line is being answered. Three
   * exchanges deep those are different questions — "no, the other one" needs
   * the second and says nothing with only the first.
   */
  const [answering, setAnswering] = useState<PartyComment | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  /** Reply: their name in the box, their message quoted above it. */
  const reply = (c: PartyComment) => {
    setAnswering(c);
    setText((v) => withMention(v, c.author.name));
    box.current?.focus();
  };
  /**
   * Which message has its emoji row open.
   *
   * One at a time, and opened by a press rather than by hovering. Hover alone
   * meant the row was permanently on every message on a phone, where there is
   * no hover to wait for — five emoji over every line, overlapping the line
   * above, on a 390px screen. A press works with a finger and with a mouse.
   */
  const [picking, setPicking] = useState<string | null>(null);
  const picker = useRef<HTMLSpanElement>(null);

  /*
   * And a way out of it that is not picking one.
   *
   * Opening the row replaced the button that opened it, so there was nothing
   * left to press again — somebody who pressed it to see what was there was
   * stuck choosing a reaction they did not want. The two ways anybody tries
   * are pressing elsewhere and pressing escape, so both close it.
   *
   * Pointerdown rather than click, and captured, so the row is gone by the
   * time whatever was pressed underneath acts on it — otherwise dismissing
   * the emoji happens to open the party as well.
   */
  useEffect(() => {
    if (picking == null) return;
    const away = (e: PointerEvent) => {
      if (!picker.current?.contains(e.target as Node)) setPicking(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setPicking(null); }
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", esc, true);
    };
  }, [picking]);

  const [supabase] = useState(createClient);
  const [busy, setBusy] = useState(0);

  // Uploaded on the drop, the same as the write-up above: by the time somebody
  // has typed "do you mean this spot?" the picture is already stored.
  const take = async (files: File[]) => {
    if (!supabase || !userId) return;
    setBusy((n) => n + files.length);
    for (const f of files) {
      const r = await upload(f);
      setBusy((n) => n - 1);
      if (!("error" in r)) setShots((v) => [...v, r.url]);
    }
  };
  const { over, handlers } = useDropTarget({ onFiles: take });

  /*
   * And pasted, which is how a screenshot actually arrives.
   *
   * Shift+PrintScreen puts the picture on the clipboard and nowhere else, so
   * dragging it in means saving it to disk first to drag the file back out
   * again — two steps around a keystroke that was already holding the thing.
   *
   * Scoped to this box. The listing form can be open over the party it is
   * editing, and both have somewhere to put a picture; without a scope one
   * screenshot would land in the message and in the write-up at once.
   */
  const pad = useRef<HTMLDivElement>(null);
  usePasteImages(take, true, pad);

  /*
   * Put one on, or take it off.
   *
   * On the screen first and then written, like the replies themselves: a tap
   * that waits for a round trip before anything moves reads as a tap that
   * missed. The board reloads on the realtime event anyway, so a write that
   * fails corrects itself within the second rather than leaving a lie on the
   * page.
   */
  const react = (c: PartyComment, emoji: string) => {
    if (!supabase || !userId || !me) return;
    const who = { characterId: me.id, name: me.name };
    const on = c.reactions?.find((r) => r.emoji === emoji);
    const mine = !!on?.by.some((w) => w.characterId === who.characterId
                                   && w.name === who.name);
    onReact?.(c.id, emoji, !mine, who);
    write(c.id, emoji, mine, who);
  };

  /** By id, for the line a reply quotes. */
  const byId = new Map(comments.map((c) => [c.id, c]));

  const send = () => {
    if (!text.trim() && !shots.length) return;
    /*
     * Nobody writes here without a character behind them.
     *
     * This used to send as "You" for a reader who was signed in and had not
     * claimed one — the name is the component's own word for the reader, and
     * stored on the row it became what everybody else saw: a message from
     * somebody the FC could not identify, under a party they were signing up
     * to. The box is not drawn in that state any more; this is the same rule
     * where the write happens, and the database holds it too.
     */
    if (!me) return;
    void onAdd({
      id: blockId(),
      author: { characterId: me.id, name: me.name, avatar: me.avatar },
      text: text.trim(),
      images: shots.length ? shots : undefined,
      at: new Date().toISOString(),
      // Worked out here rather than on the way in, so what was highlighted and
      // who was told come from one reading of the same text.
      mentions: mentionIds(text.trim(), people),
      mentionsAll: mentionsAll(text.trim(), people),
      replyTo: answering?.id ?? null,
    });
    setText("");
    setShots([]);
    setAnswering(null);
  };

  return (
    <section className="flex flex-col items-stretch gap-3 border-t border-line pt-3">
      <span className="font-data text-[13px] uppercase tracking-[0.14em] text-muted">
        {comments.length === 0 ? t("pf.comments")
          : comments.length === 1 ? t("pf.commentOne")
            : t("pf.commentsN", { n: comments.length })}
      </span>

      {/*
        * A conversation, laid out as one.
        *
        * These are replies under a party — "can I come late", "which spot do
        * you mean" — and they read as a chat because that is what they are.
        * A column of identical left-aligned blocks made you read every name to
        * find your own line in it; putting yours down the right side answers
        * that before anything is read, which is the one thing a chat layout is
        * actually for.
        *
        * Which side is decided by the character, not by the account: the same
        * person can be signed in on a second device, and "mine" should mean
        * the same thing on both.
        *
        * Runs of one person talking are drawn as one run. Somebody who says
        * three things in a minute has not had three conversations, and three
        * faces down the margin says they have — so the face and the name go on
        * the first of a run and the rest are more of it.
        */}
      {comments.map((c, i) => {
        const src = face(c.author.characterId, c.author.avatar);
        const mine = !!me && c.author.characterId === me.id;
        const cont = sameSpeaker(c, comments[i - 1]);
        // Whether the next one carries on, so the tail of a run keeps its
        // corner square and only the last bubble is rounded off.
        const goes = sameSpeaker(comments[i + 1] ?? c, c) && i + 1 < comments.length;
        return (
          <article key={c.id}
                   className={`flex w-[min(46rem,100%)] max-w-full gap-2.5 ${
                     cont ? "-mt-1.5" : ""} ${
                     mine ? "flex-row-reverse self-end" : "self-start"}`}>
            {/* The gap where the face was, on everything after the first of a
                run — so the bubbles stay in their column instead of sliding
                under the avatar. */}
            {cont ? (
              <span aria-hidden className="size-[70px] shrink-0" />
            ) : src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" width={70} height={70}
                   className="size-[70px] shrink-0 rounded-full border border-line object-cover" />
            ) : (
              /* The same seventy across. It was thirty where the picture was
                 thirty-six, so a run of messages stepped in and out depending
                 on who had a portrait — and at seventy that gap would be the
                 width of a thumb. */
              <span className={`grid size-[70px] shrink-0 place-items-center rounded-full text-[28px] text-muted ${
                c.author.characterId == null
                  ? "border border-dashed border-line" : "border border-line bg-card"}`}>
                {c.author.characterId == null ? "?" : ""}
              </span>
            )}

            <div className={`flex min-w-0 flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
              {/*
                * The bubble.
                *
                * Yours in the accent, everybody else's on the card colour, and
                * the corner nearest its own avatar squared off — which is what
                * makes a row of them read as coming from a direction rather
                * than as a stack of boxes. Inside a run the squared corner is
                * kept on every bubble, so the run reads as one shape.
                */}
              <div className={`group/msg relative flex min-w-0 flex-col gap-1 rounded-2xl border px-3 py-2 ${
                mine
                  ? `border-accent/40 bg-accent/[0.09] ${cont || goes ? "rounded-tr-sm" : "rounded-tr-sm"}`
                  : `border-line bg-card/50 ${cont || goes ? "rounded-tl-sm" : "rounded-tl-sm"}`}`}>
                {!cont && (
                  <span className={`flex flex-wrap items-baseline gap-2 ${
                    mine ? "flex-row-reverse" : ""}`}>
                    {/* Your own name is the one thing on the line you already
                        know. The side says it, so the space goes to the time. */}
                    {!mine && (
                      <span className="text-[16px] text-ink">{c.author.name}</span>
                    )}
                    <span className="font-data text-[13.5px] text-muted">
                      {fmtDateTime(c.at)}
                    </span>
                    {/* Beside the time it was said, because that is the fact
                        it qualifies: this is not what was here when somebody
                        read it earlier. Not on a deleted one — "edited" about
                        a message that is gone is a detail about nothing. */}
                    {c.editedAt && !c.deletedAt && (
                      <span className="font-data text-[13.5px] text-muted/70"
                            title={fmtDateTime(c.editedAt)}>
                        {t("party.msgEdited", { at: fmtDateTime(c.editedAt) })}
                      </span>
                    )}
                  </span>
                )}
                {/*
                  * What this answers, above what it says.
                  *
                  * One line of it, because the thing being quoted is two
                  * inches up the screen — this is here to say which of the
                  * four messages up there, not to reprint one. A reply to
                  * something since deleted still shows the tombstone's line,
                  * which is what keeps "no, the other one" readable.
                  */}
                {c.replyTo && (() => {
                  const to = byId.get(c.replyTo);
                  if (!to) return null;
                  return (
                    <span className={`flex min-w-0 items-center gap-1.5 border-l-2 border-accent/40 pl-2 text-[14.5px] text-muted ${
                      mine ? "self-end" : ""}`}>
                      <span className="shrink-0 text-accent/80">{to.author.name}</span>
                      <span className="truncate opacity-80">
                        {to.deletedAt ? t("party.msgGone") : to.text || "🖼"}
                      </span>
                    </span>
                  );
                })()}

                {/*
                  * Taken back.
                  *
                  * The line stays where it was, because the replies under it
                  * were answers to something and a hole where the question was
                  * turns them into non sequiturs. Nothing of it is left to
                  * draw — the database blanked the body — so it says what
                  * happened and stops.
                  */}
                {c.deletedAt ? (
                  <p className={`text-[16px] italic leading-relaxed text-muted ${
                    mine ? "text-right" : ""}`}>
                    {t("party.msgGone")}
                  </p>
                ) : fixing?.id === c.id ? (
                  /* Rewritten in place, in a box the shape of the message. A
                     dialog for a one-line correction would be a bigger
                     interruption than the mistake. */
                  <span className="flex flex-col gap-1.5">
                    <textarea value={fixing.text} rows={2} autoFocus
                              onChange={(e) => setFixing({ id: c.id, text: e.target.value })}
                              className="w-[min(28rem,70vw)] rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[16px] text-ink" />
                    <span className="flex items-center gap-2 self-end">
                      <button type="button" onClick={() => setFixing(null)}
                              className="text-[15px] text-muted hover:text-ink">
                        {t("pf.cancel")}
                      </button>
                      <button type="button"
                              disabled={!fixing.text.trim() || fixing.text === c.text}
                              onClick={() => {
                                void onEdit?.(c.id, fixing.text.trim());
                                setFixing(null);
                              }}
                              className="rounded-lg border border-accent/60 bg-accent/10 px-2.5 py-1 text-[15px] text-accent disabled:opacity-40">
                        {t("party.msgSave")}
                      </button>
                    </span>
                  </span>
                ) : c.text ? (
                  <p className={`whitespace-pre-wrap break-words text-[16px] leading-relaxed text-ink/85 ${
                    mine ? "text-right" : ""}`}>
                    <MessageText text={c.text} people={people} />
                  </p>
                ) : null}
                {/*
                  * The video, in the message.
                  *
                  * Somebody posting a link to the phase-two explanation in the
                  * middle of a conversation about phase two is posting it so
                  * the others can watch it — and a link in a chat bubble is a
                  * page everybody has to leave the conversation for. Same rule
                  * as the write-up above, and the same cap: two, because a
                  * message with six in it is a playlist.
                  */}
                {!c.deletedAt && clips(c.text).map((v) => (
                  <div key={v.id}
                       className={`aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-line ${
                         mine ? "self-end" : ""}`}>
                    <iframe src={youtubeSrc(v)} title="YouTube" loading="lazy"
                            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                            allowFullScreen
                            className="size-full" />
                  </div>
                ))}
                {!c.deletedAt && !!c.images?.length && (
                  <div className={`flex flex-wrap gap-2 ${mine ? "justify-end" : ""}`}>
                    {c.images.map((src2, n) => (
                      <button key={src2} onClick={() => setZoom({ images: c.images!, at: n })}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src2} alt=""
                             className="h-24 w-auto rounded-md border border-line object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/*
                  * The way to add one, on the edge of the bubble.
                  *
                  * Hidden until the message is hovered, and always there on a
                  * touch screen where there is no hover to wait for. A row of
                  * five faint emoji under every line would be five times more
                  * furniture than conversation.
                  */}
                {/*
                  * Correcting and withdrawing, on your own messages only.
                  *
                  * Opposite corner from the reaction button, which belongs to
                  * everybody else — the two are different jobs and putting
                  * them together would mean hunting for which of the row is
                  * yours. Faint until the message is hovered, for the same
                  * reason the reaction is: a row of controls under every line
                  * is more furniture than conversation.
                  */}
                {mine && !c.deletedAt && !fixing && onEdit && onDrop && (
                  <span className="absolute -top-4 right-1 z-[1] flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/msg:opacity-100 max-sm:opacity-60">
                    <button type="button" aria-label={t("pf.edit")}
                            onClick={() => setFixing({ id: c.id, text: c.text })}
                            className={ctl("hover:border-accent hover:text-accent")}>
                      ✎
                    </button>
                    <button type="button" aria-label={t("pf.deleteParty")}
                            onClick={() => setDropping(c.id)}
                            className={ctl("text-chili/80 hover:border-chili hover:text-chili")}>
                      ✕
                    </button>
                  </span>
                )}

                {/* Mostly above the bubble rather than sunk into it: at
                    twenty-eight across, a control centred on the edge sits
                    squarely on the name and the time. */}
                {mayWrite && !c.deletedAt && (
                  <span className={`absolute -top-4 z-[1] flex items-center ${
                    mine ? "left-1" : "right-1"}`}>
                    {picking === c.id ? (
                      <span ref={picker}
                            className="flex items-center gap-0.5 rounded-full border border-line bg-surface px-1 py-0.5 shadow-sm">
                        {REACTIONS.map((e) => (
                          <button key={e} type="button"
                                  onClick={() => { react(c, e); setPicking(null); }}
                                  className="flex items-center rounded-full px-1 leading-none transition-transform hover:scale-125">
                            <Emote value={e} size={20} />
                          </button>
                        ))}
                      </span>
                    ) : (
                      /* Small, and out of the way until it is wanted. Faint on
                         a desktop until the message is hovered; always there
                         on a touch screen, where waiting for a hover that
                         never comes means the button does not exist. */
                      <span className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 hover:opacity-100 group-hover/msg:opacity-100 max-sm:opacity-60">
                        <button type="button" aria-label={t("pf.react")}
                                onClick={() => setPicking(c.id)}
                                className={ctl("")}>
                          <ReactFace />
                        </button>
                        {/* Answering this one in particular: their name goes
                            in the box and the message is quoted above the
                            reply, so three exchanges later "no, the other
                            one" still says which. */}
                        <button type="button" aria-label={t("party.reply")}
                                title={t("party.reply")}
                                onClick={() => reply(c)}
                                className={ctl("hover:border-accent hover:text-accent")}>
                          ↩
                        </button>
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/*
                * What has been left on it.
                *
                * Under the bubble rather than in it, because a reaction is
                * something other people did to the message and not part of
                * what it says. Yours is outlined, so "have I already" is
                * answered without counting.
                */}
              {!!c.reactions?.length && (
                <span className={`flex flex-wrap gap-1.5 ${mine ? "justify-end" : ""}`}>
                  {c.reactions.map((r) => {
                    const isMine = !!me && r.by.some((w) => w.characterId === me.id);
                    return (
                      /*
                       * Who pressed it, on a card rather than in a tooltip.
                       *
                       * It was the browser's `title`: a second of waiting, a
                       * system font, one flat line of names run together with
                       * commas, and nothing at all on a phone. The question it
                       * answers — who thought this was funny — is a list of
                       * people, and the site already draws people with their
                       * faces on.
                       */
                      <HoverCard key={r.emoji} side="top"
                                 trigger={
                        <button type="button" disabled={!mayWrite}
                                onClick={() => react(c, r.emoji)}
                                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[14.5px] leading-none transition-colors ${
                                  isMine
                                    ? "border-accent/60 bg-accent/15 text-accent"
                                    : "border-line bg-bg/40 text-muted hover:border-muted hover:text-ink"}`}>
                          <Emote value={r.emoji} size={20} />
                          <span className="font-data tabular-nums">{r.by.length}</span>
                        </button>}>
                        <span className="flex flex-col gap-1.5">
                          <span className="flex items-center gap-2">
                            <Emote value={r.emoji} size={26} />
                            <span className="font-data text-[11.5px] uppercase tracking-[0.1em] text-muted">
                              {t("pf.reactedN", { n: r.by.length })}
                            </span>
                          </span>
                          <span className="flex flex-col gap-1">
                            {r.by.map((w) => (
                              <span key={`${w.characterId}-${w.name}`}
                                    className="flex items-center gap-1.5">
                                {face(w.characterId,
                                      facesBy.get(w.characterId ?? -1) ?? null) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={face(w.characterId,
                                             facesBy.get(w.characterId ?? -1) ?? null)!}
                                       alt=""
                                       width={18} height={18}
                                       className="size-[18px] rounded-full border border-line object-cover" />
                                ) : (
                                  <span className="size-[18px] rounded-full border border-dashed border-line" />
                                )}
                                <span className="text-[13.5px] text-ink">{w.name}</span>
                              </span>
                            ))}
                          </span>
                        </span>
                      </HoverCard>
                    );
                  })}
                </span>
              )}
            </div>
          </article>
        );
      })}

      {/* Across the thread rather than down one side of it: it is addressed
          to the room, and a bubble would put it in somebody's mouth. */}
      {notice && (
        <span className="my-1 flex items-center gap-2 self-stretch">
          <span aria-hidden className="h-px flex-1 bg-jade/25" />
          <span className="rounded-full border border-jade/45 bg-jade/10 px-3 py-[3px] text-center font-data text-[13.5px] text-jade">
            {notice}
          </span>
          <span aria-hidden className="h-px flex-1 bg-jade/25" />
        </span>
      )}

      {/* Writing one. Dropping a picture anywhere on the box attaches it, which
          is where somebody's cursor already is when they have the screenshot. */}
      {/*
        * And only where there is somebody to write it.
        *
        * The front page is open to anybody, so a visitor who is not signed in
        * could reach an event, type an answer, watch it appear and never find
        * out it was not sent — every write here needs a session, so a box with
        * no session behind it can only tell a lie.
        *
        * A session is half of it. Somebody signed in who has not verified a
        * character is in the same position one step further along: the write
        * would go through and land under a name nobody in the FC can place.
        * They get the reason and the way out of it instead of a box.
        */}
      {userId && !me && (
        <div className="rounded-lg border border-dashed border-line px-3 py-2.5 text-[14.5px] leading-relaxed text-muted">
          {t("gate.needCharacter")}{" "}
          <Link href="/profile" className="text-accent no-underline hover:underline">
            {t("nav.profile")}
          </Link>
        </div>
      )}
      {mayWrite && (
        <div {...handlers} ref={pad}
             className={`flex flex-col gap-2 rounded-lg border p-2.5 transition-colors ${
               over ? "border-accent bg-accent/5" : "border-line bg-bg/40"}`}>
          {/* What is being answered, above the box it is answered in — so
              the reply is visibly attached to something before it is sent,
              rather than turning out to have been when it appears. */}
          {answering && (
            <span className="flex min-w-0 items-center gap-2 rounded-lg border-l-2 border-accent/50 bg-surface/60 px-2 py-1 text-[14.5px] text-muted">
              <span className="shrink-0 text-accent/80">{t("party.replyingTo")}</span>
              <span className="shrink-0 text-ink/80">{answering.author.name}</span>
              <span className="truncate opacity-80">
                {answering.deletedAt ? t("party.msgGone") : answering.text || "🖼"}
              </span>
              <button type="button" aria-label={t("pf.cancel")}
                      onClick={() => setAnswering(null)}
                      className="ml-auto shrink-0 text-muted hover:text-ink">
                ✕
              </button>
            </span>
          )}
          <MentionInput boxRef={box} value={text} people={people} rows={2}
                        onChange={(v) => setText(v.slice(0, 2000))}
                        placeholder={t("pf.commentBox")}
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-[16.5px] text-ink placeholder:text-muted" />
          {!!shots.length && (
            <div className="flex flex-wrap gap-2">
              {shots.map((src, n) => (
                <span key={src} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-20 w-auto rounded-md border border-line" />
                  <button onClick={() => setShots((v) => v.filter((_, i) => i !== n))}
                          aria-label={t("pf.remove")}
                          className="absolute right-1 top-1 rounded border border-chili/60 bg-bg/85 px-1 text-[14px] text-chili">
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={send} disabled={(!text.trim() && !shots.length) || busy > 0}
                    className="rounded-lg border border-accent bg-accent/15 px-3 py-1 text-[15.5px] text-accent hover:bg-accent/25 disabled:opacity-40">
              {t("pf.comment")}
            </button>
            {/*
              * The emotes, where somebody writing a message can reach them.
              *
              * They work by typing ":kekw:" and nobody knows that, which makes a
              * feature that exists and cannot be found. Four pictures is a row
              * and not a picker — there is nothing here to search.
              */}
            <span className="flex items-center gap-0.5">
              {EMOTES.map((e) => (
                <button key={e.id} type="button" title={e.say}
                        onClick={() => {
                          setText((v) => `${v}${v && !v.endsWith(" ") ? " " : ""}${e.id} `
                            .slice(0, 2000));
                          box.current?.focus();
                        }}
                        className="rounded p-0.5 transition-transform hover:scale-125">
                  <Emote value={e.id} size={22} />
                </button>
              ))}
            </span>
            <span className="text-[14.5px] text-muted">
              {busy > 0 ? t("pf.uploading", { n: busy }) : t("pf.orDropShot")}
            </span>
          </div>
        </div>
      )}

      {dropping && (
        <ConfirmDialog z={120} danger
                       message={t("party.msgDeleteAsk")}
                       confirmLabel={t("pf.deleteParty")}
                       onCancel={() => setDropping(null)}
                       onConfirm={() => {
                         const id = dropping;
                         setDropping(null);
                         void onDrop?.(id);
                       }} />
      )}

      {zoom && (
        <ImageLightbox images={zoom.images} at={zoom.at}
                       onMove={(at) => setZoom({ ...zoom, at })}
                       onClose={() => setZoom(null)} />
      )}
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { PartyComment } from "@/lib/party";
import { REACTIONS, blockId, sameSpeaker } from "@/lib/party";
import type { PersonOption } from "@/lib/people";
import { fmtDateTime } from "@/lib/dates";
import { useAvatarOverrides } from "@/lib/avatars";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { useDropTarget } from "@/components/ui/DropZone";
import { createClient } from "@/lib/supabase/client";
import { toggleReaction, uploadPartyImage } from "@/lib/party-db";
import { useLang } from "@/lib/i18n";
import MessageText from "@/components/MessageText";
import ConfirmDialog from "@/components/ConfirmDialog";
import MentionInput from "@/components/party/MentionInput";
import { mentionIds, mentionsAll, withMention } from "@/lib/mentions";
import { clips, youtubeSrc } from "@/lib/youtube";

/**
 * Replies on a party.
 *
 * The thing a raid lead posts is a plan, and the thing everybody else has is a
 * question about it: can I bring Reaper, is this the old strat, I am ten minutes
 * late. That conversation currently happens in Discord where it is four
 * messages up by the time the second person asks the same thing, and the answer
 * belongs under the plan it is about.
 *
 * Pictures on a reply, for the same reason the plan has them — "do you mean
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
const ctl = (extra: string) =>
  "grid size-7 shrink-0 place-items-center rounded-full border border-line"
  + ` bg-surface text-[14.5px] leading-none shadow-sm transition-colors ${extra}`;

export default function PartyComments(
  { comments, people, me, userId, onAdd, onReact, onEdit, onDrop }: {
    comments: PartyComment[];
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
  },
) {
  const { t } = useLang();
  const overrides = useAvatarOverrides();
  const face = (id: number | null, fallback: string | null) =>
    (id != null && overrides[id]) || fallback || null;

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
      const r = await uploadPartyImage(supabase, userId, f);
      setBusy((n) => n - 1);
      if (!("error" in r)) setShots((v) => [...v, r.url]);
    }
  };
  const { over, handlers } = useDropTarget({ onFiles: take });

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
    if (!supabase || !userId) return;
    const who = { characterId: me?.id ?? null, name: me?.name ?? "You" };
    const on = c.reactions?.find((r) => r.emoji === emoji);
    const mine = !!on?.by.some((w) => w.characterId === who.characterId
                                   && w.name === who.name);
    onReact?.(c.id, emoji, !mine, who);
    void toggleReaction(supabase, userId, c.id, emoji, who, mine);
  };

  /** By id, for the line a reply quotes. */
  const byId = new Map(comments.map((c) => [c.id, c]));

  const send = () => {
    if (!text.trim() && !shots.length) return;
    void onAdd({
      id: blockId(),
      author: me
        ? { characterId: me.id, name: me.name, avatar: me.avatar }
        // Signed in but with no character verified. The reply is still
        // theirs to make; it simply has no face to put on it.
        : { characterId: null, name: "You", avatar: null },
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
      <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
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
              <span aria-hidden className="size-[30px] shrink-0" />
            ) : src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" width={30} height={30}
                   className="size-[30px] shrink-0 rounded-full border border-line object-cover" />
            ) : (
              <span className={`grid size-[30px] shrink-0 place-items-center rounded-full text-[13.5px] text-muted ${
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
                      <span className="text-[14.5px] text-ink">{c.author.name}</span>
                    )}
                    <span className="font-data text-[12px] text-muted">
                      {fmtDateTime(c.at)}
                    </span>
                    {/* Beside the time it was said, because that is the fact
                        it qualifies: this is not what was here when somebody
                        read it earlier. Not on a deleted one — "edited" about
                        a message that is gone is a detail about nothing. */}
                    {c.editedAt && !c.deletedAt && (
                      <span className="font-data text-[12px] text-muted/70"
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
                    <span className={`flex min-w-0 items-center gap-1.5 border-l-2 border-accent/40 pl-2 text-[13px] text-muted ${
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
                  <p className={`text-[14.5px] italic leading-relaxed text-muted ${
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
                              className="w-[min(28rem,70vw)] rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[14.5px] text-ink" />
                    <span className="flex items-center gap-2 self-end">
                      <button type="button" onClick={() => setFixing(null)}
                              className="text-[13.5px] text-muted hover:text-ink">
                        {t("pf.cancel")}
                      </button>
                      <button type="button"
                              disabled={!fixing.text.trim() || fixing.text === c.text}
                              onClick={() => {
                                void onEdit?.(c.id, fixing.text.trim());
                                setFixing(null);
                              }}
                              className="rounded-lg border border-accent/60 bg-accent/10 px-2.5 py-1 text-[13.5px] text-accent disabled:opacity-40">
                        {t("party.msgSave")}
                      </button>
                    </span>
                  </span>
                ) : c.text ? (
                  <p className={`whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-ink/85 ${
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
                {userId && !c.deletedAt && (
                  <span className={`absolute -top-4 z-[1] flex items-center ${
                    mine ? "left-1" : "right-1"}`}>
                    {picking === c.id ? (
                      <span ref={picker}
                            className="flex items-center gap-0.5 rounded-full border border-line bg-surface px-1 py-0.5 shadow-sm">
                        {REACTIONS.map((e) => (
                          <button key={e} type="button" title={e}
                                  onClick={() => { react(c, e); setPicking(null); }}
                                  className="rounded-full px-1 text-[14.5px] leading-none transition-transform hover:scale-125">
                            {e}
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
                          ☺
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
                <span className={`flex flex-wrap gap-1 ${mine ? "justify-end" : ""}`}>
                  {c.reactions.map((r) => {
                    const isMine = !!me && r.by.some((w) => w.characterId === me.id);
                    return (
                      <button key={r.emoji} type="button"
                              disabled={!userId}
                              title={r.by.map((w) => w.name).join(", ")}
                              onClick={() => react(c, r.emoji)}
                              className={`flex items-center gap-1 rounded-full border px-1.5 py-[1px] text-[13px] transition-colors ${
                                isMine
                                  ? "border-accent/60 bg-accent/15 text-accent"
                                  : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                        <span className="text-[13.5px] leading-none">{r.emoji}</span>
                        <span className="font-data">{r.by.length}</span>
                      </button>
                    );
                  })}
                </span>
              )}
            </div>
          </article>
        );
      })}

      {/* Writing one. Dropping a picture anywhere on the box attaches it, which
          is where somebody's cursor already is when they have the screenshot. */}
      <div {...handlers}
           className={`flex flex-col gap-2 rounded-lg border p-2.5 transition-colors ${
             over ? "border-accent bg-accent/5" : "border-line bg-bg/40"}`}>
        {/* What is being answered, above the box it is answered in — so
            the reply is visibly attached to something before it is sent,
            rather than turning out to have been when it appears. */}
        {answering && (
          <span className="flex min-w-0 items-center gap-2 rounded-lg border-l-2 border-accent/50 bg-surface/60 px-2 py-1 text-[13px] text-muted">
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
                      className="rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-muted" />
        {!!shots.length && (
          <div className="flex flex-wrap gap-2">
            {shots.map((src, n) => (
              <span key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-20 w-auto rounded-md border border-line" />
                <button onClick={() => setShots((v) => v.filter((_, i) => i !== n))}
                        aria-label={t("pf.remove")}
                        className="absolute right-1 top-1 rounded border border-chili/60 bg-bg/85 px-1 text-[12.5px] text-chili">
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={send} disabled={(!text.trim() && !shots.length) || busy > 0}
                  className="rounded-lg border border-accent bg-accent/15 px-3 py-1 text-[14px] text-accent hover:bg-accent/25 disabled:opacity-40">
            {t("pf.comment")}
          </button>
          <span className="text-[13px] text-muted">
            {busy > 0 ? t("pf.uploading", { n: busy }) : t("pf.orDropShot")}
          </span>
        </div>
      </div>

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

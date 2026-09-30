"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { thumbUrl, type ContestImage } from "@/lib/contest";
import PopotoVote from "@/components/contest/PopotoVote";

/**
 * One look on the wall.
 *
 * Every card is the same size, which is the one place this departs from the
 * gallery's wall. There a picture keeps its shape because the wall is for
 * looking; here the wall is for choosing, and a look drawn twice the size of
 * the one beside it has been given an advantage nobody voted for. Glamour
 * shots are mostly GPose portraits, so the frame is portrait too, and a wide
 * shot is cropped to it — the whole picture is one click away.
 *
 * The badges say what a member would want to know before opening it: whose
 * it is if it is theirs, that it arrived late, and where it placed.
 */
export default function LookCard(
  { id, cover, pictures, name, avatar, anonymous = false, caption, votes, given, place,
    awards = [], isNew = false, mine = false, hidden = false, pending = false, comments = 0,
    vote, onOpen }: {
    id: number;
    /** Messages under it, not counting ones taken back. See v99. */
    comments?: number;
    cover: ContestImage | undefined;
    pictures: number;
    name: string;
    avatar: string | null;
    /** Names are hidden in this contest; `name` is the look's number. */
    anonymous?: boolean;
    /** Waiting for an admin; only its author and admins are sent it. */
    pending?: boolean;
    caption: string | null;
    /** Null when the count is not on show. */
    votes: number | null;
    given: boolean;
    /** Only once the result is out. */
    place?: number | null;
    awards?: string[];
    isNew?: boolean;
    mine?: boolean;
    hidden?: boolean;
    /** Absent when there is no button to show at all. */
    vote?: { disabled: boolean; why?: string; onToggle: (b: HTMLButtonElement) => Promise<void> };
    onOpen: () => void;
  },
) {
  const { t } = useLang();
  const [shown, setShown] = useState(false);

  return (
    <article className={`group flex flex-col overflow-hidden rounded-xl border bg-surface transition-colors ${
      place === 1 ? "border-gold/60" : "border-line hover:border-accent/70"}`}>
      {/* The popoto sits on the picture's corner rather than beside the name:
          two cards across a phone leave about a hundred pixels for a name,
          and a button beside it left "Aqua E…". It cannot go inside the
          picture's own button, so the two share a positioned box. */}
      <div className="relative">
      <button type="button" onClick={onOpen}
              className="relative block aspect-[4/5] w-full overflow-hidden bg-card text-left">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img id={`look-${id}`} src={thumbUrl(cover)} alt={caption ?? ""} loading="lazy"
               onLoad={() => setShown(true)}
               className={`size-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.02] ${
                 shown ? "opacity-100" : "opacity-0"} ${hidden ? "grayscale" : ""}`} />
        )}

        <span className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
          {place != null && (
            <span className={`rounded-md px-1.5 py-0.5 font-data text-meta font-semibold backdrop-blur ${
              place === 1 ? "bg-gold text-bg" : "bg-bg/80 text-ink"}`}>
              {t("contest.place", { n: place })}
            </span>
          )}
          {mine && (
            <span className="rounded-md border border-accent/60 bg-bg/80 px-1.5 py-0.5 text-meta text-accent backdrop-blur">
              {t("contest.yours")}
            </span>
          )}
          {isNew && (
            <span className="rounded-md border border-jade/60 bg-bg/80 px-1.5 py-0.5 text-meta text-jade backdrop-blur">
              {t("contest.new")}
            </span>
          )}
          {hidden && (
            <span className="rounded-md border border-chili/60 bg-bg/85 px-1.5 py-0.5 text-meta text-chili backdrop-blur">
              {t("contest.hiddenByAdmin")}
            </span>
          )}
          {pending && !hidden && (
            <span className="rounded-md border border-gold/60 bg-bg/85 px-1.5 py-0.5 text-meta text-gold backdrop-blur">
              {t("contest.pending")}
            </span>
          )}
        </span>

        {pictures > 1 && (
          <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-bg/75 px-1.5 py-0.5 font-data text-meta text-ink backdrop-blur">
            {t("contest.pictures", { n: pictures })}
          </span>
        )}

        {awards.length > 0 && (
          <span className="pointer-events-none absolute bottom-2 left-2 right-16 flex flex-wrap gap-1">
            {awards.map((a) => (
              <span key={a} className="rounded-md border border-gold/60 bg-bg/85 px-1.5 py-0.5 text-meta text-gold backdrop-blur">
                {a}
              </span>
            ))}
          </span>
        )}
      </button>

      {vote ? (
        <PopotoVote compact overlay given={given} count={votes} disabled={vote.disabled}
                    why={vote.why} onToggle={vote.onToggle}
                    className="absolute bottom-2 right-2" />
      ) : votes != null ? (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-bg/80 px-1.5 py-0.5 font-data text-meta tabular-nums text-ink backdrop-blur">
          {t("contest.votes", { n: votes })}
        </span>
      ) : null}
      </div>

      <div className="flex items-center gap-2 px-3 pb-1 pt-2.5">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" loading="lazy"
               className="size-6 shrink-0 rounded-full border border-line object-cover" />
        ) : anonymous ? (
          // A number where the face would be, so a wall of hidden names reads
          // as numbered looks rather than as faces that failed to load.
          <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-card font-data text-meta text-muted">#</span>
        ) : (
          <span className="size-6 shrink-0 rounded-full border border-line bg-card" />
        )}
        <span className="min-w-0 flex-1 truncate font-data text-ui font-semibold text-ink">{name}</span>
        {/* The same mark the gallery's tiles use for their comments. */}
        {comments > 0 && (
          <span className="shrink-0 font-data text-meta tabular-nums text-muted"
                title={comments === 1 ? t("pf.commentOne") : t("pf.commentsN", { n: comments })}>
            💬 {comments}
          </span>
        )}
      </div>
      {caption ? (
        <p className="line-clamp-2 px-3 pb-3 text-ui leading-snug text-muted">{caption}</p>
      ) : (
        <div className="pb-2" />
      )}
    </article>
  );
}

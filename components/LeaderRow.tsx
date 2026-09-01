import Link from "next/link";

/**
 * One line of a leaderboard.
 *
 * Shared so the achievement boards and the potato board cannot drift apart in
 * how they draw a place — they are read side by side on one page, and two rows
 * that rank the same way should not look like two different things.
 *
 * The top three get a face. Below that a name is enough: a column of thirty
 * portraits is a page of thumbnails with some numbers on it, and the point of
 * a top three is that it is glanceable without reading.
 */

export interface Leader {
  id: number;
  name: string;
  avatar: string | null;
  score: number;
  n: number;
  /** Anything to say beside the name — a grade, "on vacation". */
  note?: string;
  noteTone?: "accent" | "muted";
}

const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");
/** A stable colour per name, so a missing portrait is still somebody's colour. */
const hue = (n: string) => [...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

export default function LeaderRow(
  { row, place, value, sub, title }: {
    row: Leader;
    place: number;
    /** The number this board ranks by, already formatted. */
    value: string;
    /** The smaller number in brackets after it. */
    sub?: string;
    title?: string;
  },
) {
  const top = place <= 3;
  return (
    <li className={`grid items-center gap-2 ${
      top ? "grid-cols-[22px_28px_1fr_auto] py-0.5" : "grid-cols-[22px_1fr_auto]"} text-[13px]`}>
      <span className={`text-right font-data text-[11.5px] ${
        top ? "text-accent" : "text-muted"}`}>
        {place}
      </span>

      {top && (
        <Link href={`/member/${row.id}`} className="block size-7 shrink-0">
          {row.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.avatar} alt="" loading="lazy"
                 className="size-7 rounded-full border border-line object-cover" />
          ) : (
            <span className="grid size-7 place-items-center rounded-full border border-line font-data text-[10px] text-ink/80"
                  style={{ background: `hsl(${hue(row.name)} 30% 22%)` }}>
              {initials(row.name)}
            </span>
          )}
        </Link>
      )}

      <span className="min-w-0 truncate">
        <Link href={`/member/${row.id}`}
              className={`font-data text-ink no-underline hover:text-accent ${
                top ? "font-semibold" : ""}`}>
          {row.name}
        </Link>
        {row.note && (
          <span className={`ml-1.5 text-[11px] ${
            row.noteTone === "muted" ? "text-muted/70" : "text-accent"}`}>
            {row.note}
          </span>
        )}
      </span>

      <span className="text-right font-data text-[12px] text-muted" title={title}>
        {value}
        {sub && <small className="ml-1 opacity-60">({sub})</small>}
      </span>
    </li>
  );
}

import { emoteOf } from "@/lib/emotes";

/**
 * One reaction, whichever kind it is.
 *
 * The row under a message holds five characters everybody's keyboard agrees on
 * and four pictures the Free Company brought with it, and by the time either
 * reaches here it is a string in a database column. So the decision is made in
 * one place: if the table knows the token it is a picture, and if it does not
 * it is the character somebody chose.
 *
 * Sized in pixels rather than by the font, because half of these are images
 * and an image does not have a font size — a row that set one with text-[20px]
 * and the other with a width would drift apart the first time either changed.
 */
export default function Emote(
  { value, size = 20, sticker = false }: {
    value: string;
    size?: number;
    /**
     * Drawn as the picture it is, rather than as a large character.
     *
     * A sticker sent on its own line and a screenshot dropped into a message
     * are the same act from the reader's side — somebody put a picture here —
     * and the thread was drawing them as two different kinds of thing, one
     * framed and rounded at ninety-six pixels and the other square and
     * seventy. Same box for both.
     */
    sticker?: boolean;
  },
) {
  const e = emoteOf(value);
  if (!e) {
    return (
      <span style={{ fontSize: size }} className="leading-none">{value}</span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={e.src} alt={e.say} title={e.say} width={size} height={size}
         style={{ width: size, height: size }}
         className={sticker
           ? "inline-block shrink-0 rounded-md border border-line object-cover"
           : "inline-block shrink-0 object-contain align-[-0.15em]"} />
  );
}

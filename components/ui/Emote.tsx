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
  { value, size = 20 }: { value: string; size?: number },
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
         className="inline-block shrink-0 object-contain align-[-0.15em]" />
  );
}

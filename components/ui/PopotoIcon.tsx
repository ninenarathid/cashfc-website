import popoto from "@/assets/popoto/popoto.webp";
import heart from "@/assets/popoto/heart.webp";
import sleep from "@/assets/popoto/sleep.webp";
import fly from "@/assets/popoto/fly.webp";
import hug from "@/assets/popoto/hug.webp";

/**
 * The popoto, drawn.
 *
 * It was the potato emoji, and every platform draws that its own way — a
 * glossy brown lump on an iPhone, a flat one on Windows — so the thing members
 * send each other looked different depending on whose screen it was on. This
 * is one potato, in a pose for each moment of sending one:
 *
 *   popoto   the plain one, on every button, counter and board
 *   heart    holding a heart, in the corner of "somebody sent you one"
 *   sleep    asleep, where it has been sent today and waits for 07:00
 *   fly      in the air, and hug, landed on the face it was thrown at — the
 *            two halves of the throw (see throwPotato)
 *
 * The files come from scripts/popoto-art.mjs, which lines the poses up so that
 * one can replace another in place without the potato changing size.
 */
export const POPOTO = { popoto, heart, sleep, fly, hug };

export type PopotoPose = "popoto" | "heart" | "sleep";

/**
 * One in a line of text, where the emoji used to be.
 *
 * Sized in em unless told otherwise, so it follows the text around it the way
 * the emoji did: the 13px button and the board heading each get a potato their
 * own size without either saying so. Dropped below the middle of the line by
 * about as much as an emoji's descent, so it sits on the text rather than
 * floating over it.
 *
 * Decoded with the frame it arrives in. The icon changes with state — the
 * button's plain potato becomes the sleeping one the moment it has been sent —
 * and a change should be one frame, not a frame of nothing and then the
 * picture. They are a few kilobytes each and already in memory (warmPopoto),
 * so decoding them in step costs nothing.
 */
export default function PopotoIcon(
  { pose = "popoto", size = "1.3em", label, className = "" }: {
    pose?: PopotoPose;
    size?: number | string;
    /** For a potato standing in for a word, as beside a bare count. Unset, it is decoration. */
    label?: string;
    className?: string;
  },
) {
  const art = POPOTO[pose];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={art.src} alt={label ?? ""} width={art.width} height={art.height}
         decoding="sync" draggable={false}
         className={`inline-block shrink-0 select-none align-[-0.3em] ${className}`}
         style={{ width: size, height: size }} />
  );
}

/*
 * Every pose, fetched and decoded before it is needed.
 *
 * Only the plain potato is on the page when it loads. The rest turn up because
 * somebody did something — the throw, the button that falls asleep, the heart
 * in the bell — and a picture fetched at that moment is a moment of empty space
 * where the potato should be, at exactly the point somebody is watching for
 * it. So all five are asked for once the page is idle, and decoded, and held
 * here so the browser keeps them.
 */
const held: HTMLImageElement[] = [];
let warming: Promise<void> | null = null;

export function warmPopoto(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  warming ??= Promise.all(Object.values(POPOTO).map((art) => {
    const img = new Image();
    img.src = art.src;
    held.push(img);
    // A picture that will not decode is a pose that falls back to loading
    // when it is shown, which is what happened before any of this.
    return img.decode().catch(() => {});
  })).then(() => {});
  return warming;
}

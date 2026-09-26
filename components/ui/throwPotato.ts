import { POPOTO, warmPopoto } from "@/components/ui/PopotoIcon";
import shape from "@/assets/popoto/throw.json";
import { throwArc } from "@/lib/throw-arc";

/**
 * A popoto, thrown.
 *
 * Sending one was a click, a number going up by one and a line of text, which
 * is the same as every other button on the site — and a popoto is not a form
 * being submitted, it is somebody tossing a potato at a friend. So it is
 * tossed: from the button, over in an arc, onto their picture, which flinches,
 * with a "+1" that rises off it.
 *
 * From a member's page, from the member list, and from the notification panel,
 * where answering somebody who sent you one is a potato thrown at their face in
 * the row — one button, or one for each of them in turn.
 *
 * It flies in one pose and lands in another. In the air it is mid-leap, arms
 * out and eyes screwed shut; on the face it hits it is hugging them, squashed
 * flat by the landing and springing back. That change is the point of the
 * whole thing, so everything here is arranged for it to be seen:
 *
 *   · it is a little bigger than the emoji was, enough for a face to read
 *   · it leans with the arc instead of spinning (lib/throw-arc), so its face is
 *     the right way up for the whole flight
 *   · the hug is held still for a moment before it goes, rather than
 *     vanishing the instant it arrives
 *   · both drawings are decoded before it leaves the button, and both are on
 *     the page for the whole throw with one of them transparent, so the change
 *     at the moment of landing is an opacity flip — never a picture loading
 *
 * Drawn on a layer of its own over the page and taken down after, rather than
 * as part of the React tree. Nothing about it is state anybody reads — it is
 * the second and a half between pressing and landing — and holding it in a
 * component would re-render the whole profile page to move a potato.
 *
 * The browser's own animations (Web Animations), so it runs on the compositor
 * and needs no library. Every part of it — the flight, the change of pose, the
 * squash, the ring, the "+1", the flinch — is started in the same moment with
 * its own delay on one clock, so the landing happens on the same frame
 * everywhere instead of each piece starting when the last one's promise
 * resolved.
 *
 * Nobody who has asked their system for less motion gets the flight. They get
 * the landing — the hug fading in on the face, and the "+1" — which says the
 * same thing without anything crossing the screen.
 *
 * `slow` is for looking at it, and only the local test commands pass it:
 * `testPotato(4)` plays the whole throw four times slower, every part of it
 * together, so the change of pose can be watched rather than caught.
 */

/**
 * How wide the potato itself is, in px — in the air and on the face alike.
 *
 * One size for both poses, so the potato that lands is plainly the one that
 * was thrown rather than a bigger or smaller one taking its place. And this
 * size, because the hug sits on somebody's face, often a small one in a list:
 * any bigger and it covers the face it is hugging, and in the air it read as
 * something dropped on the page rather than tossed across it.
 */
const BODY = 31;
/** The square both drawings sit in, sized so the potato inside comes out BODY wide. */
const BOX = Math.round(BODY / shape.fly.w);
/** Hitting the face, flattening against it and springing back. */
const SQUASH = 420;
/** Held still in the hug, so it is seen and not just glimpsed. */
const HOLD = 380;
/** Shrinking away. */
const LEAVE = 220;

export async function throwPotato(
  from: Element | DOMRect | null, to: Element | null,
  { slow = 1 }: { slow?: number } = {},
): Promise<void> {
  if (typeof window === "undefined" || !from) return;
  // A rectangle rather than an element, for a button that may not outlive the
  // throw: the notification panel's "send them all back" fires a potato at each
  // person in turn, and the button itself goes once the last one has landed.
  // Where it was standing when it was pressed is all a throw needs from it.
  const a = from instanceof Element ? from.getBoundingClientRect() : from;
  const target = to ?? (from instanceof Element ? from : null);
  const b = target ? target.getBoundingClientRect() : a;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Both poses ready to paint before anything moves. Warmed already (see
  // warmPopoto) this settles at once; cold — the first throw of a visit on a
  // slow connection — it is worth a beat, but only a beat. Past that it goes
  // anyway, and a pose that is still arriving arrives late.
  const inAir = drawing(POPOTO.fly.src);
  const landed = drawing(POPOTO.hug.src);
  void warmPopoto();
  await Promise.race([
    Promise.all([inAir.decode(), landed.decode()]).catch(() => {}),
    new Promise((r) => setTimeout(r, 250)),
  ]);

  const x0 = a.left + a.width / 2;
  const y0 = a.top + a.height / 2;
  const x1 = b.left + b.width / 2;
  const y1 = b.top + b.height * 0.42;
  const dx = x1 - x0;
  const dy = y1 - y0;
  // Longer for a longer throw, and never so short the pose in the air is a blur.
  const flight = Math.round(700 + Math.min(300, Math.hypot(dx, dy) * 0.3));
  const total = flight + SQUASH + HOLD + LEAVE;
  /** A moment in the throw, as a share of the whole of it. */
  const at = (ms: number) => Math.min(1, ms / total);

  const layer = div("position:fixed;inset:0;pointer-events:none;z-index:200;");
  layer.setAttribute("aria-hidden", "true");

  // Three boxes, one job each, so no transform has to be worked out from
  // another: where the potato is and how it leans; its shape, popping out of
  // the button and squashing on the face; and which way it faces, turned round
  // for a throw to the left. The drawing faces right.
  const potato = div(`position:absolute;left:${x0 - BOX / 2}px;top:${y0 - BOX / 2}px;`
    + `width:${BOX}px;height:${BOX}px;will-change:transform,opacity;`);
  const body = div("position:absolute;inset:0;will-change:transform;");
  const facing = div(`position:absolute;inset:0;transform:scaleX(${dx < 0 ? -1 : 1});`
    + "filter:drop-shadow(0 4px 6px rgba(0,0,0,.45));");
  for (const img of [inAir, landed]) {
    img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  }
  body.appendChild(facing);
  potato.appendChild(body);
  layer.appendChild(potato);

  // The "+1", off the top of the potato's head rather than over its face, and
  // a moment after it lands, so the eye is on the hug first.
  const plus = div(`position:absolute;left:${x1}px;top:${y1 - BOX * 0.55}px;`
    + "display:flex;align-items:center;gap:3px;transform:translate(-50%,-50%);opacity:0;"
    + "font:700 18px/1 system-ui,sans-serif;color:#f3c969;white-space:nowrap;"
    + "text-shadow:0 2px 6px rgba(0,0,0,.6);");
  const mini = drawing(POPOTO.popoto.src);
  mini.style.cssText = "width:20px;height:20px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5));";
  plus.append("+1", mini);
  layer.appendChild(plus);
  document.body.appendChild(layer);

  const running: Animation[] = [];
  try {
    if (reduce) {
      // Standing still: the hug appears on the face it was meant for, stays,
      // and goes.
      potato.style.left = `${x1 - BOX / 2}px`;
      potato.style.top = `${y1 - BOX / 2}px`;
      facing.appendChild(landed);
      running.push(
        potato.animate([
          { opacity: 0 },
          { opacity: 1, offset: 0.15 },
          { opacity: 1, offset: 0.8 },
          { opacity: 0 },
        ], { duration: 1100, fill: "forwards" }),
        rise(plus, 150, 700),
      );
    } else {
      facing.append(inAir, landed);
      landed.style.opacity = "0";

      // Along the arc, leaning into it, then straightening up on the face.
      const path: Keyframe[] = throwArc(dx, dy, 30).map((p) => ({
        offset: at(flight * p.t),
        transform: `translate(${p.x}px,${p.y}px) rotate(${p.tilt}deg)`,
      }));
      path.push(
        { offset: at(flight + 160), transform: `translate(${dx}px,${dy}px) rotate(0deg)` },
        { offset: 1, transform: `translate(${dx}px,${dy}px) rotate(0deg)` },
      );

      // Out of the button with a little overshoot; at the face, flattened by
      // the landing, springing tall, settling back to the size it flew at;
      // held; then gone. The two frames at the moment of landing are one after
      // the other at the same instant: it does not ease into the squash, it hits.
      const squash: Keyframe[] = [
        { offset: 0, transform: "scale(.45)", easing: "cubic-bezier(.3,1.6,.6,1)" },
        { offset: at(flight * 0.2), transform: "scale(1)" },
        { offset: at(flight), transform: "scale(1)" },
        { offset: at(flight), transform: "scale(1.3,.72)", easing: "ease-out" },
        { offset: at(flight + 120), transform: "scale(.9,1.12)", easing: "ease-in-out" },
        { offset: at(flight + 240), transform: "scale(1.05,.96)", easing: "ease-in-out" },
        { offset: at(flight + 340), transform: "scale(.99,1.01)", easing: "ease-out" },
        { offset: at(flight + SQUASH), transform: "scale(1)" },
        { offset: at(flight + SQUASH + HOLD), transform: "scale(1)", easing: "ease-in" },
        { offset: 1, transform: "scale(.5)" },
      ];

      // The change of pose: a cut on the frame it lands, not a cross-fade — two
      // potatoes half-visible on top of each other read as a smear.
      const cut = (before: number): Keyframe[] => [
        { offset: 0, opacity: before },
        { offset: at(flight), opacity: before },
        { offset: at(flight), opacity: 1 - before },
        { offset: 1, opacity: 1 - before },
      ];

      const whole = { duration: total, easing: "linear", fill: "forwards" as const };
      running.push(
        potato.animate(path, whole),
        potato.animate([
          { offset: 0, opacity: 0 },
          { offset: at(70), opacity: 1 },
          { offset: at(total - LEAVE), opacity: 1 },
          { offset: 1, opacity: 0 },
        ], whole),
        body.animate(squash, whole),
        inAir.animate(cut(1), whole),
        landed.animate(cut(0), whole),
        rise(plus, flight + 140, 900),
      );

      // A ring out from where it hit.
      const ring = div(`position:absolute;left:${x1}px;top:${y1}px;width:14px;height:14px;`
        + "margin:-7px 0 0 -7px;border-radius:9999px;border:2px solid #e8b04b;opacity:0;");
      layer.insertBefore(ring, potato);
      running.push(ring.animate(
        [{ transform: "scale(1)", opacity: 0.9 }, { transform: "scale(7)", opacity: 0 }],
        { duration: 520, delay: flight, easing: "ease-out", fill: "forwards" }));

      // The flinch belongs to the thing that was hit, so there is none when
      // nothing was named — a throw with only a place to land still lands.
      if (target) {
        running.push(target.animate([
          { transform: "none" },
          { transform: "scale(.94) rotate(-2.5deg)", offset: 0.25 },
          { transform: "scale(1.03) rotate(1deg)", offset: 0.6 },
          { transform: "none" },
        ], { duration: 420, delay: flight, easing: "ease-out" }));
      }
    }
    // Set in the same task they were started in, so they stay on one clock.
    if (slow > 0 && slow !== 1) for (const r of running) r.playbackRate = 1 / slow;
    await Promise.all(running.map((r) => r.finished));
  } catch {
    // An animation interrupted — the page navigated, the tab was hidden — has
    // nothing left to show. The popoto was sent either way.
  } finally {
    layer.remove();
  }
}

/** The "+1" floating up and away. */
function rise(el: HTMLElement, delay: number, duration: number): Animation {
  return el.animate([
    { transform: "translate(-50%,-30%) scale(.6)", opacity: 0 },
    { transform: "translate(-50%,-90%) scale(1.1)", opacity: 1, offset: 0.25 },
    { transform: "translate(-50%,-210%) scale(1)", opacity: 0 },
  ], { duration, delay, easing: "ease-out", fill: "forwards" });
}

function div(css: string): HTMLDivElement {
  const d = document.createElement("div");
  d.style.cssText = css;
  return d;
}

function drawing(src: string): HTMLImageElement {
  const img = new Image();
  img.alt = "";
  img.draggable = false;
  img.decoding = "sync";
  img.src = src;
  return img;
}

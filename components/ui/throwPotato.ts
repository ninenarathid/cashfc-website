/**
 * A popoto, thrown.
 *
 * Sending one was a click, a number going up by one and a line of text, which
 * is the same as every other button on the site — and a popoto is not a form
 * being submitted, it is somebody tossing a potato at a friend. So it is
 * tossed: from the button, over in an arc, spinning, onto their picture, which
 * flinches, with a "+1" that rises off it.
 *
 * From a member's page, and from the notification panel, where answering
 * somebody who sent you one is a potato thrown at their face in the row — one
 * button, or one for each of them in turn.
 *
 * Drawn on a layer of its own over the page and taken down after, rather than
 * as part of the React tree. Nothing about it is state anybody reads — it is
 * the half-second between pressing and landing — and holding it in a
 * component would re-render the whole profile page twice to move a potato.
 *
 * The browser's own animations (Web Animations), so it runs off the main
 * thread's layout and needs no library. The arc is two movements at once, the
 * way a thrown thing actually moves: steady across, and up then down with the
 * ease that gravity gives it.
 *
 * Nobody who has asked their system for less motion gets the flight. They get
 * the landing — the picture's nudge and the "+1" — which says the same thing
 * without anything crossing the screen.
 */
export async function throwPotato(
  from: Element | DOMRect | null, to: Element | null,
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

  const x0 = a.left + a.width / 2;
  const y0 = a.top + a.height / 2;
  const x1 = b.left + b.width / 2;
  const y1 = b.top + b.height * 0.42;
  const dx = x1 - x0;
  const dy = y1 - y0;
  // Higher for a longer throw, and always above both ends, so a target that
  // sits above the button is still reached over the top rather than in a line.
  const lift = Math.min(0, dy) - 90 - Math.hypot(dx, dy) * 0.18;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:200;";
  document.body.appendChild(layer);

  try {
    if (!reduce) {
      const across = document.createElement("div");
      across.style.cssText = `position:absolute;left:${x0}px;top:${y0}px;`;
      const upDown = document.createElement("div");
      const spud = document.createElement("div");
      spud.textContent = "🥔";
      spud.style.cssText =
        "font-size:34px;line-height:1;transform:translate(-50%,-50%);"
        + "filter:drop-shadow(0 4px 6px rgba(0,0,0,.45));";
      upDown.appendChild(spud);
      across.appendChild(upDown);
      layer.appendChild(across);

      const ms = Math.round(620 + Math.min(260, Math.hypot(dx, dy) * 0.35));
      await Promise.all([
        across.animate(
          [{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }],
          { duration: ms, easing: "linear", fill: "forwards" }).finished,
        upDown.animate([
          { transform: "translateY(0)", easing: "cubic-bezier(.2,.6,.35,1)" },
          { transform: `translateY(${lift}px)`, offset: 0.42, easing: "cubic-bezier(.6,0,.85,.4)" },
          { transform: `translateY(${dy}px)` },
        ], { duration: ms, fill: "forwards" }).finished,
        spud.animate([
          { transform: "translate(-50%,-50%) rotate(0deg) scale(.7)" },
          { transform: "translate(-50%,-50%) rotate(400deg) scale(1.15)", offset: 0.42 },
          { transform: "translate(-50%,-50%) rotate(760deg) scale(.9)" },
        ], { duration: ms, easing: "linear", fill: "forwards" }).finished,
      ]);
      across.remove();
    }

    // The landing. The picture flinches, a ring goes out from where it hit, and
    // a "+1" rises off it — the part everybody gets, motion or not.
    const ring = document.createElement("div");
    ring.style.cssText =
      `position:absolute;left:${x1}px;top:${y1}px;width:14px;height:14px;`
      + "margin:-7px 0 0 -7px;border-radius:9999px;border:2px solid #e8b04b;";
    const plus = document.createElement("div");
    plus.textContent = "+1 🥔";
    plus.style.cssText =
      `position:absolute;left:${x1}px;top:${y1}px;transform:translate(-50%,-50%);`
      + "font:700 18px/1 system-ui,sans-serif;color:#f3c969;white-space:nowrap;"
      + "text-shadow:0 2px 6px rgba(0,0,0,.6);";
    layer.append(ring, plus);

    const landing: Promise<unknown>[] = [
      plus.animate([
        { transform: "translate(-50%,-50%) scale(.6)", opacity: 0 },
        { transform: "translate(-50%,-120%) scale(1.1)", opacity: 1, offset: 0.25 },
        { transform: "translate(-50%,-260%) scale(1)", opacity: 0 },
      ], { duration: reduce ? 700 : 950, easing: "ease-out", fill: "forwards" }).finished,
    ];
    if (!reduce) {
      landing.push(
        ring.animate(
          [{ transform: "scale(1)", opacity: 0.9 }, { transform: "scale(7)", opacity: 0 }],
          { duration: 520, easing: "ease-out", fill: "forwards" }).finished,
      );
      // The flinch belongs to the thing that was hit, so there is none when
      // nothing was named — a throw with only a place to land still lands.
      if (target) {
        landing.push(target.animate([
          { transform: "none" },
          { transform: "scale(.94) rotate(-2.5deg)", offset: 0.25 },
          { transform: "scale(1.03) rotate(1deg)", offset: 0.6 },
          { transform: "none" },
        ], { duration: 420, easing: "ease-out" }).finished);
      }
    } else {
      ring.remove();
    }
    await Promise.all(landing);
  } catch {
    // An animation interrupted — the page navigated, the tab was hidden — has
    // nothing left to show. The popoto was sent either way.
  } finally {
    layer.remove();
  }
}

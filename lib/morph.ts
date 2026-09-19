/**
 * Carrying one face from the roster onto the page it belongs to.
 *
 * A view transition can hold an element across a navigation if the same
 * `view-transition-name` is on something in the old page and something in the
 * new one. The browser then draws one picture travelling between the two
 * positions instead of cross-fading two pages — a member's face grows out of
 * the row you tapped and becomes the portrait at the top of their page.
 *
 * The name is put on at the moment of the click rather than left on every face
 * in the list, for a reason that is not performance: a view transition aborts
 * outright if two elements share a name, and the roster draws five hundred of
 * them. So exactly one face carries the name, and only between the click and
 * the page it lands on.
 *
 * Written straight to the DOM instead of through React state on purpose. The
 * snapshot is taken as the navigation starts, which can be the same tick as the
 * click; a state update is not guaranteed to have painted by then, and a name
 * that arrives late produces no morph at all — silently.
 */

export const FACE_MORPH = "member-face";

/** Whether this browser can do any of it. */
const supported = () =>
  typeof document !== "undefined"
  && typeof CSS !== "undefined"
  && typeof CSS.supports === "function"
  && CSS.supports("view-transition-name: none");

/** Take the name off whatever is wearing it. */
function clearFaceMorph() {
  document.querySelectorAll<HTMLElement>("[data-face-morph]").forEach((el) => {
    el.style.viewTransitionName = "";
    el.removeAttribute("data-face-morph");
  });
}

/**
 * Hand the browser the face it should carry to the next page.
 *
 * Call it from the click that navigates. Safe to call when nothing matches —
 * the transition simply has nothing to pair with and the page changes as it
 * otherwise would.
 */
export function markFaceMorph(id: number | string) {
  if (!supported()) return;
  // Always first: a face left named by a navigation somebody cancelled would
  // collide with this one and take the whole transition down with it.
  clearFaceMorph();

  const el = document.querySelector<HTMLElement>(
    `[data-face="${CSS.escape(String(id))}"]`);
  if (!el) return;

  el.style.viewTransitionName = FACE_MORPH;
  el.setAttribute("data-face-morph", "");
}

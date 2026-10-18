"use client";

import { Children, cloneElement, isValidElement, createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import TownIcon, { type IconName } from "./TownIcon";

/**
 * The foot of the map, and its head: one place for everything the town offers at the bottom of the screen, and one
 * for what it says at the top, laid out by the page and never by a distance each piece keeps for itself.
 *
 * Until 2026-10-08 each piece stood at a height of its own above the map's foot (0.75rem, 4.25rem, 8rem, 11.5rem …),
 * which holds only while every piece is one row of buttons: a game's board is taller than three of those steps, and
 * the chips of the bucket line lay across the pouring board; whoever sat had "get up" lying on the chat's lines (the
 * owner's screenshots, "แก้ไขปัญหา UI บังใน Cash town"). Here a piece says only what it is (`rank`), and is put into the
 * one column of its place (a portal), where each takes the room it needs and the next stands beside it.
 *
 * At the foot:
 * - `main`: what the place I stand at is for (the farm's deed, the forest's, the kitchen's, a line dropped): lowest,
 *   under the thumb.
 * - `chip`: something else that can be done here (the well's book, the chest, water handed on, a thing picked up).
 * - `note`: words only. They stay while a board is up.
 * - `board`: a game's board, or a box that asks something: while one is up the foot's chips and deeds are put away
 *   (they could not be used meanwhile, and lay across it), and on a narrow screen it has the whole foot, the chat and
 *   the buttons at the sides put away with them.
 * - `side`: a thing of the hand kept beside the chat (the hunter's belt), on the left.
 *
 * At the head, under the top row:
 * - `toast`: transient notices, suppressed to keep the gameplay screen clear. Interactive offers use `chip`.
 * - `corner`: what stays under the clock (a chat room folded away), on the left.
 *
 * `order` places a piece among the others of its place (a higher number is lower on the screen); `wide` is a board of
 * thirty rem. The map (Town.tsx) makes the places and gives them by `TownFootContext`; with no map about, nothing is
 * drawn. The layout itself is `FOOT_CSS`, which the map puts on the page.
 */
export type FootRank = "main" | "chip" | "power" | "note" | "board" | "side" | "toast" | "corner";
export interface FootPlaces { dock: HTMLElement | null; side: HTMLElement | null; head: HTMLElement | null; corner: HTMLElement | null; powers?: HTMLElement | null }
export const TownFootContext = createContext<FootPlaces>({ dock: null, side: null, head: null, corner: null, powers: null });

const ORDER: Record<FootRank, number> = { note: 10, chip: 30, power: 20, main: 60, board: 60, side: 0, toast: 30, corner: 30 };

/** (`badge`: of a power, a small count over the corner of its icon, such as the uses the day has left of it) */
export default function TownFoot({ rank = "chip", order, wide = false, icon, badge, children }: { rank?: FootRank; order?: number; wide?: boolean; icon?: IconName; badge?: string | number; children: ReactNode }) {
  const places = useContext(TownFootContext);
  // Keep gameplay clear of transient notices on both phones and desktops.
  if (rank === "toast") return null;
  const into = rank === "side" ? places.side : rank === "power" ? places.powers ?? places.corner : rank === "corner" ? places.corner : places.dock;
  if (!into) return null;
  if (rank === "power" && icon) return createPortal(
    <div data-foot="power" style={{ order: order ?? ORDER.power }} className="pointer-events-auto">
      {Children.map(children, child => {
        if (!isValidElement<{ children?: ReactNode; className?: string; title?: string; "aria-label"?: string }>(child) || child.type !== "button") return child;
        const words = (node: ReactNode): string => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(words).join(" ") : isValidElement<{children?:ReactNode}>(node) ? words(node.props.children) : "";
        const title = child.props["aria-label"] || child.props.title || words(child.props.children);
        return cloneElement(child, { title, "aria-label": title, className: "pressable relative grid h-11 w-11 place-items-center rounded-xl border-2 border-[#987144] bg-[#302a22]/95 text-[#f0dfb6] shadow-md hover:border-gold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-gold" }, <TownIcon name={icon} size={30} />,
          badge !== undefined ? <span key="badge" aria-hidden data-foot-badge className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full border border-[#2a190d] bg-[#f0c060] px-1 text-center font-data text-[11px] font-bold leading-[18px] tabular-nums text-[#3a2209] shadow">{badge}</span> : null);
      })}
    </div>, into);
  return createPortal(
    <div data-foot={rank} style={{ order: order ?? ORDER[rank], ...(rank === "board" ? { maxHeight: "100%", minHeight: 0 } : {}) }}
         className={`pointer-events-none flex max-w-full flex-col gap-2 ${rank === "side" || rank === "corner" ? "items-start" : "items-center"} ${rank === "board" ? (wide ? "w-[30rem]" : "w-[26rem]") : ""}`}>
      {children}
    </div>,
    into,
  );
}

/**
 * How it is laid out: one grid (`.town-foot`, the map's) for everything under the top row.
 *
 * Its pieces: what stays under the clock (`corner`) and what is told for a moment (`toast`) at the head; then what
 * is used by hand (`hand`: the belt, getting up), the chat's lines (`said`), the foot's column (`dock`); and the
 * foot's last row, what is for talking at its left (`ctrl`: the chat, the microphone, the emotes) and what is for
 * doing at its right (`right`: the thing in the hand, the lines of work, the bag). Until 2026-10-09 `right` was a
 * column up the whole right edge, with the zoom in its middle: on a short phone its buttons were squeezed to
 * thirty-five pixels, and what the place offers had only the room it left.
 * - "Get up" is over the chat, not between its lines and its box (the owner, 2026-10-08: "ปุ่มลุกขึ้นควรจะอยู่ด้านบนแชท").
 *   So it moves a line's height when a line of chat comes or goes: his choice, over mine of a button that keeps
 *   its place.
 * - A narrow screen: one column the width of the screen, in that order, the hand's row taking what room is left,
 *   and under it the last row's two ends. What the place offers stays just over that row, where no line of chat
 *   moves it.
 * - From 64rem: three columns, the toasts and the dock in the middle of the screen, each side at least 16rem. The
 *   chat's box gives way before anything overlaps.
 * - `:has()` puts the rest of the foot away while a board is up (see `TownFoot`). A browser without it shows them
 *   still, above the board, never across it.
 * - While a phone's chat is typed in, the dock is put away: the keyboard has the room.
 * - The rows over the chat's box give way before it does: the hand's takes what is left, and the lines' row may be
 *   less than its history is tall (`minmax(0, auto)`: the history then runs up over the head, as it always did), so
 *   that on a screen a keyboard has made short the box stays at the foot and is not pushed under the keyboard.
 */
export const FOOT_CSS = `
  .town-foot { display: grid; align-items: end; column-gap: 0.5rem; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto auto minmax(0, 1fr) minmax(0, auto) auto auto; grid-template-areas: "corner corner" "powers powers" "toast toast" "hand hand" "said said" "dock dock" "ctrl right"; }
  .town-foot > [data-head-corner] { grid-area: corner; align-self: start; justify-self: start; }
  .town-foot > [data-foot-powers] { grid-area: powers; align-self: start; justify-self: start; padding-bottom: .375rem; }
  [data-foot-powers] { display: flex; flex-wrap: wrap; gap: .375rem; max-width: min(20rem,calc(100vw - 2rem)); }
  .town-foot > [data-head-toast] { grid-area: toast; align-self: start; }
  .town-foot > [data-foot-hand] { grid-area: hand; }
  .town-foot > [data-foot-said] { grid-area: said; }
  .town-foot > [data-foot-dock] { grid-area: dock; }
  .town-foot > [data-foot-ctrl] { grid-area: ctrl; }
  .town-foot > [data-foot-right] { grid-area: right; position: relative; }
  .town-foot:has([data-foot="board"]) { z-index: 36; }
  .town-foot:has([data-foot="board"]) [data-foot="power"] { display: none; }
  .town-foot [data-foot="board"] > * { max-height: 100%; min-height: 0; }
  .town-foot [data-foot-dock] button { max-width: 100%; }
  .town-foot [data-foot-dock]:has(> [data-foot="board"]) > :is([data-foot="chip"], [data-foot="main"]) { display: none; }
  .town-foot[data-typing] > [data-foot-dock] { display: none; }
  @media (max-width: 63.999rem) {
    .town-foot:not([data-typing]):has([data-foot="board"]) { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr); grid-template-areas: "corner" "toast" "dock"; }
    .town-foot:not([data-typing]):has([data-foot="board"]) > :is([data-foot-hand], [data-foot-said], [data-foot-ctrl], [data-foot-right], [data-foot-powers]) { display: none; }
  }
  @media (min-width: 64rem) {
    .town-foot { grid-template-columns: minmax(16rem, 1fr) auto minmax(16rem, 1fr); grid-template-rows: auto minmax(0, 1fr) minmax(0, auto) auto; grid-template-areas: "corner toast ." "hand dock ." "said dock powers" "ctrl dock right"; }
    .town-foot > [data-head-toast] { justify-self: center; }
    .town-foot > [data-foot-powers] { align-self: end; justify-self: end; justify-content: flex-end; padding-bottom: .5rem; }
  }
`;

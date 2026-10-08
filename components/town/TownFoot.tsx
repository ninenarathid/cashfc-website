"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
 * - `toast`: what the town tells me for a moment, or holds out to me (thanks, water handed to me, a drink), in the
 *   middle.
 * - `corner`: what stays under the clock (a chat room folded away), on the left.
 *
 * `order` places a piece among the others of its place (a higher number is lower on the screen); `wide` is a board of
 * thirty rem. The map (Town.tsx) makes the places and gives them by `TownFootContext`; with no map about, nothing is
 * drawn. The layout itself is `FOOT_CSS`, which the map puts on the page.
 */
export type FootRank = "main" | "chip" | "note" | "board" | "side" | "toast" | "corner";
export interface FootPlaces { dock: HTMLElement | null; side: HTMLElement | null; head: HTMLElement | null; corner: HTMLElement | null }
export const TownFootContext = createContext<FootPlaces>({ dock: null, side: null, head: null, corner: null });

const ORDER: Record<FootRank, number> = { note: 10, chip: 30, main: 60, board: 60, side: 0, toast: 30, corner: 30 };

export default function TownFoot({ rank = "chip", order, wide = false, children }: { rank?: FootRank; order?: number; wide?: boolean; children: ReactNode }) {
  const places = useContext(TownFootContext);
  const into = rank === "side" ? places.side : rank === "toast" ? places.head : rank === "corner" ? places.corner : places.dock;
  if (!into) return null;
  return createPortal(
    <div data-foot={rank} style={{ order: order ?? ORDER[rank] }}
         className={`pointer-events-none flex max-w-full flex-col gap-2 ${rank === "side" || rank === "corner" ? "items-start" : "items-center"} ${rank === "board" ? (wide ? "w-[30rem]" : "w-[26rem]") : ""}`}>
      {children}
    </div>,
    into,
  );
}

/**
 * How it is laid out: one grid (`.town-foot`, the map's) for everything under the top row.
 *
 * Its pieces: what stays under the clock (`corner`) and what is told for a moment (`toast`) at the head; then the
 * chat's lines (`said`), the foot's column (`dock`), what is under the left thumb (`ctrl`: the belt, getting up, the
 * chat's box); and the buttons on the right (`right`), from the head to the foot.
 * - A narrow screen: everything but the buttons is one column, in that order, the lines' row taking what room is
 *   left (the lines come and go, and nothing to press moves when they do). The column is as wide as the buttons
 *   leave, so nothing in it can lie under them.
 * - From 64rem: three columns, the toasts and the dock in the middle of the screen, each side at least 16rem. The
 *   chat's box gives way before anything overlaps.
 * - `:has()` puts the rest of the foot away while a board is up (see `TownFoot`). A browser without it shows them
 *   still, above the board, never across it.
 * - While a phone's chat is typed in, the dock is put away: the keyboard has the room.
 */
export const FOOT_CSS = `
  .town-foot { display: grid; align-items: end; column-gap: 0.5rem; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto minmax(0, 1fr) auto auto; grid-template-areas: "corner right" "toast right" "said right" "dock right" "ctrl right"; }
  .town-foot > [data-head-corner] { grid-area: corner; align-self: start; justify-self: start; }
  .town-foot > [data-head-toast] { grid-area: toast; align-self: start; }
  .town-foot > [data-foot-said] { grid-area: said; }
  .town-foot > [data-foot-dock] { grid-area: dock; }
  .town-foot > [data-foot-ctrl] { grid-area: ctrl; }
  .town-foot > [data-foot-right] { grid-area: right; align-self: stretch; }
  .town-foot [data-foot-dock] button { max-width: 100%; }
  .town-foot [data-foot-dock]:has(> [data-foot="board"]) > :is([data-foot="chip"], [data-foot="main"]) { display: none; }
  .town-foot[data-typing] > [data-foot-dock] { display: none; }
  @media (max-width: 63.999rem) {
    .town-foot:not([data-typing]):has([data-foot="board"]) { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr); grid-template-areas: "corner" "toast" "dock"; }
    .town-foot:not([data-typing]):has([data-foot="board"]) > :is([data-foot-said], [data-foot-ctrl], [data-foot-right]) { display: none; }
  }
  @media (min-width: 64rem) {
    .town-foot { grid-template-columns: minmax(16rem, 1fr) auto minmax(16rem, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; grid-template-areas: "corner toast right" "said dock right" "ctrl dock right"; }
    .town-foot > [data-head-toast] { justify-self: center; }
  }
`;

/**
 * Faces a player can make for a moment, from the emote window (the owner, 2026-10-17: "expression ช่วยออกแบบ
 * เริ่มต้นมาซัก 5 แบบ"). Each is drawn on the shared head (lib/town/pixeldoll, the atlas's `expr`): the shy face keeps
 * the player's own eyes, the other four show their own eyes while they last.
 *
 * The room is told a number (`Doing.mood`): 0 for none, else the place in this list plus one. Only ever add at the
 * end, so that an older page reads the ones it knows. Pure, and with nothing brought in: lib/town/room reads it.
 */
export const EXPRESSIONS = [
  { id: "happy", th: "ยิ้ม", en: "Smile" },
  { id: "surprised", th: "ตกใจ", en: "Surprised" },
  { id: "sad", th: "เศร้า", en: "Sad" },
  { id: "pout", th: "งอน", en: "Pout" },
  { id: "shy", th: "เขิน", en: "Shy" },
] as const;

export type ExpressionId = (typeof EXPRESSIONS)[number]["id"];

/** How long a face lasts, in milliseconds: its maker's page puts it away after this. */
export const EXPRESSION_MS = 4000;

/** Whether a number may be told to the room as a face (0, none, included). */
export const isMood = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= EXPRESSIONS.length;

/** The face a room's number stands for, or null for none or for a number this page does not know. */
export const expressionOf = (n: unknown): ExpressionId | null =>
  isMood(n) && n > 0 ? EXPRESSIONS[n - 1].id : null;

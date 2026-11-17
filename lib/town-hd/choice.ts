/**
 * Whether this device draws the town's HD ground, and how much of it (the owner, 2026-11-17: "ช่วยทำให้ปรับได้ใน setting
 * เปิด ปิด 3d low mid high / default เป็น เปิด 3d high"). Kept on the device, as the town's other settings are
 * (lib/town/pace, lib/town/motion). This file brings in nothing of the 3D code: the settings read it without it.
 */
export type HdChoice = "off" | "low" | "mid" | "high";
export const HD_CHOICES: readonly HdChoice[] = ["off", "low", "mid", "high"];
const KEY = "cashTown:hd";

export function hdOf(kept: unknown): HdChoice {
  // ("1" and "0" were the trial's first switch, `/town?hd=1`)
  if (kept === "1") return "high";
  if (kept === "0") return "off";
  return HD_CHOICES.includes(kept as HdChoice) ? (kept as HdChoice) : "high";
}
export function keptHd(): HdChoice {
  try { return hdOf(localStorage.getItem(KEY)); } catch { return "high"; }
}
export function keepHd(choice: HdChoice): void {
  try { localStorage.setItem(KEY, choice); } catch { /* a private window: the choice lasts the visit */ }
}

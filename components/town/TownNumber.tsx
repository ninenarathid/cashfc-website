"use client";

import { useState } from "react";

/**
 * A box for a whole number between a least and a most (how many, a price): it can be emptied and typed anew.
 *
 * The boxes of the stall held up and of the notice board wrote the number back at every keystroke, never under one:
 * emptied, the box read 1 again at once, so a 1 could not be taken out to type 5, and what was typed after it made
 * 15 (a member on a phone, by way of the owner, 2026-10-08: "เล่นในมือถือจะปรับราคายากมาก เพราะมันไม่ให้ลบออกหมด จะใส่ 1 5
 * แล้วลบ 1 ออกก็ไม่ได้").
 *
 * While it is typed in, the box holds what is typed, digits only, and may be empty; the number it stands for is the
 * last whole one typed, held to the least and the most (a number over the most reads as the most at once, as before).
 * Leaving the box writes that number back. A tap into it marks all of it, so that typing takes its place. It is a
 * text box with a number pad (`inputMode`), not a number box: those keep their own half-typed text on a phone.
 */
export default function TownNumber({ value, min = 1, max, onChange, ...rest }: {
  value: number; min?: number; max: number; onChange: (n: number) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "min" | "max" | "onChange" | "type">) {
  /** What is typed, while the box has the keys; null when it shows the number itself. */
  const [typed, setTyped] = useState<string | null>(null);
  return (
    <input {...rest} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" enterKeyHint="done" min={min} max={max}
           value={typed ?? String(value)}
           onFocus={(e) => { setTyped(String(value)); e.currentTarget.select(); }}
           onBlur={() => setTyped(null)}
           onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
           onChange={(e) => {
             const digits = e.target.value.replace(/\D+/g, "").slice(0, 7), has = document.activeElement === e.target;
             if (digits === "") { setTyped(has ? "" : null); return; }
             const n = Math.max(min, Math.min(max, Number(digits)));
             // (over the most it reads as the most; under the least it is left as typed until the box is left: "0" may be the start of nothing, but "1" of "15")
             setTyped(has ? (Number(digits) > max ? String(max) : digits) : null);
             onChange(n);
           }} />
  );
}

/**
 * A fire's flames, drawn by the clock (the owner, 2026-10-03, of the cooking yard's fire: "ไฟตรงกลางลานอาหาร ช่วยทำให้มี
 * อนิเมชัน"): three tongues of square pixels, one inside the next, licking and leaning, and a few sparks going up. (x, y) is
 * the fire's foot on the screen, `k` the map's scale, `t` the clock (ms; 0 stands them still, and no sparks fly). Shared
 * by the forest camp's fire, the cooking fires (Town.tsx) and the editor's farm's fire bowls at night (TownLamps).
 */
export function drawPixelFlames(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, t: number) {
  const px = 2 * k;
  const tongues: Array<[string, number, number, number]> = [["#d9481c", 13, 15, 0], ["#f58a1f", 9, 12, 1.7], ["#ffd24a", 5, 8, 3.1]];
  for (const [colour, wide, tall, beat] of tongues) {
    ctx.fillStyle = colour;
    for (let r = 0; r < tall; r++) {
      const up = r / tall;
      const w = Math.max(1, Math.round(wide * (1 - up) ** 0.75 * (0.82 + 0.18 * Math.sin(t / 110 + r * 0.9 + beat))));
      const lean = Math.round((Math.sin(t / 170 + r * 0.45 + beat) * 1.6 + Math.sin(t / 61 + beat) * 0.7) * up);
      ctx.fillRect(Math.round(x + (lean - w / 2) * px), Math.round(y - (r + 1) * px), Math.ceil(w * px), Math.ceil(px));
    }
  }
  if (!t) return;
  for (let i = 0; i < 5; i++) {
    const life = (t / 1500 + i * 0.211) % 1;
    ctx.fillStyle = `rgba(255,${Math.round(205 - life * 90)},90,${(1 - life) * 0.9})`;
    ctx.fillRect(Math.round(x + (Math.sin(i * 12.9) * 9 + Math.sin(life * 6 + i) * 4) * k), Math.round(y - (26 + life * 52) * k), Math.ceil(px * 0.75), Math.ceil(px * 0.75));
  }
}

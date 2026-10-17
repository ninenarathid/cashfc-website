"use client";

import { useEffect, useRef } from "react";
import { EXPRESSIONS } from "@/lib/town/expression";
import type { Look } from "@/lib/town/look";
import type { PixelKit } from "@/lib/town/pixeldoll";

/**
 * The emote window's faces (the owner, 2026-10-17: lib/town/expression): one button a face, each showing the player's
 * own head making it, drawn from the doll's own pictures, so what is pressed is what the town will see.
 */
export function TownFaces({ look, kit, th, onPick }: { look: Look; kit: PixelKit | null; th: boolean; onPick: (mood: number) => void }) {
  return (
    // (three to a row on a phone, so the window stays on the screen over the emote button; one row of five wider)
    <div role="group" aria-label={th ? "สีหน้า" : "Faces"} className="grid grid-cols-[repeat(3,3.5rem)] gap-1.5 sm:flex">
      {EXPRESSIONS.map((e, i) => (
        <button key={e.id} type="button" role="menuitem" onClick={() => onPick(i + 1)} data-emote-face={e.id}
                className="pressable flex w-14 flex-col items-center gap-1 px-0.5 py-1.5 text-ui text-ink hover:bg-card">
          <Head look={look} kit={kit} expr={e.id} />
          {th ? e.th : e.en}
        </button>
      ))}
    </div>
  );
}

const SIZE = 46;

function Head({ look, kit, expr }: { look: Look; kit: PixelKit | null; expr: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext("2d");
    if (!c || !ctx || !kit) return;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    c.width = SIZE * dpr; c.height = SIZE * dpr;
    ctx.clearRect(0, 0, c.width, c.height);
    // the whole head as large as fits: hard pixels at a picture pixel to a screen pixel or more, smoothed below that
    const { w, h } = kit.headSize(look), k = Math.min(c.width / w, c.height / h);
    kit.drawHead(ctx, look, Math.round((c.width - w * k) / 2), Math.round((c.height - h * k) / 2), k, expr);
  }, [look, kit, expr]);
  return <canvas ref={ref} aria-hidden style={{ width: SIZE, height: SIZE, imageRendering: "pixelated" }} />;
}

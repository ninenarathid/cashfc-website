"use client";

import type { Keeper } from "@/lib/town/keeper";
import type { Sprite } from "@/lib/town/scenery";
import type { ShopRoomArt } from "@/lib/town/shop-room-art";

/**
 * What every window of Granny Twilla's clothes shop is given by the town (components/town/Town.tsx's panel `tailor` and
 * `auction`): the window that is built for each takes these, and the town opens and closes it.
 */
export interface ShopWindowProps {
  th: boolean;
  /** Whoever keeps the game for this page (null until it is ready, or where the game is not open to me). */
  keeper: Keeper | null;
  /** The town's own pixel art for a picture's name, once the scenery has come (Granny's portraits are `tk_granny`, `tk_granny_o`). */
  art: (name: string) => Sprite | null;
  phone: boolean;
  /**
   * What the shop's mannequin wears (lib/town/shop-room-art's `onMannequin`): a drawing given here is drawn over the
   * mannequin, in its place back to front among the walkers, on this page, until null is given. (Town.tsx keeps it after
   * the window closes; the week's auction outfits are to be shown there.)
   */
  dressMannequin: (draw: ShopRoomArt["onMannequin"]) => void;
  onClose: () => void;
}

/**
 * Granny Twilla's clothes (the owner, 2026-10-25): opened from a talk with her, "ดูเสื้อผ้า". A stand-in until the
 * shop's window is built: it says so.
 */
export default function TownTailor({ th, art, onClose }: ShopWindowProps) {
  return <ShopWindowSoon id="town-tailor-h" title={th ? "ร้านเสื้อผ้ายายทวิลล่า" : "Granny Twilla's clothes"} art={art}
    text={th ? "ยายกำลังจัดเสื้อผ้าขึ้นราวอยู่จ้ะ อีกไม่นานก็เลือกได้แล้ว" : "Granny is still putting the clothes out on the rails. Not long now, dearie."}
    th={th} onClose={onClose} />;
}

/** The look both stand-ins share: the shop's name with Granny's portrait, a line, and the town's Close. */
export function ShopWindowSoon({ id, title, text, art, th, onClose }: { id: string; title: string; text: string; art: ShopWindowProps["art"]; th: boolean; onClose: () => void }) {
  const face = art("tk_granny");
  return (
    <section aria-labelledby={id} className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Face sprite={face} box={36} />
        <h2 id={id} className="font-display text-title font-semibold text-ink">{title}</h2>
        <button type="button" onClick={onClose}
                className="pressable ml-auto min-h-11 rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
          {th ? "ปิด" : "Close"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
        <p className="rounded-xl border border-line bg-card/60 px-3 py-2.5 text-read text-ink">{text}</p>
        <p className="mt-2 text-meta text-muted">{th ? "เร็วๆ นี้" : "Coming soon"}</p>
      </div>
    </section>
  );
}

/** A picture of the town's pixel art, whole and crisp, in a square box (as the Popoto Board draws its own). */
function Face({ sprite, box }: { sprite: Sprite | null; box: number }) {
  if (!sprite) return <span aria-hidden className="shrink-0" style={{ width: box, height: box }} />;
  const [x, y, w, h] = sprite.at, k = box / Math.max(w, h);
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: box, height: box }}>
      <span style={{
        width: w * k, height: h * k, backgroundImage: `url(${sprite.src})`,
        backgroundSize: `${sprite.sheet[0] * k}px ${sprite.sheet[1] * k}px`, backgroundPosition: `${-x * k}px ${-y * k}px`,
        imageRendering: "pixelated",
      }} />
    </span>
  );
}

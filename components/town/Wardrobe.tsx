"use client";

import {
  BROWS, EYES, EYE_COLORS, GENDERS, HAIRS, HAIR_COLORS, MOUTHS, OUTFITS, SKINS, randomLook,
  type Look, type Named, type Swatch,
} from "@/lib/town/look";

/**
 * The wardrobe: how your avatar looks, changed as you go.
 *
 * There is no preview of its own. While it is open the town's camera comes
 * close to your avatar and turns it to face you, so what you try on is what
 * everybody else will see, standing in the town. The room hears about it once
 * you stop changing things (TownSession.setLook).
 *
 * Every choice is free and can be changed back at any time: no unlocking, no
 * cost (the owner's call for the first version, 2026-10-01).
 */
export default function Wardrobe({ look, onChange, onTurn, onClose, th }: {
  look: Look;
  onChange: (look: Look) => void;
  /** Turn the avatar to see its side or back: -1 one way, 1 the other. */
  onTurn: (dir: -1 | 1) => void;
  onClose: () => void;
  th: boolean;
}) {
  const set = (patch: Partial<Look>) => onChange({ ...look, ...patch });
  const t = (n: Named | Swatch) => (th ? n.th : n.en);

  return (
    <section aria-labelledby="wardrobe-h" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <h2 id="wardrobe-h" className="font-display text-title font-semibold text-ink">👕 {th ? "แต่งตัว" : "Wardrobe"}</h2>
        <button type="button" onClick={() => onChange(randomLook())}
                className="pressable ml-auto rounded-full border border-line-strong px-3 py-1.5 text-ui text-ink hover:border-accent hover:text-accent">
          🎲 {th ? "สุ่ม" : "Surprise me"}
        </button>
        <button type="button" onClick={onClose}
                className="pressable rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
          {th ? "เสร็จ" : "Done"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
        <p className="text-meta text-muted">
          {th ? "เปลี่ยนได้ตลอด ทุกคนในเมืองเห็นทันที · ตอนนี้มีแค่ Lalafell เผ่าอื่นตามมาเร็วๆ นี้"
            : "Change it any time; everyone in town sees it. Lalafell only for now, more races soon."}
        </p>

        <Group label={th ? "หมุนตัวดู" : "Turn around"}>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => onTurn(-1)} aria-label={th ? "หมุนซ้าย" : "Turn left"}
                    className="pressable grid size-9 place-items-center rounded-full border border-line-strong text-read text-ink hover:border-accent">⟲</button>
            <button type="button" onClick={() => onTurn(1)} aria-label={th ? "หมุนขวา" : "Turn right"}
                    className="pressable grid size-9 place-items-center rounded-full border border-line-strong text-read text-ink hover:border-accent">⟳</button>
          </div>
        </Group>

        <Choices label={th ? "เพศ" : "Body"} items={GENDERS} value={look.gender} t={t} onPick={(gender) => set({ gender })} />
        <Choices label={th ? "ทรงผม" : "Hairstyle"} items={HAIRS} value={look.hair} t={t} onPick={(hair) => set({ hair })} />
        <Swatches label={th ? "สีผม" : "Hair colour"} items={HAIR_COLORS} value={look.hairColor} t={t} onPick={(hairColor) => set({ hairColor })} />
        <Choices label={th ? "ตา" : "Eyes"} items={EYES} value={look.eyes} t={t} onPick={(eyes) => set({ eyes })} />
        <Swatches label={th ? "สีตา" : "Eye colour"} items={EYE_COLORS} value={look.eyeColor} t={t} onPick={(eyeColor) => set({ eyeColor })} />
        <Choices label={th ? "คิ้ว" : "Brows"} items={BROWS} value={look.brow} t={t} onPick={(brow) => set({ brow })} />
        <Choices label={th ? "ปาก" : "Mouth"} items={MOUTHS} value={look.mouth} t={t} onPick={(mouth) => set({ mouth })} />
        <Swatches label={th ? "ผิว" : "Skin"} items={SKINS} value={look.skin} t={t} onPick={(skin) => set({ skin })} />
        <Swatches label={th ? "สีชุด" : "Outfit colour"} items={OUTFITS} value={look.outfit} t={t} onPick={(outfit) => set({ outfit })} />

        <Group label={th ? "แก้มแดง" : "Blush"}>
          <button type="button" role="switch" aria-checked={look.blush} onClick={() => set({ blush: !look.blush })}
                  className={`pressable rounded-full px-3 py-1.5 text-ui ${look.blush ? "bg-accent/20 text-accent" : "border border-line-strong text-muted"}`}>
            {look.blush ? (th ? "มี" : "On") : (th ? "ไม่มี" : "Off")}
          </button>
        </Group>
      </div>
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 font-data text-label uppercase tracking-wider text-muted">{label}</div>
      {children}
    </div>
  );
}

function Choices({ label, items, value, onPick, t }: {
  label: string; items: Named[]; value: number; onPick: (i: number) => void; t: (n: Named) => string;
}) {
  return (
    <Group label={label}>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {items.map((n, i) => (
          <button key={n.id} type="button" aria-pressed={i === value} onClick={() => onPick(i)}
                  className={`pressable rounded-full px-3 py-1.5 text-ui transition-colors ${i === value
                    ? "bg-accent/20 font-semibold text-accent ring-1 ring-accent/60"
                    : "border border-line-strong text-ink hover:border-accent"}`}>
            {t(n)}
          </button>
        ))}
      </div>
    </Group>
  );
}

function Swatches({ label, items, value, onPick, t }: {
  label: string; items: Swatch[]; value: number; onPick: (i: number) => void; t: (n: Swatch) => string;
}) {
  return (
    <Group label={`${label} · ${t(items[value])}`}>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {items.map((c, i) => (
          <button key={c.hex + i} type="button" aria-pressed={i === value} aria-label={t(c)} title={t(c)} onClick={() => onPick(i)}
                  style={{ background: c.hex }}
                  className={`pressable size-8 rounded-full ring-offset-2 ring-offset-surface transition-shadow ${i === value
                    ? "ring-2 ring-accent" : "ring-1 ring-inset ring-black/25 hover:ring-2 hover:ring-line-strong"}`} />
        ))}
      </div>
    </Group>
  );
}

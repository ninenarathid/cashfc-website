"use client";

import {
  EYES, EYE_COLORS, GENDERS, HAIR_COLORS, RACES, hairForGender, hairsFor, hairsOf, lookAsRace, randomLook, skinsOf,
  type Look, type Named, type Swatch,
} from "@/lib/town/look";
import TownIcon from "./TownIcon";

/**
 * The wardrobe: how your avatar looks, changed as you go.
 *
 * There is no preview of its own. While it is open the town's camera comes
 * close to your avatar, so what you try on is what everybody else will see,
 * standing in the town. The room hears about it once you stop changing things
 * (TownSession.setLook).
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
        <h2 id="wardrobe-h" className="font-display text-title font-semibold text-ink"><span className="flex items-center gap-2"><TownIcon name="wardrobe" size={22} />{th ? "แต่งตัว" : "Wardrobe"}</span></h2>
        <button type="button" onClick={() => onChange(randomLook(look.race))}
                className="pressable ml-auto rounded-full border border-line-strong px-3 py-1.5 text-ui text-ink hover:border-accent hover:text-accent">
          <span className="flex items-center gap-1.5"><TownIcon name="dice" size={16} />{th ? "สุ่ม" : "Surprise me"}</span>
        </button>
        <button type="button" onClick={onClose}
                className="pressable rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
          {th ? "เสร็จ" : "Done"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">

        <Group label={th ? "หมุนตัวดู" : "Turn around"}>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => onTurn(-1)} aria-label={th ? "หมุนซ้าย" : "Turn left"}
                    className="pressable grid size-9 place-items-center rounded-full border border-line-strong text-read text-ink hover:border-accent"><TownIcon name="turnLeft" size={18} /></button>
            <button type="button" onClick={() => onTurn(1)} aria-label={th ? "หมุนขวา" : "Turn right"}
                    className="pressable grid size-9 place-items-center rounded-full border border-line-strong text-read text-ink hover:border-accent"><TownIcon name="turnRight" size={18} /></button>
          </div>
        </Group>

        {/* The game's races: each opens when its pictures are made; the rest are there, locked. */}
        <Group label={th ? "เผ่า" : "Race"}>
          <div role="group" aria-label={th ? "เผ่า" : "Race"} className="flex flex-wrap gap-1.5">
            {RACES.map((r, i) => r.open ? (
              <button key={r.id} type="button" aria-pressed={look.race === i} onClick={() => onChange(lookAsRace(look, i))}
                      className={`pressable rounded-full px-3 py-1.5 text-ui ${look.race === i
                        ? "bg-accent/20 font-semibold text-accent ring-1 ring-accent/60" : "border border-line-strong text-ink hover:border-accent"}`}>
                {t(r)}
              </button>
            ) : (
              <button key={r.id} type="button" disabled aria-disabled="true"
                      title={th ? "ยังไม่เปิด เร็วๆ นี้" : "Not open yet, coming soon"}
                      className="inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-ui text-muted opacity-70">
                <TownIcon name="lock" size={13} />{t(r)}
                <span className="sr-only">{th ? " (ยังไม่เปิด)" : " (locked)"}</span>
              </button>
            ))}
          </div>
        </Group>

        <Choices label={th ? "เพศ" : "Body"} items={GENDERS} value={look.gender} t={t}
                 onPick={(gender) => set({ gender, hair: hairForGender(look.hair, gender, look.race) })} />
        {/* The game's character creator's own hairstyles, each race and gender its own list. */}
        <Choices label={th ? "ทรงผม" : "Hairstyle"} items={hairsOf(look.race)} only={hairsFor(look.gender, look.race)} value={look.hair} t={t} onPick={(hair) => set({ hair })} />
        <Swatches label={th ? "สีผม" : "Hair colour"} items={HAIR_COLORS} value={look.hairColor} t={t} onPick={(hairColor) => set({ hairColor })} />
        <Swatches label={th ? "สีผิว" : "Skin"} items={skinsOf(look.race)} value={look.skin} t={t} onPick={(skin) => set({ skin })} />
        <Choices label={th ? "ทรงตา" : "Eyes"} items={EYES} value={look.eyes} t={t} onPick={(eyes) => set({ eyes })} />
        <Swatches label={th ? "สีตา" : "Eye colour"} items={EYE_COLORS} value={look.eyeColor} t={t} onPick={(eyeColor) => set({ eyeColor })} />
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

function Choices({ label, items, only, value, onPick, t }: {
  label: string; items: Named[]; value: number; onPick: (i: number) => void; t: (n: Named) => string;
  /** Only these indices of items, in this order. */
  only?: number[];
}) {
  return (
    <Group label={label}>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {(only ?? items.map((_, i) => i)).map((i) => [i, items[i]] as const).map(([i, n]) => (
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

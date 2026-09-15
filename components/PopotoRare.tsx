"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  TIER_FX, TIER_LOOK, openRare, senderName, tintFor, type Flavor, type RareGift,
} from "@/lib/popoto-rare";
import { fmtDate } from "@/lib/dates";
import { useLang } from "@/lib/i18n";
import GiftIcon from "@/components/ui/GiftIcon";

/**
 * What the popoto is, drawn: the flavour's picture where an admin has uploaded
 * one, and until then the potato itself, tinted to the flavour's colour. The
 * stand-in is deliberate rather than a placeholder — a flavour made this
 * evening is a flavour somebody can receive this evening.
 */
export function FlavorArt({ flavor, size }: { flavor: Flavor; size: number }) {
  if (flavor.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={flavor.image} alt="" width={size} height={size}
           style={{ width: size, height: size }}
           className="object-contain" />
    );
  }
  return (
    <span style={{ fontSize: size * 0.9, lineHeight: 1, filter: tintFor(flavor.color) }}>
      🥔
    </span>
  );
}

/** The tier, as a word on a band of its colour. Ultra shimmers. */
export function TierBadge({ tier, small = false }: { tier: Flavor["tier"]; small?: boolean }) {
  const look = TIER_LOOK[tier];

  /*
   * The corner of a tile on the shelf: two letters, as a card game prints
   * them. "SUPER RARE" at nine pixels folded onto two lines and sat across the
   * potato it was meant to label; SR and UR are what these are called anyway,
   * and a solid chip reads at that size where a tinted outline does not.
   */
  if (small) {
    return (
      <span className={`inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-[1px] font-data text-[10px] font-extrabold leading-none tracking-[0.06em] shadow-md shadow-black/50 ${
        tier === "ultra" ? "rare-ultra-chip text-[#2a1600]" : "text-white"}`}
            style={tier === "ultra" ? undefined : {
              background: `linear-gradient(135deg, ${look.color}, ${look.color}b3)`,
              boxShadow: `0 0 0 1px ${look.color}66, 0 2px 6px rgba(0,0,0,.45)`,
            }}>
        {look.short}
      </span>
    );
  }

  /*
   * On the card, the word in full: a band with the tier's colour running through
   * it and a fine light edge. Ultra's band is gold that slowly turns through
   * the spectrum, so the rarest one is the one that looks it.
   */
  return (
    <span className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1 font-display text-[12.5px] font-extrabold uppercase italic tracking-[0.16em] ${
      tier === "ultra" ? "rare-ultra-chip text-[#2a1600]" : "text-white"}`}
          style={tier === "ultra" ? undefined : {
            background: `linear-gradient(90deg, ${look.color}d9, ${look.color}, ${look.color}d9)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,.35), 0 0 14px ${look.color}66`,
            textShadow: "0 1px 2px rgba(0,0,0,.35)",
          }}>
      <span aria-hidden className="text-[10px] not-italic">
        {tier === "ultra" ? "✦✦✦" : tier === "super" ? "✦✦" : "✦"}
      </span>
      {look.label}
    </span>
  );
}

/**
 * Unwrapping a rare popoto.
 *
 * Three moments, and the page waits at each one for the person rather than
 * running through them: the parcel, which shakes a little and waits to be
 * opened; the opening, where the paper splits and falls away and the potato
 * rises into the light; and the line inside, from somebody in the Free
 * Company, which stays until they close it.
 *
 * A gift already opened opens straight to the line. The unwrapping is the
 * surprise, and the surprise happens once; going back to read it from the
 * shelf on their profile is going back to read it.
 *
 * `preview` is for trying it out: a gift handed in whole, with nothing asked
 * of the database and nothing marked as opened.
 */
export default function PopotoRare(
  { giftId, from, opened = false, preview, onClose, onOpened }: {
    giftId?: number;
    /** Who sent the popoto, where the caller already knows. */
    from?: string | null;
    /** Unwrapped before: open straight to the line, without the ceremony. */
    opened?: boolean;
    preview?: RareGift;
    onClose: () => void;
    onOpened?: (g: RareGift) => void;
  },
) {
  const { t, lang } = useLang();
  const bowId = `bow${useId().replace(/:/g, "")}`;
  const [supabase] = useState(createClient);
  const [gift, setGift] = useState<RareGift | null>(null);
  // Opened before: never show the parcel, not even for the moment it takes to
  // fetch the line — a wrapped gift that then pops open by itself is a gift
  // that looked like it was unwrapped for them.
  const [stage, setStage] = useState<"wrapped" | "charging" | "opening" | "open">(
    opened ? "open" : "wrapped");
  // Whether it was unwrapped just now. Reading an opened one again from the
  // shelf keeps the light and the stars, but not the flash and the shockwaves:
  // those are the moment it opened, and that moment has happened.
  const [ceremony, setCeremony] = useState(false);
  const [sender, setSender] = useState<string | null>(from ?? null);
  const [err, setErr] = useState<string | null>(null);

  /*
   * An opened gift goes straight to its line. Asking for it a second time does
   * not move when it was first opened; see open_rare_popoto.
   */
  useEffect(() => {
    if (!opened) return;
    if (preview) { setGift(preview); setStage("open"); return; }
    if (!supabase || giftId == null) return;
    void openRare(supabase, giftId).then((g) => {
      if ("error" in g) { setErr(g.error); return; }
      setGift(g);
      setStage("open");
    });
  }, [opened, preview, supabase, giftId]);

  useEffect(() => {
    if (sender || !supabase || !preview?.senderId) return;
    void senderName(supabase, preview.senderId).then(setSender);
  }, [sender, supabase, preview?.senderId]);

  // Two things on the screen unwrap it (the parcel and the button), and the
  // stage only moves once the gift has come back — so a quick double press
  // would start two openings on top of each other. This closes the door at the
  // first press. And the openings' timers go with the dialog if it is closed
  // halfway through one.
  const unwrapping = useRef(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach((id) => window.clearTimeout(id)); }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const unwrap = async () => {
    if (stage !== "wrapped" || unwrapping.current) return;
    unwrapping.current = true;
    setErr(null);
    let g: RareGift | { error: string };
    if (preview) {
      g = preview;
    } else if (supabase && giftId != null) {
      g = await openRare(supabase, giftId);
    } else {
      unwrapping.current = false;
      return;
    }
    if ("error" in g) { setErr(g.error); unwrapping.current = false; return; }
    setGift(g);
    if (!sender && supabase && g.senderId) {
      void senderName(supabase, g.senderId).then(setSender);
    }
    onOpened?.(g);
    setCeremony(true);
    // The rarer ones strain first: the parcel shakes harder and harder with
    // light pouring out of the seams, and only then gives.
    const fx = TIER_FX[g.tier];
    const burst = () => {
      setStage("opening");
      later(() => setStage("open"), fx.open);
    };
    if (fx.charge) {
      setStage("charging");
      later(burst, fx.charge);
    } else {
      burst();
    }
  };

  // What it turned out to be decides how the opening looks: the tier sets how
  // much bursts out, the flavour its colour. Until it is open, gold.
  const tier = gift?.tier ?? "rare";
  const look = TIER_LOOK[tier];
  const fx = TIER_FX[tier];
  const hue = gift?.color ?? look.color;
  // Ultra's light is every colour; the others are their flavour's.
  const ultra = tier === "ultra";

  // Crumbs thrown out from behind the potato in a ring. Fixed per tier rather
  // than re-rolled on every render, so they do not jump.
  const crumbs = useMemo(() => Array.from({ length: look.crumbs }, (_, i) => {
    const a = (i / look.crumbs) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
    const r = (90 + (i % 4) * 34) * fx.reach;
    return { dx: `${Math.cos(a) * r}px`, dy: `${Math.sin(a) * r}px`,
             size: (6 + (i % 3) * 3) * (ultra ? 1.4 : 1), light: i % 3 === 0,
             delay: (i % 5) * 40 };
  }), [look.crumbs, fx.reach, ultra]);

  // Sparkles around it, on a loose ring that reaches as far as the light does.
  const stars = useMemo(() => Array.from({ length: fx.stars }, (_, i) => {
    const a = i * 2.39996; // the golden angle, so they never line up
    const r = 105 + ((i * 37) % 100) / 100 * (fx.raySize / 2 - 110);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, size: 12 + (i % 4) * 6,
             delay: (i * 173) % 1600, light: i % 2 === 0 };
  }), [fx.stars, fx.raySize]);

  const revealed = stage === "opening" || stage === "open";
  const burstNow = ceremony && revealed;
  const rainbow = "#ff6b6b, #ffd166, #6bff95, #6bc7ff, #b18cff, #ff7ad9, #ff6b6b";

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="pop-in fixed inset-0 z-[120] bg-bg/90 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined}
                        className={`pop-in fixed inset-0 z-[121] flex flex-col items-center justify-center gap-6 overflow-y-auto overflow-x-hidden p-5 outline-none ${
                          burstNow && fx.shake ? `rare-shake-${fx.shake}` : ""}`}>
          <Dialog.Title className="sr-only">{t("rare.title")}</Dialog.Title>

          {/* ── the whole screen: washed in its colour, and the flash ───── */}
          {revealed && fx.aura > 0 && (
            <span aria-hidden
                  className={`rare-aura pointer-events-none fixed inset-0 -z-10 ${ultra ? "rare-ultra-glow" : ""}`}
                  style={{ ["--aura" as string]: fx.aura,
                           background: `radial-gradient(circle at 50% 38%, ${hue} 0%, ${hue}55 28%, transparent 70%)` }} />
          )}
          {burstNow && (
            <span aria-hidden className="rare-flash pointer-events-none fixed inset-0 z-10"
                  style={{ ["--flash" as string]: fx.flash,
                           background: `radial-gradient(circle at 50% 38%, #ffffff 0%, #fffaf0 35%, ${hue} 100%)`,
                           animationDuration: `${ultra ? 1500 : 900}ms` }} />
          )}

          {/* ── the parcel, and what is in it ───────────────────────────── */}
          <div className={`relative grid size-56 place-items-center ${revealed ? "rare-open" : ""}`}>
            {/* Straining: light pours out of the seams, harder the rarer. */}
            {stage === "charging" && (
              <>
                <span aria-hidden className="rare-seam absolute inset-y-[-12%] left-1/2 z-10 w-2 rounded-full bg-white"
                      style={{ boxShadow: `0 0 24px 10px ${hue}, 0 0 70px 30px ${hue}aa`,
                               animationDuration: `${fx.charge}ms` }} />
                <span aria-hidden className="rare-seam absolute inset-x-[-12%] top-1/2 z-10 h-2 rounded-full bg-white"
                      style={{ boxShadow: `0 0 24px 10px ${hue}, 0 0 70px 30px ${hue}aa`,
                               animationDuration: `${fx.charge}ms` }} />
                <span aria-hidden className={`rare-charge-glow absolute inset-[-30%] rounded-full ${ultra ? "rare-ultra-glow" : ""}`}
                      style={{ background: `radial-gradient(circle, ${hue}cc 0%, ${hue}44 40%, transparent 70%)`,
                               animationDuration: `${fx.charge}ms` }} />
              </>
            )}

            {revealed && (
              <>
                {/* Spokes of light turning behind it. Ultra's are every colour. */}
                <span aria-hidden
                      className={`${ceremony ? "rare-rays" : "rare-rays-still"} pointer-events-none absolute left-1/2 top-1/2 rounded-full ${ultra ? "rare-ultra-glow" : ""}`}
                      style={{
                        width: `min(${fx.raySize}px, 96vw)`, height: `min(${fx.raySize}px, 96vw)`,
                        ["--rays-o" as string]: ultra ? 1 : tier === "super" ? .85 : .6,
                        ["--rays-speed" as string]: ultra ? "14s" : tier === "super" ? "20s" : "28s",
                        background: ultra
                          ? `repeating-conic-gradient(from 0deg, transparent 0deg ${360 / fx.rays / 2}deg, rgba(255,255,255,.9) ${360 / fx.rays / 2}deg ${360 / fx.rays}deg), conic-gradient(${rainbow})`
                          : `repeating-conic-gradient(from 0deg, transparent 0deg ${360 / fx.rays / 2}deg, ${hue}cc ${360 / fx.rays / 2}deg ${360 / fx.rays}deg)`,
                        backgroundBlendMode: ultra ? "multiply" : undefined,
                        WebkitMaskImage: "radial-gradient(circle, #000 12%, rgba(0,0,0,.5) 35%, transparent 70%)",
                        maskImage: "radial-gradient(circle, #000 12%, rgba(0,0,0,.5) 35%, transparent 70%)",
                      }} />
                <span aria-hidden
                      className={`rare-glow absolute rounded-full ${ultra ? "rare-ultra-glow" : ""}`}
                      style={{ inset: `${-20 * fx.reach}%`,
                               background: `radial-gradient(circle, #fff8 0%, ${hue}bb 18%, ${hue}33 48%, transparent 70%)` }} />

                {/* Shockwaves, at the moment it opened. */}
                {burstNow && Array.from({ length: fx.rings }, (_, i) => (
                  <span key={`ring${i}`} aria-hidden
                        className="rare-ring pointer-events-none absolute left-1/2 top-1/2 size-32 rounded-full border-4"
                        style={{ borderColor: i % 2 && ultra ? "#fff" : hue,
                                 boxShadow: `0 0 24px ${hue}, inset 0 0 18px ${hue}`,
                                 animationDelay: `${260 + i * 170}ms`,
                                 ["--ring-scale" as string]: 3 + fx.reach * 2.2 + i * .8 }} />
                ))}
                {burstNow && crumbs.map((c, i) => (
                  <span key={i} aria-hidden
                        className="rare-burst absolute left-1/2 top-1/2 rounded-full"
                        style={{ width: c.size, height: c.size,
                                 background: c.light ? "#fff4d6" : ultra ? `hsl(${(i * 47) % 360} 95% 65%)` : hue,
                                 boxShadow: `0 0 ${c.size}px ${c.light ? "#fff" : hue}`,
                                 animationDelay: `${300 + c.delay}ms`,
                                 ["--dx" as string]: c.dx, ["--dy" as string]: c.dy }} />
                ))}

                {/* Sparkles that stay. */}
                {stars.map((s, i) => (
                  <span key={`star${i}`} aria-hidden
                        className="rare-twinkle pointer-events-none absolute left-1/2 top-1/2 leading-none"
                        style={{ fontSize: s.size, marginLeft: s.x, marginTop: s.y,
                                 color: s.light ? "#fffbe8" : ultra ? `hsl(${(i * 61) % 360} 100% 75%)` : hue,
                                 textShadow: `0 0 10px ${hue}, 0 0 20px ${hue}`,
                                 animationDelay: `${(ceremony ? 500 : 0) + s.delay}ms` }}>
                    ✦
                  </span>
                ))}

                {gift && (
                  <span aria-hidden className="rare-rise relative grid place-items-center"
                        style={{ filter: `drop-shadow(0 0 ${ultra ? 34 : tier === "super" ? 26 : 18}px ${hue}) drop-shadow(0 0 6px #fff8)` }}>
                    <FlavorArt flavor={gift} size={ultra ? 150 : tier === "super" ? 135 : 120} />
                  </span>
                )}
              </>
            )}

            {/* Brown paper in two halves, tied with a red ribbon. Kept on the
                page through the opening so the halves have somewhere to fall
                from; gone once the line is up. */}
            {stage !== "open" && (
              <button type="button" onClick={() => void unwrap()}
                      aria-label={t("rare.unwrap")}
                      className={`absolute inset-0 ${
                        stage === "wrapped" ? "rare-wobble cursor-pointer"
                        : stage === "charging" ? "rare-charge pointer-events-none" : "pointer-events-none"}`}
                      style={stage === "charging" ? { ["--charge" as string]: `${fx.charge}ms` } : undefined}>
                <span className="rare-flap-l absolute inset-y-0 left-0 w-1/2 rounded-l-2xl border border-r-0 border-[#8a6a3f]"
                      style={{ background: "repeating-linear-gradient(135deg,#b9915a 0 10px,#b08850 10px 20px)" }} />
                <span className="rare-flap-r absolute inset-y-0 right-0 w-1/2 rounded-r-2xl border border-l-0 border-[#8a6a3f]"
                      style={{ background: "repeating-linear-gradient(45deg,#b9915a 0 10px,#b08850 10px 20px)" }} />
                <span className="rare-ribbon absolute inset-y-0 left-1/2 w-5 -translate-x-1/2 bg-[#c0392b] shadow-inner" />
                <span className="rare-ribbon absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 bg-[#c0392b] shadow-inner" />
                {/* The bow, cut from the same drawing as the icon in the bell, so
                    the parcel on screen is the one that was promised there. */}
                <span className="rare-ribbon absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[62%] drop-shadow-lg">
                  <svg viewBox="7 4 18 9" width={88} height={44} aria-hidden>
                    <defs>
                      <linearGradient id={bowId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ef5a45" />
                        <stop offset="1" stopColor="#b8321f" />
                      </linearGradient>
                    </defs>
                    <path d="M16 10.2 C12.6 4.6 7.2 5.2 8 8.6 C8.6 11 12.4 10.9 16 10.2 Z" fill={`url(#${bowId})`} />
                    <path d="M16 10.2 C19.4 4.6 24.8 5.2 24 8.6 C23.4 11 19.6 10.9 16 10.2 Z" fill={`url(#${bowId})`} />
                    <path d="M11.4 7.6 C12.6 7.4 14.2 8.6 15 9.8" stroke="#8f2415" strokeWidth=".7" fill="none" opacity=".55" />
                    <path d="M20.6 7.6 C19.4 7.4 17.8 8.6 17 9.8" stroke="#8f2415" strokeWidth=".7" fill="none" opacity=".55" />
                    <ellipse cx="16" cy="10.3" rx="2.2" ry="1.8" fill="#d6402c" />
                    <ellipse cx="15.4" cy="9.8" rx=".8" ry=".5" fill="#fff" opacity=".45" />
                  </svg>
                </span>
              </button>
            )}
          </div>

          {/* ── the words ───────────────────────────────────────────────── */}
          {/* Kept up while it strains, so nothing below it jumps. */}
          {stage === "wrapped" || stage === "charging" ? (
            <div className={`flex flex-col items-center gap-3 text-center transition-opacity ${
                   stage === "charging" ? "pointer-events-none opacity-40" : ""}`}>
              <p className="text-[15px] text-ink/90">
                {sender ? t("rare.fromSender", { who: sender }) : t("rare.fromSomebody")}
              </p>
              <button type="button" onClick={() => void unwrap()}
                      className="inline-flex items-center gap-2 rounded-xl border border-gold/60 bg-gold/15 py-2.5 pl-4 pr-6 text-[16px] font-semibold text-gold hover:bg-gold/25">
                <GiftIcon size={24} />
                {t("rare.unwrap")}
              </button>
              {err && <p className="text-[13.5px] text-chili">{err}</p>}
            </div>
          ) : gift && (
            <figure className="rare-card relative z-20 flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border bg-surface/95 px-6 py-5 text-center shadow-2xl shadow-black/50"
                    style={{ borderColor: `${hue}${ultra ? "" : tier === "super" ? "b3" : "73"}`,
                             boxShadow: `0 0 ${ultra ? 60 : tier === "super" ? 34 : 16}px ${hue}${ultra ? "88" : "55"}, 0 25px 50px -12px rgba(0,0,0,.5)` }}>
              <TierBadge tier={gift.tier} />
              {/* The flavour's own full name, as the keeper wrote it — "Popoto
                  รสส้ม", "Orange Popoto" — rather than a name wrapped in a
                  pattern that only suits one language's word order. */}
              {gift.name && (
                <p className="font-display text-[20px] font-semibold" style={{ color: hue }}>
                  {(lang === "en" ? gift.nameEn : null) || gift.name}
                </p>
              )}
              <blockquote className="whitespace-pre-wrap text-[18px] leading-relaxed text-ink">
                “{gift.body}”
              </blockquote>
              <figcaption className="text-[14.5px] text-gold">
                —{" "}
                {gift.authorCharacterId != null ? (
                  <Link href={`/member/${gift.authorCharacterId}`} onClick={onClose}
                        className="text-gold no-underline hover:underline">
                    {gift.authorName}
                  </Link>
                ) : gift.authorName}
              </figcaption>
              <p className="font-data text-[11.5px] text-muted">
                {sender ? t("rare.fromSender", { who: sender }) : t("rare.fromSomebody")}
                {" · "}{fmtDate(gift.at)}
              </p>
            </figure>
          )}

          {stage === "open" && (
            <Dialog.Close className="rounded-lg border border-line px-5 py-2 text-[15px] text-muted hover:border-muted hover:text-ink">
              {t("common.close")}
            </Dialog.Close>
          )}

          <Dialog.Close aria-label={t("common.close")}
                        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-line bg-bg/85 text-muted hover:border-accent hover:text-accent">
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


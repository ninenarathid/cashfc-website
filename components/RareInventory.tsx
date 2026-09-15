"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  RARE_INVENTORY_ID, SHOWCASE_MAX, TIER_LOOK, openedLines, raresFor, setShowcase, showcaseFor,
  type RareGift, type RareSlot,
} from "@/lib/popoto-rare";
import PopotoRare, { FlavorArt, TierBadge } from "@/components/PopotoRare";
import { fmtDate } from "@/lib/dates";
import { useLang } from "@/lib/i18n";
import GiftIcon from "@/components/ui/GiftIcon";
import * as HoverCard from "@radix-ui/react-hover-card";

type Line = { body: string; authorName: string; authorCharacterId: number | null };

/**
 * Everything about one gift, on hover: what it is, its line and who wrote it,
 * and when it came. A parcel says only that it is one and when it came —
 * hovering is not a way to look inside.
 */
function GiftCard(
  { slot, line }: {
    slot: Pick<RareSlot, "tier" | "name" | "nameEn" | "color" | "image" | "openedAt" | "at">;
    line?: Line;
  },
) {
  const { t, lang } = useLang();
  const look = TIER_LOOK[slot.tier];
  if (!slot.openedAt) {
    return (
      <div className="flex w-60 items-center gap-3 rounded-xl border border-gold/60 bg-surface px-3.5 py-3 shadow-2xl shadow-black/50">
        <GiftIcon size={44} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[14px] font-semibold text-gold">{t("rare.cardWrapped")}</span>
          <span className="text-[12px] leading-snug text-muted">{t("rare.cardSecret")}</span>
          <span className="mt-1 text-[11.5px] text-muted">
            {t("rare.cardGot")} {fmtDate(slot.at)}
          </span>
        </div>
      </div>
    );
  }
  const name = (lang === "en" ? slot.nameEn : null) || slot.name;
  return (
    <div className="flex w-72 flex-col gap-2.5 rounded-xl border-2 bg-surface p-3.5 shadow-2xl shadow-black/50"
         style={{ borderColor: look.color }}>
      <div className="flex items-center gap-3">
        <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-bg/50">
          <FlavorArt flavor={slot} size={56} />
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <TierBadge tier={slot.tier} small />
          {name && (
            <span className="text-[15px] font-semibold leading-snug"
                  style={{ color: slot.color ?? look.color }}>
              {name}
            </span>
          )}
        </div>
      </div>
      {line ? (
        <>
          <blockquote className="whitespace-pre-wrap border-l-2 pl-2.5 text-[13px] leading-relaxed text-ink"
                      style={{ borderColor: `${look.color}99` }}>
            {line.body}
          </blockquote>
          <span className="text-right text-[12px] font-medium text-gold">— {line.authorName}</span>
        </>
      ) : (
        <span className="text-[12px] text-muted">…</span>
      )}
      <div className="flex flex-wrap justify-between gap-x-3 border-t border-line pt-2 text-[11.5px] text-muted">
        <span>{t("rare.cardGot")} {fmtDate(slot.at)}</span>
        <span>{t("rare.cardOpened")} {fmtDate(slot.openedAt)}</span>
      </div>
    </div>
  );
}

/** One gift as a tile: a parcel while wrapped, its flavour once opened. */
function Tile(
  { slot, line, onPress, children }: {
    slot: Pick<RareSlot, "tier" | "name" | "nameEn" | "color" | "image" | "openedAt" | "at">;
    line?: Line;
    onPress: () => void;
    children?: React.ReactNode;
  },
) {
  const opened = !!slot.openedAt;
  return (
    <span className="relative">
      <HoverCard.Root openDelay={120} closeDelay={60}>
        <HoverCard.Trigger asChild>
          <button type="button" onClick={onPress}
                  className={`grid size-14 place-items-center rounded-xl border-2 text-[26px] transition-[filter,background-color] ${
                    opened ? "bg-bg/40 hover:brightness-110"
                           : "rare-wobble border-gold/70 bg-gold/15 hover:bg-gold/25"}`}
                  style={opened ? { borderColor: TIER_LOOK[slot.tier].color } : undefined}>
            {/* Wrapped, it says nothing about what is inside — the tier is part of
                the surprise. Opened, it is the flavour. */}
            {opened ? <FlavorArt flavor={slot} size={40} /> : <GiftIcon size={38} />}
          </button>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content side="top" sideOffset={10} collisionPadding={12} className="z-50">
            <GiftCard slot={slot} line={line} />
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
      {opened && slot.tier !== "rare" && (
        <span className="pointer-events-none absolute -right-2 -top-2">
          <TierBadge tier={slot.tier} small />
        </span>
      )}
      {children}
    </span>
  );
}

/**
 * Every rare popoto somebody has been sent, on their own edit-profile page.
 *
 * Where a gift that was never opened from the bell gets opened, and where the
 * owner picks what goes on their public profile: up to ten opened gifts, in
 * the order they are picked. Each pick is saved as it is made — the whole
 * shelf at once, so the order can never be half-written (v81).
 *
 * Parcels are not pickable. Showing one would tell everybody what is inside it
 * before its owner has looked.
 */
export function RareInventory(
  { characterId, demo }: {
    characterId: number | null;
    /** Sample gifts for trying it out; nothing is read or written. */
    demo?: RareGift[];
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [slots, setSlots] = useState<RareSlot[]>([]);
  const [showing, setShowing] = useState<{ id: number; opened: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [lines, setLines] = useState<Record<number, Line>>({});

  const read = useCallback(async () => {
    if (demo) {
      setSlots(demo.map((g) => ({ ...g, senderId: g.senderId ?? "", showcase: null })));
      return;
    }
    if (!supabase || characterId == null) return;
    const got = await raresFor(supabase, characterId);
    setSlots(got);
    // The lines of the opened ones, for their cards. Parcels' stay unread.
    setLines(await openedLines(supabase, got.filter((s) => s.openedAt).map((s) => s.id)));
  }, [supabase, characterId, demo]);
  const lineOf = (s: RareSlot): Line | undefined => {
    if (!s.openedAt) return undefined;
    if (!demo) return lines[s.id];
    const g = demo.find((x) => x.id === s.id);
    return g && { body: g.body, authorName: g.authorName, authorCharacterId: g.authorCharacterId };
  };
  useEffect(() => { void read(); }, [read]);

  /*
   * Arriving from a rare popoto notification: the page is long and this is
   * below the profile form, and it only exists once the gifts have loaded —
   * too late for the browser's own jump to the #rare-inventory in the address.
   */
  const has = slots.length > 0;
  useEffect(() => {
    if (!has || window.location.hash !== `#${RARE_INVENTORY_ID}`) return;
    document.getElementById(RARE_INVENTORY_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [has]);

  const onShow = useMemo(
    () => slots.filter((s) => s.showcase != null)
      .sort((a, b) => (a.showcase ?? 0) - (b.showcase ?? 0)),
    [slots]);

  if (!slots.length) return null;

  const toggle = async (s: RareSlot) => {
    if (!s.openedAt || busy) return;
    setErr(null);
    const ids = s.showcase != null
      ? onShow.filter((x) => x.id !== s.id).map((x) => x.id)
      : [...onShow.map((x) => x.id), s.id];
    if (ids.length > SHOWCASE_MAX) return;
    // On the screen first, then written.
    const place = new Map(ids.map((id, i) => [id, i + 1]));
    setSlots((v) => v.map((x) => ({ ...x, showcase: place.get(x.id) ?? null })));
    if (demo || !supabase) return;
    setBusy(true);
    const r = await setShowcase(supabase, ids);
    setBusy(false);
    if (r.error) { setErr(r.error); await read(); }
  };

  const wrapped = slots.filter((s) => !s.openedAt).length;
  const ordered = [...slots].sort((a, b) =>
    Number(!!a.openedAt) - Number(!!b.openedAt) || b.at.localeCompare(a.at));

  return (
    <section id={RARE_INVENTORY_ID}
             className="mt-3 scroll-mt-24 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display font-semibold">
          {t("rare.inventory")} · {slots.length}
        </div>
        <span className="text-[12.5px] text-muted">
          {t("rare.onShow", { n: onShow.length, max: SHOWCASE_MAX })}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
        {wrapped ? t("rare.inventoryWrapped", { n: wrapped }) : t("rare.inventoryHint")}
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        {ordered.map((s) => {
          const shown = s.showcase != null;
          const full = !shown && onShow.length >= SHOWCASE_MAX;
          return (
            <span key={s.id} className="flex flex-col items-center gap-1">
              <Tile slot={s} line={lineOf(s)}
                    onPress={() => setShowing({ id: s.id, opened: !!s.openedAt })}>
                {shown && (
                  <span className="pointer-events-none absolute -bottom-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-accent font-data text-[10.5px] font-bold text-bg shadow">
                    {s.showcase}
                  </span>
                )}
              </Tile>
              {s.openedAt ? (
                <button type="button" onClick={() => void toggle(s)}
                        disabled={full || busy}
                        className={`rounded-full border px-2 py-[1px] text-[11px] transition-colors disabled:opacity-35 ${
                          shown ? "border-accent bg-accent/15 text-accent"
                                : "border-line text-muted hover:border-accent hover:text-accent"}`}>
                  {shown ? t("rare.shown") : t("rare.show")}
                </button>
              ) : (
                <span className="text-[11px] text-gold">{t("rare.tapToOpen")}</span>
              )}
            </span>
          );
        })}
      </div>
      {err && <p className="mt-2 text-[12.5px] text-chili">{err}</p>}

      {showing && (demo ? (
        <PopotoRare preview={demo.find((g) => g.id === showing.id)} opened={showing.opened}
                    from="ตัวอย่าง"
                    onOpened={(g) => setSlots((v) => v.map((x) => (
                      x.id === g.id ? { ...x, openedAt: new Date().toISOString() } : x)))}
                    onClose={() => setShowing(null)} />
      ) : (
        <PopotoRare giftId={showing.id} opened={showing.opened}
                    onClose={() => { setShowing(null); void read(); }} />
      ))}
    </section>
  );
}

/**
 * The gifts somebody chose to show, on their public profile.
 *
 * Everybody sees it, the owner included, because it is what the owner put
 * there. Pressing one reads its line — as the owner's, already opened; nobody
 * is unwrapping anything on somebody else's page.
 */
export function RareShowcase(
  { characterId, demo }: { characterId: number; demo?: RareGift[] },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [gifts, setGifts] = useState<RareGift[]>([]);
  const [showing, setShowing] = useState<RareGift | null>(null);

  useEffect(() => {
    if (demo) { setGifts(demo.filter((g) => g.openedAt).slice(0, SHOWCASE_MAX)); return; }
    if (!supabase) return;
    let live = true;
    void showcaseFor(supabase, characterId).then((g) => { if (live) setGifts(g); });
    return () => { live = false; };
  }, [supabase, characterId, demo]);

  if (!gifts.length) return null;

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <span className="font-data text-[11px] uppercase tracking-[0.16em] text-gold">
        {t("rare.shelf")}
      </span>
      <div className="flex flex-wrap gap-2.5">
        {gifts.map((g) => (
          <Tile key={g.id} slot={g} onPress={() => setShowing(g)}
                line={{ body: g.body, authorName: g.authorName, authorCharacterId: g.authorCharacterId }} />
        ))}
      </div>
      {showing && (
        <PopotoRare preview={showing} opened onClose={() => setShowing(null)} />
      )}
    </div>
  );
}

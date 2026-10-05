"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Keeper } from "@/lib/town/keeper";
import type { FishSfx } from "@/lib/town/sfx";
import TownIcon from "./TownIcon";

/** How often whom I have to thank is asked for again while I am on the farm. */
const AGAIN_MS = 3 * 60_000;

/**
 * Thanks at the picking (lib/town/thanks; the owner, 2026-10-05: those who
 * carry water and water the others' plants got nothing for it). Standing on a
 * plot of my own whose plant somebody helped (they watered it, or it was
 * watered with water they carried), a small card is offered with their
 * names: one tap thanks them all, one a day from me to each.
 *
 * And the other way round: when somebody thanks me, the map says so, once.
 *
 * What is kept is the keeper's: for a member the database's (v129); in `next
 * dev`'s test room the browser's trial.
 */
export default function TownThanks({ keeper, th, tile, near, bottom, sfx }: {
  keeper: Keeper;
  th: boolean;
  /** The plot I stand on, when I stand still on one. */
  tile: [number, number] | null;
  /** Whether I am on the farm's map. */
  near: boolean;
  /** How far up from the foot of the map the card sits. */
  bottom: string;
  sfx: FishSfx | null;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  // whom I have to thank: asked for as I come to the farm, and now and then while I am there
  useEffect(() => {
    if (!near) return;
    void keeper.thankLook();
    const t = setInterval(() => { void keeper.thankLook(); }, AGAIN_MS);
    return () => clearInterval(t);
  }, [near, keeper]);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 2600); return () => clearTimeout(t); }, [note]);
  const [busy, setBusy] = useState(false);

  const key = tile ? `${tile[0]},${tile[1]}` : null;
  const helpers = key ? keeper.toThank()[key] ?? [] : [];
  const thank = useCallback(async () => {
    if (!key) return;
    setBusy(true);
    const did = await keeper.thankAt(key);
    setBusy(false);
    if (!did.ok) return;
    sfx?.wake();
    sfx?.work("pick");
    setNote(th ? `ขอบคุณแล้ว ${did.thanked.length} คน` : `Thanked ${did.thanked.length}`);
  }, [keeper, key, th, sfx]);

  // Somebody thanked me: said once for each, when the keeper comes to know of it (those there already when the town is
  // entered are said together, once).
  const told = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const thanked = keeper.thanked();
  useEffect(() => {
    const fresh = thanked.filter((t) => !told.current?.has(t.id));
    told.current = new Set(thanked.map((t) => t.id));
    if (!fresh.length) return;
    const first = fresh[0].name || (th ? "เพื่อนคนหนึ่ง" : "Somebody"), more = fresh.length - 1;
    setToast(th ? `${first}${more > 0 ? ` และอีก ${more} คน` : ""} ขอบคุณที่ช่วยดูแลผัก` : `${first}${more > 0 ? ` and ${more} more` : ""} thanked you for helping their plants`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- by who they are, not by the list's identity
  }, [thanked.map((t) => t.id).join(","), th]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); }, [toast]);

  // (for scripts in `next dev`: whom I have to thank, who thanked me, thanking)
  useEffect(() => {
    const handle = { toThank: () => keeper.toThank(), thanked: () => keeper.thanked(), board: () => keeper.thanks(), here: () => helpers.map((h) => h.id), thank, toast: () => toast };
    (window as unknown as { __townThanks?: typeof handle }).__townThanks = handle;
    return () => { delete (window as unknown as { __townThanks?: typeof handle }).__townThanks; };
  });

  const names = helpers.slice(0, 2).map((h) => h.name || "?").join(th ? " และ " : " and "), more = helpers.length - 2;
  return (
    <>
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-2">
          <p className="pop-in flex items-center gap-2 rounded-full border border-line-lit bg-surface/95 px-4 py-2 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-thanks-toast>
            <TownIcon name="thanksCard" size={20} />
            {toast}
          </p>
        </div>
      )}
      {(helpers.length > 0 || note) && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
          {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-thanks-note>{note}</p>}
          {helpers.length > 0 && (
            <button type="button" onClick={() => void thank()} disabled={busy} data-thanks-chip data-state="open"
                    className="pop-in pressable pointer-events-auto flex min-h-11 max-w-[22rem] items-center gap-2 rounded-full border border-line-lit bg-surface/95 px-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-accent disabled:opacity-60">
              <TownIcon name="thanksCard" size={20} />
              <span className="min-w-0 truncate">
                {th ? `ขอบคุณ ${names}${more > 0 ? ` +${more}` : ""}` : `Thank ${names}${more > 0 ? ` +${more}` : ""}`}
              </span>
            </button>
          )}
        </div>
      )}
    </>
  );
}

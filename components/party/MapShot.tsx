"use client";

import type { Spot } from "@/lib/party";
import { coordAt, mapArt, mapImage, pinAt } from "@/lib/map-art";
import { useLang } from "@/lib/i18n";

/**
 * The spot, on the actual map.
 *
 * "Kozama'uka (12.4, 30.1)" is an address anybody in the game can use, and it
 * is also two numbers — somebody who does not already know the zone has to
 * open the map in-game to find out whether that is the north end or the far
 * side of a river. The picture answers that before anybody logs in, which is
 * the whole point of arranging things here rather than in Discord.
 *
 * The picture is the game's own, fetched from XIVAPI when this is drawn rather
 * than kept in the repository: six hundred zones at half a megabyte each is
 * three hundred megabytes for the handful a board ever shows. Which means it
 * can fail — the host can be down, a zone can have no map row — and a party
 * whose picture did not load still has its coordinates written above it.
 *
 * With onPick it is the control rather than the illustration: clicking the map
 * is how somebody who is looking at the place would say where, and it beats
 * reading two numbers off the game and typing them in from memory.
 */
export default function MapShot(
  { spot, size = 260, onPick, art: given, at, caption }: {
    spot: Spot | undefined;
    /**
     * A width in pixels, or "full" to take whatever it is given.
     *
     * Full where somebody is placing the pin themselves: a click on a
     * 220-pixel picture is worth about a fifth of a malm, and the difference
     * between the near bank and the far one is smaller than that.
     */
    size?: number | "full";
    /** Given, the picture becomes clickable and reports where. */
    onPick?: (x: number, y: number) => void;
    /**
     * A different picture from the one the zone name would find.
     *
     * A housing district has two: plots 1 to 30 are the main ward and 31 to 60
     * are the subdivision, which the zone name cannot tell apart.
     */
    art?: { id: string; size: number };
    /** A pin somewhere other than the party's own coordinates. */
    at?: { x: number; y: number };
    /** What to write under it, where the coordinates are not the answer. */
    caption?: string;
  },
) {
  const { t } = useLang();
  const art = given ?? mapArt(spot?.map);
  if (!art || !spot?.map) return null;

  const atX = at?.x ?? spot.x;
  const atY = at?.y ?? spot.y;
  const has = atX != null && atY != null;
  // Without a pin and without a way to place one there is nothing to look at
  // but a picture of a zone, which is not a direction to anywhere.
  if (!has && !onPick) return null;

  const left = has ? pinAt(atX, art.size) : 0;
  const top = has ? pinAt(atY, art.size) : 0;

  const px = size === "full" ? null : size;

  const pick = (e: React.MouseEvent<HTMLElement>) => {
    if (!onPick) return;
    const r = e.currentTarget.getBoundingClientRect();
    onPick(coordAt((e.clientX - r.left) / r.width, art.size),
           coordAt((e.clientY - r.top) / r.height, art.size));
  };

  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mapImage(art)} alt={spot.map}
           width={px ?? undefined} height={px ?? undefined}
           loading="lazy" decoding="async" draggable={false}
           className="size-full object-cover" />
      {/*
        * The pin, drawn rather than pictured.
        *
        * A ring and a dot, because a marker that fills the spot it is marking
        * hides the landmark somebody is looking for. Centred on the point by
        * its own translation, so it sits on the coordinate at any size.
        */}
      {has && (
        <>
          <span aria-hidden style={{ left: `${left}%`, top: `${top}%` }}
                className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent/25 shadow-[0_0_0_1px_rgba(0,0,0,0.6)]" />
          <span aria-hidden style={{ left: `${left}%`, top: `${top}%` }}
                className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        </>
      )}
    </>
  );

  const box = "relative aspect-square overflow-hidden rounded-lg border border-line bg-bg";

  return (
    <figure style={px ? { width: px } : undefined}
            className={`m-0 flex flex-col gap-1 ${px ? "" : "w-full"}`}>
      {onPick ? (
        <button type="button" onClick={pick}
                title={t("pf.mapClick")}
                className={`${box} cursor-crosshair transition-colors hover:border-accent/70`}>
          {inner}
        </button>
      ) : (
        <div className={box}>{inner}</div>
      )}
      <figcaption className="font-data text-[10.5px] tabular-nums text-muted">
        {has ? (
          <>
            {caption ?? `${spot.map} (${atX.toFixed(1)}, ${atY.toFixed(1)})`}
            <span className="ml-1 opacity-60">· {t("pf.mapFrom")}</span>
          </>
        ) : (
          <span className="font-sans">{t("pf.mapClick")}</span>
        )}
      </figcaption>
    </figure>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { Spot } from "@/lib/party";
import { isHousing, spotText } from "@/lib/party";
import MapShot from "@/components/party/MapShot";
import { WARDS, plotAt } from "@/lib/housing";
import maps from "@/data/maps.json";
import { DATACENTRES, FC_DC, FC_WORLD, dcOf } from "@/lib/world";
import { useLang } from "@/lib/i18n";

/**
 * Where in the game, with coordinates.
 *
 * A photo shoot and a FATE farm are both arrangements to stand somewhere
 * specific, and "Kozama'uka" is only half of that — the other half is X and Y,
 * which is how FFXIV players have given each other directions since 2013.
 *
 * The zone list is typed into rather than scrolled: five hundred and seventy
 * places is not a dropdown anybody can use, and everybody arranging this
 * already knows the name of the place they mean. The region comes back with
 * each suggestion because there are two Aetheryte Plazas and half a dozen
 * places called something-Camp, and the region is what tells them apart.
 *
 * The coordinates are optional and deliberately so. "Somewhere in the Crystarium"
 * is a real plan; refusing to accept it until somebody types 12.4 would push
 * that plan back to Discord, which is the thing this page exists to stop.
 */

interface MapRow { name: string; region?: string; sub?: string }
const ALL = (maps as { maps: MapRow[] }).maps;

export default function WherePicker(
  { value, onChange }: { value: Spot | undefined; onChange: (s: Spot | undefined) => void },
) {
  const { t } = useLang();
  const [q, setQ] = useState("");

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    // Starts-with first, then anywhere: typing "the" should not open on
    // "Bathhouse". Capped, because a two-letter search matches a hundred.
    const starts: MapRow[] = [];
    const inside: MapRow[] = [];
    for (const m of ALL) {
      const n = m.name.toLowerCase();
      if (n.startsWith(s)) starts.push(m);
      else if (n.includes(s)) inside.push(m);
      if (starts.length >= 8) break;
    }
    return [...starts, ...inside].slice(0, 8);
  }, [q]);

  const sel = "rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink";

  // Shown as this Free Company's own until somebody says otherwise, and
  // written back the moment they touch either — a form that displays Tonberry
  // and stores nothing is a form that has told the reader something untrue.
  const world = value?.world ?? FC_WORLD;
  const dc = value?.dc ?? dcOf(world) ?? FC_DC;
  const set = (patch: Partial<Spot>) =>
    onChange({ map: "", ...value, dc, world, ...patch });

  /** The plot they have typed, where it is a plot the game has. */
  const here = plotAt(value?.map, value?.plot);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
          {t("pf.where")}
        </span>
        <span className="text-[11.5px] text-muted">
          {t("pf.whereHelp")}
        </span>
      </div>

      {/*
        * Which world, before where on it.
        *
        * A data centre first because a world list of ninety is not a list
        * anybody reads, and because "which DC" is the question somebody
        * travelling answers first anyway. Both start on this Free Company's
        * own, which is the right answer almost every night — the point of
        * asking at all is the night it is not.
        */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={dc}
                onChange={(e) => {
                  const next = e.target.value;
                  // A world from the old data centre is not on the new one, so
                  // it moves to that centre's first rather than staying as a
                  // pair the game has never seen.
                  set({ dc: next, world: DATACENTRES[next]?.[0] });
                }}
                className={sel}>
          {Object.keys(DATACENTRES).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={world} onChange={(e) => set({ world: e.target.value })}
                className={sel}>
          {(DATACENTRES[dc] ?? []).map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      {value?.map ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-[13px] text-accent">
            {spotText(value)}
          </span>
          {/* Beside the name rather than under it: they are part of the
              address, and a player reads "Kozama'uka (12.4, 30.1)" as one
              thing.

              A housing district is addressed differently, and this is not a
              nicety — a coordinate inside the Goblet tells nobody which house,
              and Ward 12 Plot 30 is what somebody would actually be told. */}
          {isHousing(value.map) ? (
            <>
              <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
                {t("pf.ward")}
                <input type="number" step={1} min={1} max={WARDS}
                       value={value.ward ?? ""}
                       onChange={(e) => onChange({
                         ...value,
                         ward: e.target.value === "" ? undefined : Number(e.target.value),
                       })}
                       className={`${sel} w-20`} />
              </label>
              <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
                {t("pf.plot")}
                <input type="number" step={1} min={1} max={60}
                       value={value.plot ?? ""}
                       onChange={(e) => onChange({
                         ...value,
                         plot: e.target.value === "" ? undefined : Number(e.target.value),
                       })}
                       className={`${sel} w-20`} />
              </label>
            </>
          ) : (
            <>
              <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
                X
                <input type="number" step="0.1" min={1} max={45}
                       value={value.x ?? ""}
                       onChange={(e) => onChange({
                         ...value,
                         x: e.target.value === "" ? undefined : Number(e.target.value),
                       })}
                       className={`${sel} w-20`} />
              </label>
              <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
                Y
                <input type="number" step="0.1" min={1} max={45}
                       value={value.y ?? ""}
                       onChange={(e) => onChange({
                         ...value,
                         y: e.target.value === "" ? undefined : Number(e.target.value),
                       })}
                       className={`${sel} w-20`} />
              </label>
            </>
          )}
          <button type="button"
                  onClick={() => { onChange({ map: "", dc, world }); setQ(""); }}
                  className="text-[12px] text-muted underline hover:text-ink">
            {t("pf.change")}
          </button>
        </div>
      ) : null}

      {/* The pin, while it is still being placed. Clicking the map is how
          somebody standing in the zone would say where — and two numbers typed
          from memory are easy to get wrong by a digit, which a picture is how
          anybody notices. A housing district has no coordinates to place, so
          it gets no map. */}
      {value?.map ? (
        // A housing district is the one place the plot number is the pin: the
        // game marks all sixty on its own map, and which of the two maps —
        // main ward or subdivision — the zone name cannot tell you.
        isHousing(value.map) ? (
          here && (
            <MapShot spot={value} size="full"
                     art={{ id: here.map, size: here.size }}
                     at={{ x: here.x, y: here.y }}
                     caption={`${value.map} · ${t("pf.ward")} ${value.ward ?? "?"}, `
                       + `${t("pf.plot")} ${here.plot}`} />
          )
        ) : (
          <MapShot spot={value} size="full"
                   onPick={(x, y) => onChange({ ...value, dc, world, x, y })} />
        )
      ) : (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder={t("pf.whereSearch")}
                 className={`${sel} w-full placeholder:text-muted`} />
          {hits.map((m) => (
            <button key={m.name} type="button"
                    onClick={() => { set({ map: m.name, region: m.region }); setQ(""); }}
                    className="flex items-baseline gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface">
              <span className="text-[13px] text-ink">{m.name}</span>
              {m.region && (
                <span className="font-data text-[10.5px] uppercase tracking-[0.1em] text-muted">
                  {m.region}
                </span>
              )}
              {m.sub && <span className="text-[11.5px] text-muted">{m.sub}</span>}
            </button>
          ))}
          {q.trim().length >= 2 && !hits.length && (
            <span className="text-[11.5px] text-muted">
              {t("pf.whereNone", { n: ALL.length })}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/** The same fact, small, for a row in the list. */
export function SpotChip({ spot }: { spot: Spot | undefined }) {
  const text = spotText(spot);
  if (!text) return null;
  return (
    <span className="rounded-full border border-line px-2 py-[2px] font-data text-[10.5px] text-muted">
      📍 {text}
    </span>
  );
}

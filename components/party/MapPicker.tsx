"use client";

import type { MapPlan } from "@/lib/party";
import { LATEST_MAP, MAPS_EACH, TREASURE_MAPS, mapFullLabel } from "@/lib/treasure";
import { useLang } from "@/lib/i18n";

/**
 * What a map night is opening, and how much of it.
 *
 * Two questions that decide whether somebody can come, and neither is answered
 * by the time or the party size. Turning up to a G18 night with a G12 in the
 * bag means standing about while everybody else portals; "bring one" and "bring
 * five" are twenty minutes and most of an evening.
 *
 * The list is every map in the game, read from the item sheet rather than typed
 * out, newest at the top with this patch's marked. A hand-written list would be
 * wrong the week a patch adds one — in the one place people would be using it.
 *
 * Both answers are optional. "Maps, Thursday, bring what you have" is a real
 * plan and the form should not refuse it until somebody has picked a G number.
 */
export default function MapPicker(
  { value, onChange }: {
    value: MapPlan | undefined;
    onChange: (m: MapPlan | undefined) => void;
  },
) {
  const { t } = useLang();
  const v = value ?? {};

  const set = (next: MapPlan) => {
    // An empty plan is no plan, and storing {} would put an object on the
    // listing that renders as nothing and reads as something.
    onChange(next.kind || next.each ? next : undefined);
  };

  const sel = "rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-ink";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
        {t("party.mapWhich")}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <select value={v.kind ?? ""}
                onChange={(e) => set({ ...v, kind: e.target.value || undefined })}
                aria-label={t("party.mapWhich")} className={`${sel} min-w-[190px]`}>
          <option value="">{t("party.mapAny")}</option>
          {TREASURE_MAPS.map((m) => (
            <option key={m.id} value={m.name}>
              {mapFullLabel(m)}
              {m.name === LATEST_MAP ? ` — ${t("party.mapLatest")}` : ""}
            </option>
          ))}
        </select>

        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
          {t("party.mapEach")}
        </span>
        <select value={v.each ?? ""}
                onChange={(e) => set({ ...v, each: e.target.value ? Number(e.target.value) : undefined })}
                aria-label={t("party.mapEach")} className={sel}>
          <option value="">{t("party.mapEachAny")}</option>
          {MAPS_EACH.map((n) => (
            <option key={n} value={n}>{t("party.mapEachN", { n })}</option>
          ))}
        </select>
      </div>

      {/*
        * Said here rather than only on the listing, because the person setting
        * the time is the one who needs to know the board will not hold them to
        * it. A map night ends when the maps are done and how long that takes is
        * a dice roll — two hours of maps is forty minutes or it is four.
        */}
      <p className="text-[11.5px] text-muted">{t("party.estimateWhy")}</p>
    </div>
  );
}

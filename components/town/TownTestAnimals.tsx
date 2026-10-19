"use client";

import { useState, type ReactNode } from "react";
import type { Trial } from "@/lib/town/trial";
import { BREEDS, DAWN_BOOSTS, OFFERINGS, SPECIES, SPECIES_IDS, adultAt, breedOf, type Stage } from "@/lib/town/animals";
import { POPOTO_SHOP } from "@/lib/town/animal-act";
import { MEADOW_SPOTS, POPOTO } from "@/lib/town/pasture";
import { ITEMS, type ItemId } from "@/lib/town/items";
import { roomFor } from "@/lib/town/trade";
import { rankOf } from "@/lib/town/lines";

/**
 * The test window's leaf for the pasture (docs/plans/animals): animals of any breed at any stage, rounds ready,
 * hearts, hunger, the line's things, the line's points, the gate, the gifts' hours and the wagon, so that the owner can
 * try every part of it in `next dev` at once. Only the trial's: it lays things straight onto the browser's world.
 */
export default function TownTestAnimals({ trial, th, me, say }: { trial: Trial; th: boolean; me: string; say: (s: string) => void }) {
  const t = (a: string, b: string) => (th ? a : b);
  const [breed, setBreed] = useState("barnHen");
  const [stage, setStage] = useState<Stage>("adult");
  const [hearts, setHearts] = useState(4);
  const world = trial.animalWorld(), mine = world.animals.filter((a) => a.owner === me), now = trial.now();
  const each = (patch: (a: (typeof mine)[number]) => Partial<(typeof mine)[number]>, words: string) => { for (const a of mine) trial.animalSet(a.id, patch(a)); say(words); };
  const give = (ids: string[], n: number) => {
    let put = 0;
    for (const id of ids) { const room = Math.min(n, roomFor(trial.purse().bag, id as ItemId)); if (room > 0) { trial.grant(id as ItemId, room); put++; } }
    say(t(`เสกของ ${put}/${ids.length} อย่าง`, `${put}/${ids.length} things conjured`));
  };
  const warp = (x: number, y: number) => (window as unknown as { __townView?: { warp: (x: number, y: number) => boolean } }).__townView?.warp(x, y);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3" data-test-animals>
      <Row label={t("ไปที่ทุ่งเลี้ยงสัตว์", "Go to the pasture")} value={<span className="text-meta text-muted">{t(`สัตว์ของฉัน ${mine.length} ตัว · ทั้งหมด ${world.animals.length}`, `${mine.length} mine · ${world.animals.length} in all`)}</span>}>
        <Do onClick={() => warp(POPOTO.at.x, POPOTO.at.y + 1.5)}>{t("ร้านลุง Popoto", "Uncle Popoto's stall")}</Do>
        <Do onClick={() => warp(140, -11)}>{t("โรงนา", "The barn")}</Do>
        <Do onClick={() => warp(171, -13)}>{t("เล้าไก่", "The coop")}</Do>
        <Do onClick={() => warp(MEADOW_SPOTS[0][0], MEADOW_SPOTS[0][1] + 1)}>{t("ทุ่งหญ้า", "The meadow")}</Do>
      </Row>
      <Row label={t("ให้สัตว์ตัวเอง", "Give myself an animal")} value={<span className="text-meta text-muted">{breedOf(breed)?.name[th ? "th" : "en"]}</span>}>
        <select value={breed} onChange={(e) => setBreed(e.target.value)} className="min-h-9 rounded-lg border border-line bg-card px-2 text-meta text-ink" aria-label={t("พันธุ์", "Breed")}>
          {SPECIES_IDS.map((sp) => <optgroup key={sp} label={SPECIES[sp].name[th ? "th" : "en"]}>{BREEDS.filter((b) => b.species === sp).map((b) => <option key={b.id} value={b.id}>{b.letter} · {b.name[th ? "th" : "en"]}</option>)}</optgroup>)}
        </select>
        {(["coming", "baby", "young", "adult"] as Stage[]).map((s) => <Do key={s} on={stage === s} onClick={() => setStage(s)}>{s === "coming" ? t("ยังไม่เกิด", "coming") : s === "baby" ? t("ลูก", "baby") : s === "young" ? t("วัยรุ่น", "young") : t("โต", "adult")}</Do>)}
        {[0, 3, 6, 10].map((h) => <Do key={h} on={hearts === h} onClick={() => setHearts(h)}>{h}♥</Do>)}
        <Do onClick={() => { const a = trial.animalGive(breed, stage, hearts); say(a ? t(`ได้ ${breedOf(breed)?.name.th} (${a.place})`, `Got a ${breedOf(breed)?.name.en} (${a.place})`) : "?"); }}>{t("ให้เลย", "Give")}</Do>
        <Do onClick={() => { for (const sp of SPECIES_IDS) trial.animalGive(BREEDS.find((b) => b.species === sp && b.letter === "A")!.id, "adult", 4); say(t("ได้ไก่ เป็ด แกะ วัว โตแล้วอย่างละตัว", "A grown hen, duck, sheep and cow")); }}>{t("ครบสี่ชนิด (โต)", "One of each, grown")}</Do>
      </Row>
      <Row label={t("ผลผลิตพร้อมเก็บ", "Rounds ready")} value={<span className="text-meta text-muted">{mine.filter((a) => a.banked > 0).length}</span>}>
        <Do onClick={() => each((a) => ({ banked: a.grown >= adultAt(a.species) ? SPECIES[a.species].bank : 0, made: 0, at: now }), t("ทุกตัวที่โตแล้วมีผลผลิตเต็ม", "Every grown one is full"))}>{t("เต็มทุกตัว", "Fill them")}</Do>
        <Do onClick={() => each((a) => ({ outside: a.species === "chicken" || a.species === "duck" ? [{ at: [150, -25] as [number, number], n: 2 }, { at: [137, -5] as [number, number], n: 1 }] : a.outside, outBands: 4 }), t("ไก่เป็ดไข่ทิ้งไว้ในทุ่งแล้ว", "Eggs laid out on the meadow"))}>{t("ไข่ในทุ่ง", "Eggs out")}</Do>
        <Do onClick={() => each((a) => ({ grown: adultAt(a.species), at: now }), t("โตเต็มวัยทุกตัว", "All grown up"))}>{t("โตทันที", "Grow up")}</Do>
      </Row>
      <Row label={t("หัวใจ อาหาร พัก", "Hearts, food, rest")} value={<span className="text-meta text-muted" />}>
        {[0, 3, 6, 10].map((h) => <Do key={h} onClick={() => each(() => ({ hearts: h * 20 }), t(`หัวใจ ${h} ทุกตัว`, `${h} hearts each`))}>{h}♥</Do>)}
        <Do onClick={() => each(() => ({ food: 0, at: now }), t("หิวทุกตัว", "All hungry"))}>{t("หิว", "Hungry")}</Do>
        <Do onClick={() => each(() => ({ food: 24, at: now }), t("อิ่มทุกตัว", "All fed"))}>{t("อิ่ม", "Fed")}</Do>
        <Do onClick={() => each(() => ({ rest: 0, today: { day: -1 } }), t("ไม่พัก และเริ่มวันใหม่", "Rested, a new day"))}>{t("รีเซ็ตพัก/วัน", "Reset rest/day")}</Do>
      </Row>
      <Row label={t("ของในสายเลี้ยงสัตว์", "Things of the line")} value={<span className="text-meta text-muted" />}>
        <Do onClick={() => give(["milker", "woolShears", "eggBasket"], 1)}>{t("เครื่องมือเกม", "Game tools")}</Do>
        <Do onClick={() => give(SPECIES_IDS.flatMap((sp) => [SPECIES[sp].sack, SPECIES[sp].growItem]), 5)}>{t("อาหาร ×5", "Feed ×5")}</Do>
        <Do onClick={() => give(SPECIES_IDS.flatMap((sp) => SPECIES[sp].treats), 3)}>{t("ขนม ×3", "Treats ×3")}</Do>
        <Do onClick={() => give([...new Set(SPECIES_IDS.flatMap((sp) => Object.values(OFFERINGS[sp]) as string[]))].slice(0, 12), 2)}>{t("ของเซ่น", "Offerings")}</Do>
        <Do onClick={() => give(DAWN_BOOSTS as string[], 2)}>{t("ของเช้ามืด", "Dawn forage")}</Do>
        <Do onClick={() => give(["churn", "cheesePress", "spindle", "knittingNeedles"], 1)}>{t("เครื่องแปรรูป", "Making tools")}</Do>
      </Row>
      <Row label={t("แต้มสายเลี้ยงสัตว์", "The pasture's points")} value={<span className="font-data text-meta tabular-nums text-ink">{t("ขั้น", "rank")} {rankOf("animals", trial.lines().lines.animals.points)} · {Math.round(trial.lines().lines.animals.points)}</span>}>
        {[0, 50, 400, 3000, 12000].map((n) => <Do key={n} onClick={() => { trial.setLine("animals", n); say(t(`ตั้งแต้ม ${n}`, `${n} points`)); }}>{n}</Do>)}
      </Row>
      <Row label={t("ประตู ลม พิณ เกวียน", "Gate, wind, harp, wagon")} value={<span className="text-meta text-muted">{world.spells.filter((x) => x.until > now).map((x) => x.kind).join(", ") || "–"}</span>}>
        <Do onClick={() => { const r = trial.animals({ action: "gate", open: true }); say(r.ok ? t("เปิดประตูทุ่งแล้ว", "Gate open") : "?"); }}>{t("เปิดประตู", "Open gate")}</Do>
        <Do onClick={() => { const r = trial.animals({ action: "gate", open: false }); say(r.ok ? t("ปิดประตูแล้ว", "Gate shut") : "?"); }}>{t("ปิดประตู", "Shut gate")}</Do>
        <Do onClick={() => { trial.animalSpell("wind"); say(t("ลมฤดูใบไม้ผลิพัดแล้ว (ออกจากฟาร์มแล้วเข้าใหม่)", "Spring wind blowing (leave the farm and come back)")); }}>{t("ลมฤดูใบไม้ผลิ", "Spring wind")}</Do>
        <Do onClick={() => { trial.animalSpell("harp"); say(t("เสียงพิณ 30 นาที", "The harp, 30 minutes")); }}>{t("พิณ", "Harp")}</Do>
        <Do onClick={() => { trial.animalWagon(); say(t("เกวียนหญ้าออกจากฟาร์มแล้ว", "The hay wagon sets off")); }}>{t("เกวียนหญ้า", "Hay wagon")}</Do>
      </Row>
      <Row label={t("เริ่มฟาร์มสัตว์ใหม่", "Begin the pasture again")} value={<span className="text-meta text-muted">{Object.keys(POPOTO_SHOP).length} {t("ของในร้าน", "on the shelf")}</span>}>
        <Do onClick={() => { trial.animalsClear(); say(t("ล้างสัตว์ทั้งหมดแล้ว", "Every animal cleared")); }}>{t("ล้างทั้งหมด", "Clear all")}</Do>
      </Row>
    </div>
  );
}
function Row({ label, value, children }: { label: string; value: ReactNode; children: ReactNode }) {
  return (
    <div className="border-b border-line py-2.5">
      <p className="flex items-center justify-between gap-2 text-ui"><span className="font-semibold text-ink">{label}</span>{value}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
function Do({ onClick, on = false, children }: { onClick: () => void; on?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on || undefined}
            className={`pressable min-h-9 rounded-full border px-3 text-meta ${on ? "border-gold bg-gold/15 font-semibold text-gold" : "border-line-strong text-ink hover:border-gold"}`}>
      {children}
    </button>
  );
}

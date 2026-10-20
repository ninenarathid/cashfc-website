"use client";

import { useState, type ReactNode } from "react";
import type { Trial } from "@/lib/town/trial";
import { ANIMALS, BREEDS, DAWN_BOOSTS, OFFERINGS, SPECIES, SPECIES_IDS, adultAt, breedOf, type Sex, type Stage } from "@/lib/town/animals";
import { POPOTO_SHOP } from "@/lib/town/animal-act";
import { BARNS, FARM_GATES, FENCE_X, MEADOW, PEN, POPOTO, SOUTH_MEADOW } from "@/lib/town/pasture";
import type { ItemId } from "@/lib/town/items";
import { roomFor } from "@/lib/town/trade";
import { rankOf } from "@/lib/town/lines";

/**
 * The test window's leaf for the animal farm (docs/plans/animals, round 6): a barn of mine (any of the 24, its room, left
 * untended so many days), animals of any breed, stage and sex, rounds ready, hearts, hunger, the line's things, logs and
 * stone tiles for a barn, the line's points, my door, made-up friends in the barns about (an offer, an ask, a loan), the
 * gifts' hours and the wagon, so that the owner can try every part of it in `next dev` at once. Only the trial's: it lays
 * things straight onto the browser's world.
 */
export default function TownTestAnimals({ trial, th, me, say }: { trial: Trial; th: boolean; me: string; say: (s: string) => void }) {
  const t = (a: string, b: string) => (th ? a : b);
  const [breed, setBreed] = useState("barnHen");
  const [stage, setStage] = useState<Stage>("adult");
  const [hearts, setHearts] = useState(4);
  const [sex, setSex] = useState<Sex>("f");
  const world = trial.animalWorld(), mine = world.animals.filter((a) => a.owner === me), now = trial.now();
  const herd = world.herds.find((h) => h.owner === me);
  const each = (patch: (a: (typeof mine)[number]) => Partial<(typeof mine)[number]>, words: string) => { for (const a of mine) trial.animalSet(a.id, patch(a)); say(words); };
  const give = (ids: string[], n: number) => {
    let put = 0;
    for (const id of ids) { const room = Math.min(n, roomFor(trial.purse().bag, id as ItemId)); if (room > 0) { trial.grant(id as ItemId, room); put++; } }
    say(t(`เสกของ ${put}/${ids.length} อย่าง`, `${put}/${ids.length} things conjured`));
  };
  const warp = (x: number, y: number) => (window as unknown as { __townView?: { warp: (x: number, y: number) => boolean } }).__townView?.warp(x, y);
  const myBarn = herd && herd.barn !== null ? BARNS[herd.barn] : null;
  const open = !!herd && herd.door.length > 0 && herd.door[herd.door.length - 1][1] === null;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3" data-test-animals>
      <Row label={t("ไปที่ฟาร์มสัตว์", "Go to the animal farm")} value={<span className="text-meta text-muted">{t(`สัตว์ของฉัน ${mine.length} ตัว · ทั้งหมด ${world.animals.length}`, `${mine.length} mine · ${world.animals.length} in all`)}</span>}>
        <Do onClick={() => warp(POPOTO.at.x, POPOTO.at.y + 2)}>{t("ลุง Popoto", "Uncle Popoto")}</Do>
        <Do onClick={() => warp(FENCE_X - 3, FARM_GATES[0].road + 0.5)}>{t("ประตูเหนือ", "North gate")}</Do>
        <Do onClick={() => warp(FENCE_X - 3, FARM_GATES[1].road + 0.5)}>{t("ประตูใต้", "South gate")}</Do>
        {myBarn && <Do onClick={() => warp(myBarn.x + 4, myBarn.y + myBarn.h + 1)}>{t("หน้าโรงของฉัน", "My barn's door")}</Do>}
        {myBarn && <Do onClick={() => warp(myBarn.x + 4, myBarn.y + 2)}>{t("ในโรงของฉัน", "Inside my barn")}</Do>}
        <Do onClick={() => warp(MEADOW.x + 8, MEADOW.y + 3)}>{t("ทุ่งหญ้า", "The meadow")}</Do>
        <Do onClick={() => warp(SOUTH_MEADOW.x + 10, SOUTH_MEADOW.y + 2)}>{t("ทุ่งใต้", "South meadow")}</Do>
        <Do onClick={() => warp(PEN.x + 2, PEN.y + PEN.h + 1)}>{t("คอกลุง", "Uncle's pen")}</Do>
      </Row>
      <Row label={t("โรงของฉัน", "My barn")} value={<span className="text-meta text-muted">{herd && herd.barn !== null ? t(`โรง ${herd.barn + 1} · ${herd.room} ตัว · ประตู${open ? "เปิด" : "ปิด"}`, `Barn ${herd.barn + 1} · room ${herd.room} · door ${open ? "open" : "shut"}`) : t("ยังไม่มี", "none")}</span>}>
        <Do onClick={() => { trial.animalHerd({}); say(t("ได้โรงแล้ว", "A barn given")); }}>{t("ให้โรง", "Give a barn")}</Do>
        <Do onClick={() => { trial.animalHerd({ barn: null }); say(t("คืนโรงแล้ว", "Barn taken off")); }}>{t("ไม่มีโรง", "No barn")}</Do>
        {ANIMALS.barns.stages.map((st) => <Do key={st.room} on={herd?.room === st.room} onClick={() => { trial.animalHerd({ room: st.room }); say(t(`เลี้ยงได้ ${st.room} ตัว`, `Room ${st.room}`)); }}>{t(`${st.room} ตัว`, `room ${st.room}`)}</Do>)}
        {[0, 15, 22].map((d) => <Do key={d} onClick={() => { trial.animalHerd({ untendedDays: d }); say(t(`ไม่ได้ดูแล ${d} วัน`, `Untended ${d} days`)); }}>{t(`ทิ้ง ${d} วัน`, `left ${d} d`)}</Do>)}
        <Do onClick={() => { const r = trial.animals({ action: "door", open: !open }); say(r.ok ? (open ? t("ปิดประตูแล้ว", "Door shut") : t("เปิดประตูแล้ว", "Door open")) : r.why ?? "?"); }}>{open ? t("ปิดประตู", "Shut door") : t("เปิดประตู", "Open door")}</Do>
        <Do onClick={() => give(["log", "stoneTile"], 60)}>{t("ไม้ซุงและแผ่นหิน", "Logs and stone tiles")}</Do>
      </Row>
      <Row label={t("ให้สัตว์ตัวเอง", "Give myself an animal")} value={<span className="text-meta text-muted">{breedOf(breed)?.name[th ? "th" : "en"]}</span>}>
        <select value={breed} onChange={(e) => setBreed(e.target.value)} className="min-h-9 rounded-lg border border-line bg-card px-2 text-meta text-ink" aria-label={t("พันธุ์", "Breed")}>
          {SPECIES_IDS.map((sp) => <optgroup key={sp} label={SPECIES[sp].name[th ? "th" : "en"]}>{BREEDS.filter((b) => b.species === sp).map((b) => <option key={b.id} value={b.id}>{b.letter} · {b.name[th ? "th" : "en"]}</option>)}</optgroup>)}
        </select>
        {(["coming", "baby", "young", "adult"] as Stage[]).map((s) => <Do key={s} on={stage === s} onClick={() => setStage(s)}>{s === "coming" ? t("ยังไม่เกิด", "coming") : s === "baby" ? t("ลูก", "baby") : s === "young" ? t("วัยรุ่น", "young") : t("โต", "adult")}</Do>)}
        {(["f", "m"] as Sex[]).map((x) => <Do key={x} on={sex === x} onClick={() => setSex(x)}>{x === "f" ? t("♀ เมีย", "♀ female") : t("♂ ผู้", "♂ male")}</Do>)}
        {[0, 3, 6, 10].map((h) => <Do key={h} on={hearts === h} onClick={() => setHearts(h)}>{h}♥</Do>)}
        <Do onClick={() => { const a = trial.animalGive(breed, stage, hearts, sex); say(a ? t(`ได้ ${breedOf(breed)?.name.th} (${a.home === "pen" ? "คอกลุง" : "ในโรง"})`, `Got a ${breedOf(breed)?.name.en} (${a.home})`) : "?"); }}>{t("ให้เลย", "Give")}</Do>
        <Do onClick={() => { for (const sp of SPECIES_IDS) trial.animalGive(BREEDS.find((b) => b.species === sp && b.letter === "A")!.id, "adult", 4, sp === "sheep" ? "m" : "f"); say(t("ได้ไก่ เป็ด แกะ(ผู้) วัว โตแล้วอย่างละตัว", "A grown hen, duck, ram and cow")); }}>{t("ครบสี่ชนิด (โต)", "One of each, grown")}</Do>
      </Row>
      <Row label={t("ผลผลิตพร้อมเก็บ", "Rounds ready")} value={<span className="text-meta text-muted">{mine.filter((a) => a.banked > 0).length}</span>}>
        <Do onClick={() => each((a) => ({ banked: a.grown >= adultAt(a.species) ? SPECIES[a.species].bank : 0, made: 0, at: now }), t("ทุกตัวที่โตแล้วมีผลผลิตเต็ม", "Every grown one is full"))}>{t("เต็มทุกตัว", "Fill them")}</Do>
        <Do onClick={() => each((a) => ({ outside: a.species === "chicken" || a.species === "duck" ? [{ at: [MEADOW.x + 4, MEADOW.y + 2] as [number, number], n: 2 }, { at: [SOUTH_MEADOW.x + 6, SOUTH_MEADOW.y + 3] as [number, number], n: 1 }] : a.outside, outBands: 4 }), t("ไก่เป็ดไข่ทิ้งไว้ในทุ่งแล้ว", "Eggs laid out on the meadow"))}>{t("ไข่ในทุ่ง", "Eggs out")}</Do>
        <Do onClick={() => each((a) => ({ grown: adultAt(a.species), at: now }), t("โตเต็มวัยทุกตัว", "All grown up"))}>{t("โตทันที", "Grow up")}</Do>
        <Do onClick={() => each((a) => (a.species === "sheep" ? { banked: 0, made: 2, at: now } : {}), t("แกะเพิ่งตัดขน", "Sheep just shorn"))}>{t("แกะตัดขนแล้ว", "Shorn sheep")}</Do>
      </Row>
      <Row label={t("หัวใจ อาหาร พัก", "Hearts, food, rest")} value={<span className="text-meta text-muted" />}>
        {[0, 3, 6, 10].map((h) => <Do key={h} onClick={() => each(() => ({ hearts: h * 20 }), t(`หัวใจ ${h} ทุกตัว`, `${h} hearts each`))}>{h}♥</Do>)}
        <Do onClick={() => each(() => ({ streak: 7 }), t("กินอิ่มต่อเนื่อง 7 วัน", "Fed 7 days in a row"))}>{t("อิ่ม 7 วัน", "7-day streak")}</Do>
        <Do onClick={() => each(() => ({ food: 0, at: now }), t("หิวทุกตัว", "All hungry"))}>{t("หิว", "Hungry")}</Do>
        <Do onClick={() => each(() => ({ food: 24, at: now }), t("อิ่มทุกตัว", "All fed"))}>{t("อิ่ม", "Fed")}</Do>
        <Do onClick={() => each(() => ({ rest: 0, today: { day: -1 } }), t("ไม่พัก และเริ่มวันใหม่", "Rested, a new day"))}>{t("รีเซ็ตพัก/วัน", "Reset rest/day")}</Do>
      </Row>
      <Row label={t("เพื่อนในฟาร์ม", "Friends on the farm")} value={<span className="text-meta text-muted">{t(`เสนอ ${(world.offers ?? []).length} · ขอ ${(world.asks ?? []).length}`, `${(world.offers ?? []).length} offers · ${(world.asks ?? []).length} asks`)}</span>}>
        <Do onClick={() => { trial.animalFriends(); say(t("มีเพื่อนในโรงข้างๆ เสนอสัตว์ ขอยืม และให้ยืมแล้ว", "Friends in the barns: an offer, an ask and a loan")); }}>{t("เพื่อน + คำขอ", "Friends + requests")}</Do>
        <Do onClick={() => { trial.animalFriends(true); say(t("โรงเต็มทุกโรง (โรงร้างจองได้)", "Every barn taken (the left one may be taken)")); }}>{t("เต็มทุกโรง", "Fill every barn")}</Do>
        <Do onClick={() => { trial.animalMine(); say(t("ฉันเสนอและขอยืมไว้แล้ว", "My offer and ask standing")); }}>{t("คำขอของฉัน", "My requests")}</Do>
      </Row>
      <Row label={t("ของในสายเลี้ยงสัตว์", "Things of the line")} value={<span className="text-meta text-muted" />}>
        <Do onClick={() => give(["milker", "woolShears", "eggBasket"], 1)}>{t("เครื่องมือเกม", "Game tools")}</Do>
        <Do onClick={() => give(SPECIES_IDS.flatMap((sp) => [SPECIES[sp].sack, SPECIES[sp].growItem]), 5)}>{t("อาหาร ×5", "Feed ×5")}</Do>
        <Do onClick={() => give(SPECIES_IDS.flatMap((sp) => SPECIES[sp].treats), 3)}>{t("ขนม ×3", "Treats ×3")}</Do>
        <Do onClick={() => give([...new Set(SPECIES_IDS.flatMap((sp) => Object.values(OFFERINGS[sp]) as string[]))].slice(0, 12), 2)}>{t("ของเซ่น", "Offerings")}</Do>
        <Do onClick={() => give(DAWN_BOOSTS as string[], 2)}>{t("ของเช้ามืด", "Dawn forage")}</Do>
        <Do onClick={() => give(["churn", "cheesePress", "spindle", "knittingNeedles"], 1)}>{t("เครื่องแปรรูป", "Making tools")}</Do>
      </Row>
      <Row label={t("แต้มสายเลี้ยงสัตว์", "The line's points")} value={<span className="font-data text-meta tabular-nums text-ink">{t("ขั้น", "rank")} {rankOf("animals", trial.lines().lines.animals.points)} · {Math.round(trial.lines().lines.animals.points)}</span>}>
        {[0, 50, 400, 3000, 12000].map((n) => <Do key={n} onClick={() => { trial.setLine("animals", n); say(t(`ตั้งแต้ม ${n}`, `${n} points`)); }}>{n}</Do>)}
      </Row>
      <Row label={t("ลม พิณ เกวียน", "Wind, harp, wagon")} value={<span className="text-meta text-muted">{world.spells.filter((x) => x.until > now).map((x) => x.kind).join(", ") || "–"}</span>}>
        <Do onClick={() => { trial.animalSpell("wind"); say(t("ลมฤดูใบไม้ผลิพัดแล้ว (ออกจากฟาร์มแล้วเข้าใหม่)", "Spring wind blowing (leave the farm and come back)")); }}>{t("ลมฤดูใบไม้ผลิ", "Spring wind")}</Do>
        <Do onClick={() => { trial.animalSpell("harp"); say(t("เสียงพิณ 30 นาที", "The harp, 30 minutes")); }}>{t("พิณ", "Harp")}</Do>
        <Do onClick={() => { trial.animalWagon(); say(t("เกวียนหญ้าออกจากฟาร์มแล้ว", "The hay wagon sets off")); }}>{t("เกวียนหญ้า", "Hay wagon")}</Do>
      </Row>
      <Row label={t("เริ่มฟาร์มสัตว์ใหม่", "Begin the animal farm again")} value={<span className="text-meta text-muted">{Object.keys(POPOTO_SHOP).length} {t("ของในร้าน", "on the shelf")}</span>}>
        <Do onClick={() => { trial.animalsClear(); say(t("ล้างสัตว์และโรงทั้งหมดแล้ว", "Every animal and barn cleared")); }}>{t("ล้างทั้งหมด", "Clear all")}</Do>
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

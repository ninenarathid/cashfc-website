import { OLD_FX } from "./forged";
import { ALL, GEM_FX, OPTIONS, WIND_WALK, optN, type Element, type OptionId, type ToolKind } from "./tools";

/**
 * What an option and a gem do, in a line: the words of the smith's cards (a draw's two options to choose from; a
 * tool's own card, which says of its options and of the gem set in it what each does). Nothing else in the game says
 * these: they are read only by whoever has the option laid out before them, or the gem set.
 *
 * Every number in a line is read from the registry (lib/town/tools), never written here: a knob turned there turns
 * the words. Pure.
 */
export interface Words { th: string; en: string }
const w = (th: string, en: string): Words => ({ th, en });
const pct = (share: number) => Math.round(share * 100);
/** How often a counted option works, in words: a day's or a meal's count. Nothing, of one that is not counted. */
export function countWords(id: OptionId): Words | null {
  const use = (OPTIONS[id] as { use?: { n: number; per: "day" | "meal" } }).use;
  if (!use) return null;
  return use.per === "day" ? w(`วันละ ${use.n} ครั้ง`, use.n === 1 ? "once a day" : `${use.n} a day`) : w(`${use.n} ครั้งแรกของแต่ละมื้อ`, `the first ${use.n} of a meal's hours`);
}
const used = (id: OptionId): number => (OPTIONS[id] as { use?: { n: number } }).use?.n ?? 0;

/** What an option does. */
export function optionDoes(id: OptionId): Words {
  const n = (key: string) => optN(id, key), u = used(id);
  switch (id) {
    // ── the pick ──
    case "pkPeek": return w("แตะหินเพื่อรู้ว่าข้างในเป็นหินเปล่า เศษแร่ หรือสายแร่ โดยไม่ต้องทุบ", "Tap a rock to know what it holds (stone, fragments or a vein) without striking it");
    case "pkCrumb": return w(`หินธรรมดาทุกก้อนที่ ${n("every")} ได้เศษแร่ของชั้นนั้นเพิ่ม ${n("more")}`, `Every ${n("every")}th plain rock gives ${n("more")} more fragment of the floor's ore`);
    case "pkSteady": return w(`ตีสายแร่ได้เพิ่ม ${n("strikes")} ครั้ง`, `${n("strikes")} more strikes at a vein`);
    case "pkLoose": return w(`เมื่อหินแตก หินที่ติดกันทุบน้อยลง ${n("fewer")} ครั้ง`, `When a rock breaks, the rocks touching it take ${n("fewer")} swing fewer`);
    case "pkFresh": return w(`หิน ${u} ก้อนแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} rocks of a meal's hours cost no stamina`);
    case "pkCutter": return w(`สายพลอยให้เศษพลอยเพิ่ม ${n("more")}`, `A gem vein gives ${n("more")} more gem fragment`);
    case "pkQuake": return w(`ทุบครั้งเดียว หินรอบตัวทั้ง 8 ช่องแตกหมด · วันละ ${u} ครั้ง`, `One swing breaks every rock in the 8 tiles round you · ${u} a day`);
    case "pkTwin": return w(`สายแร่เล่นได้ ${n("times")} รอบ · วันละ ${u} ครั้ง`, `A vein is played ${n("times")} times over · ${u} a day`);
    case "pkDrill": return w(`ทุบพื้นเปิดทางลงเองได้ และเปิดให้ทุกคน · วันละ ${u} ครั้ง`, `Strike the floor to open the way down yourself, for everybody · ${u} a day`);
    case "pkGleam": return w("หินผลึกให้ของเพิ่มอีกครึ่งเท่า และรู้ว่าวันนี้อยู่ชั้นไหน", "The crystal rock gives half as much again, and you know which floor has it today");
    // ── the axe ──
    case "axGrain": return w(`เห็นกิ่งล่วงหน้าไกลขึ้น ${n("ahead")} ท่อน`, `Branches are seen ${n("ahead")} segments further ahead`);
    case "axDust": return w(`ต้นไม้ทุกต้นที่ ${n("every")} ได้ท่อนไม้เพิ่ม ${n("more")}`, `Every ${n("every")}th tree gives ${n("more")} more log`);
    case "axKeen": return w(`ฟันน้อยลง ${n("chops")} ครั้งต่อต้น`, `${n("chops")} chops fewer a tree`);
    case "axResin": return w(`ต้นไม้ 1 ใน ${n("in")} ต้นได้ยางไม้หรือลูกสนด้วย`, `1 tree in ${n("in")} also gives a resin or a pine cone`);
    case "axFresh": return w(`ต้นไม้ ${u} ต้นแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} trees of a meal's hours cost no stamina`);
    case "axDry": return w(`ไม้เนื้อดี 1 ท่อนหลอมได้ ${n("pieces")} ชิ้น (แค่มีขวานเล่มนี้ในกระเป๋า)`, `1 fine timber smelts ${n("pieces")} pieces (with this axe in the bag)`);
    case "axOne": return w(`ฟันทีเดียวล้ม ไม่ต้องเล่นเกม · วันละ ${u} ต้น`, `A tree falls at one chop, with no game · ${u} a day`);
    case "axDouble": return w(`ต้นไม้ที่ล้มให้ไม้ ${n("by")} เท่า · วันละ ${u} ต้น`, `A felled tree gives ${n("by")} times the wood · ${u} a day`);
    case "axRoot": return w(`ตอที่เพิ่งตัดโตกลับทันทีสำหรับทุกคน · วันละ ${u} ครั้ง`, `The stump just made grows back at once, for everybody · ${u} a day`);
    case "axElder": return w("ต้นไม้โบราณให้ของเพิ่มอีกครึ่งเท่า และรู้ว่าโตเมื่อไร", "The ancient tree gives half as much again, and you know when it is grown");
    // ── the rod ──
    case "rdBait": return w("ตวัดเร็วไปครั้งแรกของแต่ละการเหวี่ยง ปลาไม่ตกใจและเหยื่อไม่หาย", "The first strike too soon of a cast neither scares the fish nor loses the bait");
    case "rdCalm": return w(`ช่วงปลอดภัยไม่ขยับในวินาทีแรกของการสู้ปลา`, `The safe stretch does not move in a fight's first ${n("secs") === 1 ? "second" : `${n("secs")} seconds`}`);
    case "rdFresh": return w(`สู้ปลา ${u} ครั้งแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} fights of a meal's hours cost no stamina`);
    case "rdQuick": return w(`รอปลากินเหยื่อสั้นลง ${pct(n("shorter"))}%`, `The wait for a bite is ${pct(n("shorter"))}% shorter`);
    case "rdGold": return w(`ตวัดติดแน่นอนถ้าตวัดภายใน ${n("secs")} วินาทีหลังปลากิน · วันละ ${u} ครั้ง`, `A strike takes if made within ${n("secs")} s of the bite · ${u} a day`);
    case "rdStill": return w(`ปลาทุกตัวคึกน้อยลงครึ่งหนึ่ง นาน ${n("mins")} นาที · วันละ ${u} ครั้ง`, `Every fish half as lively for ${n("mins")} minutes · ${u} a day`);
    case "rdCall": return w(`เหวี่ยงเบ็ดแล้วปลากินทันที · วันละ ${u} ครั้ง`, `A line dropped is bitten at once · ${u} a day`);
    // ── the hoe ──
    case "hoClear": return w(`ถอนวัชพืชมีก้อนหินน้อยลง ${n("stones")} ก้อน`, `The weeding has ${n("stones")} stones fewer`);
    case "hoFirst": return w("พลาดครั้งแรกของแต่ละแปลงไม่นับ", "The first miss on a plot is not counted");
    case "hoFresh": return w(`${u} แปลงแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} plots of a meal's hours cost no stamina`);
    case "hoLight": return w("ตัวชี้ไม่เร่งขึ้นหลังตีโดน", "The marker does not quicken after a hit");
    case "hoBoth": return w(`แปลงรกถางและพรวนจบในเกมเดียว · วันละ ${u} แปลง`, `A wild plot is cleared and tilled in one game · ${u} a day`);
    case "hoGrip": return w(`หมดแรงแล้วจอบก็ไม่หลุดมือเมื่อพลาดครั้งที่สาม · วันละ ${u} แปลง`, `With no stamina the hoe is not dropped at the third miss · ${u} plots a day`);
    case "hoWet": return w(`แปลงที่พรวนนับว่ารดน้ำแล้ว 1 ครั้ง · วันละ ${u} แปลง`, `A plot tilled counts as watered once · ${u} a day`);
    // ── the watering can ──
    case "cnDrop": return w(`เติมน้ำครั้งหนึ่งรดได้เพิ่ม ${n("more")} ครั้ง`, `${n("more")} more watering a filling`);
    case "cnThrift": return w(`เติมบัวครั้งหนึ่งใช้น้ำบ่อ ${n("takes")} ถัง แทน 2 ถัง`, `A filling takes ${n("takes")} of the well's bucketfuls, not 2`);
    case "cnFresh": return w(`รดน้ำ ${u} ครั้งแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} waterings of a meal's hours cost no stamina`);
    case "cnKind": return w(`รดน้ำให้ต้นของคนอื่น ได้แต้มสายผู้ช่วยเพิ่ม ${n("points")}`, `${n("points")} more helpers' point for watering another's plant`);
    case "cnRain": return w(`รดครั้งเดียวเปียกทั้งแถวในแปลงของตัวเอง · วันละ ${u} ครั้ง`, `One watering wets the whole row of your own bed · ${u} a day`);
    case "cnFull": return w(`${n("mins")} นาทีที่รดน้ำไม่เปลืองน้ำ · วันละ ${u} ครั้ง`, `${n("mins")} minutes in which watering uses no water · ${u === 1 ? "once" : u} a day`);
    case "cnTwice": return w(`ต้นที่รดไปแล้วในชั่วโมงนี้ รดซ้ำได้อีกครั้ง · วันละ ${u} ครั้ง`, `A plot already watered this hour may be watered once more · ${u} a day`);
    // ── the insect net ──
    case "ntAgain": return w("ตวัดครั้งต่อไปได้เร็วขึ้นเท่าตัว", "The next swing can begin in half the time");
    case "ntMesh": return w(`แมลงทนการพลาดได้อีก ${n("misses")} ครั้งก่อนหนีไป`, `An insect bears ${n("misses")} more miss before it is off`);
    case "ntFresh": return w(`จับแมลง ${u} ครั้งแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} catches of a meal's hours cost no stamina`);
    case "ntLong": return w(`เอื้อมได้ไกลขึ้น ${n("reach")} ช่อง`, `Reach ${n("reach")} tile longer`);
    case "ntWide": return w(`ตวัดครั้งเดียวได้แมลงทุกตัวในระยะ ${n("reach")} ช่อง · วันละ ${u} ครั้ง`, `One swing takes every insect within ${n("reach")} tiles · ${u} a day`);
    case "ntFreeze": return w(`แมลงที่เล็งไว้อยู่นิ่ง ${n("secs")} วินาที · วันละ ${u} ครั้ง`, `The insect aimed at holds still ${n("secs")} s · ${u} a day`);
    case "ntNest": return w("จุดแมลงที่เพิ่งว่างบอกว่าจะมีตัวใหม่เมื่อไร", "A haunt just emptied says when it will have another");
    // ── cookware ──
    case "ckFire": return w("ไฟลุกพรึ่บน้อยลงครึ่งหนึ่ง และจังหวะคนไม่เปลี่ยนความเร็ว", "The roast flares half as often, and the stir's pace does not change speed");
    case "ckBase": return w("พลาดครั้งแรกของแต่ละหม้อไม่เสียที่", "The first miss of a pot loses no helping");
    case "ckFresh": return w("หม้อแรกของแต่ละมื้อไม่เสีย stamina", "The first pot of a meal's hours costs no stamina");
    case "ckBrisk": return w(`การคนและการย่างสั้นลง ${pct(n("shorter"))}%`, `The stirring and the roast are ${pct(n("shorter"))}% shorter`);
    case "ckBig": return w(`หม้อนี้ได้เพิ่ม ${n("more")} ที่ · วันละ ${u} หม้อ`, `A pot gives ${n("more")} more helpings · ${u} pots a day`);
    case "ckWarm": return w(`บัฟของอาหารจากหม้อนี้นานขึ้น ${n("hours")} ชั่วโมง · วันละ ${u} หม้อ`, `The buff of a dish from this pot lasts ${n("hours")} hour longer · ${u} pots a day`);
    case "ckScent": return w(`ทุกคนที่กินจากหม้อนี้ได้ stamina เพิ่ม ${n("stamina")} · วันละ ${u} หม้อ`, `Everybody who eats from this pot has ${n("stamina")} more stamina · ${u} pots a day`);
  }
}

const step = (steps: readonly number[], level: number): number => steps[Math.max(1, Math.min(steps.length, level)) - 1];
/** What the wind does in any tool: the same for every kind. */
const windWords = (level: number): Words => { const p = pct(step(WIND_WALK, level)); return w(`ถือไว้แล้วเดินเร็วขึ้น ${p}%`, `Walk ${p}% faster with it held`); };
/** What a gem's element does in the pick or the axe, at the level it works at. */
function newToolGem(kind: "pick" | "axe", element: Element, level: number): Words {
  const pick = kind === "pick";
  switch (element) {
    case "fire": { const p = pct(step(GEM_FX.fire[kind].fewer, level)); return pick ? w(`ทุบหินน้อยลง ${p}%`, `${p}% fewer swings a rock`) : w(`ฟันน้อยลง ${p}%`, `${p}% fewer chops a tree`); }
    case "water": {
      const n = pick ? step(GEM_FX.water.pick.back, level) : step(GEM_FX.water.axe.spared, level);
      return pick ? w(`ในเกมสายแร่ ตีโดนปมได้คืน ${n} ครั้ง`, `In the vein game, ${n} strike${n > 1 ? "s" : ""} that hit a knot ${n > 1 ? "are" : "is"} given back`)
        : w(`โดนกิ่ง ${n} ครั้งแรกไม่นับว่าพลาด`, `The first ${n} branch${n > 1 ? "es" : ""} hit ${n > 1 ? "are" : "is"} no miss`);
    }
    case "ice": {
      if (pick) { const n = step(GEM_FX.ice.pick.cross, level); return w(`ในเกมสายแร่ ปม ${n} จุดเป็นน้ำแข็งที่รอยร้าวข้ามได้`, `In the vein game ${n} knot${n > 1 ? "s are" : " is"} ice the crack may cross`); }
      const p = pct(step(GEM_FX.ice.axe.slow, level));
      return w(`แถบเวลาเดินช้าลง ${p}%`, `The time bar runs ${p}% slower`);
    }
    case "earth": { const p = pct(step(GEM_FX.earth[kind].stamina, level)); return pick ? w(`ทุบหินเสีย stamina น้อยลง ${p}%`, `${p}% less stamina a rock`) : w(`ตัดไม้เสีย stamina น้อยลง ${p}%`, `${p}% less stamina a tree`); }
    case "lightning": { const p = pct(step(GEM_FX.lightning[kind].chain, level)); return pick ? w(`${p}% ที่หินก้อนติดกันจะแตกด้วย`, `${p}% that a touching rock breaks too`) : w(`${p}% ที่ต้นข้างเคียงจะถูกตัดไปครึ่งหนึ่ง`, `${p}% that a neighbouring tree is half cut`); }
    case "wind": return windWords(level);
    case "light": {
      const n = step(GEM_FX.light[kind].glint, level);
      if (pick) return n >= ALL ? w("หินที่มีสายแร่ส่องประกายทั้งชั้น", "Vein rocks glint over the whole floor") : w(`หินที่มีสายแร่ส่องประกายในระยะ ${n} ช่อง`, `Vein rocks glint within ${n} tiles`);
      return n >= ALL ? w("ต้นไม้ที่โตแล้วส่องประกายทั้งแผนที่", "Grown trees glint over the whole map") : w(`ต้นไม้ที่โตแล้วส่องประกายในระยะ ${n} ช่อง`, `Grown trees glint within ${n} tiles`);
    }
    case "dark": {
      if (pick) { const x = step(GEM_FX.dark.pick.veins, level), k = step(GEM_FX.dark.pick.swings, level); return w(`เจอสายแร่บ่อยขึ้น ${x} เท่า แต่หินทุกก้อนต้องทุบเพิ่ม ${k} ครั้ง`, `Veins ${x} times as often; every rock takes ${k} swing more`); }
      const p = pct(step(GEM_FX.dark.axe.log, level)), f = pct(step(GEM_FX.dark.axe.faster, level));
      return w(`${p}% ได้ท่อนไม้เพิ่ม 1 แต่แถบเวลาเร็วขึ้น ${f}%`, `${p}% for one more log; the time bar runs ${f}% faster`);
    }
  }
}
const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);
/**
 * What a gem's element does in one of the seven older tools, at the level it works at: every number from
 * lib/town/forged's table, which is what the games read. Null where the table has nothing for that tool.
 */
function oldToolGem(kind: ToolKind, element: Element, level: number): Words | null {
  const fam = kind === "pot" || kind === "pan" || kind === "grill" ? "cook" : (kind as "rod" | "hoe" | "can" | "bugNet");
  const F = OLD_FX;
  switch (element) {
    case "fire":
      if (fam === "rod") { const p = pct(step(F.fire.rod.tires, level)); return w(`ปลาเหลือสายให้สู้น้อยลง ${p}%`, `The fish has ${p}% less line to be won`); }
      if (fam === "hoe") { const n = step(F.fire.hoe.fewer, level); return w(`แต่ละแปลงตีน้อยลง ${n} ครั้ง`, `${n} ${plural(n, "hit", "hits")} fewer a plot`); }
      if (fam === "can") { const n = step(F.fire.can.more, level); return w(`เติมน้ำครั้งหนึ่งรดได้เพิ่ม ${n} ครั้ง`, `${n} more ${plural(n, "watering", "waterings")} a filling`); }
      if (fam === "bugNet") { const p = pct(step(F.fire.bugNet.sooner, level)); return w(`สวิงลงถึงตัวเร็วขึ้น ${p}%`, `The swing lands ${p}% sooner`); }
      { const p = pct(step(F.fire.cook.shorter, level)); return w(`คนน้อยลง ${p}%`, `${p}% fewer stirs a pot`); }
    case "water": {
      const n = step(F.water.spared, level);
      if (fam === "rod") return w(`ตวัดเร็วไป ${n} ครั้งแรกของแต่ละครั้งที่เหวี่ยงไม่นับ`, `The first ${n} ${plural(n, "strike", "strikes")} too soon of a cast ${plural(n, "is", "are")} not counted`);
      if (fam === "hoe") return w(`พลาด ${n} ครั้งแรกของแต่ละแปลงไม่นับ`, `The first ${n} ${plural(n, "miss", "misses")} on a plot ${plural(n, "is", "are")} not counted`);
      if (fam === "can") return w(`พลาด ${n} ครั้งแรกของการรดแต่ละครั้งไม่นับ`, `The first ${n} ${plural(n, "miss", "misses")} of a pour ${plural(n, "is", "are")} not counted`);
      if (fam === "bugNet") return w(`พลาด ${n} ครั้งแรกกับแมลงแต่ละตัวไม่นับ`, `The first ${n} ${plural(n, "miss", "misses")} at an insect ${plural(n, "is", "are")} not counted`);
      return w(`พลาด ${n} ครั้งแรกของแต่ละหม้อไม่เสียที่`, `The first ${n} ${plural(n, "miss", "misses")} of a pot ${plural(n, "loses", "lose")} no helping`);
    }
    case "ice": {
      const p = pct(step(F.ice.slow, level));
      if (fam === "rod") return w(`ช่วงของปลาขยับช้าลง ${p}%`, `The fish's stretch moves ${p}% slower`);
      if (fam === "hoe") return w(`ตัวชี้และลมตอนถอนวัชพืชช้าลง ${p}%`, `The marker and the weeding's gusts are ${p}% slower`);
      if (fam === "can") return w(`น้ำตอนรดไหลช้าลง ${p}%`, `The pour's water runs ${p}% slower`);
      if (fam === "bugNet") return w(`แมลงหนีช้าลง ${p}%`, `An insect makes off ${p}% slower`);
      return w(`หลุดจังหวะได้นานขึ้นก่อนจะเสีย (ช้าลง ${p}%)`, `A slip may last longer before it costs (${p}% slower)`);
    }
    case "earth": {
      const p = pct(step(F.earth.stamina, level));
      const what: Record<typeof fam, [string, string]> = { rod: ["สู้ปลา", "a fight"], hoe: ["ทำแปลง", "a plot"], can: ["รดน้ำ", "a watering"], bugNet: ["จับแมลง", "a catch"], cook: ["ทำอาหาร", "a pot"] };
      return w(`${what[fam][0]}เสีย stamina น้อยลง ${p}%`, `${p}% less stamina ${what[fam][1]}`);
    }
    case "lightning": {
      const p = pct(step(F.lightning.chance, level));
      if (fam === "rod") return w(`${p}% ที่เหยื่อไม่หมดไป`, `${p}% that the bait is not used up`);
      if (fam === "hoe") return w(`${p}% ที่แปลงถัดไปในแถวเสร็จไปด้วย`, `${p}% that the next plot of the row is done too`);
      if (fam === "can") return w(`${p}% ที่แปลงถัดไปได้น้ำไปด้วย`, `${p}% that the next plot is watered too`);
      if (fam === "bugNet") return w(`${p}% ที่ได้แมลงอีกตัวติดมาด้วย`, `${p}% that another insect comes with the one caught`);
      return w(`${p}% ที่หม้อได้เพิ่ม 1 ที่`, `${p}% that a pot has one more helping`);
    }
    case "wind": return windWords(level);
    case "light":
      if (fam === "rod") { const s = step(F.light.rod.early, level); return w(`ทุ่นระยิบก่อนปลากิน ${s} วินาที`, `The float shimmers ${s} s before the bite`); }
      if (fam === "hoe") return w("ก้อนหินตอนถอนวัชพืชเรืองแสงให้เห็น", "The weeding's stones glow");
      if (fam === "can") { const n = step(F.light.can.glint, level); return n >= ALL ? w("ต้นที่รดได้ตอนนี้ส่องประกายทั้งแปลง", "Plants that can be watered now glint over the whole bed") : w(`ต้นที่รดได้ตอนนี้ส่องประกายในระยะ ${n} ช่อง`, `Plants that can be watered now glint within ${n} tiles`); }
      if (fam === "bugNet") { const n = step(F.light.bugNet.seen, level); return w(`เห็นแมลงที่ซ่อนอยู่ในระยะ ${n} ช่อง`, `Insects that hide are seen within ${n} tiles`); }
      return null;
    case "dark":
      if (fam === "rod") { const x = step(F.dark.rod.rare, level), f = pct(F.dark.rod.fiercer); return w(`ปลาหายากมาบ่อยขึ้น ${x} เท่า แต่ปลาทุกตัวดุขึ้น ${f}%`, `Rare fish ${x} times as often; every fish ${f}% fiercer`); }
      if (fam === "hoe") { const p = pct(step(F.dark.hoe.worm, level)), f = pct(F.dark.hoe.faster); return w(`${p}% ที่พรวนแล้วเจอไส้เดือน แต่ตัวชี้เร็วขึ้น ${f}%`, `${p}% that a tilled plot turns up a worm; the marker ${f}% faster`); }
      if (fam === "can") { const p = pct(step(F.dark.can.more, level)), k = F.dark.can.uses; return w(`รดครั้งหนึ่งต้นโตเพิ่ม ${p}% แต่ใช้น้ำ ${k} ครั้ง`, `A watering adds ${p}% more growth, and uses ${k}`); }
      if (fam === "bugNet") { const x = step(F.dark.bugNet.rare, level), f = pct(F.dark.bugNet.smaller); return w(`แมลงหายากมาบ่อยขึ้น ${x} เท่า แต่วงสวิงเล็กลง ${f}%`, `Rare insects ${x} times as often; the ring ${f}% smaller`); }
      { const p = pct(step(F.dark.cook.helping, level)), f = pct(F.dark.cook.harder); return w(`${p}% ที่หม้อได้เพิ่ม 1 ที่ แต่จังหวะที่ดีแคบลง ${f}%`, `${p}% that a pot has one more helping; its good pace ${f}% narrower`); }
  }
}
/** What a gem's element does in a kind of tool, at the level it works at: null where nothing says. */
export function gemDoes(kind: ToolKind, element: Element, level: number): Words | null {
  if (level < 1) return null;
  return kind === "pick" || kind === "axe" ? newToolGem(kind, element, level) : oldToolGem(kind, element, level);
}

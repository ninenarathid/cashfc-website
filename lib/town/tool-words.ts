import { OLD_FX, canFx, cookFx, hoeFx, netFx, rodFx } from "./forged";
import {
  ALL, FORGE, GEM_FX, LEVELS, OPTIONS, ROCKS, WIND_WALK, axeAhead, axeBarSlow, axeChops, levelOf, optN, pickSwings, toolKindOf, veinStrikes,
  type Element, type OptionId, type ToolKind,
} from "./tools";
import type { Stack } from "./trade";
import { powerRule } from "./powers";
import { TREES } from "./trees";

/**
 * What an option and a gem do, in a line: the words of the smith's cards (a draw's two options to choose from; a
 * tool's own card, which says of its options and of the gem set in it what each does; the gems leaf, which says of
 * each gem held what it would do in the tool on the anvil). Nothing else in the game says these: they are read only
 * by whoever has the option laid out before them, or the gem in hand.
 *
 * Every number in a line is read from the registry (lib/town/tools), never written here: a knob turned there turns
 * the words. Pure.
 */
export interface Words { th: string; en: string }
const w = (th: string, en: string): Words => ({ th, en });
const pct = (share: number) => Math.round(share * 100);
/** How often a counted option works, in words: a day's or a meal's count. Nothing, of one that is not counted. */
export function countWords(id: OptionId, stack?: Stack | null): Words | null {
  const use = powerRule(id, stack);
  if (!use) return null;
  return use.per === "day" ? w(`วันละ ${use.n} ครั้ง`, use.n === 1 ? "once a day" : `${use.n} a day`) : w(`${use.n} ครั้งแรกของแต่ละมื้อ`, `the first ${use.n} of a meal's hours`);
}

/** What an option does. */
export function optionDoes(id: OptionId, stack?: Stack | null): Words {
  const n = (key: string) => optN(id, key, stack), u = powerRule(id, stack)?.n ?? 0;
  switch (id) {
    // ── the pick ──
    case "pkPeek": return w(`แตะหินเพื่อรู้ว่าข้างในเป็นหินเปล่า เศษแร่ หรือสายแร่ โดยไม่ต้องทุบ${n("strikes") ? ` · ตีสายแร่เพิ่ม ${n("strikes")} ครั้ง` : ""}`, `Tap a rock to know what it holds without striking it${n("strikes") ? ` · ${n("strikes")} more vein strikes` : ""}`);
    case "pkCrumb": return w(`หินธรรมดาทุกก้อนที่ ${n("every")} ได้เศษแร่ของชั้นนั้นเพิ่ม ${n("more")}`, `Every ${n("every")}th plain rock gives ${n("more")} more fragment of the floor's ore`);
    case "pkSteady": return w(`ในมินิเกมขุดสายแร่ มีจำนวนครั้งให้ตีเพิ่ม ${n("strikes")} ครั้ง`, `${n("strikes")} more strikes in the vein minigame`);
    case "pkLoose": return w(`เมื่อหินแตก หินที่ติดกันทุบน้อยลง ${n("fewer")} ครั้ง`, `When a rock breaks, the rocks touching it take ${n("fewer")} swing fewer`);
    case "pkFresh": return w(`หิน ${u} ก้อนแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} rocks of a meal's hours cost no stamina`);
    case "pkCutter": return w(`สายพลอยให้เศษพลอยเพิ่ม ${n("more")}`, `A gem vein gives ${n("more")} more gem fragment`);
    case "pkQuake": return w(`ทุบครั้งเดียว หินในระยะ ${n("reach")} ช่องแตกด้วย · วันละ ${u} ครั้ง`, `One swing also breaks rocks within ${n("reach")} tiles · ${u} a day`);
    case "pkTwin": return w(`เล่นมินิเกมขุดสายแร่สำเร็จแล้ว ได้ของที่ขุดได้ ${n("times")} เท่าทันที · วันละ ${u} ครั้ง`, `Multiply the vein minigame's earned loot by ${n("times")} immediately · ${u} a day`);
    case "pkDrill": return w(`กดใช้เพื่อเปิดทางลงเหมืองชั้นถัดไป โดยไม่ต้องหาหินที่ซ่อนทางลง ทุกคนใช้ทางนี้ได้ · วันละ ${u} ครั้ง`, `Activate to open the way to the next mine floor without finding the ladder rock; everyone can use it · ${u} a day`);
    case "pkGleam": return w("หินผลึกให้ของเพิ่ม 50% บอกชั้นที่มีหินผลึกวันนี้ และทำให้หินที่มีสายแร่ส่องประกายทั้งชั้น", "Crystal rocks give 50% more loot; reveal today's crystal floor and make every vein rock glint");
    // ── the axe ──
    case "axGrain": return w(`ในมินิเกมตัดไม้ เห็นกิ่งล่วงหน้าเพิ่ม ${n("ahead")} ท่อน เพื่อเลือกด้านฟันได้ง่ายขึ้น`, `Preview ${n("ahead")} more trunk segments in the felling minigame to choose a safe side`);
    case "axDust": return w(`ต้นไม้ทุกต้นที่ ${n("every")} ได้ท่อนไม้เพิ่ม ${n("more")}`, `Every ${n("every")}th tree gives ${n("more")} more log`);
    case "axKeen": return w(`ฟันน้อยลง ${n("chops")} ครั้งต่อต้น`, `${n("chops")} chops fewer a tree`);
    case "axResin": return w(`ต้นไม้ 1 ใน ${n("in")} ต้นได้ยางไม้หรือลูกสนด้วย`, `1 tree in ${n("in")} also gives a resin or a pine cone`);
    case "axFresh": return w(`ต้นไม้ ${u} ต้นแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} trees of a meal's hours cost no stamina`);
    case "axDry": return w(`ไม้เนื้อดี 1 ท่อนหลอมได้ ${n("pieces")} ชิ้น (แค่มีขวานเล่มนี้ในกระเป๋า)`, `1 fine timber smelts ${n("pieces")} pieces (with this axe in the bag)`);
    case "axOne": return w(`ต้นไม้ทั่วไปล้มในครั้งเดียว โดยข้ามมินิเกมตัดไม้ · วันละ ${u} ต้น`, `Fell an ordinary tree in one chop, skipping the felling minigame · ${u} a day`);
    case "axDouble": return w(`ต้นไม้ที่ล้มให้ไม้ ${n("by")} เท่า · วันละ ${u} ต้น`, `A felled tree gives ${n("by")} times the wood · ${u} a day`);
    case "axRoot": return w(`ใช้กับตอที่คุณเพิ่งตัดภายใน ${TREES.root.within / 60} นาที: ตอของคุณในระยะ ${n("reach")} ช่อง สูงสุด ${n("trees")} ต้น โตกลับทันทีให้ทุกคนตัดได้ ไม่รวมต้นไม้โบราณ · วันละ ${u} ครั้ง`, `Use on a stump you made within ${TREES.root.within / 60} minutes: regrow up to ${n("trees")} of your stumps within ${n("reach")} tiles for everyone, excluding the ancient tree · ${u} a day`);
    case "axElder": return w("ตัดต้นไม้โบราณได้ของเพิ่ม 50% เห็นกิ่งทั้งหมดในมินิเกมก่อนฟัน และเห็นเวลาที่ต้นไม้โบราณจะโตกลับ", "The ancient tree gives 50% more loot; preview every branch before felling and see its regrowth time");
    // ── the rod ──
    case "rdBait": return w(`ตวัดเร็วไปครั้งแรก ปลาไม่ตกใจและเหยื่อไม่หาย${n("strike") ? ` · จังหวะตวัดกว้างขึ้น ${pct(n("strike"))}% ของเบ็ดเริ่มต้น` : ""}`, `The first early strike preserves the bait${n("strike") ? ` · strike window gains ${pct(n("strike"))}% of the starter rod's window` : ""}`);
    case "rdCalm": return w(`ในมินิเกมสู้ปลา แถบปลอดภัยอยู่นิ่งใน ${n("secs")} วินาทีแรก ทำให้คุมตัวชี้ง่ายขึ้น`, `The safe zone stays still for the first ${n("secs")} seconds of the fishing fight`);
    case "rdFresh": return w(`สู้ปลา ${u} ครั้งแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} fights of a meal's hours cost no stamina`);
    case "rdQuick": return w(`รอปลากินเหยื่อสั้นลง ${pct(n("shorter"))}%`, `The wait for a bite is ${pct(n("shorter"))}% shorter`);
    case "rdGold": return w(`ตวัดช้าไปก็ยังติด ถ้าตวัดภายใน ${n("secs")} วินาทีหลังปลากิน · วันละ ${u} ครั้ง`, `A strike that comes too late still takes, if made within ${n("secs")} s of the bite · ${u} a day`);
    case "rdStill": return w(`เมื่อปลาระดับสูงกว่าธรรมดาติดเบ็ด จะทำให้แถบปลอดภัยในมินิเกมสู้ปลาขยับช้าลง ${pct(1 - n("by"))}% นาน ${n("mins")} นาที มีผลกับปลาที่คุณตกช่วงนั้น · วันละ ${u} ครั้ง`,
      `Hook a fish above common quality to slow your fishing fight's safe zone by ${pct(1 - n("by"))}% for ${n("mins")} minutes · ${u} a day`);
    case "rdCall": return w(`เหวี่ยงเบ็ดแล้วปลากินทันที · วันละ ${u} ครั้ง`, `A line dropped is bitten at once · ${u} a day`);
    // ── the hoe ──
    case "hoClear": return w(`มินิเกมถางหญ้า: มีก้อนหินที่กดโดนแล้วนับว่าพลาดน้อยลงสูงสุด ${n("stones")} ก้อน ช่วยให้เลือกกดต้นหญ้าได้ง่ายขึ้น`, `Weeding minigame: remove up to ${n("stones")} stone obstacles that count as misses when tapped, making weeds easier to pick`);
    case "hoFirst": return w(`ในมินิเกมถางหญ้าและพรวนดิน ไม่นับการกดพลาด ${n("misses")} ครั้งแรกของแต่ละแปลง`, `Ignore the first ${n("misses")} misses per plot in the weeding and tilling minigames`);
    case "hoFresh": return w(`ถางหญ้าหรือพรวนดิน ${u} แปลงแรกหลังอาหารแต่ละมื้อ ไม่เสีย stamina`, `The first ${u} weeding or tilling actions of a meal's hours cost no stamina`);
    case "hoLight": return w(`มินิเกมพรวนดิน: ตัวชี้ไม่เร่งความเร็วหลังคุณกดถูกจังหวะ${n("band") ? ` และแถบที่ต้องกดให้โดนกว้างขึ้น ${pct(n("band") - 1)}%` : ""}`, `Tilling minigame: the marker does not speed up after a hit${n("band") ? `; the target zone is ${pct(n("band") - 1)}% wider` : ""}`);
    case "hoBoth": return w(`เล่นมินิเกมถางหญ้าหรือพรวนดินสำเร็จครั้งเดียว เตรียมดินในแถวของคุณให้พร้อมปลูกสูงสุด ${n("plots")} ช่อง · วันละ ${u} ครั้ง`, `Finish one weeding or tilling minigame to prepare up to ${n("plots")} plots in your row for planting · ${u} a day`);
    case "hoGrip": return w(`เมื่อ stamina หมด มินิเกมถางหญ้าขยับช้าลง และมินิเกมพรวนดินมีแถบกดกว้างขึ้นกับตัวชี้ช้าลง ช่วยให้เล่นง่ายขึ้น แต่ยังล้มเหลวได้ · วันละ ${u} แปลง`, `At zero stamina, weeding moves more slowly and tilling has a wider target zone and slower marker; failure is still possible · ${u} plots a day`);
    case "hoWet": return w(`แปลงที่พรวนเก็บความชื้น พืชที่ปลูกไม่ต้องรดน้ำตลอดรอบปลูก · วันละ ${u} แปลง`, `Tilled soil stays moist throughout its planted crop's life · ${u} plots a day`);
    // ── the watering can ──
    case "cnDrop": return w(`เติมน้ำครั้งหนึ่งรดได้เพิ่ม ${n("more")} ครั้ง`, `${n("more")} more ${n("more") === 1 ? "watering" : "waterings"} a filling`);
    case "cnThrift": return w(`เติมบัวใช้น้ำบ่อ ${n("takes")} ถัง แทน 2 ถัง${n("more") ? ` · จุเพิ่ม ${n("more")} ครั้ง` : ""}`, `A filling takes ${n("takes")} bucketfuls${n("more") ? ` · ${n("more")} more waterings` : ""}`);
    case "cnFresh": return w(`รดน้ำ ${u} ครั้งแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} waterings of a meal's hours cost no stamina`);
    case "cnKind": return w(`รดน้ำให้ต้นของคนอื่น ได้แต้มสายผู้ช่วยเพิ่ม ${n("points")}`, `${n("points")} more helpers' point for watering another's plant`);
    case "cnRain": return w(`รดน้ำต้นของคุณ 1 ต้น แล้วรดต้นอื่นที่ยังต้องการน้ำในแปลงของคุณทั้งหมดไปด้วย · วันละ ${u} ครั้ง`, `Water one of your plants to also water every eligible plant in your bed · ${u} a day`);
    case "cnFull": return w(`เริ่มเมื่อรดน้ำต้นที่ยังแห้ง: รดน้ำโดยไม่ลดน้ำในบัวนาน ${n("mins")} นาที แต่ยังใช้ stamina ตามปกติ · วันละ ${u} ครั้ง`, `Starts when watering a dry plant: use no can water for ${n("mins")} minutes; normal stamina costs apply · ${u === 1 ? "once" : u} a day`);
    case "cnTwice": return w(`รดน้ำต้นที่ยังแห้ง 1 ครั้ง ได้การเติบโตเท่ากับรด 2 ครั้งอัตโนมัติ ใช้น้ำและ stamina เท่าครั้งเดียว · วันละ ${u} ครั้ง`, `Water a dry plant once for double watering growth automatically, at the water and stamina cost of one · ${u} a day`);
    // ── the insect net ──
    case "ntAgain": return w(`หลังตวัดสวิง รอก่อนตวัดครั้งถัดไปสั้นลง ${pct(1 - n("by"))}%`, `Wait ${pct(1 - n("by"))}% less between net swings`);
    case "ntMesh": return w(`แมลงทนการพลาดได้อีก ${n("misses")} ครั้งก่อนหนีไป`, `An insect bears ${n("misses")} more ${n("misses") === 1 ? "miss" : "misses"} before it is off`);
    case "ntFresh": return w(`จับแมลง ${u} ครั้งแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} catches of a meal's hours cost no stamina`);
    case "ntLong": return w(`เอื้อมได้ไกลขึ้น ${n("reach")} ช่อง`, `Reach ${n("reach")} tile longer`);
    case "ntWide": return w(`ตวัดสวิงครั้งเดียว กวาดจับแมลงที่มองเห็นและจับได้ในระยะ ${n("reach")} ช่อง สูงสุด ${n("catches")} ตัว ต้องมีแมลงอยู่ในระยะ · วันละ ${u} ครั้ง`, `One net swing sweeps up to ${n("catches")} visible, catchable insects within ${n("reach")} tiles; insects must be present · ${u} a day`);
    case "ntFreeze": return w(`แมลงที่เล็งไว้อยู่นิ่ง ${n("secs")} วินาทีตั้งแต่เริ่มตวัด · วันละ ${u} ครั้ง`, `The insect a swing is aimed at holds still for ${n("secs")} s from the moment it begins · ${u} a day`);
    case "ntNest": return w("เห็นว่าจุดไหนมีแมลงแม้ตัวซ่อนอยู่ จุดที่คุณจับจนว่างจะบอกเวลาที่ตัวใหม่อาจกลับมา ช่วยเลือกจุดรอจับ", "Reveal occupied insect spots, even hidden insects, and show the next possible return at spots you emptied");
    // ── cookware ──
    case "ckFire": return w(`มินิเกมทำอาหาร: ทนต่อการคนหลุดจังหวะได้นานขึ้น ${n("steady")} เท่า ช่วยให้มือสะดุดเล็กน้อยแล้วอาหารไม่เสีย`, `Cooking minigame: tolerate off-pace stirring ${n("steady")} times longer before losing a helping`);
    case "ckBase": return w(`มินิเกมทำอาหาร: พลาด ${n("misses")} ครั้งแรกของแต่ละหม้อ ไม่ลดจำนวนอาหารที่ได้`, `Cooking minigame: the first ${n("misses")} misses per pot do not reduce the servings`);
    case "ckFresh": return u === 1 ? w("หม้อแรกของแต่ละมื้อไม่เสีย stamina", "The first pot of a meal's hours costs no stamina") : w(`${u} หม้อแรกของแต่ละมื้อไม่เสีย stamina`, `The first ${u} pots of a meal's hours cost no stamina`);
    case "ckBrisk": return w(`การคนและการย่างสั้นลง ${pct(n("shorter"))}%`, `The stirring and the roast are ${pct(n("shorter"))}% shorter`);
    case "ckBig": return w(`มีวัตถุดิบตามสูตรครบ ${n("batches")} ชุด: เล่นมินิเกมทำอาหารครั้งเดียว ได้อาหาร ${n("batches")} ชุด ใช้วัตถุดิบทุกชุด หากพลาดจะลดอาหารทุกชุด ถ้ามีวัตถุดิบไม่พอจะทำ 1 ชุดตามปกติ · วันละ ${u} หม้อ`, `With ${n("batches")} recipe batches of ingredients, cook all ${n("batches")} in one minigame; consume every batch and apply misses to all. Otherwise cook one normally · ${u} pots a day`);
    case "ckWarm": return w(`ทุกคนที่กินจากหม้อนี้ที่โต๊ะเลี้ยง บัฟของอาหารนานขึ้น ${n("hours")} ชั่วโมง · วันละ ${u} หม้อ`, `For everybody who eats from this pot at the feast table, the dish's buff lasts ${n("hours")} ${n("hours") === 1 ? "hour" : "hours"} longer · ${u} pots a day`);
    case "ckScent": return w(`ทำอาหารแล้ววางที่โต๊ะเลี้ยง: ทุกคนที่กินได้ stamina เพิ่ม ${n("stamina")} ต่อที่ โดยไม่เกินขีดสูงสุด · วันละ ${u} หม้อ`, `Cook and serve at the feast table: each helping restores ${n("stamina")} extra stamina to its eater, up to the stamina cap · ${u} pots a day`);
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
      if (pick) { const x = step(GEM_FX.dark.pick.veins, level), k = step(GEM_FX.dark.pick.swings, level); return w(`เจอสายแร่บ่อยขึ้น ${x} เท่า หินที่ปกติต้องทุบเกิน 2 ครั้งต้องทุบเพิ่ม ${k} ครั้ง`, `Veins ${x} times as often; rocks normally needing more than two swings take ${k} extra swing`); }
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
      if (fam === "rod") { const p = pct(step(F.fire.rod.tires, level)); return w(`ปลาหมดแรงเร็วขึ้น ${p}%`, `The fish tires ${p}% sooner`); }
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
      if (fam === "rod") return w(`แถบปลอดภัยขยับช้าลง ${p}%`, `The safe stretch moves ${p}% slower`);
      if (fam === "hoe") return w(`มินิเกมพรวนดิน: ตัวชี้ช้าลง ${p}% · มินิเกมถางหญ้า: ต้นหญ้ากับหินสลับตำแหน่งช้าลง ${p}%`, `Tilling minigame: the marker moves ${p}% slower; weeding minigame: weeds and stones change places ${p}% slower`);
      if (fam === "can") return w(`น้ำในเกมรดขึ้นช้าลง ${p}%`, `The pour's water rises ${p}% slower`);
      if (fam === "bugNet") return w(`แมลงทุกตัวเคลื่อนไหวช้าลง ${p}% สำหรับเรา`, `Every insect moves ${p}% slower for you`);
      return w(`หลุดจังหวะได้นานขึ้นก่อนจะเสีย (ช้าลง ${p}%)`, `A slip may last longer before it costs (${p}% slower)`);
    }
    case "earth": {
      const p = pct(step(F.earth.stamina, level));
      const what: Record<typeof fam, [string, string]> = { rod: ["สู้ปลา", "a fight"], hoe: ["ทำแปลง", "a plot"], can: ["รดน้ำ", "a watering"], bugNet: ["จับแมลง", "a catch"], cook: ["ทำอาหาร", "a pot"] };
      return w(`${what[fam][0]}เสีย stamina น้อยลง ${p}%`, `${p}% less stamina ${what[fam][1]}`);
    }
    case "lightning": {
      const p = pct(step(F.lightning.chance, level));
      if (fam === "rod") return w(`แถบปลอดภัยกว้างขึ้น ${p}% และมีโอกาส ${p}% ได้เหยื่อคืน`, `${p}% wider safe band; ${p}% chance to regain bait`);
      if (fam === "hoe") return w(`${p}% ที่แปลงถัดไปในแถวเสร็จไปด้วย`, `${p}% that the next plot of the row is done too`);
      if (fam === "can") return w(`${p}% ที่แปลงถัดไปได้น้ำไปด้วย`, `${p}% that the next plot is watered too`);
      if (fam === "bugNet") return w(`จับได้แล้วมีโอกาส ${p}% ได้เพิ่มอีกตัว`, `${p}% that a catch brings one more`);
      return w(`${p}% ที่หม้อได้เพิ่ม 1 ที่`, `${p}% that a pot has one more helping`);
    }
    case "wind": return windWords(level);
    case "light":
      if (fam === "rod") { const s = step(F.light.rod.early, level); return w(`ทุ่นเรืองแสงก่อนปลากิน ${s} วินาที`, `The float glows ${s} s before the bite`); }
      if (fam === "hoe") { const n=step(F.light.hoe.stones,level); return w(`ก้อนหินเรืองแสง และมีหินลดลง ${n} ก้อน`, `Stones glow; ${n} fewer stone obstacles`); }
      if (fam === "can") { const n = step(F.light.can.glint, level); return n >= ALL ? w("ต้นที่รดได้ตอนนี้ส่องประกายทั้งแปลง", "Plants that can be watered now glint over the whole bed") : w(`ต้นที่รดได้ตอนนี้ส่องประกายในระยะ ${n} ช่อง`, `Plants that can be watered now glint within ${n} tiles`); }
      if (fam === "bugNet") { const n = step(F.light.bugNet.seen, level); return w(`แมลงในระยะ ${n} ช่องมีประกาย แม้ตัวที่ซ่อนอยู่`, `Insects within ${n} tiles glint, the hidden ones too`); }
      return w(`แสงบอกจังหวะที่ดี และจังหวะกว้างขึ้น ${pct(step(F.light.cook.band,level))}%`, `Light guides stirring; ${pct(step(F.light.cook.band,level))}% wider timing band`);
    case "dark":
      if (fam === "rod") { const x = step(F.dark.rod.rare, level), f = pct(F.dark.rod.fiercer); return w(`ปลาหายากมาบ่อยขึ้น ${x} เท่า แต่ปลาทุกตัวดึงแรงขึ้น ${f}%`, `Rare fish ${x} times as often; every fish pulls ${f}% harder`); }
      if (fam === "hoe") { const p = pct(step(F.dark.hoe.worm, level)), f = pct(F.dark.hoe.faster); return w(`${p}% ที่พรวนแล้วเจอไส้เดือน แต่ตัวชี้เร็วขึ้น ${f}%`, `${p}% that a tilled plot turns up a worm; the marker ${f}% faster`); }
      if (fam === "can") { const p = pct(step(F.dark.can.more, level)), k = F.dark.can.uses; return w(`รดครั้งหนึ่งต้นโตเพิ่ม ${p}% แต่ใช้น้ำ ${k} ครั้ง`, `A watering adds ${p}% more growth, and uses ${k}`); }
      if (fam === "bugNet") { const x = step(F.dark.bugNet.rare, level), f = pct(F.dark.bugNet.smaller); return w(`แมลงที่กลับมาหลังเราจับได้ เป็นตัวหายากบ่อยขึ้น ${x} เท่า แต่วงสวิงเล็กลง ${f}%`, `The insect that comes back after your catch is a rare one ${x} times as often; the ring ${f}% smaller`); }
      { const p = pct(step(F.dark.cook.helping, level)), f = pct(F.dark.cook.harder); return w(`${p}% ที่หม้อได้เพิ่ม 2 ที่ แต่จังหวะที่ดีแคบลง ${f}%`, `${p}% that a pot has two more helpings; its good pace ${f}% narrower`); }
  }
}
/** What a gem's element does in a kind of tool, at the level it works at: null where nothing says. */
export function gemDoes(kind: ToolKind, element: Element, level: number): Words | null {
  if (level < 1) return null;
  return kind === "pick" || kind === "axe" ? newToolGem(kind, element, level) : oldToolGem(kind, element, level);
}

/* ── a tool's own numbers (its card, and what the next level changes) ───── */

/** One number of a tool's card: what it is called, and how it reads (the same text is the same number). */
export interface CardLine { key: string; name: Words; value: Words }
const same = (text: string): Words => w(text, text);
/** A share as a percentage, to one place where it has one: 0.025 is 2.5, 0.1 is 10. */
const pct1 = (share: number): number => Math.round(share * 1000) / 10;
/** A number to so many places at the most, with no noughts at its end. */
const upTo = (n: number, places: number): string => String(Math.round(n * 10 ** places) / 10 ** places);
/** So many times as wide, as words: wider by a share, narrower by one, or as it is bought. */
const wider = (times: number): Words => {
  const p = pct1(times - 1);
  return p > 0 ? w(`กว้างขึ้น ${p}%`, `${p}% wider`) : p < 0 ? w(`แคบลง ${-p}%`, `${-p}% narrower`) : w("ตามปกติ", "as bought");
};
/** So many times the pace, as words: slower by a share, faster by one, or as it is bought. */
const slower = (pace: number): Words => {
  const p = pct1(1 - pace);
  return p > 0 ? w(`ช้าลง ${p}%`, `${p}% slower`) : p < 0 ? w(`เร็วขึ้น ${-p}%`, `${-p}% faster`) : w("ตามปกติ", "as bought");
};
const times = (n: number): Words => w(`${n} ครั้ง`, String(n));
const ROCK_WORD: Words[] = [w("ทุบหินชั้นตื้น", "Swings, shallow rock"), w("ทุบหินชั้นกลาง", "Swings, middle rock"), w("ทุบหินชั้นลึก", "Swings, deep rock")];
/**
 * The numbers of a tool's own card, as the tool is now: its level's, with whatever its options and its gem add to
 * the same numbers (each is what its game reads: lib/town/tools' readers for the pick and the axe, lib/town/forged's
 * for the rest). Nothing, of a thing that is not forged. A level's table is so laid that no plus leaves every one of
 * these as the plus before left it.
 */
export function cardOf(stack: Stack | null | undefined): CardLine[] {
  const kind = stack ? toolKindOf(stack.item) : null;
  if (!stack || !kind) return [];
  switch (kind) {
    case "pick": return [
      ...ROCKS.map((hard, i): CardLine => ({ key: `rock${i}`, name: ROCK_WORD[i] ?? ROCK_WORD[ROCK_WORD.length - 1], value: times(pickSwings(stack, hard)) })),
      { key: "strikes", name: w("ตีสายแร่ได้", "Strikes at a vein"), value: times(veinStrikes(stack)) },
    ];
    case "axe": {
      const ahead = axeAhead(stack);
      return [
        { key: "chops", name: w("ฟันต่อต้น", "Chops a tree"), value: times(axeChops(stack)) },
        { key: "ahead", name: w("เห็นกิ่งล่วงหน้า", "Branches seen ahead"), value: w(`${ahead} ท่อน`, `${ahead} segments`) },
        { key: "slow", name: w("แถบเวลา", "The time bar"), value: slower(1 - axeBarSlow(stack)) },
      ];
    }
    case "rod": {
      const fx = rodFx(stack), secs = upTo(LEVELS.rod.strike[0] * fx.strike, 2);
      return [
        { key: "band", name: w("ช่วงปลอดภัยตอนสู้ปลา", "The fight's safe stretch"), value: wider(fx.band) },
        { key: "pace", name: w("ช่วงปลอดภัยขยับ", "The stretch's pace"), value: slower(fx.pace) },
        { key: "strike", name: w("จังหวะตวัด", "The strike's moment"), value: w(`${secs} วินาที`, `${secs} s`) },
      ];
    }
    case "hoe": {
      const fx = hoeFx(stack);
      return [
        { key: "band", name: w("ช่วงตีจอบ", "The tilling stretch"), value: wider(fx.band) },
        { key: "pace", name: w("ความเร็วตัวชี้พรวนดิน / การสลับตำแหน่งในเกมถางหญ้า", "Tilling marker / weeding shuffle speed"), value: slower(fx.pace) },
      ];
    }
    case "can": {
      const fx = canFx(stack);
      return [
        { key: "waterings", name: w("เติมครั้งหนึ่งรดได้", "Waterings a filling"), value: times(LEVELS.can.waterings[0] + fx.more) },
        { key: "marks", name: w("ขีดตอนเทเมื่อหมดแรง", "The tired pour's marks"), value: wider(fx.marks) },
      ];
    }
    case "bugNet": {
      const fx = netFx(stack), ring = upTo(LEVELS.bugNet.ring[0] * fx.ring, 3), ms = Math.round(LEVELS.bugNet.lands[0] * fx.lands);
      return [
        { key: "ring", name: w("วงสวิง", "The net's ring"), value: w(`${ring} ช่อง`, `${ring} tile`) },
        { key: "lands", name: w("สวิงลงถึงใน", "The swing lands in"), value: same(`${ms} ms`) },
      ];
    }
    case "pot": case "pan": case "grill":
      return [{ key: "band", name: w("จังหวะที่ดีตอนคนและย่าง", "The good stretch, stirring and roasting"), value: wider(cookFx(stack).band) }];
  }
}
/** A number of a tool's card that the next level changes: as it is, and as it would be. */
export interface CardChange { key: string; name: Words; from: Words; to: Words }
/**
 * What the next level changes for this tool: each number of its own card that would read otherwise at one plus more,
 * as it reads now and as it would then (with the same options and the same gem; at the top a gem works a level
 * stronger, and that is in the numbers too). Nothing, of a tool at the top and of a thing that is not forged.
 */
export function nextOf(stack: Stack | null | undefined): CardChange[] {
  const level = levelOf(stack);
  if (!stack || !toolKindOf(stack.item) || level >= FORGE.top) return [];
  const now = cardOf(stack), then = cardOf({ ...stack, plus: level + 1 });
  return now.flatMap((line, i) => (then[i] && then[i].value.en !== line.value.en ? [{ key: line.key, name: line.name, from: line.value, to: then[i].value }] : []));
}

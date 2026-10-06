import type { Line } from "./talk";

/**
 * The seven lines of work, each with a ladder of ten ranks (the owner, 2026-10-06, of the water carriers' three
 * ranks and their gifts: "อยากทำให้มี progression และ ฉายา ได้ไอเทม เหมือนกับที่ ขนน้ำทำได้ด้วย"; then "ขอถึงขั้น 10 เลย",
 * and for the well "เอาเหมือนกัน"; a helpers' line apart from the well's, "แยกเป็นสาย \"ผู้ช่วยเหลือ\" ดีกว่า"; fishing and
 * the forest, "ช่วยเพิ่ม Progession ของ ตกปลา และ หาของป่าให้ด้วย"; insects and one's own farming after them).
 *
 * - **Points** are counted for what a member does in a line (what counts is each line's own, and the keeper's to
 *   say). A rank is reached at so many, all told (`marks`). He asked for many: "ใช้แต้มเยอะกว่านี้หน่อย เพราะในความเป้นจริง
 *   คนที่เล่น พอรู้ว่าทำอะไรแล้วได้ผลตอบแทน ก็พยายามปั่นแต้มกัน". So a day has a bound too (`day`): points past it in a
 *   day count a quarter (`countedOn`), which slows whoever grinds and nobody else.
 * - **A rank has a title**, worn under one's name if one chooses it ("เลือกได้ ทำ UI ให้ด้วย"), and a gift, which is
 *   not this file's: gifts come in rounds, each before members climb to it.
 * - **What a ladder shows** (`ladderOf`; his words: "มีบอกด้วยว่า ตอนนี้มีคะแนนเท่าไหร่ ต้องถึงเท่าไหร่ถึงได้ แต่ของที่ยังไม่ปลดล็อคจะ
 *   ยังไม่มีข้อมูลให้เห็น"): the ranks one has, each with its title and its mark; the next one, with its mark and
 *   nothing else; and the ranks beyond it with nothing at all, not even their marks ("ซ่อนแต้มไว้ เราจะมาคิดกันใหม่
 *   ในอนาคต").
 *
 * Pure: every number is a knob, and nothing here knows who did what.
 */
export const LINE_IDS = ["kitchen", "well", "helpers", "fishing", "forest", "insects", "farming"] as const;
export type LineId = (typeof LINE_IDS)[number];
/** How many ranks a ladder has. */
export const RANKS = 10;
/** What a point past the day's bound counts for. */
export const PAST_BOUND = 0.25;

/** The marks of most ladders, and of the two that count what is done many times a day (water carried, help given). */
const MARKS = [50, 150, 350, 700, 1300, 2200, 3600, 5500, 8000, 12000];
const DEEP_MARKS = [50, 200, 600, 1500, 3000, 6000, 10000, 15000, 22000, 30000];

export interface LineDef {
  name: Line;
  /** Its picture, an icon of the town's. */
  icon: string;
  /** The points, all told, at which each rank begins: the first to the tenth. */
  marks: number[];
  /** The points a day that count in full. */
  day: number;
  /** What somebody of each rank is called: the first to the tenth. */
  titles: Array<[th: string, en: string]>;
}

export const LINES: Record<LineId, LineDef> = {
  kitchen: {
    name: { th: "สายครัว", en: "The kitchen" }, icon: "stoveBig", marks: MARKS, day: 150,
    titles: [
      ["ลูกมือครัว", "Kitchen hand"], ["ศิษย์เตาไฟ", "Hearth apprentice"], ["นักปรุงฝึกเวท", "Spellcook in training"], ["นักเล่นแร่แปรรส", "Flavour alchemist"],
      ["ผู้คุมเตาเวท", "Keeper of the spell-stove"], ["จอมเวทแห่งกระทะ", "Wizard of the pan"], ["สหายภูตเตาไฟ", "Hearth-sprite's friend"], ["เชฟเพลิงฟีนิกซ์", "Phoenix-fire chef"],
      ["ปรมาจารย์รสทิพย์", "Grandmaster of heavenly taste"], ["ตำนานแห่งรสทิพย์", "Legend of heavenly taste"],
    ],
  },
  well: {
    name: { th: "สายหาบน้ำ", en: "The well" }, icon: "wellBook", marks: DEEP_MARKS, day: 200,
    titles: [
      ["ผู้หาบน้ำ", "Water bearer"], ["ศิษย์แห่งสายธาร", "Apprentice of the stream"], ["ผู้เฝ้าบ่อน้ำ", "Keeper of the well"], ["ผู้ฟังเสียงน้ำ", "Listener to the water"],
      ["ผู้อ่านเมฆ", "Cloud reader"], ["นักเก็บน้ำค้างจันทร์", "Gatherer of moon dew"], ["สหายภูตน้ำ", "Water-sprite's friend"], ["ผู้เป่าแตรสายธาร", "Horn-blower of the stream"],
      ["ผู้ปลุกตาน้ำ", "Springwaker"], ["ผู้เรียกฝน", "Rain caller"],
    ],
  },
  helpers: {
    name: { th: "สายผู้ช่วยเหลือ", en: "The helpers" }, icon: "handshake", marks: DEEP_MARKS, day: 200,
    titles: [
      ["ผู้มีน้ำใจ", "Kind heart"], ["สหายชาวสวน", "Gardener's friend"], ["ผู้ดูแลแปลงเพื่อนบ้าน", "Minder of the neighbours' beds"], ["ผู้แบ่งแรง", "Sharer of strength"],
      ["ผู้เยียวยาต้นกล้า", "Healer of seedlings"], ["ผู้พิทักษ์สวน", "Guardian of the garden"], ["สหายภูตสวน", "Garden-sprite's friend"], ["ผู้ถักสายใย", "Weaver of threads"],
      ["ผู้ชุบชีวิตพฤกษา", "Reviver of green things"], ["เทพารักษ์แห่ง Cash Town", "Guardian spirit of Cash Town"],
    ],
  },
  fishing: {
    name: { th: "สายตกปลา", en: "The fishing deck" }, icon: "rod", marks: MARKS, day: 150,
    titles: [
      ["นักตกปลาฝึกหัด", "Novice angler"], ["สหายนากน้ำ", "Otter's friend"], ["นักตกปลาสองมือ", "Two-handed angler"], ["ผู้ถือสายใยมังกร", "Bearer of the dragon-silk line"],
      ["นักตกปลาจันทรา", "Moonlight angler"], ["ผู้ท้าทายปลาตำนาน", "Challenger of legends"], ["ผู้เรียกฝูงปลา", "Caller of shoals"], ["นายเรือใบบัว", "Captain of the lotus-leaf boat"],
      ["เจ้าแห่งลานตกปลา", "Lord of the fishing deck"], ["สหายมังกรสายธาร", "River dragon's friend"],
    ],
  },
  forest: {
    name: { th: "สายหาของป่า", en: "The forest" }, icon: "basket", marks: MARKS, day: 150,
    titles: [
      ["ผู้เดินป่า", "Forest walker"], ["สหายกระรอก", "Squirrel's friend"], ["นักดมกลิ่นป่า", "Sniffer of the woods"], ["ผู้ถือโคมหิ่งห้อย", "Firefly-lantern bearer"],
      ["นักล่าลายแทง", "Treasure-map hunter"], ["ผู้ขี่กวางมอส", "Rider of the moss stag"], ["ผู้เฝ้าวงแหวนเห็ด", "Keeper of the fairy ring"], ["คนเลี้ยงผึ้งแห่งต้นไม้ใหญ่", "Beekeeper of the great tree"],
      ["ผู้เรียกดาวตก", "Caller of falling stars"], ["ผู้พิทักษ์ต้นไม้ใหญ่", "Guardian of the great tree"],
    ],
  },
  insects: {
    name: { th: "สายจับแมลง", en: "The insects" }, icon: "bugNet", marks: MARKS, day: 150,
    titles: [
      ["นักจับแมลงฝึกหัด", "Novice bug catcher"], ["สหายผีเสื้อ", "Butterfly's friend"], ["นักวางน้ำหวาน", "Layer of nectar"], ["มือสวิงสายลม", "Wind-net hand"],
      ["ผู้กล่อมแมลง", "Lullabist of insects"], ["ผู้ห่มปีกผีเสื้อ", "Wearer of butterfly wings"], ["เจ้าสังเวียนด้วง", "Lord of the beetle ring"], ["ผู้ถือโคมจันทร์", "Moon-lamp bearer"],
      ["ผู้พิทักษ์ปวงแมลง", "Guardian of all insects"], ["ราชาแห่งปวงปีก", "King of all wings"],
    ],
  },
  farming: {
    name: { th: "สายปลูกผัก", en: "The farm" }, icon: "hoe", marks: MARKS, day: 150,
    titles: [
      ["ชาวสวนฝึกหัด", "Novice gardener"], ["สหายโนมสวน", "Gnome's friend"], ["มือหว่านทั้งแถว", "Sower of whole rows"], ["ผู้ถือเคียวจันทร์เสี้ยว", "Bearer of the crescent sickle"],
      ["ผู้ถือนาฬิกาทรายฤดูกาล", "Bearer of the hourglass of seasons"], ["สหายแมนเดรก", "Mandrake's friend"], ["ผู้ปลูกผักยักษ์", "Grower of giant vegetables"], ["นักผสมพันธุ์พืช", "Crossbreeder of plants"],
      ["เจ้าแห่งเทศกาลเก็บเกี่ยว", "Lord of the harvest festival"], ["ผู้ปลูกต้นถั่ววิเศษ", "Grower of the magic beanstalk"],
    ],
  },
};

/** The rank so many points are: none (0) to the tenth. */
export const rankOf = (line: LineId, points: number): number => LINES[line].marks.filter((at) => points >= at).length;
/** What somebody of a rank is called; nothing, for no rank. */
export const titleOf = (line: LineId, rank: number): Line | null => {
  const t = LINES[line].titles[Math.floor(rank) - 1];
  return t ? { th: t[0], en: t[1] } : null;
};

/**
 * Where somebody stands on a ladder: their rank, the mark that rank began at (0 with none), the next rank's mark
 * (null at the last), and how far between the two they are, from 0 to 1 (1 at the last).
 */
export function towards(line: LineId, points: number): { rank: number; from: number; next: number | null; share: number } {
  const marks = LINES[line].marks, rank = rankOf(line, points), from = rank ? marks[rank - 1] : 0, next = marks[rank] ?? null;
  return { rank, from, next, share: next === null ? 1 : Math.max(0, Math.min(1, (points - from) / (next - from))) };
}

/**
 * What some points come to on a day that has had so many already (`today`: what the day's deeds were worth before
 * any bound): in full up to the day's bound, a quarter past it. So the day's first points are never the lesser for
 * what comes after them.
 */
export function countedOn(line: LineId, today: number, add: number): number {
  if (add <= 0) return 0;
  const full = Math.max(0, Math.min(add, LINES[line].day - Math.max(0, today)));
  return full + (add - full) * PAST_BOUND;
}
/** Whether a day has passed its bound: what it earns from here counts a quarter. */
export const pastBound = (line: LineId, today: number) => today >= LINES[line].day;

/**
 * One rank of a ladder as its member is told it: a rank they have, with its title and its mark; the next, with its
 * mark and nothing more; or one beyond that, with nothing: what is not unlocked says nothing of itself.
 */
export type RankTold = { rank: number; state: "had"; at: number; title: Line } | { rank: number; state: "next"; at: number } | { rank: number; state: "far" };
/** A whole ladder as its member is told it, the first rank to the tenth. */
export function ladderOf(line: LineId, points: number): RankTold[] {
  const marks = LINES[line].marks, mine = rankOf(line, points);
  return marks.map((at, i): RankTold => {
    const rank = i + 1;
    return rank <= mine ? { rank, state: "had", at, title: titleOf(line, rank)! } : rank === mine + 1 ? { rank, state: "next", at } : { rank, state: "far" };
  });
}

/** Every title somebody has earned, line by line and rank by rank: what there is to choose from to wear under one's name. */
export function titlesOf(points: Partial<Record<LineId, number>>): Array<{ line: LineId; rank: number; title: Line }> {
  return LINE_IDS.flatMap((line) => Array.from({ length: rankOf(line, points[line] ?? 0) }, (_, i) => ({ line, rank: i + 1, title: titleOf(line, i + 1)! })));
}
/** Whether a title is somebody's to wear: of a line there is, and of a rank they have. */
export const mayWear = (points: Partial<Record<LineId, number>>, line: string, rank: number): boolean =>
  (LINE_IDS as readonly string[]).includes(line) && Number.isInteger(rank) && rank >= 1 && rank <= rankOf(line as LineId, points[line as LineId] ?? 0);

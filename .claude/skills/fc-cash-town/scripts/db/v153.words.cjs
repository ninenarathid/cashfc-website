// The deeds' Thai words: one function for every line, in the shared SQL; out of the well's file. Run from the worktree's root.
// (run again when another line's deeds are in: add its words to WORDS below; the shared file's block is written anew each time)
const fs = require("fs");
const D = ".claude/skills/fc-cash-town/scripts/db/";
const lf = (s) => s.replace(/\r\n/g, "\n");
const WORDS = [
  ["the gifts of the lines' ranks, the titles and the notice board (written down since v144 to v152, with no word until now)",
    [["charms", "เปลี่ยนเครื่องรางที่ใส่"], ["familiar", "เรียกสัตว์คู่ใจ"], ["gift_use", "ใช้พลังของวิเศษ"], ["title", "เลือกฉายา"],
     ["notice_post", "ติดประกาศที่ป้าย"], ["notice_buy", "ซื้อของจากประกาศ"], ["notice_fill", "ขายของให้ประกาศรับซื้อ"], ["notice_collect", "รับเงินจากป้ายประกาศ"],
     ["notice_down", "ปลดประกาศ"], ["notice_fetch", "รับของจากป้ายประกาศ"], ["notice_slot", "เพิ่มช่องประกาศ"]]],
  ["the kitchen's gifts", [["basket_put", "เก็บอาหารใส่ตะกร้ามิติ"], ["basket_take", "หยิบอาหารออกจากตะกร้ามิติ"]]],
  ["the farm's gifts", [["row", "ทำงานทั้งแถวในครั้งเดียว"], ["gnome", "โนมรดน้ำทั้งแปลง"], ["hourglass", "พลิกนาฬิกาทรายแห่งฤดู"]]],
  ["the well's gifts", [["drink_offer", "ยื่นน้ำพุแห่งชีวิตให้เพื่อน"], ["drink", "ดื่มน้ำพุแห่งชีวิตที่เพื่อนยื่นให้"], ["drink_gave", "เพื่อนดื่มน้ำพุแห่งชีวิตที่ยื่นให้"],
    ["rain_fill", "กบเรียกฝนเติมถังให้"], ["moon_keep", "เก็บน้ำใส่ขวดแก้วจันทรา"], ["moon_pour", "เทน้ำจากขวดแก้วจันทราลงบ่อ"]]],
  ...(fs.existsSync(D + "v153.words.json") ? JSON.parse(fs.readFileSync(D + "v153.words.json", "utf8")) : []),
];
// the words as the database has them now
const live = lf(fs.readFileSync(D + "live/functions-v152.sql", "utf8"));
const at = live.indexOf("-- town.deed_th(p_what text)");
const body = live.slice(live.indexOf("  select case p_what", at), live.indexOf("$function$;", at));
if (!body.trimEnd().endsWith("else p_what end")) throw new Error("the live words do not end as expected");
const kept = body.trimEnd().slice(0, -" else p_what end".length);
const had = new Set([...kept.matchAll(/when '([a-z_]+)' then/g)].map((m) => m[1]));
for (const [, list] of WORDS) for (const [w] of list) if (had.has(w)) throw new Error(`${w} has a word already`);
const fn = [
  "-- The deeds' Thai words, for town.tally: v142's as the database has them, every word of theirs as it was, with a word",
  "-- for each deed written down since that had none, and for each deed of the gifts of ranks 1 to 6.",
  "create or replace function town.deed_th(p_what text)",
  "returns text language sql immutable",
  "as $$",
  kept,
  ...WORDS.flatMap(([about, list]) => [`    -- ${about}`, "    " + list.map(([w, th]) => `when '${w}' then '${th}'`).join(" ")]),
  "    else p_what end",
  "$$;",
  "",
].join("\n");

// the well's file: its own writing of it taken out (if it is still there)
{
  const f = D + "v153.well.sql";
  let s = fs.readFileSync(f, "utf8"); const crlf = s.includes("\r\n"); s = lf(s);
  const a = s.indexOf("-- SHARED BY EVERY LINE: the deeds' Thai words");
  if (a >= 0) {
    const z = s.indexOf("$function$;", a);
    if (z < 0) throw new Error("the well's block has no end");
    s = s.slice(0, a) + "-- (the deeds' Thai words, town.deed_th, are in v153.shared.sql with every line's: the well's six among them)\n" + s.slice(z + "$function$;\n".length);
    fs.writeFileSync(f, crlf ? s.replace(/\n/g, "\r\n") : s);
    console.log("the well's file: its deed_th taken out");
  }
}
// the shared file: the block written anew before its last revoke
{
  const f = D + "v153.shared.sql";
  let s = fs.readFileSync(f, "utf8"); const crlf = s.includes("\r\n"); s = lf(s);
  const a = s.indexOf("-- The deeds' Thai words, for town.tally");
  const foot = "revoke execute on all functions in schema town from public, anon, authenticated;";
  if (a >= 0) s = s.slice(0, a) + s.slice(s.indexOf(foot));
  if (!s.includes(foot)) throw new Error("the shared file has no foot");
  s = s.replace(foot, () => fn + "\n" + foot);
  fs.writeFileSync(f, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`the shared file: deed_th with ${WORDS.reduce((n, [, l]) => n + l.length, 0)} new words`);
}

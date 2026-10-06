// The lines of work and their ladders (the owner, 2026-10-06), played in the trial and read off the screen: seven
// lines with the points had and the points the next rank takes; a ladder that tells the ranks had, the next one's
// mark and nothing of the rest; a title worn under the name; and points that come of what is done.
//
//   node .claude/skills/fc-cash-town/scripts/town-lines.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room). Writes lines-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 900)}`); };
const T = "window.__townTrade", C = "window.__townCook";
const L = `document.querySelector("[data-town-lines]")`;
const enter = async (X) => {
  await X.goto(`${BASE}/town?townTest=R&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};
const openLines = async (X) => {
  if (await X.evaluate(`!!${L}`)) return;
  await X.evaluate(`document.querySelector("[data-town-lines-button]").click()`);
  await until("the board of lines opens", () => X.evaluate(`!!${L}`), 5000);
  await sleep(700);
};
const cards = (X) => X.evaluate(`[...${L}.querySelectorAll("[data-lines-line]")].map((b) => ({ id: b.dataset.linesLine, rank: Number(b.dataset.rank), points: Number(b.dataset.points), text: b.innerText.replace(/\\s+/g, " ").trim() }))`);
const ladder = (X) => X.evaluate(`[...${L}.querySelectorAll("[data-lines-rank]")].map((li) => ({ rank: Number(li.dataset.linesRank), state: li.dataset.state, text: li.innerText.replace(/\\s+/g, " ").trim() }))`);
const pick = async (X, id) => { await X.evaluate(`${L}.querySelector('[data-lines-line="${id}"]').click()`); await sleep(350); };

for (const [label, size] of [["wide", { width: 1280, height: 860 }], ["phone", { width: 390, height: 844, mobile: true }]]) {
  const X = await browser(`Lines ${label}`, size);
  try {
    await enter(X);
    await X.evaluate(`(${T}.reset(), ${T}.forget())`);
    await sleep(400);
    await X.evaluate(`(localStorage.removeItem("cashtown.trial.lines.1"), localStorage.removeItem("cashtown.trial.titles.1"))`);
    await enter(X);
    ok(`[${label}] the map has a button for the lines of work`, await X.evaluate(`!!document.querySelector("[data-town-lines-button]")`));
    // a member some way up two ladders
    await X.evaluate(`(${T}.setLine("kitchen", 400), ${T}.setLine("fishing", 60))`);
    await openLines(X);
    let seven = await cards(X);
    ok(`[${label}] seven lines, each with its rank and its points against the next rank's`, seven.length === 7 && seven.find((c) => c.id === "kitchen").rank === 3 && seven.find((c) => c.id === "kitchen").points === 400
      && /400 \/ 700/.test(seven.find((c) => c.id === "kitchen").text) && /นักปรุงฝึกเวท/.test(seven.find((c) => c.id === "kitchen").text)
      && seven.find((c) => c.id === "fishing").rank === 1 && /60 \/ 150/.test(seven.find((c) => c.id === "fishing").text) && /ยังไม่มีขั้น/.test(seven.find((c) => c.id === "forest").text) && /0 \/ 50/.test(seven.find((c) => c.id === "forest").text), seven);
    await pick(X, "kitchen");
    let rungs = await ladder(X);
    ok(`[${label}] the ladder tells the ranks had with their titles and marks`, rungs.length === 10 && rungs.slice(0, 3).every((r) => r.state === "had") && /ลูกมือครัว/.test(rungs[0].text) && /50 แต้ม/.test(rungs[0].text) && /นักปรุงฝึกเวท/.test(rungs[2].text), rungs.slice(0, 3));
    ok(`[${label}] …the next one by its mark alone, and how far it is`, rungs[3].state === "next" && /\?\?\?/.test(rungs[3].text) && /700 แต้ม/.test(rungs[3].text) && /อีก 300/.test(rungs[3].text) && !/นักเล่นแร่แปรรส/.test(rungs[3].text), rungs[3]);
    const whole = await X.evaluate(`${L}.innerText`);
    ok(`[${label}] …and nothing at all of the ranks beyond: no title of theirs, and no mark`, rungs.slice(4).every((r) => r.state === "far" && r.text.replace(/\s/g, "") === `${r.rank}???`)
      && !/ผู้คุมเตาเวท|จอมเวทแห่งกระทะ|ตำนานแห่งรสทิพย์|1,300|2,200|12,000/.test(whole), rungs.slice(4));
    await X.shot(`${OUT}/lines-${label}-kitchen.png`);

    // a title worn, and taken off
    ok(`[${label}] no title is worn until one is chosen`, (await X.evaluate(`${L}.querySelector("[data-lines-worn]").dataset.linesWorn`)) === "" && /ยังไม่ได้ใส่ฉายา/.test(whole));
    await X.evaluate(`${L}.querySelector('[data-lines-wear="2"]').click()`);
    await until("the second rank's title is worn", async () => (await X.evaluate(`${L}.querySelector("[data-lines-worn]").dataset.linesWorn`)) === "kitchen:2", 4000);
    const me = await X.evaluate(`window.__cashTown.me().id`);
    const kept = await X.evaluate(`${T}.titles()`);
    ok(`[${label}] a title one has is worn under the name, and kept`, JSON.stringify(Object.values(kept)) === JSON.stringify([{ line: "kitchen", rank: 2 }]) && /ศิษย์เตาไฟ/.test(await X.evaluate(`${L}.querySelector("[data-lines-worn]").innerText`)), { kept, me });
    ok(`[${label}] a rank not had cannot be worn: it has no button`, (await X.evaluate(`${L}.querySelectorAll("[data-lines-wear]").length`)) === 3 && (await X.evaluate(`${T}.titleWear({ line: "kitchen", rank: 4 })`)).ok === false);
    await sleep(300);
    await X.shot(`${OUT}/lines-${label}-worn.png`);
    await X.evaluate(`${L}.querySelector("[data-lines-bare]").click()`);
    await until("worn no more", async () => (await X.evaluate(`${L}.querySelector("[data-lines-worn]").dataset.linesWorn`)) === "", 4000);
    ok(`[${label}] and taken off again`, Object.keys(await X.evaluate(`${T}.titles()`)).length === 0);
    await X.evaluate(`[...${L}.querySelectorAll("button")].find((b) => b.innerText.trim() === "ปิด").click()`);
    await sleep(400);

    if (label === "wide") {
      // points come of what is done: a pot of a real recipe is worth its helpings, and ten more the first time
      await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
      await X.evaluate(`${T}.resize(20)`);
      await X.evaluate(`(() => { for (const [id, n] of [["snakehead", 2], ["tomato", 4], ["chili", 4], ["scallion", 2], ["pot", 1]]) ${T}.grant(id, n); })()`);
      const places = await X.evaluate(`${C}.places()`), stove = places.find((p) => p.kind === "stove").at;
      const cook = async () => {
        await X.evaluate(`window.__townView.warp(${stove[0]}, ${stove[1]})`);
        await sleep(900);
        await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s?.item === "pot"))`);
        await until("cooking is offered", async () => (await X.evaluate(`${C}.offers()`)).includes("cook"), 5000);
        await X.evaluate(`${C}.act("cook")`);
        await until("the table is laid", () => X.evaluate(`${C}.open()`), 4000);
        await X.evaluate(`${C}.put([["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]])`);
        await sleep(300);
        await X.evaluate(`${C}.go()`);
        await sleep(400);
        if (await gameUp(X)) { await play(X); await sleep(900); }
        await X.evaluate(`${C}.shut()`);
        await sleep(300);
      };
      const before = (await X.evaluate(`${T}.lines()`)).lines.kitchen;
      await cook();
      let after = (await X.evaluate(`${T}.lines()`)).lines.kitchen;
      ok("a pot of tom yum is worth its four helpings, and ten more the first time it is made", after.points === before.points + 4 + 10 && after.today === 14, { before, after });
      await cook();
      after = (await X.evaluate(`${T}.lines()`)).lines.kitchen;
      ok("…a second pot its four, and no ten", after.points === before.points + 14 + 4 && after.today === 18, after);
      await openLines(X);
      seven = await cards(X);
      ok("the board says today's points beside the line", /418 \/ 700/.test(seven.find((c) => c.id === "kitchen").text) && /วันนี้ \+18/.test(seven.find((c) => c.id === "kitchen").text), seven.find((c) => c.id === "kitchen"));
      await X.shot(`${OUT}/lines-wide-today.png`);
    }
    ok(`[${label}] no page errors`, (X.errors ?? []).length === 0, X.errors);
  } finally { await X.close(); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

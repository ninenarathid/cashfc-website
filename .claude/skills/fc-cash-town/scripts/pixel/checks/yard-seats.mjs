// Every race at the cooking yard's tables, close up: sitting on a far bench (facing the viewer) and on a near one (their
// back to the viewer), at the left table and at the right one (mirrored), photographed side by side. For the eye: a
// pose that is wrong from behind shows here, and nowhere in a number.
//   node checks/yard-seats.mjs [base] [outDir] [look,look,...]      a look is the 8 characters of Doing.look
// With no looks: both genders of every race. The dev test room only (?townTest), with motion reduced.
import sharp from "sharp";
import { browser, until, sleep, status } from "./cdp.mjs";
const { KITCHEN, YARD_SEATS } = await import("../../../../../../lib/town/world.ts");
const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? "work/debug";
const CODES = process.argv[4] ? process.argv[4].split(",") : [0, 1, 2, 3, 4, 5, 6, 7].flatMap((r) => [0, 1].map((g) => `5${r}${g}0d400`));
const T = "window.__cashTown", W = 220, H = 260;
// the middle place of each bench: far and near, at each table
const SEATS = [false, true].flatMap((back) => [0, 1].map((table) => KITCHEN.seats.findIndex((s, i) => s.back === back && s.table === table && KITCHEN.seats[i - 1]?.table === table && KITCHEN.seats[i - 1]?.back === back)));
if (SEATS.some((i) => i < 0)) { console.log("FAIL the yard has no near bench to sit on"); process.exit(1); }
const X = await browser("Y", { width: 900, height: 700 });
await X.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
let id = null;
const open = async (code) => {
  if (code && id) await X.evaluate(`localStorage.setItem("cashTown:look:${id}", "${code}")`);
  await X.goto(`${BASE}/town?townTest=Y&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 120000);
  await until("the map's hooks", () => X.evaluate("!!window.__townView?.screenOf"), 20000);
  id ??= (await X.evaluate(`${T}.me()`)).id;
  for (let i = 0; i < 4; i++) await X.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "+" }))`);
};
/** A picture about a place at a table, once I sit there: the map is turned to look at the place itself (I walked to its floor tile, which for a near bench is at the bench's end). */
const shot = async (seat) => {
  await until("sat down there", async () => (await X.evaluate(`${T}.me()`)).sit === YARD_SEATS + seat, 40000);
  const at = KITCHEN.seats[seat].at;
  await X.evaluate(`window.__townView.lookAt(${at.x}, ${at.y})`);
  // (the places at the tables are on the screen once the yard's roof is off)
  let b = null;
  await until("the place on the screen", async () => !!(b = (await X.evaluate("window.__townView.benches()")).find((x) => x.i === YARD_SEATS + seat)), 20000);
  await sleep(900);
  b = (await X.evaluate("window.__townView.benches()")).find((x) => x.i === YARD_SEATS + seat);
  const clip = { x: Math.max(0, Math.round((b.x0 + b.x1) / 2 - W / 2)), y: Math.max(0, Math.round(b.y1 - H + 70)), width: W, height: H, scale: 1 };
  return Buffer.from((await X.send("Page.captureScreenshot", { format: "png", clip })).data, "base64");
};
try {
  await open(null);
  for (const code of CODES) {
    await open(code);
    const shots = [];
    for (const seat of SEATS) {
      await X.evaluate(`${T}.sitOn(${YARD_SEATS + seat})`);
      shots.push(await shot(seat));
    }
    const file = `${OUT}/yard-${code}.png`;
    await sharp({ create: { width: SEATS.length * (W + 4), height: H, channels: 3, background: "#000" } })
      .composite(shots.map((input, i) => ({ input, left: i * (W + 4), top: 0 }))).png().toFile(file);
    console.log(`${code}: ${file}`);
  }
} finally { await X.close?.(); }
process.exit(0);

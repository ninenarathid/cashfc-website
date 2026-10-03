// A few frames of the town in a row, to see what moves: node checks/sky-film.mjs <weather> [hour] [frames] [gapMs] [crop x,y,w,h]
import { browser, until, sleep, status } from "./cdp.mjs";
import sharp from "sharp";
const [word = "light", hour = "10", n = "4", gap = "250", crop = "320,215,640,430"] = process.argv.slice(2);
const [cx, cy, cw, ch] = crop.split(",").map(Number);
const X = await browser("F");
try {
  await X.goto(`http://localhost:3100/town?townTest=F&townHour=${hour}&townWeather=${word}`);
  await until("ready", async () => (await status(X)) === "ready", 120000);
  await until("the map's hooks", () => X.evaluate("!!window.__townView?.sky"), 20000);
  await sleep(4000);
  const shots = [];
  for (let i = 0; i < +n; i++) {
    const s = await X.send("Page.captureScreenshot", { format: "png", clip: { x: cx, y: cy, width: cw, height: ch, scale: 1 } });
    shots.push(Buffer.from(s.data, "base64"));
    await sleep(+gap);
  }
  const file = `work/debug/film-${word}-${hour}.png`;
  await sharp({ create: { width: cw * shots.length + 4 * (shots.length - 1), height: ch, channels: 3, background: "#000" } })
    .composite(shots.map((input, i) => ({ input, left: i * (cw + 4), top: 0 }))).png().toFile(file);
  console.log(file, JSON.stringify(await X.evaluate("window.__townView.leaves()")), "errors:", JSON.stringify(X.logs));
} catch (e) { console.log("ERR", e.message); } finally { X.close(); process.exit(0); }

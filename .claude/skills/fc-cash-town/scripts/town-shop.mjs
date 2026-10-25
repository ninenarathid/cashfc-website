// Granny Twilla's clothes shop as the owner asked on 2026-10-25, shot in a real browser on the dev test room, desktop and
// phone: the room, her talk, her rails with things tried on (an outfit, a hat, a hairstyle), a buy, the week's auction
// with a bid, a limited outfit tried on in the room, and the wardrobe's locked hairstyles. For Codex's UI review and the
// owner's look; it checks only that each step came up.
//
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/town-shop.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

globalThis.__cashTownMap = "town2";
await import("./db/repo-ts-town.mjs");
const { SHOP_IN } = await import("@/lib/town/shop-room");
const { newPurse } = await import("@/lib/town/trade");
const [BASE = "http://localhost:3233", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const V = "window.__townView";
const url = (room) => `${BASE}/town?townTest=A&townRoom=${room}&townMap=town2&townHour=12&townWeather=clear`;

async function tapAt(X, x, y) {
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
}
/** Press the first visible button whose words hold one of these (in the panel `within`, if given), as a finger does. */
async function press(X, words, within = "body", pick = "[0]") {
  const box = await X.evaluate(`(() => {
    const words = ${JSON.stringify(words)}, root = document.querySelector(${JSON.stringify(within)}) ?? document.body;
    const all = [...root.querySelectorAll("button, summary")].filter((b) => b.offsetParent && !b.disabled && words.some((w) => b.textContent.includes(w)));
    const b = all${pick};
    if (!b) return null;
    b.scrollIntoView({ block: "nearest" });
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: b.textContent.trim().slice(0, 40) };
  })()`);
  if (box) { await tapAt(X, box.x, box.y); await sleep(900); }
  return box;
}
const TAILOR = 'section[aria-labelledby="town-tailor-h"]';
const panel = (X) => X.evaluate(`document.querySelector("[data-shop-panel]")?.getAttribute("data-shop-panel") ?? null`);

for (const [label, size] of [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }]]) {
  const X = await browser(`shop-${label}`, size);
  const shot = (n) => X.shot(`${OUT}/shop-${label}-${n}.png`);
  try {
    const room = url(`shopui${Date.now() % 100000}`);
    await X.goto(room);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    // (the trial purse is the browser's: enough coins for a buy and a bid, then the page again)
    const purse = JSON.stringify({ ...newPurse({ profile: 247, gallery: 31 }), coins: 60000 });
    await X.evaluate(`(() => { const id = sessionStorage.getItem("cashTown:test:A"); localStorage.setItem("cashtown.trial.purse.2." + id, ${JSON.stringify(purse)}); return id; })()`);
    await X.goto(room);
    await until("ready again", async () => (await status(X)) === "ready", 240000);
    await X.evaluate(`${V}.warp(${Math.floor(SHOP_IN.x)}, ${Math.floor(SHOP_IN.y)})`);
    await sleep(3000);
    await shot("01-room");

    // ── her talk, then her rails ──
    const talking = () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.offsetParent && ["ต่อไป", "ดูเสื้อผ้า", "Next", "Browse the clothes"].some((t) => b.textContent.includes(t)))`);
    let g = null;
    for (let i = 0; i < 3 && !(await talking()); i++) {
      g = await until("granny drawn", async () => (await X.evaluate(`${V}.keepers()`)).find((k) => k.id === "granny"), 15000).catch(() => null);
      if (!g) break;
      const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`);
      await tapAt(X, at.x + (g.x0 + g.x1) / 2, at.y + (g.y0 * 0.5 + g.y1 * 0.5));
      await sleep(1500);
    }
    ok(`${label}: Granny talks when tapped`, await talking());
    const has = (w) => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.offsetParent && ${JSON.stringify(w)}.some((t) => b.textContent.includes(t)))`);
    for (let i = 0; i < 4 && !(await has(["ดูเสื้อผ้า", "Browse the clothes"])); i++) {
      await shot("02-talk");
      await press(X, ["ต่อไป", "Next"]);
    }
    await shot("02-choices");
    await press(X, ["ดูเสื้อผ้า", "Browse the clothes"]);
    await until("tailor open", async () => (await panel(X)) === "tailor", 8000).catch(() => {});
    await sleep(1500);
    ok(`${label}: her rails open`, (await panel(X)) === "tailor");
    await shot("03-rails");

    // an outfit in season tried on (the Halloween one), then a hat with it, then a hairstyle
    const o = await press(X, ["ฮาโลวีน", "Halloween"], TAILOR);
    ok(`${label}: a Halloween outfit tried`, !!o, o);
    await sleep(1200);
    await shot("04-outfit-tried");
    await press(X, ["หมวก", "Hats"], TAILOR);
    const h = await press(X, ["ฮาโลวีน", "Halloween"], TAILOR);
    ok(`${label}: a Halloween hat tried with it`, !!h, h);
    await sleep(1200);
    await shot("05-hat-tried");
    await press(X, ["ทรงผม", "Hairstyles"], TAILOR);
    const cards = await X.evaluate(`[...document.querySelectorAll('${TAILOR} button[aria-pressed]')].length`);
    const hr = await press(X, [","], TAILOR, "[1]");
    ok(`${label}: a hairstyle tried (${cards} on the rail)`, !!hr, hr);
    await sleep(1200);
    await shot("06-hair-tried");
    const b = await press(X, ["ซื้อ", "Buy"], TAILOR, ".at(-1)");
    ok(`${label}: bought what was tried`, !!b, b);
    await sleep(2500);
    await shot("07-bought");

    // ── the week's auction, from her panel's own tab ──
    await press(X, ["ประมูล", "Auction"], "[data-shop-panel]");
    await until("auction open", async () => (await panel(X)) === "auction", 8000).catch(() => {});
    await sleep(2500);
    ok(`${label}: the auction opens`, (await panel(X)) === "auction");
    await shot("08-auction");
    const bid = await press(X, ["เสนอ", "Bid"], "[data-shop-panel]", ".at(-1)");
    ok(`${label}: a bid placed`, !!bid, bid);
    await sleep(2500);
    await shot("09-bid");
    const t = await press(X, ["ลองใส่", "Try on"], "[data-shop-panel]");
    ok(`${label}: the limited set tried on`, !!t, t);
    await sleep(2500);
    await shot("10-limited-tried");
    await press(X, ["ปิด", "Close"], "[data-shop-panel]");
    await sleep(2500);
    await shot("11-closed");

    // ── the wardrobe: the shop's hairstyles not yet had are locked ──
    const wd = await press(X, ["แต่งตัว", "Wardrobe"]);
    await sleep(2000);
    // (to its hairstyles, where the shop's not yet had are locked)
    const locked = await X.evaluate(`(() => { const b = [...document.querySelectorAll('[aria-label^="???"]')].filter((e) => e.offsetParent); b[0]?.scrollIntoView({ block: "center" }); return b.length; })()`);
    await sleep(1000);
    ok(`${label}: the wardrobe opens, the shop's hairstyles not had locked (${locked})`, !!wd && locked > 0, { wd, locked });
    await shot("12-wardrobe");
    ok(`${label}: no page errors`, !X.errors().length, X.errors());
  } catch (e) { fail++; console.log(`  FAIL ${label}: ${e.message}`); await shot("zz-error").catch(() => {}); }
  finally { X.close(); }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// The firefly lantern (the forest's fourth rank; the owner's ladder of 2026-10-07): its wearer sees what every place
// in the forest holds at any hour, the whole map and not a ring, and the secret places of the deep woods that nobody
// else sees; a secret place takes two games running. And from the fourth rank the forest's good things are harder.
// Tried in the trial: without the lantern no secret place is told and what is buried is not; with it both are, there
// are fireflies over every place and a chart of the whole forest; a ring's two games won give all it has and the
// place goes into my record; a look-alike taken in a bough's second game loses it; leaving a place's games loses it;
// at the sixth rank a good thing's patch goes dim, its mound has fewer strokes and its fruit falls quicker, and a
// common thing is as it was.
//
//   node .claude/skills/fc-cash-town/scripts/town-lantern.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room). Writes lantern-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townForest", G = "window.__townGame";
const enter = async (X, hour = 12) => {
  await X.goto(`${BASE}/town?townTest=N&townRoom=check&townHour=${hour}&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};
const sights = (X) => X.evaluate(`${F}?.sights?.() ?? []`);
const heldOf = (X, id) => X.evaluate(`${T}.purse().bag.reduce((t, s) => t + (s && s.item === ${JSON.stringify(id)} ? s.n : 0), 0)`);
const left = (X) => X.evaluate(`${T}.purse().stamina.left`);
const offers = (X) => X.evaluate(`[...document.querySelectorAll("[data-forest-offer]")].map((b) => b.dataset.forestOffer)`);
const stage = (X) => X.evaluate(`${F}.stage()`);
/** Stand where a secret place is gathered from: on a ring, beside a bough's tree. */
async function standAt(X, s) {
  for (const [dx, dy] of s.kind === "bough" ? [[1, 0], [0, 1], [-1, 0], [0, -1]] : [[0, 0]]) {
    await X.evaluate(`${V}.warp(${s.x + dx}, ${s.y + dy})`);
    try { return await until("the offer", async () => (await offers(X)).includes("secret") || null, 2500, 150); } catch { /* another side of the tree */ }
  }
  return false;
}
/** Play the game that is up without a miss (`slip`: with one wrong touch in it). */
async function playClean(X, slip = false) {
  const kind = await gameUp(X);
  if (kind === "choosing") {
    const b = await X.evaluate(`${G}.bunch()`);
    if (slip) { await X.evaluate(`${G}.take(${b.cells.findIndex((c) => c && !c.good)})`); await sleep(120); }
    for (const [i, c] of b.cells.entries()) if (c && c.good) { await X.evaluate(`${G}.take(${i})`); await sleep(110); }
  } else if (kind === "digging") {
    const d = await X.evaluate(`${G}.dig()`);
    for (const [i, c] of d.cells.entries()) if (c.over) for (let n = c.earth + (slip && i === d.cells.findIndex((x) => x.over) ? 1 : 0); n > 0; n--) { await X.evaluate(`${G}.strike(${i})`); await sleep(60); }
  } else if (kind === "catching") {
    for (let i = 0; i < 400; i++) {
      const st = await X.evaluate(`${G} && ${G}.kind === "catching" ? ${G}.shower().drops : null`);
      const next = st?.find((d) => d.caught === null);
      if (!next) break;
      await X.evaluate(`${G}.move(${slip ? (next.lane + 2) % 5 : next.lane})`);
      await sleep(50);
    }
  }
  return kind;
}

const X = await browser("Lantern", { width: 1280, height: 860 });
try {
  await enter(X);
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false), localStorage.removeItem("cashtown.trial.lines.1"))`);
  await sleep(300);
  await enter(X);
  await X.evaluate(`${T}.setStamina(100)`);
  await X.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await until("the forest's own code has come", () => X.evaluate(`!!${F}`), 30000);
  const hidden = await X.evaluate(`${F}.secrets()`);
  ok("there are six secret places, all the far side of the stream", hidden.length === 6, hidden.length);
  // (a word under which a ring and a bough and two more hold something this hour: looked for with the lantern worn)
  await X.evaluate(`(${T}.setGifts(["charmFirefly"]), ${K}.charmsWear(["charmFirefly"]))`);
  const word = await X.evaluate(`(() => { const ids = new Set(${JSON.stringify(hidden.map((h) => h.id))}), kind = new Map(${JSON.stringify(hidden.map((h) => [h.id, h.kind]))});
    for (let i = 0; i < 600; i++) { ${T}.setSalt("lantern-" + i); const s = ${K}.wild().filter((x) => ids.has(x.id)); if (s.length >= 4 && s.some((x) => kind.get(x.id) === "ring") && s.filter((x) => kind.get(x.id) === "bough").length >= 2) return "lantern-" + i; }
    return null; })()`);
  ok("a word under which four secret places hold something", !!word, word);
  await X.evaluate(`${K}.charmsWear([])`);
  await until("the forest's things", async () => (await sights(X)).length > 40, 30000);

  // ── without the lantern ──
  let all = await sights(X);
  ok("without the lantern no secret place is told", all.every((s) => !s.secret) && all.every((s) => s.id < hidden[0].id), all.filter((s) => s.secret));
  ok("…nor what lies buried", all.filter((s) => s.kind === "mound").length > 0 && all.filter((s) => s.kind === "mound").every((s) => s.item === null));
  ok("…and there is no lantern's button, and no fireflies", !(await X.evaluate(`!!document.querySelector("[data-forest-lantern]")`)) && (await X.evaluate(`${F}.lit()`)) === false && (await X.evaluate(`${F}.flies()`)) === 0);
  const ring = hidden.find((h) => h.kind === "ring");
  await X.evaluate(`${V}.warp(${ring.x}, ${ring.y})`);
  await sleep(1200);
  ok("standing on a ring, nothing is offered: it is not there", !(await offers(X)).includes("secret"), await offers(X));
  await X.shot(`${OUT}/lantern-0-bare.png`);

  // ── the lantern worn ──
  const wore = await X.evaluate(`${K}.charmsWear(["charmFirefly"])`);
  ok("the lantern is worn", wore.ok === true, wore);
  await until("the secret places are told", async () => (await sights(X)).some((s) => s.secret), 8000).catch(() => null);
  all = await sights(X);
  const secrets = all.filter((s) => s.secret);
  ok("with it, the secret places that hold something are among the places", secrets.length >= 4 && secrets.every((s) => !!s.item), secrets);
  ok("…what lies under every mound is told", all.filter((s) => s.kind === "mound").every((s) => !!s.item));
  await sleep(700);
  ok("…fireflies are over every place on the screen, by day too", (await X.evaluate(`${F}.lit()`)) === true && (await X.evaluate(`${F}.flies()`)) > 0, await X.evaluate(`${F}.flies()`));
  ok("…and the ring I stand on is offered, as a secret place", (await until("the offer", async () => (await offers(X)).includes("secret") || null, 5000, 150).catch(() => false)) === true, await offers(X));
  await X.shot(`${OUT}/lantern-1-ring-day.png`);
  // a mound, with what is under it shown
  const mound = all.find((s) => s.kind === "mound");
  await X.evaluate(`${V}.warp(${mound.x + 1}, ${mound.y + 1})`);
  await sleep(900);
  await X.shot(`${OUT}/lantern-2-mound.png`);

  // ── the chart ──
  await X.evaluate(`document.querySelector("[data-forest-lantern]").click()`);
  await until("the chart", () => X.evaluate(`!!document.querySelector("[data-forest-chart]")`), 4000);
  await sleep(500);
  const chart = await X.evaluate(`(() => { const c = document.querySelector("[data-forest-chart]"); return { places: Number(c.dataset.places), secrets: Number(c.dataset.secrets), drawn: c.querySelectorAll("[data-chart-place]").length, me: !!c.querySelector("[data-chart-me]") }; })()`);
  ok("the lantern's chart has every place that holds something, the secret ones marked, and where I stand", chart.places === all.length && chart.drawn === all.length && chart.secrets === secrets.length && chart.me, chart);
  await X.shot(`${OUT}/lantern-3-chart.png`);
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await sleep(400);
  ok("Escape puts the chart away", !(await X.evaluate(`!!document.querySelector("[data-forest-chart]")`)));

  // ── a ring: two games running, both won ──
  const r = secrets.find((s) => s.kind === "ring");
  ok("a ring that holds something is stood on", await standAt(X, r), r);
  const had = await heldOf(X, r.item), st0 = await left(X);
  await X.evaluate(`${F}.act()`);
  ok("its first game is the choosing", (await until("a game", () => gameUp(X), 4000).catch((e) => e.message)) === "choosing" && (await stage(X)) === 0);
  ok("…at the first three ranks a good thing is no harder: its patch never goes dim", (await X.evaluate(`${F}.harder()`)) === 1 && (await X.evaluate(`${G}.bunch().dim`)) === null, await X.evaluate(`${F}.harder()`));
  await sleep(400);
  await X.shot(`${OUT}/lantern-4-ring-game1.png`);
  await playClean(X);
  ok("the first won, the second begins at once: the digging", (await until("the second game", async () => ((await stage(X)) === 1 ? gameUp(X) : null), 5000, 100).catch((e) => e.message)) === "digging");
  ok("…and nothing is in the bag yet", (await heldOf(X, r.item)) === had);
  await sleep(400);
  await X.shot(`${OUT}/lantern-5-ring-game2.png`);
  await playClean(X);
  await until("it is gathered", async () => (await heldOf(X, r.item)) > had, 6000).catch(() => null);
  ok("both won, the ring gives all it has", (await heldOf(X, r.item)) === had + r.n, { held: await heldOf(X, r.item), had, r });
  ok("…for four of stamina, once", (await left(X)) === st0 - 4, { before: st0, after: await left(X) });
  ok("…it is in my record of the secret places, and the page says so", JSON.stringify(await X.evaluate(`${K}.purse().forest?.secrets ?? null`)) === JSON.stringify([r.id])
    && (await X.evaluate(`document.querySelector('[data-forest-note="charmFirefly"]')?.innerText ?? ""`)).includes("1/6"), await X.evaluate(`document.querySelector("[data-forest-note]")?.innerText`));
  ok("…and the ring has nothing more for me", !(await sights(X)).some((s) => s.id === r.id));
  await sleep(300);
  await X.shot(`${OUT}/lantern-6-ring-won.png`);

  // ── harder, at the sixth rank ──
  await X.evaluate(`${T}.setLine("forest", 2200)`);
  await sleep(600);
  const boughs = secrets.filter((s) => s.kind === "bough");
  const b = boughs[0];
  ok("a bough that holds something is stood beside", await standAt(X, b), b);
  const hadB = await heldOf(X, b.item), st1 = await left(X);
  await X.evaluate(`${F}.act()`);
  ok("its first game is the catching", (await until("a game", () => gameUp(X), 4000).catch((e) => e.message)) === "catching" && (await stage(X)) === 0);
  const fall = await X.evaluate(`${G}.shower().fall`);
  ok("at the sixth rank a good thing's fruit falls quicker (1.5 s by 1.24)", Math.abs((await X.evaluate(`${F}.harder()`)) - 1.24) < 1e-9 && Math.abs(fall - 1.5 / 1.24) < 1e-9, { fall, harder: await X.evaluate(`${F}.harder()`) });
  await playClean(X);
  ok("the first won, the second begins: the choosing", (await until("the second game", async () => ((await stage(X)) === 1 ? gameUp(X) : null), 9000, 100).catch((e) => e.message)) === "choosing");
  const dim = await X.evaluate(`${G}.bunch().dim`);
  ok("…whose patch goes dim after a while (10 s by 1.24)", Math.abs(dim - 10 / 1.24) < 1e-9, dim);
  await sleep(300);
  await X.shot(`${OUT}/lantern-7-bough-game2.png`);
  // a look-alike taken: lost
  await playClean(X, true);
  await until("the game is gone", async () => (await gameUp(X)) === null, 5000, 100).catch(() => null);
  await sleep(700);
  ok("a look-alike taken in the second game: the bough gives nothing", (await heldOf(X, b.item)) === hadB, { held: await heldOf(X, b.item), hadB });
  ok("…my turn at it is spent, for its stamina", !(await sights(X)).some((s) => s.id === b.id) && (await left(X)) === st1 - 4, { left: await left(X), st1 });
  ok("…the record is as it was, and the page says it is gone", JSON.stringify(await X.evaluate(`${K}.purse().forest?.secrets`)) === JSON.stringify([r.id])
    && (await X.evaluate(`!!document.querySelector('[data-forest-note="charmFirefly"]')`)), await X.evaluate(`document.querySelector("[data-forest-note]")?.innerText`));
  await X.shot(`${OUT}/lantern-8-bough-lost.png`);
  // leaving a place's games loses it
  const b2 = boughs[1];
  ok("another bough is stood beside", await standAt(X, b2), b2);
  const st2 = await left(X);
  await X.evaluate(`${F}.act()`);
  await until("a game", () => gameUp(X), 4000);
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await until("the place is gone", async () => !(await sights(X)).some((s) => s.id === b2.id), 5000, 150).catch(() => null);
  ok("its games left once begun, the place is lost: gone from my sight, for its stamina", !(await sights(X)).some((s) => s.id === b2.id) && (await left(X)) === st2 - 4 && (await gameUp(X)) === null, { left: await left(X), st2 });
  // a mound seen with the lantern: an uncommon thing has fewer strokes to spare; a common thing is as it was
  all = await sights(X);
  await X.evaluate(`(${T}.grant("hoe", 1), ${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "hoe")))`);
  // (a mound with nothing else in reach of it, so that it is the mound that is offered)
  const alone = (s) => !all.some((o) => o.id !== s.id && Math.max(Math.abs(o.x - s.x), Math.abs(o.y - s.y)) <= 2);
  const yam = all.find((s) => s.kind === "mound" && ["wildYam", "bambooShoot", "truffle"].includes(s.item) && alone(s)), worm = all.find((s) => s.kind === "mound" && s.item === "worm" && alone(s));
  if (yam) {
    await X.evaluate(`${V}.warp(${yam.x}, ${yam.y})`);
    await until("the offer", async () => (await offers(X)).includes("dig") || null, 5000, 150);
    await X.evaluate(`${F}.act()`);
    await until("the digging game", () => gameUp(X), 4000);
    const d = await X.evaluate(`${G}.dig()`), spare = d.strokes - d.cells.filter((c) => c.over).reduce((t, c) => t + c.earth, 0);
    ok("a good thing seen under its mound has three strokes to spare at the sixth rank, where anybody has four", spare === 3 && Math.abs((await X.evaluate(`${F}.harder()`)) - 1.24) < 1e-9, { spare, item: yam.item });
    await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await sleep(400);
  } else ok("a mound with a good thing under it (none this hour: not tried)", true);
  if (worm) {
    await X.evaluate(`${V}.warp(${worm.x}, ${worm.y})`);
    await until("the offer", async () => (await offers(X)).includes("dig") || null, 5000, 150);
    await X.evaluate(`${F}.act()`);
    await until("the digging game", () => gameUp(X), 4000);
    const d = await X.evaluate(`${G}.dig()`), spare = d.strokes - d.cells.filter((c) => c.over).reduce((t, c) => t + c.earth, 0);
    ok("a common thing is as it is for anybody: four strokes to spare", spare === 4 && (await X.evaluate(`${F}.harder()`)) === 1, { spare });
    await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await sleep(400);
  } else ok("a mound with a worm under it (none this hour: not tried)", true);
  // …and unseen (the lantern off), a good thing's mound is dug as by anybody: how hard it is would tell what it is
  if (yam) {
    await X.evaluate(`${K}.charmsWear([])`);
    await sleep(900);
    await X.evaluate(`${V}.warp(${yam.x}, ${yam.y})`);
    await until("the offer", async () => (await offers(X)).includes("dig") || null, 5000, 150);
    ok("with the lantern off, the same mound's thing is not told", (await X.evaluate(`${F}.here()?.item ?? null`)) === null);
    await X.evaluate(`${F}.act()`);
    await until("the digging game", () => gameUp(X), 4000);
    const d = await X.evaluate(`${G}.dig()`), spare = d.strokes - d.cells.filter((c) => c.over).reduce((t, c) => t + c.earth, 0);
    ok("…and unseen it is dug as by anybody (how hard it is would tell what it is)", spare === 4 && (await X.evaluate(`${F}.harder()`)) === 1, { spare });
    await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await sleep(400);
  }
  await X.evaluate(`${K}.charmsWear([])`);
  await sleep(900);
  ok("the lantern taken off, the secret places are gone from my sight again", (await sights(X)).every((s) => !s.secret) && !(await X.evaluate(`!!document.querySelector("[data-forest-lantern]")`)));

  // ── at night ──
  await enter(X, 23);
  await X.evaluate(`${K}.charmsWear(["charmFirefly"])`);
  const s4 = (await X.evaluate(`${K}.wild()`)).find((x) => x.id >= hidden[0].id) ?? null, place = s4 ? hidden.find((h) => h.id === s4.id) : hidden[0];
  await X.evaluate(`${V}.warp(${place.x + 1}, ${place.y + 1})`);
  await until("the forest's things by night", async () => (await sights(X)).length > 40, 30000);
  await sleep(2500);
  ok("at night the fireflies are over every place on the screen, with no ring to it", (await X.evaluate(`${F}.flies()`)) > 0 && (await X.evaluate(`${F}.glints()`)) === 0, { flies: await X.evaluate(`${F}.flies()`), glints: await X.evaluate(`${F}.glints()`) });
  await X.shot(`${OUT}/lantern-9-night-worn.png`);
  await X.evaluate(`${K}.charmsWear([])`);
  await sleep(1800);
  await X.shot(`${OUT}/lantern-9-night-bare.png`);
  ok("no page errors", X.logs.length === 0, X.logs);
} catch (e) { ok("the run", false, e.message); console.log(X.logs.join("\n")); } finally { await X.close(); }

// at a phone's width: the lantern's button, the chart and a secret place's button are whole on the screen
const P = await browser("LanternPhone", { width: 360, height: 740, mobile: true, dpr: 2 });
try {
  await enter(P);
  await P.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await until("the forest's own code has come", () => P.evaluate(`!!${F}`), 30000);
  const hidden = await P.evaluate(`${F}.secrets()`);
  await P.evaluate(`(${T}.empty(), ${T}.setStamina(100), ${T}.setGifts(["charmFirefly"]), ${K}.charmsWear(["charmFirefly"]))`);
  const got = await P.evaluate(`(() => { const ids = new Set(${JSON.stringify(hidden.map((h) => h.id))}); for (let i = 0; i < 600; i++) { ${T}.setSalt("phone-" + i); const s = ${K}.wild().filter((x) => ids.has(x.id)); if (s.length >= 3) return s[0].id; } return null; })()`);
  const s = hidden.find((h) => h.id === got);
  await until("the lantern's button", () => P.evaluate(`!!document.querySelector("[data-forest-lantern]")`), 8000);
  ok("the offer at a secret place", await standAt(P, s), s);
  const box = await P.evaluate(`(() => { const r = document.querySelector('[data-forest-offer="secret"]').getBoundingClientRect(), l = document.querySelector("[data-forest-lantern]").getBoundingClientRect(); return { l: r.left, r: r.right, h: r.height, bl: l.left, br: l.right }; })()`);
  ok("at a phone's width the secret place's button and the lantern's are whole on the screen", box.l >= 0 && box.r <= 360 && box.h >= 44 && box.bl >= 0 && box.br <= 360, box);
  await sleep(500);
  await P.shot(`${OUT}/lantern-phone-offer.png`);
  await P.evaluate(`document.querySelector("[data-forest-lantern]").click()`);
  await until("the chart", () => P.evaluate(`!!document.querySelector("[data-forest-chart]")`), 4000);
  await sleep(500);
  const chart = await P.evaluate(`(() => { const r = document.querySelector("[data-forest-chart] section").getBoundingClientRect(); return { l: r.left, r: r.right }; })()`);
  ok("…and so is the chart", chart.l >= 0 && chart.r <= 360, chart);
  await P.shot(`${OUT}/lantern-phone-chart.png`);
  ok("no page errors at a phone's width", P.logs.length === 0, P.logs);
} catch (e) { ok("the phone's run", false, e.message); } finally { await P.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

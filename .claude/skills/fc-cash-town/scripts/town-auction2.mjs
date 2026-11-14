// The second round's two limited sets in the dev test room, as their winners will have them, and the trial's auction
// closed from the TEST panel's way (lib/town/trial auctionCloseIn): each set worn and won, by night, standing, then the
// board's rounds settled by closing them now. For the owner's look before the round closes (2026-11-15 20:00).
//
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/town-auction2.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

globalThis.__cashTownMap = "town2";
await import("./db/repo-ts-town.mjs");
const { OUTFITS, HATS, FACE_WEAR, HAIR_WEAR, WEAR_ALL_KEY, dyeChoices } = await import("@/lib/town/wear");
const { defaultLook, encodeLook, hairsFor } = await import("@/lib/town/look");
const [BASE = "http://localhost:3250", OUT = "."] = process.argv.slice(2);
const idx = (list, id) => list.findIndex((w) => w.id === id);
const SETS = [
  { base: "moonkeeper", hat: "moonlanternhat", face: "moonmask", hair: "lanternpin" },
  { base: "mapleregent", hat: "maplehat", face: "maplemask", hair: "maplecomb" },
];
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };

for (const [label, size] of [["desk", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }]]) {
  const X = await browser(`auction2-${label}`, size);
  try {
    for (const set of SETS) for (const gender of [0, 1]) {
      await X.goto(`${BASE}/town?townTest=A&townRoom=au${Date.now() % 100000}&townMap=town2&townHour=21&townWeather=clear`);
      await until("ready", async () => (await status(X)) === "ready", 240000);
      const look = { ...defaultLook("auction2-shot"), gender, hair: hairsFor(gender, 0)[3], outfit: dyeChoices(OUTFITS, idx(OUTFITS, set.base))[0], hat: gender ? idx(HATS, set.hat) : 0, faceWear: idx(FACE_WEAR, set.face), hairWear: gender ? 0 : idx(HAIR_WEAR, set.hair) };
      await X.evaluate(`(() => { const id = sessionStorage.getItem("cashTown:test:A"); localStorage.setItem(${JSON.stringify(WEAR_ALL_KEY)}, "1"); localStorage.setItem("cashTown:look:" + id, ${JSON.stringify(encodeLook(look))}); location.reload(); })()`);
      await sleep(1500);
      await until("ready again", async () => (await status(X)) === "ready", 240000);
      await X.evaluate(`window.__townView.won(${JSON.stringify(set.base)})`);
      await sleep(2500);
      await X.shot(`${OUT}/${label}-${set.base}-${gender ? "m" : "f"}.png`);
      ok(`${label} ${set.base} ${gender ? "men's" : "women's"}`, (await status(X)) === "ready");
    }
  } finally {
    await X.close?.();
  }
}
console.log(`town-auction2: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// The two new limited masks worn in a real browser, close up on the doll, desktop and phone (the owner, 2026-11-04:
// "ช่วยแก้แว่นของ costume ใหม่ทั้งสองชุดหน่อย มันดูบั๊คแปลกๆ").
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/town-masks.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

globalThis.__cashTownMap = "town2";
await import("./db/repo-ts-town.mjs");
const { OUTFITS, HATS, FACE_WEAR, WEAR_ALL_KEY, dyeChoices } = await import("@/lib/town/wear");
const { defaultLook, encodeLook, hairsFor } = await import("@/lib/town/look");
const [BASE = "http://localhost:3241", OUT = "."] = process.argv.slice(2);
const V = "window.__townView", idx = (list, id) => list.findIndex((w) => w.id === id);
const LOOKS = [
  { name: "moon-f", base: "moonkeeper", face: "moonmask", gender: 1, hat: null, dye: 0 },
  { name: "moon-m-hat", base: "moonkeeper", face: "moonmask", gender: 0, hat: "moonlanternhat", dye: 0 },
  { name: "moon-f-dye", base: "moonkeeper", face: "moonmask", gender: 1, hat: null, dye: 3 },
  { name: "maple-f", base: "mapleregent", face: "maplemask", gender: 1, hat: null, dye: 0 },
  { name: "maple-m-hat", base: "mapleregent", face: "maplemask", gender: 0, hat: "maplehat", dye: 0 },
  { name: "maple-m-dye", base: "mapleregent", face: "maplemask", gender: 0, hat: null, dye: 2 },
];
for (const [label, size] of [["desk", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }]]) {
  const X = await browser(`masks-${label}`, size);
  try {
    for (const L of LOOKS) {
      await X.goto(`${BASE}/town?townTest=A&townRoom=mask${Date.now() % 100000}&townMap=town2&townHour=12&townWeather=clear`);
      await until("ready", async () => (await status(X)) === "ready", 240000);
      const face = dyeChoices(FACE_WEAR, idx(FACE_WEAR, L.face))[L.dye] ?? idx(FACE_WEAR, L.face);
      const look = { ...defaultLook("mask-shot"), gender: L.gender, hair: hairsFor(L.gender, 0)[3], outfit: dyeChoices(OUTFITS, idx(OUTFITS, L.base))[L.dye], hat: L.hat ? idx(HATS, L.hat) : 0, faceWear: face };
      await X.evaluate(`(() => { const id = sessionStorage.getItem("cashTown:test:A"); localStorage.setItem(${JSON.stringify(WEAR_ALL_KEY)}, "1"); localStorage.setItem("cashTown:look:" + id, ${JSON.stringify(encodeLook(look))}); location.reload(); })()`);
      await sleep(1500);
      await until("ready again", async () => (await status(X)) === "ready", 240000);
      await sleep(3000);
      await X.evaluate(`${V}.won(${JSON.stringify(L.base)})`);
      await sleep(1500);
      const file = `${OUT}/${label}-${L.name}.png`;
      await X.shot(file);
      console.log("shot", label, L.name);
    }
  } finally { await X.close?.(); }
}

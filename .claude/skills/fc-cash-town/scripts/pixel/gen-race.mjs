// A whole race's sheets, from its research file (races/<race>.json): the base walk front and back
// and the poses (bald, plain clothes), the race's starter outfit, the skin keys, the eye shapes
// and the creator's hairstyles, for both genders, in the order each needs the last.
//
//   node gen-race.mjs <race> [f|m] [--only base,back,poses,starter,skinkey,eyes,hair] [--dry]
//
// Sheets land in work/out/<race>/<g>-<kind>-<type>.png; one already there is never made again
// (delete it to redo it). Every call goes through gen.mjs, so the ledger and the budget hold.
// Each gender has its own skull (unlike the Lalafell, who share the girl's): the other races'
// men and women differ too much in size for one head to fit both.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const OUT = path.join(HERE, "work", "out");
const P = path.join(HERE, "prompts", "race");
const race = process.argv[2];
const genders = process.argv[3] === "f" || process.argv[3] === "m" ? [process.argv[3]] : ["f", "m"];
const onlyAt = process.argv.indexOf("--only");
const ONLY = onlyAt > 0 ? process.argv[onlyAt + 1].split(",") : null;
const DRY = process.argv.includes("--dry");
const R = JSON.parse(fs.readFileSync(path.join(HERE, "races", `${race}.json`), "utf8"));

/** What every prompt needs to say about the race, beyond the research's words. */
const ART = {
  hyur: { ears: "the same ears", earHair: "", skin: "Warm peach skin" },
  elezen: { ears: "the same long pointed ears", earHair: "The long pointed ears still poke out through the hair. ", skin: "Warm peach skin" },
  miqote: {
    ears: "the same green cat ears and green tail", earHair: "The two cat ears on top of the head stay exactly as they are, poking up through the hair. ",
    bald: "Keep two upright cat ears on top of the head and a long thin cat tail, both drawn in one bright grass green shaded with darker greens (they are recoloured later, like hair).",
    back: "the two green cat ears, the long green tail, ", skin: "Warm peach skin", keep: ", and the green cat ears and the green tail stay green",
  },
  roegadyn: { ears: "the same ears", earHair: "", skin: "Warm peach skin" },
  aura: {
    ears: "the same horns, scales and tail", earHair: "The two horns stay exactly as they are, the hair falling around them. ",
    bald: "Instead of human ears, two smooth horns grow from the sides of the head just above where the ears would be: each one long and tapering to a sharp point, curving gently BACKWARD past the back of the head like a dragon's horns, never curled into a spiral and never round like a ram's; ivory white with a dark outline. Small dark grey scales along the cheekbones, jaw and neck, and a thick scaled tail.",
    back: "the two ivory horns pointing backward from the sides of the head, the scaled tail, ", skin: "Warm peach skin with small dark grey scales", extra: ", and the tail", keep: ", and the ivory horns and the dark grey scales stay as they are",
  },
  hrothgar: {
    ears: "the same lion-like head, round ears and tail", earHair: "It is a mane of thick fur-like hair around the head and neck, with the round ears poking out of it. ",
    bald: "The head is a big cat's, lion-like, with a broad muzzle and round ears on top, covered in short fur only, with no mane at all; a long tail with a tuft at the end.",
    back: "the round ears, the long tail, ", skin: "Warm orange-tan fur like a lion's, with a lighter cream muzzle", skinWord: "fur", extra: ", the muzzle and the tail", keep: ", and the dark nose stays as it is",
    face: " and a dark cat nose",
  },
  viera: {
    ears: "the same two long green rabbit ears", earHair: "The two long rabbit ears stay exactly as they are, standing straight up through the hair. ",
    bald: "Keep two very long, upright furry rabbit ears on top of the head, as tall again as the head, drawn in one bright grass green shaded with darker greens with pale pink insides (the ears' fur is recoloured later, like hair).",
    back: "the two long green rabbit ears, ", skin: "Warm peach skin", keep: ", and the green rabbit ears stay green",
  },
}[race];
if (!ART) throw new Error(`no art notes for ${race}`);

/** How many heads tall an adult of each race and gender is drawn (the Lalafell are 2). */
const HEADS = {
  // (the Miqo'te at 3.1/3.3 came out 2.4/2.6 heads, "หัวโตไปนิดนึง", and the Au Ra at 3.0/3.7 near 2.9: both redrawn
  // with these, 2026-10-02)
  hyur: { f: 3.6, m: 3.8 }, elezen: { f: 3.5, m: 3.7 }, miqote: { f: 3.6, m: 3.8 }, roegadyn: { f: 3.4, m: 3.6 },
  aura: { f: 3.5, m: 3.8 }, hrothgar: { f: 3.3, m: 3.5 }, viera: { f: 3.4, m: 3.5 },
};

// Every shape the same size as the round eyes, only its shape changed (the owner, 2026-10-03: "ตาควรจะต้องเท่ากัน
// ทุกอัน เปลี่ยนแค่รูปทรง"): "big" came out two or three times the round eyes, "small" as dots or one eye.
const EYES = {
  big: "the same round eyes at exactly the same size as now, only sparkling: each iris with two small white highlights.",
  sharp: "narrow sharp almond-shaped eyes with slightly upturned outer corners.",
  droopy: "gentle droopy eyes with the outer corners turned down, half-lidded and sleepy.",
  cat: "cat-like eyes with strongly upturned outer corners and a bold upper lid line.",
  small: "the same eyes at exactly the same size as now, with smaller dark irises and more white around them, two eyes as before.",
};
const LALA = (t) => path.join(OUT, `f-bald-${t}.png`);
/** Races whose back is drawn walking straight away, as the Lalafell does (see the back below). */
const AWAY = new Set(["miqote"]);
const sheet = (g, kind, t) => `${race}/${g}-${kind}-${t}`;
const have = (name) => fs.existsSync(path.join(OUT, `${name}.png`));
const fill = (tpl, map) => {
  let s = fs.readFileSync(path.join(P, tpl), "utf8");
  for (const [k, v] of Object.entries(map)) s = s.split(`__${k}__`).join(v);
  if (/__[A-Z]+__/.test(s)) throw new Error(`${tpl}: unfilled ${s.match(/__[A-Z]+__/)[0]}`);
  return s;
};
let made = 0, skipped = 0;
function gen(name, prompt, refs) {
  if (have(name)) { skipped++; return; }
  for (const r of refs) if (!fs.existsSync(r)) throw new Error(`${name} needs ${r}`);
  const pf = path.join(HERE, "work", "prompts", `${name.replace("/", "_")}.txt`);
  fs.mkdirSync(path.dirname(pf), { recursive: true });
  fs.writeFileSync(pf, prompt);
  if (DRY) { console.log(`would make ${name} from ${refs.map((r) => path.basename(r)).join(", ")}`); made++; return; }
  const r = spawnSync("node", ["gen.mjs", name, "gpt-image-2.5-sunburst", "low", "1536x1024", pf, ...refs], { cwd: HERE, encoding: "utf8" });
  process.stdout.write(r.stdout.split("\n").filter((l) => !l.startsWith("usage")).join("\n"));
  if (r.status !== 0) throw new Error(`${name} failed: ${r.stdout}${r.stderr}`);
  made++;
}
const want = (step) => !ONLY || ONLY.includes(step);
const file = (name) => path.join(OUT, `${name}.png`);

for (const g of genders) {
  const woman = g === "f", h = R.height?.[g]?.scale ?? 1.8;
  // real proportions, softened for chibi: the order and the gaps stay, the giants stay on screen
  const scale = (1 + (h - 1) * 0.6).toFixed(2);
  const who = `a young ${R.name.en} ${woman ? "woman" : "man"} from Final Fantasy XIV`;
  // the Lalafell in the reference stands 77 of its pixels and is 2 heads tall; an adult of a taller race keeps a
  // head about the Lalafell's size and grows by body and legs (the owner's call: real proportions)
  const heads = HEADS[race]?.[g] ?? 3.2, tall = Math.round(77 * Number(scale)), head = Math.round(tall / heads);
  const likeAt0 = process.argv.indexOf("--like"), like0 = likeAt0 > 0 ? process.argv[likeAt0 + 1] : null;
  const likeR = like0 && JSON.parse(fs.readFileSync(path.join(HERE, "races", `${like0}.json`), "utf8"));
  const build = like0 ? `Proportions: exactly the reference's: the reference is a grown ${likeR.name.en} ${woman ? "woman" : "man"} of this same game, drawn about ${HEADS[like0]?.[g] ?? 3.5} heads tall; draw this character with the same head size against the body, the same slim adult face, neck, body and long legs, only ${(+scale) < (1 + ((likeR.height?.[g]?.scale ?? 1.8) - 1) * 0.6) ? "a little shorter" : "a little taller"} overall, in the same chunky pixel size. Not a child, not chibi.`
    : `Proportions: an adult in a cute pixel style, not a child: about ${heads} heads tall (the Lalafell in the reference is only 2 heads tall), with a slimmer face, a longer neck, a longer body and long legs. Drawn with exactly the same pixel size as the reference, the Lalafell stands 77 pixels tall and this character stands about ${tall} of those same pixels tall, with a head about ${head} pixels tall: more pixels, never bigger ones. The figures are much taller than the reference's, so leave room above and below.`;
  const common = { EARS: ART.ears };

  if (want("base")) {
    let p = fill("base-front.txt", { WHO: who, FEATURES: R.features[g], BUILD: build, BALD: ART.bald ?? "", SKIN: ART.skin, FACENOTE: ART.face ?? "" });
    // the style from the Lalafell, or (--like <race>) from another race's front at grown-up proportions: drawn from the
    // two-heads-tall Lalafell, a Miqo'te woman came out under three heads tall whatever was asked (2026-10-02)
    const likeAt = process.argv.indexOf("--like"), like = likeAt > 0 ? process.argv[likeAt + 1] : null;
    const refs = [like ? path.join(OUT, like, `${g}-bald-front.png`) : LALA("front")];
    if (!woman && have(sheet("f", "bald", "front"))) {
      p += `\nThe second attached picture is a woman of the same race, from this same game and sheet: draw him as a man of her race, with the same race features, the same style and the same chunky pixel size; only his build and height are his own.\n`;
      refs.push(file(sheet("f", "bald", "front")));
    }
    gen(sheet(g, "bald", "front"), p, refs);
  }
  // the back and the poses are edits of this race's own front sheet: with the Lalafell's as a layout reference,
  // the model copied the Lalafell's proportions (a big head, short legs)
  // A race whose back, edited from the front alone, came out as a side view striding across the picture ("เป็นการ
  // เดินข้างๆ", the owner, 2026-10-02, of the Miqo'te; the others he found fine) is turned with the Lalafell back
  // beside it, for its angle and its walk only.
  if (want("back")) gen(sheet(g, "bald", "back"), fill(AWAY.has(race) ? "base-back-away.txt" : "base-back.txt", { BACKNOTE: ART.back ?? "" }),
    AWAY.has(race) ? [file(sheet(g, "bald", "front")), LALA("back")] : [file(sheet(g, "bald", "front"))]);
  if (want("poses")) gen(sheet(g, "bald", "poses"), fill("base-poses.txt", { POSENOTE: ART.bald ? `${ART.bald}
` : "" }), [file(sheet(g, "bald", "front"))]);

  if (want("starter")) for (const t of ["front", "back", "poses"]) {
    // An outfit is described from the front. Where its front is its whole point (the Viera woman's bustier), the
    // model drew that front on three of the four figures walking away: her chest under the back of her head, and
    // her back on one step in four ("Viera ญ ตอนเดินหันหลังเป็นแบบนี้ น่าจะบั๊ก", the owner, 2026-10-02). So a
    // race's file may say how the outfit looks from behind (`attire.<g>.back`), and the note says it of every figure.
    const behind = t === "back" && R.attire[g].back;
    const view = t === "back" ? (behind
        ? "Every one of the four figures on this sheet is seen from behind, walking away from the viewer: draw only the back of the body and the back of the outfit on all four, the same on each. Do not draw the chest, the front of the outfit or anything of the front of the body on any figure. "
        : "This is a back view: show the back of the outfit. ")
      : t === "poses" ? "Dress the figure in every pose in this same outfit, seen from that pose's angle. " : "";
    gen(sheet(g, "starter", t), fill("starter.txt", { ...common, OUTFIT: behind || R.attire[g].desc, VIEWNOTE: view }), [file(sheet(g, "bald", t))]);
  }
  if (want("skinkey")) for (const t of ["front", "back", "poses"]) {
    gen(sheet(g, "skinkey", t), fill("skinkey.txt", { SKINWORD: ART.skinWord ?? "skin", SKINEXTRA: ART.extra ?? "", KEEP: ART.keep ?? "" }), [file(sheet(g, "starter", t))]);
  }
  if (want("eyes")) for (const [e, words] of Object.entries(EYES)) {
    gen(sheet(g, `eyes_${e}`, "front"), fill("eyes.txt", { ...common, EYES: words, LASH: woman ? "" : "No eyelashes. " }), [file(sheet(g, "bald", "front"))]);
  }
  if (want("hair")) for (const hair of R.hairs[g]) for (const t of ["front", "back"]) {
    const ties = hair.ties ? `, ${hair.ties.replace(/^,\s*/, "")}` : "";
    const view = t === "back" ? "This is a back view: show the back of the hairstyle. " : "";
    gen(sheet(g, hair.id, t), fill("hair.txt", { ...common, HAIR: hair.desc, TIES: ties, VIEW: view, EARHAIR: ART.earHair }), [file(sheet(g, "bald", t))]);
  }
}
console.log(`\n${race}: ${made} ${DRY ? "to make" : "made"}, ${skipped} already there`);

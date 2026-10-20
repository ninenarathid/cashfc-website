// The pasture's animals, round 2 (the owner, 2026-10-20: "ช่วยใช้ pixellab ในการทำท่า idle ของทุกสัตว์ ทุกช่วงวัย และ ตอนหันหน้าหันหลัง
// animation ตอนเดิน ด้วย"): every look (a breed's female and male, each species' young, the cloud ram, the shorn sheep)
// made a PixelLab character from its base (pasture-base.mjs: true pixels, facing SE), and its walk and idle animated
// in two views. README "The pasture", round 2.
//
// - The base is the character's "south" (PixelLab rotates a reference as if it faced the viewer straight on, so a 3/4
//   reference shifts every label by 45 degrees): its "south" is our SE as drawn, its "east" our NE (the 3/4 back view).
// - Four-legged ones: the skeleton templates (sheep on `dog`, cows on `horse`, as Codex advised): `walk-4-frames` and
//   `idle`, one call a view. Birds: no bird skeleton (Codex stopped the mannequin's templates), so the hen's character is
//   made on `mannequin` for its rotations only, and its walk and idle are custom animations on the PixMiniMax engine,
//   which held the hen's facing and identity in the trial where animate-with-text turned her.
// - Every call goes through pl.mjs (the gate, the ledger), several at once with PL_BATCH; the batch's whole cost from
//   the month's balance is written as one row at the end. The characters' ids are kept in work/pasture/chars.json.
//
//   REVIEW="<codex run>" node pasture-looks.mjs <look:base:kind> ...   [--conc 4] [--only create|anim]
//   kind: sheep | cow | bird   (look: the piece's look name, e.g. barnHenM; base: work/pasture/base/<base>.png)
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const WORK = path.join(HERE, "work"), BODIES = path.join(HERE, "prompts", "pixellab", "pasture2");
const CHARS = path.join(WORK, "pasture", "chars.json");
const args = process.argv.slice(2), conc = +(args[args.indexOf("--conc") + 1] || 4) || 4, only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const seOnly = args.includes("--se");
const looks = args.filter((a) => a.split(":").length === 3 && !/^[A-Za-z]:[\/]/.test(a)).map((a) => { const [look, base, kind] = a.split(":"); return { look, base, kind, ...(seOnly && !/^back/.test(kind) ? { only: "SE" } : {}) }; });
const chars = fs.existsSync(CHARS) ? JSON.parse(fs.readFileSync(CHARS, "utf8")) : {};
const saveChars = () => fs.writeFileSync(CHARS, JSON.stringify(chars, null, 1));
const key = fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").match(/^PIXELLAB_API_KEY=(.+)$/m)[1].trim();
const balance = async () => (await (await fetch("https://api.pixellab.ai/v2/balance", { headers: { Authorization: `Bearer ${key}` } })).json()).subscription?.generations;
const BATCH = `looks-${new Date().toISOString().slice(0, 16)}`;

const TEMPLATE = { sheep: "dog", cow: "horse", bird: "mannequin", back: "mannequin", backbird: "mannequin", backsheep: "mannequin" };
// What each look is, in the words PixelLab is given (the breeds' own looks, lib/town/animals.ts; the males' as their sheets drew them)
const DESC = {
  barnHen: "a red-brown hen with a small red comb", barnHenM: "a dark reddish-brown barn rooster with orange-brown neck hackles, a big red comb and a tall dark green sickle tail",
  chick: "a fluffy round yellow chick", pullet: "a young pale brown pullet hen",
  puddleDuck: "a white duck with an orange bill", puddleDuckM: "a white drake with an orange bill and a curled tail feather",
  duckling: "a fluffy round yellow duckling", youngDuck: "a young white duck with yellow down on its head",
  meadowSheep: "a soft white sheep with a cream face", meadowSheepM: "a soft white ram with a cream face and two big curled horns",
  lamb: "a small fluffy white lamb", hogget: "a young white sheep",
  dairyCow: "a white cow with black spots and a bell", dairyCowM: "a white bull with black spots, short horns and a pale pink muzzle",
  calf: "a small fawn brown calf", heifer: "a young fawn brown cow",
  // B to D
  silkie: "a fluffy white Silkie hen like cotton, with a small dark blue-grey face", silkieM: "a fluffy white Silkie rooster with a big fluffy crest, a small dark red comb and long fluffy tail plumes",
  araucana: "a grey-barred hen with puffy cheek tufts and a small red comb", araucanaM: "a grey-barred rooster with puffy cheek tufts, a red comb and a long barred sickle tail",
  marans: "a black hen with copper neck feathers and a red comb", maransM: "a glossy black rooster with bright copper neck and saddle feathers, a big red comb and a tall green-black sickle tail",
  runner: "an upright fawn and white Indian runner duck shaped like a bottle", runnerM: "an upright Indian runner drake shaped like a bottle, fawn and white with a green head",
  cayuga: "a black duck with a beetle-green sheen", cayugaM: "a glossy black drake with a strong beetle-green sheen on its head and a curled tail feather",
  mandarin: "a mandarin duck of orange, purple and green with orange sail feathers on its back", mandarinM: "a mandarin drake with two tall upright orange sail feathers on its back, a white stripe over its eye, an orange ruff and a purple breast",
  shetland: "a small sheep with chocolate-brown fleece and a dark brown face", shetlandM: "a small ram with warm brown fleece, a dark brown face and two big curled honey-coloured horns",
  jacob: "a black and white piebald sheep with four small horns", jacobM: "a black and white piebald ram with four big horns, two curling up and two curling down",
  valais: "a long-fleeced white sheep with a black face, ears and knees", valaisM: "a long-fleeced white ram with a black face, ears and knees and two big spiral horns",
  jersey: "a fawn cow with big long-lashed eyes and short horns", jerseyM: "a darker fawn brown bull with short horns and a heavy neck",
  highland: "a shaggy red-orange cow with a fringe over its eyes and wide horns", highlandM: "a shaggy red-orange bull with a fringe over its eyes and very wide upcurved horns",
  brownSwiss: "a grey-brown cow with big fuzzy ears and a pale muzzle", brownSwissM: "a grey-brown bull with big fuzzy ears, a pale muzzle, short horns and a heavy neck",
  // E to H, and the cloud ram
  lanternHen: "an amber hen whose tail tips glow pale lemon yellow", lanternHenM: "an amber rooster with a big red comb and short curled tail feathers tipped with glowing pale lemon yellow",
  cloudHen: "a puffy white hen with soft pale blue shading, like a little cloud", cloudHenM: "a puffy white rooster with soft pale blue shading, a red comb and a curled white tail",
  goldenHen: "a hen of shining gold feathers with a red comb", goldenHenM: "a shining gold rooster with a big red comb and a curled golden tail",
  pocketPhoenix: "a small bird of red-orange plumes with a crest and a tail of flame-shaped feathers", pocketPhoenixM: "a small red-orange phoenix cock with a tall crest of flame feathers and a long curling tail of orange and yellow flame feathers",
  raindropDuck: "a clear sky-blue duck with a tiny grey-white rain cloud over its head", raindropDuckM: "a deep sky-blue drake with a darker blue head and a tiny rain cloud with blue drops above its head",
  moonDuck: "a pearl-white duck with a yellow crescent on its wing", moonDuckM: "a pearl-white drake with a white head and a warm yellow crescent on its wing",
  paperboatDuck: "a cream-white duck whose feathers fold in crisp pleats like a paper boat", paperboatDuckM: "a cream-white drake folded in crisp paper pleats, with a pointed paper crest and an upright folded paper tail",
  littleLeviathan: "a short-necked sea-blue duck with deep-sea scales and a finned tail", littleLeviathanM: "a short-necked deep sea-blue drake with scales, a tall fin crest on its head and a long finned tail",
  dandelionLamb: "a sheep fluffed into pale yellow seed heads like a dandelion", dandelionLambM: "a ram fluffed into pale yellow seed heads like a dandelion, with two curled pale cream horns",
  rainbowSheep: "a sheep whose fleece runs in seven coloured bands", rainbowSheepM: "a ram whose fleece runs in seven coloured bands, with two curled cream horns",
  starFleece: "a midnight-blue sheep speckled with glowing stars", starFleeceM: "a midnight-blue ram speckled with glowing stars, with two curled silver-grey horns",
  goldenFleece: "a hornless ewe with a fleece of shining golden curls and a cream face", goldenFleeceM: "a ram with a fleece of shining golden curls and big heavy curled ivory horns",
  strawberryCow: "a pink cow freckled with yellow seed dots, with a green leafy tuft", strawberryCowM: "a pink bull freckled with yellow seed dots, with a green leafy tuft and short horns",
  cocoaCow: "a dark chocolate cow with milk-chocolate patches and cream horns", cocoaCowM: "a dark chocolate bull with milk-chocolate patches and big cream horns",
  flowerCow: "a white cow with green mossy patches and little flowers on its back", flowerCowM: "a white bull with green mossy patches, little flowers on its back and short horns",
  milkyWayCow: "a midnight-blue cow patterned with star constellations", milkyWayCowM: "a midnight-blue bull patterned with star constellations, with short pale horns",
  // the shorn whose fleece is their mark (Codex, 2026-10-20: never ask for the wool just taken off)
  valaisShorn: "a white sheep with a black face, ears and knees, just sheared: a slimmer body with a short smooth white coat",
  valaisMShorn: "a white ram with a black face, ears and knees and two big spiral horns, just sheared: a slimmer body with a short smooth white coat",
  dandelionLambShorn: "a pale cream sheep, just sheared: a slimmer body with a short smooth coat and a few small white flowers attached on its back",
  dandelionLambMShorn: "a pale cream ram with two curled pale cream horns, just sheared: a slimmer body with a short smooth coat and a few small white flowers attached on its back",
  starFleeceShorn: "a midnight-blue sheep, just sheared: a slimmer body with a short smooth coat marked with a few opaque pale-yellow stars inside its outline, with no glow or floating sparkles",
  starFleeceMShorn: "a midnight-blue ram with two curled silver-grey horns, just sheared: a slimmer body with a short smooth coat marked with a few opaque pale-yellow stars inside its outline, with no glow or floating sparkles",
  goldenFleeceShorn: "a hornless golden ewe with a cream face, just sheared: a slimmer body with a short smooth shining golden coat",
  goldenFleeceMShorn: "a golden ram with big heavy curled ivory horns, just sheared: a slimmer body with a short smooth shining golden coat",
  cloudRam: "a big fluffy white ram with a grey face, curled horns and a brown leather riding saddle, keeping the saddle, straps and stirrups in their reference positions",
};
const NOUN = { sheep: "sheep", cow: "cow", bird: "bird" };
// (a shorn look: its fleeced self's words, just sheared)
const desc = (l) => /^back/.test(l.kind) ? `${desc({ ...l, look: l.look.replace(/Back$/, ""), kind: "cow" })}, seen from behind, facing away to the upper right` : DESC[l.look] ?? (l.look.endsWith("Shorn") && DESC[l.look.slice(0, -5)] ? `${DESC[l.look.slice(0, -5)]}, just sheared: a slimmer body with a short smooth coat in its fleece's colours` : `a ${NOUN[l.kind]} (${l.look})`);
// The 3/4 back view (our NE): PixelLab's "north" (our NW, its back turned to the upper left), drawn mirrored as NE
// (pasture-frames.mjs). Its "east" came out a profile for the hen, the lamb and the calf, and only now and then the back
// three quarters; "north" was the back three quarters for every look of the starters (stage 2, 2026-10-20).
const BACK = { sheep: "north", cow: "north", bird: "north" };
// (looks whose "north" showed the face: their back view is "north-east", a straight back view, not mirrored; Codex, 2026-10-20-09-27-51)
const BACK_OF = { cayuga: "north-east", cayugaM: "north-east", mandarinM: "north-east" };
// the dog skeleton's standing loop, for the sheep. (The horse has no `idle`; its `rest-idle` lay the bull down into a
// sheep and striped the cow's spots (stage 3), so a cow's idle is a custom one, as a bird's: the calf's and the heifer's
// rest-idle held and were kept.)
const IDLE = { sheep: "idle" };
const STAND = (l, dir) => `standing in place, ${l.kind === "cow" ? "four hooves" : "feet"} planted, facing unchanged; subtle breathing, one brief blink${dir !== "south" ? " only if an eye is already visible; never turn to reveal the face" : ""}${l.kind === "cow" ? ", a small flick of an ear" : ""}; head returns to its starting position; seamless four-frame loop`;
const createBody = (l) => ({ description: `${desc(l)}, cute chibi pixel art with a thick dark outline, as in the reference`, reference_image: `@../../../work/pasture/base/${l.base}.png`, n_directions: 8, view: "low top-down", template_id: TEMPLATE[l.kind], name: l.look });
// A cow walks by the custom engine too (the owner, 2026-10-20, of the horse skeleton's walk: "ตัวนี้ขาเบี้ยว"), and its back
// view is a character of its own made from its back base (pasture-backs.mjs: a true three-quarter back), whose "south" is
// that view: its loops are written as its look's NE (kind `back`, look `<look>Back`).
const BIRD_WALK = "walking in place with small waddling steps, alternating its feet, facing unchanged, its body turned the same way in every frame";
const COW_WALK = "walking in place with a slow four-beat walk, one leg lifting at a time, all four legs straight and natural with the hooves stepping cleanly, never bending sideways; facing unchanged, its body turned the same way in every frame";
const animBodies = (l, id) => {
  // (its idle is the back base standing still: an idle animated from behind turned the head to show the face, Codex's
  // verdict on the Jersey trial, 2026-10-20-10-31-50; pasture-frames.mjs takes the walk's first picture, the base itself)
  // (every species' back view, 2026-10-20: Codex found the birds' and sheep's straight or narrow too; kind back (a cow),
  // backbird, backsheep)
  if (/^back/.test(l.kind)) return [["walk-NE", { character_id: id, mode: "pixminimax", action_description: l.kind === "backbird" ? BIRD_WALK : COW_WALK, subject_description: desc(l), frame_count: 4, directions: ["south"], animation_name: "walk-NE" }]];
  if (l.only === "SE") return animBodies({ ...l, only: undefined }, id).filter(([what]) => what.endsWith("-SE"));
  const views = l.kind === "cow" ? { south: "SE" } : { south: "SE", [BACK_OF[l.look] ?? BACK[l.kind]]: "NE" }, out = [];
  for (const [dir, view] of Object.entries(views)) {
    if (l.kind === "bird") {
      out.push([`walk-${view}`, { character_id: id, mode: "pixminimax", action_description: "walking in place with small waddling steps, alternating its feet, facing unchanged, its body turned the same way in every frame", subject_description: desc(l), frame_count: 4, directions: [dir], animation_name: `walk-${view}` }]);
      out.push([`idle-${view}`, { character_id: id, mode: "pixminimax", action_description: STAND(l, dir), subject_description: desc(l), frame_count: 4, directions: [dir], animation_name: `idle-${view}` }]);
    } else {
      out.push([`walk-${view}`, l.kind === "cow"
        ? { character_id: id, mode: "pixminimax", action_description: COW_WALK, subject_description: desc(l), frame_count: 4, directions: [dir], animation_name: `walk-${view}` }
        : { character_id: id, mode: "template", template_animation_id: "walk-4-frames", directions: [dir], animation_name: `walk-${view}` }]);
      out.push([`idle-${view}`, IDLE[l.kind]
        ? { character_id: id, mode: "template", template_animation_id: IDLE[l.kind], directions: [dir], animation_name: `idle-${view}` }
        : { character_id: id, mode: "pixminimax", action_description: STAND(l, dir), subject_description: desc(l), frame_count: 4, directions: [dir], animation_name: `idle-${view}` }]);
    }
  }
  return out;
};
const run = (name, endpoint, bodyFile) => new Promise((done) => {
  const p = spawn("node", ["pl.mjs", name, endpoint, bodyFile], { cwd: HERE, env: { ...process.env, PL_BATCH: BATCH } });
  let out = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
  p.on("close", () => done(out.trim()));
});
const done = (name) => { const d = path.join(WORK, "pl", name); return fs.existsSync(d) && fs.readdirSync(d).some((f) => /^(images-0|south)\.png$/.test(f) || /^\d+\.png$/.test(f)); };

// --plan <file>: the calls as they would go, for Codex to read first (nothing is called)
if (args.includes("--plan")) {
  const lines = looks.flatMap((l) => [
    ...(chars[l.look] ? [] : [`create-character-v3  ${JSON.stringify(createBody(l))}`]),
    ...animBodies(l, chars[l.look]?.id ?? "<the new character>").map(([what, b]) => `characters/animations ${l.look} ${what}  ${JSON.stringify(b)}`)]);
  fs.writeFileSync(args[args.indexOf("--plan") + 1], lines.join("\n") + "\n");
  console.log(lines.length, "calls planned");
  process.exit(0);
}
// PixelLab's Tier 1 runs 8 jobs at once (a call over that is refused, 429): every call here waits for one of `jobs` slots
const jobs = Math.min(7, +(args[args.indexOf("--jobs") + 1] || 6) || 6);
let free = jobs; const waiting = [];
const slot = async (f) => { if (free > 0) free--; else await new Promise((r) => waiting.push(r)); try { return await f(); } finally { const w = waiting.shift(); if (w) w(); else free++; } };
const start = await balance();
let i = 0;
/**
 * A character PixelLab made for a look although its call failed on our side (the network dropped while it was polled,
 * 2026-10-20: three looks were made twice that way): the newest of that name made today and not already a look's,
 * once PixelLab has finished it, its rotations fetched as the call would have. Taken before any new one is made.
 */
const ACCOUNT = "d269bb68-a0d3-4f22-b155-effb53323d61";
async function adopt(l) {
  const used = new Set(Object.values(chars).map((c) => c.id)), day = new Date().toISOString().slice(0, 10);
  for (let t = 0; t < 40; t++) {
    const list = (await (await fetch("https://api.pixellab.ai/v2/characters?limit=100", { headers: { Authorization: `Bearer ${key}` } })).json()).characters ?? [];
    const mine = list.filter((c) => c.name === l.look && c.created_at.startsWith(day) && !used.has(c.id)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    if (!mine.length) return null;
    const made = mine.find((c) => c.status === "completed");
    if (made) {
      const out = path.join(WORK, "pl", `pasture2-char-${l.look}`);
      fs.mkdirSync(out, { recursive: true });
      for (const d of ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]) {
        const r = await fetch(`https://backblaze.pixellab.ai/file/pixellab-characters/${ACCOUNT}/${made.id}/rotations/${d}.png`);
        if (r.ok) fs.writeFileSync(path.join(out, `${d}.png`), Buffer.from(await r.arrayBuffer()));
      }
      fs.writeFileSync(path.join(out, "response.json"), JSON.stringify({ adopted: true, character_id: made.id, created_at: made.created_at, others: mine.filter((c) => c !== made).map((c) => c.id) }, null, 1));
      return made.id;
    }
    await new Promise((r) => setTimeout(r, 30000));
  }
  return null;
}
const take = async (l) => {
  const id = await adopt(l).catch(() => null);
  if (id) { chars[l.look] = { id, base: l.base, kind: l.kind, adopted: true }; saveChars(); console.log(`char ${l.look} ${id} (made before, taken)`); }
  return !!id;
};
async function one(l) {
  // the character (one PixelLab made for it already, if any)
  if (!chars[l.look] && only !== "anim") await take(l);
  if (!chars[l.look] && only !== "anim") {
    const f = path.join(BODIES, `char-${l.look}.json`);
    fs.writeFileSync(f, JSON.stringify(createBody(l)) + "\n");
    for (let t = 0; t < 3 && !chars[l.look]; t++) {
      // (a call that failed may still have made it: taken rather than made again)
      if (t && (await take(l))) break;
      const out = await slot(() => run(`pasture2-char-${l.look}`, "create-character-v3", f));
      const r = path.join(WORK, "pl", `pasture2-char-${l.look}`, "response.json");
      const id = fs.existsSync(r) && /"character_id": "([^"]+)"/.exec(fs.readFileSync(r, "utf8"))?.[1];
      if (id && /^saved/.test(out)) { chars[l.look] = { id, base: l.base, kind: l.kind }; saveChars(); console.log(`char ${l.look} ${id}`); }
      else console.log(`char ${l.look} FAIL ${out.replace(/\s+/g, " ").slice(0, 160)}`);
    }
  }
  if (!chars[l.look] || only === "create") return;
  // its walk and idle, both views, at once
  await Promise.all(animBodies(l, chars[l.look].id).map(async ([what, body]) => {
    const name = `pasture2-${/^back/.test(l.kind) ? l.look.replace(/Back$/, "") : l.look}-${what}`;
    if (done(name)) return;
    const f = path.join(BODIES, `anim-${l.look}-${what}.json`);
    fs.writeFileSync(f, JSON.stringify(body) + "\n");
    for (let t = 0; t < 4; t++) {
      const out = await slot(() => run(name, "characters/animations", f));
      if (/^saved/.test(out)) { console.log(`ok   ${name}`); return; }
      console.log(`FAIL ${name} ${out.replace(/\s+/g, " ").slice(0, 300)}`);
      // (a refused body is not sent again; too many jobs at once (429) or PixelLab's own failure (5xx) is, after a wait)
      if (/HTTP 4(?!29)\d\d/.test(out)) return;
      await new Promise((r) => setTimeout(r, 30000));
    }
  }));
}
await Promise.all(Array.from({ length: conc }, async () => { while (i < looks.length) await one(looks[i++]); }));
const end = await balance();
fs.appendFileSync(path.join(WORK, "ledger.jsonl"), JSON.stringify({ t: new Date().toISOString(), tool: "pixellab", name: `${BATCH} (batch total)`, batch: BATCH, cost: 0, gens: +(start - end).toFixed(2), note: `the batch's calls together (${looks.map((l) => l.look).join(", ")}), from the month's balance ${start} -> ${end}; each call's own row says 0 where PixelLab did not say` }) + "\n");
console.log(`batch ${BATCH}: ${(start - end).toFixed(2)} generations, ${end} left`);

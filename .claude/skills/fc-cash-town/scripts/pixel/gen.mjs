// One OpenAI image call with reference pictures, logged to ledger.jsonl with its cost.
// node gen.mjs <out-name> <model> <quality> <size> <prompt.txt> [ref.png ...]
// The key is read from fcnext/.env.local and never printed.
//
// A call is made only once Codex has read it (the owner, 2026-10-09: "ช่วยทำให้ codex review prompt ก่อนนำไปสร้างเป็นภาพ
// ด้วย อยากได้งาน premium แต่คุ้มค่ากับ credit ที่เสียไปที่สุด"). `codex-ask.mjs art` (the codex-pair skill), given these
// same words, writes what it passed in work/reviews.jsonl; this script looks the call up there by its prompt, its
// settings and its references' names together.
//   CALLS=<file>      lists the call in that file and draws nothing, so that a batch script's calls are read at once
//   NO_REVIEW="<why>" draws it unread; the ledger keeps the reason
//   N=3               draws three of it in one call, to choose from (<name>-1.png …); each is charged as a call
//                     of its own, the reference with it (measured 2026-10-09), so it saves time and no credit
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const ENV = "E:/NinenineProject/fcnext/.env.local";
const BUDGET = 35; // US dollars; refuse to call past this (10, then 15 for the other races, then 25 when the owner added credit, 2026-10-02, then 35 when he added ten for the mountain and the cave, 2026-10-08)
// gpt-image-2 / 2.5 token rates, per 1M (checked 2026-10-02)
const RATE = { text: 5, image: 8, out: 30 };

const [outName, model, quality, size, promptFile, ...refs] = process.argv.slice(2);
const bg = process.env.BG ?? "transparent";
const n = Math.max(1, Math.min(4, Math.round(+(process.env.N ?? 1)) || 1));
if (process.env.CALLS) {
  fs.appendFileSync(process.env.CALLS, JSON.stringify({ bg, argv: [outName, model, quality, size, path.resolve(promptFile), ...refs.map(r => path.resolve(r))] }) + "\n");
  console.log(`listed ${outName} in ${process.env.CALLS}, not drawn`);
  process.exit(0);
}
const key = fs.readFileSync(ENV, "utf8").match(/^OPENAI_API_KEY=(.+)$/m)[1].trim();
const ledger = path.join(HERE, "work", "ledger.jsonl");
const spent = fs.existsSync(ledger)
  ? fs.readFileSync(ledger, "utf8").trim().split("\n").filter(Boolean).reduce((s, l) => s + JSON.parse(l).cost, 0)
  : 0;
if (spent > BUDGET - 0.5) { console.log(`STOP: spent $${spent.toFixed(3)} of $${BUDGET}`); process.exit(1); }

const prompt = fs.readFileSync(promptFile, "utf8").trim();
// The same stamp as codex-ask.mjs makes of a call it passed: change one, change both.
const stamp = createHash("sha256").update(JSON.stringify([model, quality, size, bg, prompt.replace(/\r\n/g, "\n"), refs.map(r => path.basename(r))])).digest("hex").slice(0, 16);
const reviews = path.join(HERE, "work", "reviews.jsonl");
const passed = fs.existsSync(reviews) ? fs.readFileSync(reviews, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)) : [];
const review = passed.findLast(r => r.stamp === stamp);
if (!review && !process.env.NO_REVIEW) {
  const near = passed.findLast(r => r.name === outName);
  console.log(`NOT READ: Codex has not passed this call${near ? ` (it passed ${outName} on ${near.t.slice(0, 16)} as ${near.quality} ${near.size} ${near.bg} with ${near.refs.join(", ") || "no reference"}: the words or the settings are not those)` : ""}.
  node ~/.claude/skills/codex-pair/scripts/codex-ask.mjs art --for "<where it is shown, how large, beside what>" ${bg === "transparent" ? "" : `--bg ${bg} `}${process.argv.slice(2).join(" ")}
To draw it unread, set NO_REVIEW="<why>".`);
  process.exit(1);
}
const form = new FormData();
form.append("model", model);
form.append("prompt", prompt);
form.append("quality", quality);
form.append("size", size);
form.append("background", bg);
form.append("output_format", "png");
if (n > 1) form.append("n", String(n));
for (const r of refs) form.append("image[]", new Blob([fs.readFileSync(r)], { type: "image/png" }), path.basename(r));

const t0 = Date.now();
// A new account may send 5 reference pictures a minute: wait as told and try again.
let res, j;
for (let attempt = 0; ; attempt++) {
res = await fetch(refs.length ? "https://api.openai.com/v1/images/edits" : "https://api.openai.com/v1/images/generations",
  refs.length
    ? { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form }
    : { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, quality, size, background: bg, output_format: "png", ...(n > 1 ? { n } : {}) }) });
j = await res.json();
if (res.status === 429 && attempt < 8) {
  const wait = +(/try again in ([d.]+)s/.exec(j.error?.message ?? "")?.[1] ?? 15) + 2;
  console.log(`rate limited, waiting ${wait}s`);
  await new Promise(r => setTimeout(r, wait * 1000));
  continue;
}
break;
}
if (!res.ok) { console.log("ERROR", res.status, JSON.stringify(j.error)); process.exit(1); }
const u = j.usage ?? {};
const d = u.input_tokens_details ?? {};
const cost = ((d.text_tokens ?? 0) * RATE.text + (d.image_tokens ?? 0) * RATE.image + (u.output_tokens ?? 0) * RATE.out) / 1e6;
const file = path.join(HERE, "work", "out", `${outName}.png`);
fs.mkdirSync(path.dirname(file), { recursive: true });
const files = j.data.map((_, i) => j.data.length > 1 ? file.replace(/\.png$/, `-${i + 1}.png`) : file);
j.data.forEach((d, i) => fs.writeFileSync(files[i], Buffer.from(d.b64_json, "base64")));
const row = { t: new Date().toISOString(), name: outName, model, quality, size, refs: refs.map(r => path.basename(r)),
  usage: u, cost: +cost.toFixed(4), secs: Math.round((Date.now() - t0) / 1000), ...(n > 1 ? { n: j.data.length } : {}), ...(review ? { review: stamp } : { noReview: process.env.NO_REVIEW }) };
fs.appendFileSync(ledger, JSON.stringify(row) + "\n");
console.log(`saved ${files.map(f => `work/out/${outName}${path.basename(f).slice(path.basename(file).length - 4)}`).join(", ")}  $${cost.toFixed(4)}  (${row.secs}s)  total $${(spent + cost).toFixed(3)} of $${BUDGET}`);
console.log("usage", JSON.stringify(u));

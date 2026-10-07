// One OpenAI image call with reference pictures, logged to ledger.jsonl with its cost.
// node gen.mjs <out-name> <model> <quality> <size> <prompt.txt> [ref.png ...]
// The key is read from fcnext/.env.local and never printed.
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const ENV = "E:/NinenineProject/fcnext/.env.local";
const BUDGET = 35; // US dollars; refuse to call past this (10, then 15 for the other races, then 25 when the owner added credit, 2026-10-02, then 35 when he added ten for the mountain and the cave, 2026-10-08)
// gpt-image-2 / 2.5 token rates, per 1M (checked 2026-10-02)
const RATE = { text: 5, image: 8, out: 30 };

const [outName, model, quality, size, promptFile, ...refs] = process.argv.slice(2);
const key = fs.readFileSync(ENV, "utf8").match(/^OPENAI_API_KEY=(.+)$/m)[1].trim();
const ledger = path.join(HERE, "work", "ledger.jsonl");
const spent = fs.existsSync(ledger)
  ? fs.readFileSync(ledger, "utf8").trim().split("\n").filter(Boolean).reduce((s, l) => s + JSON.parse(l).cost, 0)
  : 0;
if (spent > BUDGET - 0.5) { console.log(`STOP: spent $${spent.toFixed(3)} of $${BUDGET}`); process.exit(1); }

const prompt = fs.readFileSync(promptFile, "utf8").trim();
const form = new FormData();
form.append("model", model);
form.append("prompt", prompt);
form.append("quality", quality);
form.append("size", size);
form.append("background", process.env.BG ?? "transparent");
form.append("output_format", "png");
for (const r of refs) form.append("image[]", new Blob([fs.readFileSync(r)], { type: "image/png" }), path.basename(r));

const t0 = Date.now();
// A new account may send 5 reference pictures a minute: wait as told and try again.
let res, j;
for (let attempt = 0; ; attempt++) {
res = await fetch(refs.length ? "https://api.openai.com/v1/images/edits" : "https://api.openai.com/v1/images/generations",
  refs.length
    ? { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form }
    : { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, quality, size, background: process.env.BG ?? "transparent", output_format: "png" }) });
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
fs.writeFileSync(file, Buffer.from(j.data[0].b64_json, "base64"));
const row = { t: new Date().toISOString(), name: outName, model, quality, size, refs: refs.map(r => path.basename(r)),
  usage: u, cost: +cost.toFixed(4), secs: Math.round((Date.now() - t0) / 1000) };
fs.appendFileSync(ledger, JSON.stringify(row) + "\n");
console.log(`saved work/out/${outName}.png  $${cost.toFixed(4)}  (${row.secs}s)  total $${(spent + cost).toFixed(3)} of $${BUDGET}`);
console.log("usage", JSON.stringify(u));

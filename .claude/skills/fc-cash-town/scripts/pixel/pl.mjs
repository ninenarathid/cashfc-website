// One PixelLab call (https://api.pixellab.ai/v2), logged to work/ledger.jsonl beside gen.mjs's OpenAI calls.
// node pl.mjs <out-name> <endpoint> <body.json>
// The key is PIXELLAB_API_KEY in fcnext/.env.local and is never printed. Tier 1 since 2026-10-19 (2,000 generations
// a month). What PixelLab is used for, and what stays with gen.mjs, is ART_WORKFLOW.md's "PixelLab" section.
//
// The body is the endpoint's JSON as its docs give it (https://api.pixellab.ai/v2/llms.txt). Any string "@<file.png>"
// in it, at any depth, is sent as a base64 image ({ type: "base64", base64, format: "png" }).
// A call is made only once Codex has read it, as with gen.mjs:
//   REVIEW="<what Codex read: its codex-ask run folder or a line>"  makes it; the ledger keeps the words
//   NO_REVIEW="<why>"                                              makes it unread; the ledger keeps the reason
//   CALLS=<file>                                                   lists it in that file and makes nothing
// What comes back goes to work/pl/<out-name>/: every image as <field>-<i>.png, every file the answer links to
// (a VFX's .gif, .png, .json, game pack), and response.json with long strings cut.
// The ledger row has cost: 0 (the subscription pays, so gen.mjs's dollar total is unchanged) and gens: what the
// call took of the month's generations, with usdIfPaid when PixelLab says it.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const ENV = "E:/NinenineProject/fcnext/.env.local";
const API = "https://api.pixellab.ai/v2";

const [outName, given, bodyFile] = process.argv.slice(2);
// "estimate-skeleton" or "/estimate-skeleton"; Git Bash turns the second into "C:/Program Files/Git/estimate-skeleton"
const endpoint = given && "/" + given.replace(/^.*\/Git\//, "").replace(/^\/+/, "");
if (!outName || !endpoint || !bodyFile) {
  console.log("node pl.mjs <out-name> <endpoint> <body.json>   (REVIEW=… or NO_REVIEW=…; CALLS=<file> to list)");
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(bodyFile, "utf8"));
// The stamp is of the endpoint and the body with every picture's bytes, not its name (Codex, 2026-10-19).
const files = [];
const inline = v => typeof v === "string" && v.startsWith("@")
  ? (files.push(path.resolve(path.dirname(bodyFile), v.slice(1))), { type: "base64", base64: fs.readFileSync(files.at(-1)).toString("base64"), format: "png" })
  : Array.isArray(v) ? v.map(inline) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, inline(x)])) : v;
const body = inline(raw);
const stamp = createHash("sha256").update(JSON.stringify([endpoint, body])).digest("hex").slice(0, 16);
if (process.env.CALLS) {
  fs.appendFileSync(process.env.CALLS, JSON.stringify({ tool: "pixellab", name: outName, endpoint, body: path.resolve(bodyFile), pictures: files, stamp }) + "\n");
  console.log(`listed ${outName} in ${process.env.CALLS}, not made`);
  process.exit(0);
}
if (!process.env.REVIEW && !process.env.NO_REVIEW) {
  console.log(`NOT READ: have Codex read the body and its pictures first (codex-ask.mjs find or plan with --see), then
  REVIEW="<its run folder>" node pl.mjs ${process.argv.slice(2).join(" ")}
To make it unread, set NO_REVIEW="<why>".`);
  process.exit(1);
}
const key = fs.readFileSync(ENV, "utf8").match(/^PIXELLAB_API_KEY=(.+)$/m)?.[1].trim();
if (!key) { console.log(`no PIXELLAB_API_KEY in ${ENV}`); process.exit(1); }
const H = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
// (what only reads is asked again when the network drops for a while, as it did on 2026-10-20: a job already paid for
// must not be lost to a dropped poll, nor sent again by a runner that saw it fail)
const again = async (f, what) => { for (let t = 0; ; t++) { try { return await f(); } catch (e) { if (t >= 30) throw e; console.error(`(${what}: ${e.cause?.code ?? e.message}; again in 10 s)`); await new Promise((s) => setTimeout(s, 10000)); } } };
const left = () => again(async () => (await (await fetch(`${API}/balance`, { headers: H })).json()).subscription?.generations, "balance");

const out = path.join(HERE, "work", "pl", outName);
fs.mkdirSync(out, { recursive: true });
const before = await left();
const t0 = Date.now();
const r = await fetch(API + endpoint, { method: "POST", headers: H, body: JSON.stringify(body) });
let res = await r.json();
if (!r.ok) { console.log(`HTTP ${r.status} ${JSON.stringify(res).slice(0, 800)}`); process.exit(1); }
const job = res.background_job_id ?? res.background_job_ids?.[0];
if (job) for (;;) {
  await new Promise(s => setTimeout(s, 5000));
  res = await again(async () => (await fetch(`${API}/background-jobs/${job}`, { headers: H })).json(), "poll");
  if (res.status === "completed" || res.status === "failed") break;
}
const short = o => JSON.stringify(o, (k, v) => typeof v === "string" && v.length > 300 ? `<${v.length} chars>` : v, 1);
fs.writeFileSync(path.join(out, "response.json"), short(res));
if (res.status === "failed") { console.log(`FAILED ${short(res).slice(0, 800)}`); process.exit(1); }

let n = 0; const links = [];
const walk = (o, field) => {
  if (!o || typeof o !== "object") return;
  if (typeof o.base64 === "string") { fs.writeFileSync(path.join(out, `${field || "image"}-${n++}.png`), Buffer.from(o.base64, "base64")); return; }
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && /^https:\/\//.test(v) && /\.(png|gif|json|zip)(\?|$)/.test(v)) links.push(v);
    else walk(v, isNaN(+k) ? k : field);
  }
};
const last = res.last_response ?? res;
walk(last);
for (const u of links) fs.writeFileSync(path.join(out, path.basename(new URL(u).pathname)), await again(async () => { const d = await fetch(u); if (!d.ok) throw new Error(`HTTP ${d.status}`); const b = Buffer.from(await d.arrayBuffer()); if (b.subarray(1, 4).toString() !== "PNG" && u.endsWith(".png")) throw new Error("not a PNG"); return b; }, "download"));

const usage = last.billing_usage ?? last.usage ?? res.usage ?? {};
const after = await left();
// (several calls at once (PL_BATCH=<id>): the month's balance before and after a call counts the others' too, so a call
// that does not say what it took is written 0 here, and the batch's runner writes one row with the batch's whole cost)
const gens = +(usage.generations ?? (process.env.PL_BATCH ? 0 : before - after)).toFixed(2);
const row = { t: new Date().toISOString(), tool: "pixellab", name: outName, endpoint, pictures: files.map(f => path.basename(f)), stamp, ...(process.env.PL_BATCH ? { batch: process.env.PL_BATCH } : {}),
  cost: 0, gens, ...(usage.cost_if_paid ? { usdIfPaid: +usage.cost_if_paid.toFixed(4) } : {}), secs: Math.round((Date.now() - t0) / 1000),
  ...(process.env.REVIEW ? { review: process.env.REVIEW } : { noReview: process.env.NO_REVIEW }) };
fs.appendFileSync(path.join(HERE, "work", "ledger.jsonl"), JSON.stringify(row) + "\n");
console.log(`saved work/pl/${outName}/ (${n} pictures, ${links.length} files)  ${gens} generations  (${row.secs}s)  ${after} left this month`);

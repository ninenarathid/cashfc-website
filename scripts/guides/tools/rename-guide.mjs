// Rename one guide in place (service key from the repo root's .env.local).
// usage (from the repo root): node scripts/guides/tools/rename-guide.mjs <slug> "<new name>"
import { readFileSync } from "node:fs";
const [slug, name] = process.argv.slice(2);
if (!slug || !name) { console.error("usage: rename-guide.mjs <slug> <name>"); process.exit(1); }
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
);
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json", prefer: "return=representation" };
const before = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/guides?slug=eq.${encodeURIComponent(slug)}&select=slug,name`, { headers: H })).json();
console.log("before", before);
if (before.length !== 1) process.exit(1);
const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/guides?slug=eq.${encodeURIComponent(slug)}`, { method: "PATCH", headers: H, body: JSON.stringify({ name }) });
console.log("after", r.status, await r.json());

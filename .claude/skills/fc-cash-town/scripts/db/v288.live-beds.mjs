// v288 on the live farm as it is (read from production with GET only, laid on the bench): every bed with plants in
// it, handed on and given up through town_bed_give / town_bed_leave as a member calls them; what each answers, and the
// error where one is raised. A look, not a test: what a member found ("ไม่สามารถโอนแปลงที่มีผักอยู่ได้", 2026-10-19).
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v288.live-beds.mjs
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";

const TREE = process.env.FC_REPO ?? process.cwd(), BASE = "5568ab2b";
const env = Object.fromEntries(readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const get = async (p) => { const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${p}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } }); if (!r.ok) throw Error(p + " " + r.status); return r.json(); };
let live = []; for (let off = 0; ; off += 1000) { const page = await get(`town_plots?select=x,y,bed,soil,plant,house,damp,changed&order=x,y&limit=1000&offset=${off}`); live = live.concat(page); if (page.length < 1000) break; }
const liveBeds = await get("town_beds?select=bed,member_id,tended,empty");
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
const db = await rewardDB(252);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
try {
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  for (let n = 276; n <= Number(process.env.MAXV ?? 288); n++) for (const f of readdirSync(`${TREE}/supabase`).filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`${TREE}/supabase/${f}`, "utf8")); } catch (e) { await db.exec("rollback"); console.log("skip", f, e.message.slice(0, 80)); }
  }
  const [me, pal] = (await rows("select p.id from public.profiles p order by p.id limit 2")).map((r) => r.id);
  const as = async (q, a = []) => { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [me]); await db.query("select set_config('request.jwt.claim.role','authenticated',false)"); await db.exec("set role authenticated"); try { return (await db.query(q, a)).rows[0].r; } finally { await db.exec("reset role"); } };
  // the whole live farm, triggers quiet as it is laid
  await db.exec("alter table public.town_plots disable trigger user; delete from public.town_plots where true; delete from public.town_beds where true");
  for (const p of live) await db.query("insert into public.town_plots(x,y,bed,soil,plant,house,damp,changed) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)", [p.x, p.y, p.bed, p.soil, p.plant ? JSON.stringify(p.plant) : null, p.house ? JSON.stringify(p.house) : null, !!p.damp, p.changed]);
  await db.exec("alter table public.town_plots enable trigger user");
  const now = Number((await rows("select town.now_ms() t"))[0].t);
  const counts = {};
  for (const p of live) if (p.plant) counts[p.bed] = (counts[p.bed] ?? 0) + 1;
  const planted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log(`live: ${live.length} plots, ${liveBeds.length} beds, ${planted.length} with plants`);
  for (const [bedS, n] of planted.filter(([, n]) => !process.env.ONLY_FULL || n >= 40).slice(0, Number(process.env.FIRST ?? 99))) {
    const bed = Number(bedS);
    for (const what of ["give", "leave"]) {
      await db.exec("begin");
      try {
        await db.exec("delete from public.town_beds where true");
        await db.query("insert into public.town_beds(bed, member_id, tended, empty) values ($1, $2, $3, 0)", [bed, me, now - 3_600_000]);
        const t0 = performance.now();
        const r = what === "give" ? await as("select public.town_bed_give($1, $2) r", [bed, pal]) : await as("select public.town_bed_leave($1) r", [bed]);
        console.log(`bed ${bed} (${n} plots planted) ${what}: ${r.ok ? `ok, ${r.plants} plants` : `refused ${r.why}`} in ${Math.round(performance.now() - t0)} ms`);
        if (what === "give" && r.ok) {
          // (every plant as it was but for whose: its Quality and gift to the byte)
          const after = await rows("select x, y, plant from public.town_plots where bed = $1 and plant is not null order by x, y", [bed]);
          const was = Object.fromEntries(live.filter((p) => p.bed === bed && p.plant).map((p) => [`${p.x},${p.y}`, p.plant]));
          const off = after.filter((a) => JSON.stringify({ ...a.plant, by: undefined }) !== JSON.stringify({ ...was[`${a.x},${a.y}`], by: undefined }) || a.plant.by !== pal);
          console.log(`   ${after.length - off.length}/${after.length} plants as they were but for whose${off.length ? ` · e.g. ${off[0].x},${off[0].y}` : ""}`);
        }
      } catch (e) {
        console.log(`bed ${bed} (${n} plots planted) ${what}: ERROR ${e.code ?? ""} ${e.message.slice(0, 200)}${e.where ? ` @ ${e.where.split("\n")[0].slice(0, 160)}` : ""}`);
      } finally { await db.exec("rollback"); }
    }
  }
} finally { await db.close(); }

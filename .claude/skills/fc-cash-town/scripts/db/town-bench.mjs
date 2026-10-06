/*
 * A stand-in for the town's database, on a local port: every migration of the game's (v104 to the newest in
 * supabase/) replayed into PGlite, and its functions answered over HTTP the way PostgREST answers them. The dev
 * server's test room is pointed at it with `&townDb=http://127.0.0.1:3199`, so that what a member will play (the
 * database's keeper, lib/town/keeper) can be played in a real browser by made-up members, with nothing of
 * production's touched. There is one Supabase project: this is how the game is tried before it opens.
 *
 *   node town-bench.mjs [port]          (3199)
 *   BENCH_EXTRA=<a.sql>[,<b.sql>]       a draft that is not in supabase/ yet, run after everything that is
 *
 *   POST /rest/v1/rpc/<function>        its arguments as JSON; `x-town-as: <a tester's id>` says who asks
 *   GET  /bench/who?as=<id>&name=…      the member a tester is here (made at first sight: a proved character, thirty popoto)
 *   POST /bench/sql   { sql, params }   anything, as the SQL editor: for a check to set a purse up, or read a table
 *   POST /bench/skip  { ms }            put the town's clock forward (the next round, a plant grown, a meal's hours)
 *
 * PGlite is one connection, so every request waits its turn.
 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { KUDOS } from "./kudos-stub.mjs";

const PORT = Number(process.argv[2]) || 3199;
const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const extra = `${KUDOS}
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;
const t = await supabaseLike({ extra });
// every file of the town's there is, in order: v104 to v122 have run and are read back from history (the harness's
// migration() does that); what is in supabase/ after them is taken to be the town's, as it stands in the folder
const RAN = 152;
const pending = existsSync(`${repo}/supabase`) ? readdirSync(`${repo}/supabase`).map((f) => Number(/^v(\d+)_/.exec(f)?.[1])).filter((n) => n > RAN) : [];
const newest = Math.max(RAN, ...pending);
// (by number, but for one: v130 ran after v131, and both write the catalog's `items` over, whole. The row that stands
// is the later one's, v130's, which has the water cart: so v130 is replayed after v131, as it ran.)
// (and not every number is the town's: v136 is the party finder's polls, whose tables are not here)
const OTHERS = [136];
const numbers = Array.from({ length: newest - 103 }, (_, i) => 104 + i).filter((n) => n !== 130 && !OTHERS.includes(n));
numbers.splice(numbers.indexOf(131) + 1, 0, 130);
for (const n of numbers) {
  let sql = null;
  try { sql = migration(n); } catch { /* a number that was never a file */ }
  if (sql) await t.run(sql, `v${n}`);
}
for (const draft of (process.env.BENCH_EXTRA ?? "").split(",").filter(Boolean)) await t.run(readFileSync(draft, "utf8"), draft.split(/[\\/]/).pop());
// the stand-in's members are no admins: the game is open to them here (v115's knob, where there is one)
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`
  create table public.bench_clock (id int primary key default 1, skew bigint not null default 0);
  insert into public.bench_clock default values;
  create or replace function town.now_ms() returns bigint language sql stable
  as $$ select floor(extract(epoch from now()) * 1000)::bigint + (select skew from public.bench_clock) $$;
  revoke execute on all functions in schema town from public, anon, authenticated;
`);

/* ── who asks ── */
const members = new Map();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function who(as, name, admin = false) {
  if (!as) return null;
  if (UUID.test(as)) return as;
  if (members.has(as)) return members.get(as);
  const h = createHash("sha1").update(`town-bench:${as}`).digest("hex");
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
  const character = 700000000 + (parseInt(h.slice(0, 6), 16) % 90000000);
  await t.sql(`insert into auth.users (id, email) values ($1, $2) on conflict do nothing`, [id, `${h.slice(0, 10)}@example.com`]);
  await t.sql(`insert into public.profiles (id, character_id, character_name, character_verified_at, is_admin) values ($1, $2, $3, now(), $4) on conflict (id) do nothing`,
    [id, character, name || `Tester ${as}`.slice(0, 40), admin]);
  // thirty popoto from somebody else, a day apart, to have some to change at the bank
  await t.sql(`insert into public.kudos (sender_id, receiver_character_id, day, created_at)
               select $1, $2, current_date - n, now() - (n || ' days')::interval from generate_series(1, 30) n on conflict do nothing`, [U.m1, character]);
  members.set(as, id);
  return id;
}

/* ── the functions, and what each takes ── */
const fns = new Map();
for (const r of (await t.sql(`
  select p.proname as name, p.proretset as many, p.proargnames as args,
         array(select format_type(x, null) from unnest(p.proargtypes) x) as types
    from pg_proc p where p.pronamespace = 'public'::regnamespace and (p.proname like 'town\\_%' or p.proname like 'popoto\\_%')`)).rows) {
  fns.set(r.name, { many: r.many, types: Object.fromEntries((r.args ?? []).slice(0, r.types.length).map((a, i) => [a, r.types[i]])) });
}

let turn = Promise.resolve();
const inTurn = (work) => { const mine = turn.then(work, work); turn = mine.catch(() => null); return mine; };

async function rpc(name, args, as) {
  const fn = fns.get(name);
  if (!fn) return [404, { code: "PGRST202", message: `Could not find the function public.${name} in the schema cache` }];
  const names = Object.keys(args), values = [];
  for (const k of names) {
    if (!/^[a-z_][a-z0-9_]*$/.test(k) || !(k in fn.types)) return [404, { code: "PGRST202", message: `public.${name} takes no ${k}` }];
    let v = args[k];
    // (testers are told to the database as the members they are here)
    if (k === "p_other" && typeof v === "string") v = await who(v);
    if (k === "p_crew" && Array.isArray(v)) v = await Promise.all(v.map((x) => who(String(x))));
    if (k === "p_member" && typeof v === "string") v = await who(v);
    const type = fn.types[k];
    values.push(v === null || v === undefined ? null
      : type === "jsonb" || type === "json" ? JSON.stringify(v)
      : type.endsWith("[]") ? `{${v.map((x) => `"${String(x).replace(/["\\]/g, "")}"`).join(",")}}`
      : v);
  }
  const call = `public.${name}(${names.map((k, i) => `${k} => $${i + 1}`).join(", ")})`;
  const r = await t.as(as ?? "anon", `select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)::text as r from ${call} x`, values.length ? values : undefined);
  if (r.error) return [r.code === "42501" ? 403 : 400, { code: r.code ?? "", message: r.error }];
  const rows = JSON.parse(r.rows[0].r);
  return [200, fn.many ? rows : rows[0] ?? null];
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, x-town-as, authorization, apikey, prefer", "access-control-allow-methods": "GET, POST, OPTIONS" };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (status, body) => { res.writeHead(status, { "content-type": "application/json", ...CORS }); res.end(JSON.stringify(body)); };
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }
  let body = {};
  if (req.method === "POST") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}; } catch { send(400, { message: "not JSON" }); return; }
  }
  try {
    await inTurn(async () => {
      const m = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_0-9]+)$/);
      if (m && req.method === "POST") {
        const as = await who(String(req.headers["x-town-as"] ?? ""));
        const [status, out] = await rpc(m[1], body ?? {}, as);
        return send(status, out);
      }
      if (url.pathname === "/bench/who") {
        const id = await who(url.searchParams.get("as") ?? "", url.searchParams.get("name") ?? "", url.searchParams.get("admin") === "1");
        return send(id ? 200 : 400, { id });
      }
      if (url.pathname === "/bench/sql" && req.method === "POST") {
        const r = await t.as("super", String(body.sql ?? ""), Array.isArray(body.params) && body.params.length ? body.params : undefined);
        return send(r.error ? 400 : 200, r.error ? { message: r.error, code: r.code } : { rows: JSON.parse(JSON.stringify(r.rows ?? [], (_k, v) => (typeof v === "bigint" ? Number(v) : v))) });
      }
      if (url.pathname === "/bench/skip" && req.method === "POST") {
        const r = await t.as("super", `update public.bench_clock set skew = skew + $1 returning skew`, [Math.round(Number(body.ms) || 0)]);
        return send(200, { skew: Number(r.rows?.[0]?.skew ?? 0) });
      }
      send(404, { message: "not something this stand-in serves" });
    });
  } catch (e) {
    send(500, { message: e.message });
  }
});
await new Promise((ok) => server.listen(PORT, "127.0.0.1", ok));
console.log(`\nthe town's stand-in database is up: http://127.0.0.1:${PORT}  (v104 to v${newest}; ${fns.size} functions)`);

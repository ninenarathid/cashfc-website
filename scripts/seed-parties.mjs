// A handful of parties on the board, to look at.
//
//   node scripts/seed-parties.mjs           # put them up
//   node scripts/seed-parties.mjs --clean   # take them down again
//
// For looking at the page with something on it. The board reads from the live
// project — there is only one — so everything this writes is visible to anybody
// who opens /party, and --clean is the way back.
//
// Every row it makes carries `rules.__demo`, which is a key no seat is ever
// called and which the front end therefore never reads. That is how --clean
// finds them again without a marker anybody can see: a "[demo]" in the note
// would be honest and would also be the first thing on the row.
//
// The people are real: names, faces and character ids come out of
// members.json, because a board of "Player One" tells you nothing about how it
// reads when the names are the FC's own.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }));

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rest = async (path, init) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init?.headers || {}) } });
  const body = await r.text();
  if (!r.ok) throw new Error(`${path}: ${r.status} ${body}`);
  return body ? JSON.parse(body) : null;
};

const board = JSON.parse(readFileSync("data/members.json", "utf8"));
const roster = board.members;

/* ── the marker ───────────────────────────────────────────────────────────── */
const MARK = { __demo: true };
const isDemo = "rules->>__demo=eq.true";

if (process.argv.includes("--clean")) {
  const gone = await rest(`party_posts?${isDemo}`,
    { method: "DELETE", headers: { Prefer: "return=representation" } });
  console.log(`removed ${gone?.length ?? 0} demo part${gone?.length === 1 ? "y" : "ies"}`
    + " (their members and comments went with them)");
  // Falls off the end rather than calling process.exit: exiting while the
  // socket from that DELETE is still closing makes libuv print an assertion
  // failure over the top of the only line anybody wanted to read.
} else {
  await seed();
}

async function seed() {

/* ── who is in them ───────────────────────────────────────────────────────── */

// Real accounts, so the owner of a listing is somebody who could have made it.
const owners = await rest(
  "profiles?select=id,character_id,character_name,avatar_url"
  + "&character_verified_at=not.is.null&character_id=not.is.null&limit=8");
if (!owners.length) { console.error("no verified profiles to own a party"); process.exit(1); }

const byId = new Map(roster.map((m) => [m.id, m]));
/** A stable pick, so re-running writes the same board. */
const pick = (n, seed) => {
  const out = [];
  let x = seed;
  const pool = roster.filter((m) => m.avatar);
  while (out.length < n && pool.length) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(pool.splice(x % pool.length, 1)[0]);
  }
  return out;
};

/*
 * Every member row carries the same keys.
 *
 * PostgREST refuses a bulk insert whose objects differ ("All object keys must
 * match") — it builds one statement for the batch and cannot leave a column
 * out of half the rows. So a seated member gets a null flex rather than no
 * flex, which is the same thing to the table and the difference between a
 * request that works and one that does not.
 */
const row = ({ partyId, seat = null, m = null, name = null, job = null,
               flex = null, confirmed = true, invitedBy }) => ({
  party_id: partyId,
  seat,
  character_id: m?.id ?? null,
  name: m?.name ?? name ?? "Somebody",
  avatar: m?.avatar ?? null,
  job,
  flex,
  confirmed_at: confirmed ? new Date().toISOString() : null,
  invited_by: invitedBy,
});

/** Thai wall-clock, n days ahead, as an instant. Bangkok is UTC+7 all year. */
const at = (days, hour) => {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days,
    hour - 7, 0, 0)).toISOString();
};

const FULL = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"];
const JOBS = {
  MT: "Paladin", ST: "DarkKnight", H1: "WhiteMage", H2: "Scholar",
  D1: "Samurai", D2: "Reaper", D3: "Machinist", D4: "BlackMage",
};

/* ── the board ────────────────────────────────────────────────────────────── */

const labels = board.current_tier?.labels ?? [];
const bosses = board.extremes ?? [];

const PARTIES = [
  {
    // A reclear that is one body short, with somebody who will take either of
    // two seats — the case the whole flex idea exists for.
    content_key: `sav:${labels[labels.length - 1] ?? "M12S"}`,
    note: "Weekly reclear. Bring food, we start on time.",
    shape: "full", days: 0, hour: 21, minutes: 180, unit: "food",
    progress: { at: "a2c", mech: "still losing people to the adds" },
    loot: { rule: "ltr" },
    seats: ["MT", "H1", "H2", "D1", "D3", "D4"],
    floating: [{ seatsWanted: ["ST", "D2"], job: "Gunbreaker" }],
    comments: [
      "Can I bring Reaper instead? Not touched Samurai since 6.x.",
      "Reaper is fine, we only need the melee slot covered.",
    ],
  },
  {
    // A first night, mercenary, with a write-up — the long form.
    content_key: `ult:The Unending Coil of Bahamut`,
    note: "Prog from phase 2. Voice required.",
    shape: "full", days: 1, hour: 20, minutes: 240, unit: "hours",
    progress: { at: "prog", mech: "Nael quotes into Bahamut" },
    seats: ["MT", "ST"],
    floating: [{ any: true }, { any: true, unconfirmed: true }],
    body: [
      { kind: "text", text: "Starting from the phase 2 checkpoint. If you have not seen Nael before, watch a video first — we will explain the positions but not the whole fight." },
      { kind: "text", text: "Bring your own food and pots. We break for ten minutes at 22:00 whatever is happening." },
    ],
  },
  {
    // A farm with a rule about jobs, and one seat nobody is being asked for.
    content_key: `ex:${bosses[0] ?? "Doomtrain"}`,
    note: "Mount farm, all welcome",
    shape: "full", days: 1, hour: 22, minutes: 90, unit: "food",
    progress: { at: "farm" },
    loot: { rule: "ffa" },
    oneOfEachJob: true,
    seats: ["MT", "ST", "H1"],
    closed: ["D4"],
  },
  {
    // Twenty-four seats, and a party that is mostly empty on purpose.
    content_key: "all:Jeuno: The First Walk",
    note: "Nostalgia run, first timers welcome",
    shape: "alliance", days: 2, hour: 21, minutes: 120, unit: "hours",
    progress: { at: "fresh" },
    seats: ["A-MT", "A-H1", "A-D1", "B-MT", "B-H2"],
  },
  {
    // No party at all: everybody queues alone, and the list is the point.
    content_key: "pvp:cc",
    note: "Casual, all welcome — queue at 21:00 sharp",
    shape: "open", days: 2, hour: 21, minutes: 60, unit: "food",
    floating: [{ any: true }, { any: true }, { any: true },
               { any: true, unconfirmed: true }],
  },
  {
    // Somewhere in particular, with a friend from outside the FC in it.
    content_key: "comm:gpose",
    note: "FC group photo — glamour up",
    shape: "open", days: 3, hour: 20, minutes: 60, unit: "hours",
    spot: { map: "Kozama'uka", region: "Yok Tural", x: 12.4, y: 30.1 },
    floating: [{ any: true }, { any: true }, { any: true },
               { outsider: "Mirai Kaguya" }],
    comments: ["I will bring the umbrella minion for the front row."],
  },
];

let made = 0;
for (const [i, spec] of PARTIES.entries()) {
  const owner = owners[i % owners.length];
  const crew = pick((spec.seats?.length ?? 0) + (spec.floating?.length ?? 0) + 1, 7 + i * 31);
  const ownerMember = byId.get(owner.character_id);

  const post = await rest("party_posts?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner: owner.id,
      owner_character_id: owner.character_id,
      content_key: spec.content_key,
      note: spec.note ?? null,
      shape: spec.shape,
      starts_at: at(spec.days, spec.hour),
      length_minutes: spec.minutes,
      length_unit: spec.unit,
      one_of_each_job: !!spec.oneOfEachJob,
      closed: spec.closed ?? [],
      rules: { ...MARK, ...(spec.rules ?? {}) },
      progress: spec.progress ?? null,
      loot: spec.loot ?? null,
      spot: spec.spot ?? null,
      body: (spec.body ?? []).map((b, n) => ({ id: `b${i}${n}`, ...b })),
    }),
  });
  const partyId = post[0].id;

  // The owner sits in the first seat of their own party, or floats where there
  // are none — a listing nobody is in is a listing nobody can join.
  const rows = [];
  let n = 0;
  const seats = spec.seats ?? [];
  seats.forEach((seat, k) => {
    const m = k === 0 && ownerMember ? ownerMember : crew[n++];
    if (!m) return;
    rows.push(row({
      partyId, seat, m, job: JOBS[seat.replace(/^[ABC]-/, "")],
      invitedBy: owner.id,
    }));
  });
  (spec.floating ?? []).forEach((f, k) => {
    if (f.outsider) {
      rows.push(row({
        partyId, name: f.outsider, flex: { all: true }, invitedBy: owner.id,
      }));
      return;
    }
    const m = (!seats.length && k === 0 && ownerMember) ? ownerMember : crew[n++];
    if (!m) return;
    rows.push(row({
      partyId, m, job: f.job ?? null,
      flex: f.any ? { all: true } : { seats: f.seatsWanted },
      confirmed: !f.unconfirmed, invitedBy: owner.id,
    }));
  });
  if (rows.length) await rest("party_members", { method: "POST", body: JSON.stringify(rows) });

  for (const [k, text] of (spec.comments ?? []).entries()) {
    const speaker = k === 1 && ownerMember ? ownerMember : crew[k] ?? crew[0];
    await rest("party_comments", {
      method: "POST",
      body: JSON.stringify({
        party_id: partyId,
        author: owner.id,
        author_character_id: speaker?.id ?? null,
        author_name: speaker?.name ?? "Somebody",
        author_avatar: speaker?.avatar ?? null,
        body: text,
        created_at: new Date(Date.now() - (2 - k) * 1800_000).toISOString(),
      }),
    });
  }

  made += 1;
  console.log(`  #${partyId}  ${spec.content_key.padEnd(34)} ${rows.length} in it`);
}

console.log(`\n${made} parties on the board — open /party as an admin.`);
console.log("Take them down with: node scripts/seed-parties.mjs --clean");
}

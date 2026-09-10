// A few parties with one particular person in them, to look at.
//
//   node scripts/seed-mine.mjs                    # Ninenine
//   node scripts/seed-mine.mjs "Aqua Eleison"     # somebody else
//   node scripts/seed-mine.mjs --clean            # take them down again
//
// The board pulls the parties you are in out into their own area above the
// schedule, and there is no way to look at that on a board where you are in
// nothing. This puts somebody in one of each way it can happen:
//
//   they put it up          — the lead, who has not taken a seat in their own
//                             party, which is a real thing leads do
//   they are in a seat      — the ordinary case
//   they are flexing        — in the party with no seat yet, which is the case
//                             the old "I am in it" filter quietly missed
//
// One of them carries a proper write-up — paragraphs with screenshots between
// them — because the body of a party is the half nobody sees until somebody has
// actually written one, and an empty one demonstrates nothing about how it
// reads.
//
// Marked with rules.__demo, the same key scripts/seed-parties.mjs uses, so
// either script's --clean takes all of it away.
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
const H = {
  apikey: KEY, Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json", Prefer: "return=representation",
};
const rest = async (path, init) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init?.headers || {}) } });
  const body = await r.text();
  if (!r.ok) throw new Error(`${path}: ${r.status} ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
};

const MARK = { __demo: true };
const args = process.argv.slice(2);

if (args.includes("--clean")) {
  const rows = await rest("party_posts?select=id&rules->>__demo=eq.true&deleted_at=is.null");
  for (const p of rows) await rest(`party_posts?id=eq.${p.id}`, { method: "DELETE" });
  console.log(`removed ${rows.length} demo part${rows.length === 1 ? "y" : "ies"}.`);
  process.exit(0);
}

const want = (args[0] || "Ninenine").toLowerCase();

/* ── who this is about ────────────────────────────────────────────────────── */
const members = JSON.parse(readFileSync("data/members.json", "utf8")).members ?? [];
const star = members.find((m) => m.name.toLowerCase().includes(want));
if (!star) {
  console.error(`nobody on the roster matches "${args[0] || "Ninenine"}"`);
  process.exit(1);
}

// The account behind that character, which is what a party is owned by. Without
// one they can still hold a seat — a party member is a character, not a login —
// so only the party they lead needs it.
const [profile] = await rest(
  `profiles?select=id,character_id&character_id=eq.${star.id}&limit=1`);

// Somebody else to fill the seats around them, so the rows are not one person
// in an empty party.
const others = members.filter((m) => m.id !== star.id && m.avatar).slice(0, 6);
const [owner2] = await rest(
  "profiles?select=id,character_id&character_verified_at=not.is.null&limit=1");

const soon = (h) => new Date(Date.now() + h * 3600_000).toISOString();
const face = (m) => ({ character_id: m.id, name: m.name, avatar: m.avatar ?? null });
let n = 0;
const block = (b) => ({ id: `s${Date.now().toString(36)}${n++}`, ...b });

/*
 * A raid plan as somebody would actually write one.
 *
 * The pictures are the duty stills already in public/duty, served from the same
 * origin as everything else — a seed script that uploaded files would need a
 * signed-in user and would leave rubbish in the bucket when it was cleaned up.
 */
const WRITEUP = [
  block({ kind: "text", text: "คืนนี้ไล่ตั้งแต่ P1 ก่อนนะครับ ใครยังไม่เคยลง บอกได้เลย เดี๋ยวอธิบายทีละท่า\nเปิดห้องเสียงตั้งแต่สองทุ่ม เข้ามาคุยกันก่อนได้" }),
  block({ kind: "image", url: "/duty/savage/dawntrail/lindwurm.webp",
          caption: "มาร์คตอน adds — เลข 1 คือจุดรวมพล" }),
  block({ kind: "text", text: "ท่าที่คนพลาดบ่อยสุดคือ Wroth Flames ครั้งที่สอง ให้ดูเงาก่อนแล้วค่อยขยับ อย่าเพิ่งวิ่ง" }),
  block({ kind: "image", url: "/duty/savage/dawntrail/lindwurm-ii.webp",
          caption: "เฟสสอง ยืนตามสีที่ตัวเองได้" }),
  block({ kind: "text", text: "ถ้าผ่านก่อนสี่ทุ่มครึ่ง จะต่อ M12S-2 อีกสองสามพูล\nไม่ผ่านก็ไม่เป็นไร อาทิตย์หน้าเอาใหม่" }),
];

/* ── the three ────────────────────────────────────────────────────────────── */
const PLAN = [
  {
    why: "leads it, no seat taken",
    post: {
      owner: profile?.id ?? owner2.id, owner_character_id: star.id,
      content_key: "hunt", note: `${star.name} is calling this one`,
      shape: "open", starts_at: soon(5), length_minutes: 60, length_unit: "hours",
    },
    members: others.slice(0, 3).map((m) => ({ ...face(m), seat: null, flex: { all: true }, confirmed_at: new Date().toISOString() })),
  },
  {
    why: "in a seat",
    post: {
      owner: owner2.id, owner_character_id: owner2.character_id,
      content_key: "treasure", note: "G18 กันสองใบ เริ่มสามทุ่ม",
      shape: "full", starts_at: soon(27), length_minutes: 90,
      length_unit: "maps", runs: null,
      maps: { kind: "Timeworn Gargantuaskin Map", each: 2 },
      loot: { rule: "owner" },
    },
    members: [
      { ...face(star), seat: "H1", job: "WhiteMage", confirmed_at: new Date().toISOString() },
      ...others.slice(0, 2).map((m, i) => ({ ...face(m), seat: ["MT", "D1"][i], confirmed_at: new Date().toISOString() })),
    ],
  },
  {
    why: "in a seat, with a write-up",
    post: {
      owner: owner2.id, owner_character_id: owner2.character_id,
      content_key: "sav:M11S", note: "Prog M11S — เริ่มจาก P1",
      shape: "full", starts_at: soon(3), length_minutes: 120, length_unit: "food",
      progress: { at: "prog", mech: "Wroth Flames ครั้งที่สอง" },
      loot: { rule: "ffa" },
      body: WRITEUP,
    },
    members: [
      { ...face(star), seat: "H2", job: "Scholar", confirmed_at: new Date().toISOString() },
      ...others.slice(0, 3).map((m, i) => ({ ...face(m), seat: ["MT", "ST", "D1"][i], confirmed_at: new Date().toISOString() })),
      // Two people asked about D4 and still deciding, which is the thing v47
      // made possible and the thing worth looking at.
      ...others.slice(3, 5).map((m) => ({ ...face(m), seat: null, flex: { seats: ["D4"] }, confirmed_at: null })),
    ],
  },
  {
    why: "flexing, no seat yet",
    post: {
      owner: owner2.id, owner_character_id: owner2.character_id,
      content_key: "dun:826", note: "รอบดึก ใครยังไม่ได้ roulette มาด้วยกัน",
      shape: "light", starts_at: soon(50), length_minutes: 80, length_unit: "runs", runs: 2,
    },
    members: [
      // No seat and no answer yet: in the party, and not in a chair.
      { ...face(star), seat: null, flex: { roles: ["healer", "dps"] }, confirmed_at: null },
      ...others.slice(3, 5).map((m, i) => ({ ...face(m), seat: ["Tank", "D1"][i], confirmed_at: new Date().toISOString() })),
    ],
  },
];

let made = 0;
for (const step of PLAN) {
  const [party] = await rest("party_posts", {
    method: "POST",
    body: JSON.stringify({ ...step.post, rules: MARK }),
  });
  for (const m of step.members) {
    await rest("party_members", {
      method: "POST",
      body: JSON.stringify({
        party_id: party.id, seat: m.seat ?? null,
        character_id: m.character_id, name: m.name, avatar: m.avatar,
        job: m.job ?? null, flex: m.flex ?? null,
        asked_by: "owner", confirmed_at: m.confirmed_at,
      }),
    });
  }
  made += 1;
  console.log(`#${party.id}  ${step.post.content_key.padEnd(14)} ${star.name} ${step.why}`);
}

console.log(`\n${made} parties. All of them should appear under "parties you are in"`);
console.log("when signed in as that character.");
console.log("node scripts/seed-mine.mjs --clean takes them away again.");

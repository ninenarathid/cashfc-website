/*
 * The sample v104's dry runs count: forty extra givers, and about 3,400 popoto
 * over the five weeks the real table took to fill, with the awkward cases put
 * in by hand. The same rows every run.
 */
import { U, CHAR } from "./pglite-harness.mjs";

// Forty more accounts with a proved character each, so "from how many people"
// has people to count.
export const GIVERS = Array.from({ length: 40 }, (_, i) => ({
  id: `20000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`, character: 6001 + i,
}));
export const PEOPLE = `
  insert into auth.users (id) values ${GIVERS.map((g) => `('${g.id}')`).join(", ")};
  insert into public.profiles (id, character_id, character_name, character_verified_at) values
    ${GIVERS.map((g) => `('${g.id}', ${g.character}, 'Giver ${g.character}', now())`).join(", ")};`;

/** The same "random" rows every run. */
function sample() {
  let seed = 104;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const senders = [U.admin, U.m1, U.m2, U.guest, ...GIVERS.map((g) => g.id)];
  const receivers = [CHAR.admin, CHAR.m1, CHAR.m2, CHAR.guest, CHAR.unver, ...GIVERS.map((g) => g.character)];
  const rows = [];
  const taken = new Set();   // one per sender per person per day, as the table insists
  const add = (sender, receiver, at) => {
    const day = at.slice(0, 10);
    const key = `${sender} ${receiver} ${day}`;
    if (taken.has(key)) return;
    taken.add(key);
    rows.push({ sender, receiver, day, at });
  };
  // 2026-08-29 to 2026-10-03, more each day, the way the table grew.
  for (let d = 0; d < 36; d++) {
    const date = new Date(Date.UTC(2026, 7, 29 + d));
    for (let i = 0; i < 30 + d * 4; i++) {
      const at = new Date(date.getTime() + Math.floor(rnd() * 86_400_000));
      add(senders[Math.floor(rnd() * senders.length)],
          // Squared, so a few people get most of them and the rest a handful.
          receivers[Math.floor(rnd() * rnd() * receivers.length)], at.toISOString());
    }
  }
  rows.sort((a, b) => a.at.localeCompare(b.at));
  // The month's edge, to the microsecond either side of midnight in Bangkok.
  add(U.m1, 7001, "2026-09-30T16:59:59.999999Z");
  add(U.m2, 7001, "2026-09-30T17:00:00.000000Z");
  // To oneself: counted like any other, as the page has always counted it.
  add(U.m1, CHAR.m1, "2026-10-02T03:00:00.000Z");
  // People with one popoto from one person each: ties for the order to settle.
  add(U.m2, 7002, "2026-10-01T05:00:00.000Z");
  add(U.m1, 7003, "2026-10-01T04:00:00.000Z");
  add(U.guest, 7004, "2026-09-15T04:00:00.000Z");
  // Two people level on two popoto from two people. 7101 was given the first
  // of the four and the last; 7102 the two between. Whoever was given theirs
  // first is 7101, and a rule that looked at the last instead would say 7102.
  add(U.m1, 7101, "2026-10-04T10:00:00.000Z");
  add(U.m1, 7102, "2026-10-04T10:10:00.000Z");
  add(U.m2, 7102, "2026-10-04T10:20:00.000Z");
  add(U.guest, 7103, "2026-10-04T10:30:00.000Z");
  add(U.m2, 7101, "2026-10-04T10:40:00.000Z");
  // Written last but dated first: the order is the order of ids, as the page
  // read them, not of dates.
  add(U.admin, 7005, "2026-08-30T01:00:00.000Z");
  return rows;
}
export const ROWS = sample();

/** The six people of the harness, the givers and every sample row, into `t`. */
export async function fill(t) {
  await t.sql(PEOPLE);
  for (let i = 0; i < ROWS.length; i += 500) {
    await t.sql(`insert into public.kudos (sender_id, receiver_character_id, day, created_at) values
      ${ROWS.slice(i, i + 500).map((r) => `('${r.sender}', ${r.receiver}, '${r.day}', '${r.at}')`).join(", ")}`);
  }
  return t;
}

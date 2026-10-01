#!/usr/bin/env node
/*
 * What a month of Cash Town would cost, per way of building it.
 *
 * A model, not a bill: it multiplies the assumptions below by the prices
 * checked on 2026-10-01 (references/costs.md has the sources). Change the
 * flags to the numbers you expect, and re-check the prices before deciding.
 *
 *   node town-cost.mjs                                  defaults: 20 in town, 3 h a day
 *   node town-cost.mjs --players 40 --hours 4 --move stream --hz 10
 *   node town-cost.mjs --voice 0.3 --near 3 --voice-mode mesh
 *
 *   --players N     people in town at the busy hours, at once        (20)
 *   --hours H       busy hours a day                                  (3)
 *   --days D        days a month                                      (30)
 *   --move M        click (send a destination per click, the Zheza
 *                   way) or stream (send positions every tick)       (click)
 *   --clicks C      move clicks per person per minute (click mode)    (6)
 *   --hz Z          position updates per second (stream mode)         (10)
 *   --chat C        chat lines per person per minute                  (1)
 *   --near K        people within earshot / sight, on average         (4)
 *   --voice V       share of time a person is in a voice conversation (0.5)
 *   --kbps B        one voice stream on the wire, Opus + overhead     (48)
 *   --voice-mode    sfu (one upload each, the server fans out) or
 *                   mesh (peer to peer between the people nearby)     (sfu)
 *   --turn T        share of mesh traffic that needs a TURN relay     (0.2)
 */

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return typeof dflt === "number" ? Number(v) : v;
};
const P = arg("players", 20), H = arg("hours", 3), D = arg("days", 30);
const move = arg("move", "click"), clicks = arg("clicks", 6), hz = arg("hz", 10);
const chat = arg("chat", 1), near = arg("near", 4), voice = arg("voice", 0.5);
const kbps = arg("kbps", 48), mode = arg("voice-mode", "sfu"), turn = arg("turn", 0.2);

const secs = H * 3600 * D;                                   // busy seconds a month
const perPersonPerSec = (move === "stream" ? hz : clicks / 60) + chat / 60;
const inPerSec = P * perPersonPerSec;                        // messages arriving at the room
const inMonth = inPerSec * secs;
const usd = (n) => `$${n.toFixed(2)}`;
const M = (n) => `${(n / 1e6).toFixed(2)}M`;
const GB = (n) => `${n.toFixed(1)} GB`;

console.log(`Cash Town month: ${P} people at once, ${H} h/day × ${D} days, movement=${move}`
  + (move === "stream" ? ` @${hz} Hz` : ` (${clicks} clicks/min)`) + `, chat ${chat}/min`);
console.log(`  messages into the room: ${inPerSec.toFixed(1)}/s, ${M(inMonth)} a month\n`);

// ── the room: who carries movement and chat ─────────────────────────────
console.log("ROOM STATE (movement + chat)");

// Supabase Realtime Broadcast: 1 sent + 1 per subscriber received; Pro has
// 5M a month included (shared with everything the site already does), then
// $2.50 per million; and a project-wide ceiling of 500 messages a second.
const sbPerSec = inPerSec * (1 + (P - 1));
const sbMonth = sbPerSec * secs;
const sbCost = Math.max(0, sbMonth - 5e6) / 1e6 * 2.5;
console.log(`  Supabase Broadcast   ${M(sbMonth)} msgs  ~${usd(sbCost)}/mo over the 5M included`
  + `  | ${sbPerSec.toFixed(0)} msg/s vs the Pro ceiling of 500/s`
  + (sbPerSec > 500 ? "  ✗ OVER THE CEILING" : sbPerSec > 250 ? "  ! over half the ceiling" : "  ✓"));

// Durable Object (Workers Paid): incoming WS messages billed 20:1 as
// requests, outgoing free; 1M requests and 400k GB-s included, then $0.15/M
// and $12.50/M GB-s; a DO is billed at 128 MB while awake. With people
// active it stays awake through the busy hours; hibernation covers the rest.
const doReq = inMonth / 20 + P * 4 * D;                      // + reconnects, roughly 4 per person a day
const doGBs = 0.125 * secs;                                  // one room awake through the busy hours
const doCost = Math.max(0, doReq - 1e6) / 1e6 * 0.15 + Math.max(0, doGBs - 4e5) / 1e6 * 12.5;
console.log(`  Durable Object room  ${M(doReq)} billed requests, ${(doGBs / 1e3).toFixed(0)}k GB-s  ~${usd(doCost)}/mo`
  + " over the included (the $5 Workers Paid minimum is already planned for the site)");

// ── voice ───────────────────────────────────────────────────────────────
const bytesPerSec = kbps * 1000 / 8;
const listening = P * near * voice;                          // streams being heard at any moment
const voiceGB = listening * bytesPerSec * secs / 1e9;
const voiceMinutes = P * voice * secs / 60;                   // participant minutes in a call
console.log(`\nVOICE (${Math.round(voice * 100)}% of the time in a conversation, ~${near} nearby, ${kbps} kbps a stream)`);
if (mode === "mesh") {
  const turnGB = voiceGB * turn;
  const cfTurn = Math.max(0, turnGB - 1000) * 0.05;
  console.log(`  Mesh P2P + Cloudflare TURN  relayed ${GB(turnGB)}  ~${usd(cfTurn)}/mo (1,000 GB free, shared with the SFU)`);
  console.log(`  each phone uploads ${near} streams = ${(near * kbps).toFixed(0)} kbps while talking; keep groups ≤ 6`);
} else {
  const cf = Math.max(0, voiceGB - 1000) * 0.05;
  console.log(`  Cloudflare Realtime SFU   egress ${GB(voiceGB)}  ~${usd(cf)}/mo (1,000 GB free, then $0.05/GB)`);
}
const lkFree = voiceMinutes <= 5000 && voiceGB <= 50 && P <= 100;
const lkShip = 50 + Math.max(0, voiceMinutes - 150000) * 0.0005 + Math.max(0, voiceGB - 250) * 0.12;
console.log(`  LiveKit Cloud             ${Math.round(voiceMinutes).toLocaleString()} participant-min, ${GB(voiceGB)}`
  + `  ${lkFree ? "fits the free Build plan" : `needs Ship: ~${usd(lkShip)}/mo (free plan: 5,000 min, 50 GB, 100 at once)`}`);

console.log("\nAssumptions are flags; prices are from 2026-10-01. Re-check references/costs.md before deciding.");

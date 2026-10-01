#!/usr/bin/env node
/*
 * The numbers behind a random reward, in the terms a player feels them:
 * how many tries until it usually happens, how many days that is at a real
 * member's pace, and how unlucky the unluckiest tenth will be.
 *
 *   node odds.mjs --chance 2 --tiers R:60,SR:28,UR:12 --per-day 3
 *   node odds.mjs --chance 2 --tiers R:60,SR:28,UR:12 --per-day 3 --pity 300
 *
 *   --chance P    % of tries that drop anything rare        (2)
 *   --tiers       share of each tier among the drops, in %  (R:60,SR:28,UR:12)
 *   --per-day N   tries a typical member makes a day        (3)
 *   --pity N      guarantee the top tier by try N (bad-luck protection); 0 = none
 *
 * Read the live odds before quoting them (the rare popoto ones live in
 * public.popoto_rare_switch, tuned in the admin panel, not in code).
 */
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const chance = Number(arg("chance", "2")) / 100;
const perDay = Number(arg("per-day", "3"));
const pity = Number(arg("pity", "0"));
const tiers = String(arg("tiers", "R:60,SR:28,UR:12")).split(",").map((t) => {
  const [name, pct] = t.split(":");
  return { name, p: chance * Number(pct) / 100 };
});
const sum = tiers.reduce((s, t) => s + t.p, 0);
if (Math.abs(sum - chance) > 1e-9) console.log(`note: tier shares add to ${(sum / chance * 100).toFixed(1)}%, not 100%`);

// Tries until the first success, geometric: median ln(0.5)/ln(1-p); the
// unlucky tenth wait past ln(0.1)/ln(1-p).
const tries = (p, q) => Math.ceil(Math.log(q) / Math.log(1 - p));
const days = (n) => (n / perDay < 1 ? "<1" : (n / perDay).toFixed(0));

console.log(`any rare: ${(chance * 100).toFixed(2)}% a try, ${perDay} tries a day`);
console.log("tier".padEnd(6), "per try".padStart(9), "1 in".padStart(8), "median tries".padStart(13), "(days)".padStart(7),
  "unlucky 10%".padStart(12), "(days)".padStart(7), "P(≥1 in 30 days)".padStart(18));
for (const t of [{ name: "any", p: chance }, ...tiers]) {
  const med = tries(t.p, 0.5), bad = tries(t.p, 0.1);
  const month = 1 - (1 - t.p) ** (perDay * 30);
  console.log(t.name.padEnd(6), `${(t.p * 100).toFixed(3)}%`.padStart(9), (1 / t.p).toFixed(0).padStart(8),
    String(med).padStart(13), days(med).padStart(7), String(bad).padStart(12), days(bad).padStart(7),
    `${(month * 100).toFixed(1)}%`.padStart(18));
}

if (pity > 0) {
  const top = tiers[tiers.length - 1];
  const reach = (1 - top.p) ** (pity - 1);
  console.log(`\npity at try ${pity} for ${top.name}: nobody waits longer than ${days(pity)} days;`
    + ` ${(reach * 100).toFixed(1)}% of members would ever need it.`);
}
console.log("\nA reward most members never see in a month is a rumour, not a reward. Aim for the median member"
  + " to meet each tier within an event's length, or say plainly that it is meant to be legendary.");

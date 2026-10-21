// The database's copies of the town (lib/town/catalog) as each town makes them: what the switch between the old town and
// the editor's (supabase v295, town_set_map) has to change. Prints, key by key and down to the part, what differs; with
// --json <file>, writes the editor's town's parts and the old town's beside them.
//   cd <the tree> && FC_REPO=<the tree> TOWN_MAP=classic|town2 node .claude/skills/fc-cash-town/scripts/db/town2-catalog.mjs
// (run once per town: a process reads one town; --side writes that town's catalog to a file, --diff compares two files)
import { writeFileSync, readFileSync } from "node:fs";
const side = process.argv.indexOf("--side"), diff = process.argv.indexOf("--diff");
if (diff > 0) {
  const [a, b] = [readFileSync(process.argv[diff + 1], "utf8"), readFileSync(process.argv[diff + 2], "utf8")].map((s) => JSON.parse(s));
  const walk = (x, y, at) => {
    if (JSON.stringify(x) === JSON.stringify(y)) return;
    if (x && y && typeof x === "object" && typeof y === "object" && !Array.isArray(x) && !Array.isArray(y)) {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], `${at}.${k}`);
      return;
    }
    if (Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.length > 20) {
      const n = x.filter((v, i) => JSON.stringify(v) !== JSON.stringify(y[i])).length;
      console.log(`${at}: array of ${x.length}, ${n} differ`);
      return;
    }
    const s = (v) => { const t = JSON.stringify(v); return t === undefined ? "∅" : t.length > 140 ? `${t.slice(0, 140)}… (${t.length})` : t; };
    console.log(`${at}:\n   classic ${s(x)}\n   town2   ${s(y)}`);
  };
  walk(a, b, "catalog");
} else {
  await import("./repo-ts-town.mjs");
  const { catalogOf } = await import("@/lib/town/catalog");
  const { T2 } = await import("@/lib/town/world");
  console.log("town2:", T2);
  writeFileSync(process.argv[side + 1], JSON.stringify(catalogOf()));
}

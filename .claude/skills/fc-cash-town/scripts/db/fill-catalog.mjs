// Writes a draft's catalog block from the code as it stands (what `TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts`
// does for a file in supabase/, for one that is not there yet): the rows `CATALOG_KEYS` names for that version, between
// the draft's two marked lines.
//   FC_REPO=<the tree> node fill-catalog.mjs v139 [<the draft>]
import { readFileSync, writeFileSync } from "node:fs";
await import("./repo-ts-town.mjs");
const { seedFor } = await import("@/lib/town/catalog");

const version = process.argv[2];
if (!/^v\d+$/.test(version ?? "")) { console.error("usage: node fill-catalog.mjs vNNN [<the draft>]"); process.exit(2); }
const file = process.argv[3] ?? new URL(`./${version}_draft.sql`, import.meta.url);
const was = readFileSync(file, "utf8"), nl = was.includes("\r\n") ? "\r\n" : "\n", text = was.split("\r\n").join("\n");
const open = text.indexOf(`-- <catalog:${version}>`), close = text.indexOf(`-- </catalog:${version}>`);
if (open < 0 || close < open) throw new Error(`the draft has no marked lines for the catalog of ${version}`);
const made = text.slice(0, open) + seedFor(version) + text.slice(close + `-- </catalog:${version}>`.length);
if (made === text) console.log("the block is the code's already");
else { writeFileSync(file, made.split("\n").join(nl)); console.log(`the catalog block of ${version} written from the code`); }

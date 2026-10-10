import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
await import("./repo-ts-town.mjs");
const { seedFor } = await import("@/lib/town/catalog");
const file = join(process.env.FC_REPO, ".claude/skills/fc-cash-town/scripts/db/v180_draft.sql");
const source = readFileSync(file, "utf8");
const open = source.indexOf("-- <workshop-catalog>"), close = source.indexOf("-- </workshop-catalog>");
if (open < 0 || close <= open) throw new Error("Missing workshop catalog markers");
writeFileSync(file, source.slice(0,open) + "-- <workshop-catalog>\n" + seedFor("v180") + "\n" + source.slice(close));

import fs from "node:fs";
import path from "node:path";

import { NO_ART, type DutyArt, type DutyKind } from "@/lib/duty";

/**
 * Every duty picture on disk, as kind → slug → public path.
 *
 * The folders are the index: whatever is in public/duty is what exists, and
 * adding a picture is dropping a file in. No table to edit, no id to look up,
 * and no argument about the format — the directories are read here at build
 * time, so a .webp, a .jpg and a .png all work and nobody has to remember which
 * one the code was written for.
 *
 * Searched to any depth under each kind, so the expansion folders inside are
 * for whoever is filing the pictures and mean nothing to this. That is
 * deliberate: FF Logs reports the expansion of the *zone* a kill was logged in
 * rather than the one the fight belongs to — it files The Epic of Alexander,
 * which is Shadowbringers content, under Endwalker — so a lookup that had to
 * agree with it about which folder to open would fail on exactly the fights
 * people care most about. A slug is unique across the game; that is enough.
 *
 * The cost is that a misspelled filename is silent, which is the right way
 * round: a missing picture is a row that looks the way it always did.
 */
const KINDS: DutyKind[] = ["extreme", "savage", "ultimate"];
const ART = new Set([".webp", ".jpg", ".jpeg", ".png", ".avif"]);

function walk(dir: string, into: Record<string, string>, urlBase: string): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;                           // no folder yet, and no pictures either
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      walk(path.join(dir, e.name), into, `${urlBase}/${e.name}`);
      continue;
    }
    const ext = path.extname(e.name).toLowerCase();
    if (!ART.has(ext)) continue;
    // First one wins, so a picture filed twice does not flicker between builds
    // depending on how the filesystem felt about ordering that morning.
    const slug = path.basename(e.name, ext).toLowerCase();
    if (!(slug in into)) into[slug] = `${urlBase}/${e.name}`;
  }
}

export function dutyArtMap(): DutyArt {
  const out: DutyArt = { ...NO_ART, extreme: {}, savage: {}, ultimate: {} };
  for (const kind of KINDS) {
    walk(path.join(process.cwd(), "public", "duty", kind), out[kind], `/duty/${kind}`);
  }
  return out;
}

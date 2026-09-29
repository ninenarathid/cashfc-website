// What the build needs made from the pictures before it starts.
//
//   node scripts/prebuild.mjs
//
// Run by `npm run build` and `npm run dev`, and so by Vercel and by
// opennextjs-cloudflare too, which both build through `npm run build`. By hand
// only after adding a picture to public/duty, to update lib/duty-art.json.
//
// Two things the running site used to work out from the disk on the spot, done
// here instead, because on Cloudflare there is no disk to read at request time:
//
//   lib/duty-art.json   kind → slug → public path of every duty picture, which
//                       is what dutyArtMap() hands out. Committed, so a checkout
//                       that has never built still has it; lib/duty-art.test.ts
//                       fails when a picture was added without rerunning this.
//
//   public/og/          what the link-preview cards draw, as files the Worker
//                       can reach through its static assets: a 1200-wide JPEG
//                       of every picture the party card can show — the card
//                       renderer cannot read WebP — and the popoto the member
//                       card wears. Not committed; every build makes it afresh.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const KINDS = [
  "extreme", "savage", "ultimate", "alliance", "criterion",
  "dungeon", "legacy", "field", "pvp", "chaotic",
];
/** The kinds the party finder offers, and so the pictures a party card can draw. */
const PARTY_KINDS = new Set(["extreme", "savage", "ultimate", "alliance", "chaotic", "criterion"]);
const ART = new Set([".webp", ".jpg", ".jpeg", ".png", ".avif"]);

/*
 * The folders are the index: whatever is in public/duty is what exists, and
 * adding a picture is dropping a file in. No table to edit, no id to look up,
 * and no argument about the format — a .webp, a .jpg and a .png all work and
 * nobody has to remember which one the code was written for.
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
function walk(dir, into, urlBase) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;                           // no folder yet, and no pictures either
  }
  // Sorted, so the file is the same whichever machine wrote it: readdir order
  // is the filesystem's business, and it differs between Windows and Linux.
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    if (e.isDirectory()) {
      walk(join(dir, e.name), into, `${urlBase}/${e.name}`);
      continue;
    }
    const ext = extname(e.name).toLowerCase();
    if (!ART.has(ext)) continue;
    // First one wins, so a picture filed twice resolves the same way every time.
    const slug = basename(e.name, ext).toLowerCase();
    if (!(slug in into)) into[slug] = `${urlBase}/${e.name}`;
  }
}

/** kind → slug → public path, for every picture under public/duty. */
export function indexDutyArt(root = ROOT) {
  const out = {};
  for (const kind of KINDS) {
    out[kind] = {};
    walk(join(root, "public", "duty", kind), out[kind], `/duty/${kind}`);
  }
  return out;
}

/**
 * The JPEG a party card reads for a picture: the same path under public/og,
 * with .jpg on the end. The card route asks for it by the same rule.
 */
export const cardArtPath = (publicPath) =>
  publicPath.replace(/^\/duty\//, "/og/duty/").replace(/\.[a-z0-9]+$/i, ".jpg");

async function writeCardArt(index) {
  // Imported here rather than at the top, so the test can read the index
  // without loading an image library it has no use for.
  const { default: sharp } = await import("sharp");
  let made = 0;
  for (const kind of PARTY_KINDS) {
    for (const src of Object.values(index[kind])) {
      const from = join(ROOT, "public", src);
      const to = join(ROOT, "public", cardArtPath(src));
      // Only what changed, so `npm run dev` does not redo the lot every time.
      if (existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs) continue;
      mkdirSync(dirname(to), { recursive: true });
      // 1200 wide, the width of the card; the renderer crops the height to its
      // box, anchored where the site anchors the same picture. A JPEG because
      // these are photographs of a screen, and a lossless copy of one is most of
      // a megabyte of base64 inside a document rasterised on every request.
      await sharp(from)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(to);
      made++;
    }
  }
  return made;
}

async function main() {
  const index = indexDutyArt();
  const json = join(ROOT, "lib", "duty-art.json");
  writeFileSync(json, `${JSON.stringify(index, null, 2)}\n`);

  const made = await writeCardArt(index);

  // The popoto stays where scripts/popoto-art.mjs writes it, beside the other
  // poses; the card reads a copy.
  mkdirSync(join(ROOT, "public", "og"), { recursive: true });
  copyFileSync(join(ROOT, "assets", "popoto", "popoto-og.png"), join(ROOT, "public", "og", "popoto.png"));

  const pictures = Object.values(index).reduce((n, k) => n + Object.keys(k).length, 0);
  console.log(`prebuild: ${pictures} duty pictures indexed in ${relative(ROOT, json)}; ${made} card JPEGs made`);
}

// Run, not imported (the test imports indexDutyArt).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { coverUrl } from "@/lib/party-cover";
import { gameIconUrl } from "@/lib/tag-icons";

/**
 * The pictures a party's cards are drawn with, ready for the card renderer.
 *
 * Shared by the card a pasted link unfurls into (app/party/[id]/opengraph-image)
 * and the banner on the Discord board (app/party/[id]/banner), so both crop the
 * same picture the same way. Everything comes back as a data: URL, because
 * that is what the renderer can read, and as a JPEG or PNG, because it cannot
 * read WebP: every duty still is one, and handing it one fails the whole card
 * with "u2 is not iterable" from inside the SVG rasteriser.
 *
 * Every helper answers null on any failure; a card without its picture still
 * says everything it was for.
 */

/**
 * A duty still from public/duty, read off disk and cropped to the box.
 *
 * Off disk rather than over the network: the renderer is on the same machine,
 * and next.config.ts traces the folder in beside each route that calls this —
 * public/ is served by the CDN and is not otherwise on a function's
 * filesystem, which once left every card a flat colour without a word said.
 */
export async function stillFromDisk(
  url: string | undefined, focus: string | undefined, w: number, h: number,
): Promise<string | null> {
  if (!url?.startsWith("/")) return null;
  try {
    const file = path.join(process.cwd(), "public", decodeURIComponent(url));
    const position = /bottom/.test(focus ?? "") ? "bottom"
      : /top/.test(focus ?? "") ? "top" : "centre";
    const jpg = await sharp(fs.readFileSync(file))
      .resize(w, h, { fit: "cover", position })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch (e) {
    console.warn("party art: no still for", url, "—", (e as Error).message);
    return null;
  }
}

/** The kinds of picture a cover may be, read off the file itself, not its name. */
const COVER_FORMATS = new Set(["webp", "jpeg", "png"]);
/** The bucket's own ceiling (v332): far above what the crop saves, a few hundred KB. */
const COVER_MAX_BYTES = 8 * 1024 * 1024;

/**
 * The body, but never more of it than `max`.
 *
 * Counted as it arrives rather than trusted from Content-Length, which a
 * response may leave out; past the limit the download is cancelled.
 */
async function readCapped(res: Response, max: number): Promise<Buffer | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const parts: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { await reader.cancel(); return null; }
    parts.push(value);
  }
  return Buffer.concat(parts);
}

/**
 * The lead's own picture (v332), fetched from the bucket and cropped like a still.
 *
 * Only ever from our own bucket: coverUrl builds the address from a checked
 * path and this project's URL, so nothing a member typed can point this server
 * anywhere else. The file is a member's upload, so it is checked as one: its
 * size as it arrives, its real format before it is decoded, and a pixel limit
 * so a picture that claims to be enormous is refused instead of unpacked.
 */
export async function coverFromBucket(
  cover: string, w: number, h: number,
): Promise<string | null> {
  const url = coverUrl(cover);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3500), cache: "no-store" });
    if (!res.ok) return null;
    if (Number(res.headers.get("content-length") ?? 0) > COVER_MAX_BYTES) return null;
    const buf = await readCapped(res, COVER_MAX_BYTES);
    if (!buf) return null;
    const img = sharp(buf, { limitInputPixels: 24_000_000 });
    const meta = await img.metadata();
    if (!meta.format || !COVER_FORMATS.has(meta.format)) return null;
    const jpg = await img
      .resize(w, h, { fit: "cover", position: "centre" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch (e) {
    console.warn("party art: no cover for", cover, "—", (e as Error).message);
    return null;
  }
}

/** One of the game's icons from public/ui, which is where the site keeps the ones XIVAPI does not serve. */
const pngs = new Map<string, string | null>();
export function uiIcon(rel: string): string | null {
  if (!pngs.has(rel)) {
    try {
      const png = fs.readFileSync(path.join(process.cwd(), "public", "ui", rel));
      pngs.set(rel, `data:image/png;base64,${png.toString("base64")}`);
    } catch {
      pngs.set(rel, null);
    }
  }
  return pngs.get(rel) ?? null;
}

/**
 * One of the game's icons by its path, from XIVAPI as everywhere else on the site.
 *
 * Kept for the server's life once read: there are a couple of dozen kinds, and
 * the card for a roulette should not ask XIVAPI again every time it is drawn.
 * A failure is not kept, so the next card tries again.
 */
const icons = new Map<string, string>();
export async function gameIcon(iconPath: string): Promise<string | null> {
  const had = icons.get(iconPath);
  if (had) return had;
  try {
    const res = await fetch(gameIconUrl(iconPath).replace("format=webp", "format=png"),
      { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const buf = await readCapped(res, 512 * 1024);
    if (!buf) return null;
    const data = `data:image/png;base64,${buf.toString("base64")}`;
    icons.set(iconPath, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Kanit, because the banner is Thai first and the renderer has none of its own.
 * Read once per server (next.config.ts packs the files beside the route), as
 * the contest's card does.
 */
let fontsRead: { name: string; data: Buffer; weight: 500 | 800; style: "normal" }[] | null = null;
export function kanit() {
  fontsRead ??= [
    { name: "Kanit", weight: 800, style: "normal",
      data: fs.readFileSync(path.join(process.cwd(), "assets/fonts/Kanit-ExtraBold.ttf")) },
    { name: "Kanit", weight: 500, style: "normal",
      data: fs.readFileSync(path.join(process.cwd(), "assets/fonts/Kanit-Medium.ttf")) },
  ];
  return fontsRead;
}

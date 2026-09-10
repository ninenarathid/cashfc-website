import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import {
  KIND_COLOR, KIND_LABEL, PROGRESS_LABEL, SHAPE_LABEL, endsAt, fmtDay, fmtTime,
  lootText, mapsText, openLabel, spotText,
} from "@/lib/party";
import { contentByKey } from "@/lib/party-seeds";
import { partyCard, seatCount } from "@/lib/party-card";
import { mapLabel } from "@/lib/treasure";

/**
 * A party, as the card Discord draws when somebody pastes the link.
 *
 * The FC arranges everything in Discord and shares these links there, and until
 * now a link to Thursday's raid unfurled as the site's own description — the
 * same eleven words under every link anybody had ever posted. Which meant the
 * link said nothing, so people typed the details underneath it, which is the
 * Discord scrollback problem the board exists to fix, reappearing in the
 * sentence used to escape it.
 *
 * What the card has to answer, in the order somebody skimming a channel wants
 * it: what, when, and is there room. The seat count is the third of those and
 * the one a listing cannot convey any other way — "4/8" is the whole reason to
 * open the link or not.
 *
 * The fight's own still where there is one, and its kind's colour where there
 * is not. A missing picture is a card that looks deliberate rather than broken,
 * which is the same rule the member pages and the board itself follow: adding a
 * picture later is dropping a file in and nothing here changes.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A party on the Cafe And SHabu board";

const BG = "#0f1319";
const INK = "#e8ecf2";
const MUTED = "#8b93a1";
/** The banner across the top, and the box the still is cropped into. */
const ART_H = 360;

/**
 * The still, read off disk, cropped, and handed over as a PNG.
 *
 * Off disk rather than over the network: these live in public/ and the renderer
 * is on the same machine, so fetching our own file through a URL would be a
 * round trip that can time out to answer a question the filesystem already
 * knows.
 *
 * As a JPEG because the card renderer cannot read WebP, and every picture in
 * public/duty is one. JPEG rather than PNG for the same reason the game uses
 * WebP: these are photographs of a screen, and a lossless copy of one is eight
 * hundred kilobytes of base64 inside a document that has to be rasterised on
 * every request. It did not fail loudly either — the whole image route
 * answered 500 with "u2 is not iterable" from somewhere inside the SVG
 * rasteriser, so a link to any fight with a picture unfurled as nothing at all
 * while the one fight without a picture worked perfectly.
 *
 * Cropped here as well, to the box it is going into. The renderer would do it,
 * but a 1200-wide PNG of the whole screenshot is several megabytes of base64
 * inside a document that has to be rasterised on every request.
 *
 * A file that will not read leaves the card without a picture, which is a card
 * that still says everything it was for.
 */
async function inlineArt(
  url: string | undefined, focus: string | undefined,
): Promise<string | null> {
  if (!url?.startsWith("/")) return null;
  try {
    const file = path.join(process.cwd(), "public", decodeURIComponent(url));
    // Where the crop keeps: a game screenshot almost always has its subject in
    // the upper half, which is why the board anchors these to the top.
    const position = /bottom/.test(focus ?? "") ? "bottom"
      : /top/.test(focus ?? "") ? "top" : "centre";
    const png = await sharp(fs.readFileSync(file))
      .resize(size.width, ART_H, { fit: "cover", position })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${png.toString("base64")}`;
  } catch (e) {
    /*
     * Not silent, because silent cost a production bug.
     *
     * public/ is served by the CDN and is not on a serverless function's
     * filesystem, so this read found nothing once deployed — and since a
     * missing picture is a card that still works, every party link unfurled
     * with a flat colour where the screenshot should be and looked deliberate.
     * next.config.ts traces the folder in; if that key ever stops matching the
     * route, this line is how anybody finds out.
     */
    console.warn("party card: no picture for", url, "—", (e as Error).message);
    return null;
  }
}

export default async function Image(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const card = await partyCard(id);
  const def = card ? contentByKey(card.contentKey) : undefined;
  const tint = def ? KIND_COLOR[def.kind] : "#8b93a1";
  const art = await inlineArt(def?.art, def?.focus);

  // Nothing to draw a card about. The plain site card is a better answer than
  // an empty frame with a heading on it.
  if (!card) {
    return new ImageResponse(
      (
        <div style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: BG, color: MUTED, fontSize: 44,
        }}>
          Cafe And SHabu — Party finder
        </div>
      ),
      size,
    );
  }

  const full = card.seatsTotal > 0 && card.seatsTaken >= card.seatsTotal;
  const terms = [
    card.shape === "open" ? openLabel(def?.kind) : SHAPE_LABEL[card.shape],
    card.progress ? PROGRESS_LABEL[card.progress.at] : null,
    lootText(card.loot ?? undefined),
    mapsText(card.maps ?? undefined, mapLabel),
    spotText(card.spot ?? undefined),
  ].filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: BG, color: INK,
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      }}>
        {/* The picture, across the top, with the title over its own gradient so
            the words are readable whatever the screenshot happens to be doing
            up there. */}
        {/*
          * The picture's box.
          *
          * The fallback colour is spread in rather than written as
          * `art ? undefined : colour`. The renderer reads every style value and
          * calls toString on it, so a property explicitly set to undefined is
          * not "no value" to it — it is a crash, and the whole card 500s. Which
          * is why every fight with a picture unfurled as nothing while the one
          * without a picture worked.
          */}
        <div style={{
          position: "relative", display: "flex", width: "100%", height: ART_H,
          ...(art ? {} : { background: `${tint}33` }),
        }}>
          {art && (
            // eslint-disable-next-line @next/next/no-img-element
            /* Already cropped to this box, so it goes in as it is. */
            <img src={art} alt="" width={size.width} height={ART_H}
                 style={{ width: size.width, height: ART_H }} />
          )}
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            background: "linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.15))",
          }} />
          <div style={{
            position: "absolute", left: 48, right: 48, bottom: 28,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{
              display: "flex", fontSize: 22, letterSpacing: 3,
              textTransform: "uppercase", color: tint,
            }}>
              {def ? KIND_LABEL[def.kind] : "Party"}
              {def?.badge ? ` · ${def.badge}` : ""}
            </div>
            <div style={{ display: "flex", fontSize: 58, fontWeight: 700 }}>
              {def?.duty ?? def?.name ?? card.contentKey}
            </div>
          </div>
        </div>

        {/* When, what the terms are, and how full it is. */}
        <div style={{
          display: "flex", flex: 1, alignItems: "center",
          justifyContent: "space-between", padding: "0 48px", gap: 40,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760 }}>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 600 }}>
              {fmtDay(card.startsAt)} · {fmtTime(card.startsAt)} → {fmtTime(
                endsAt({ startsAt: card.startsAt, lengthMinutes: card.lengthMinutes } as never))}
            </div>
            {!!terms.length && (
              <div style={{ display: "flex", fontSize: 26, color: MUTED }}>
                {terms.join("  ·  ")}
              </div>
            )}
            {card.note && (
              <div style={{ display: "flex", fontSize: 26, color: "#c4ccd8" }}>
                {card.note.length > 78 ? `${card.note.slice(0, 78)}…` : card.note}
              </div>
            )}
            {card.ownerName && (
              <div style={{ display: "flex", fontSize: 22, color: MUTED }}>
                {card.ownerName}
              </div>
            )}
          </div>

          {/*
            * The count, at the size of the thing it is.
            *
            * Green while there is room, grey once there is not — the one glance
            * that decides whether the link is worth opening.
            */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 2, padding: "18px 30px", borderRadius: 22,
            border: `3px solid ${full ? "#3a4150" : tint}`,
            background: full ? "#171c24" : `${tint}1f`,
          }}>
            <div style={{
              display: "flex", fontSize: 68, fontWeight: 700,
              color: full ? MUTED : INK,
            }}>
              {seatCount(card)}
            </div>
            <div style={{
              display: "flex", fontSize: 20, letterSpacing: 2,
              textTransform: "uppercase", color: full ? MUTED : tint,
            }}>
              {card.seatsTotal
                ? (full ? "Full" : "In the party")
                : "Coming"}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

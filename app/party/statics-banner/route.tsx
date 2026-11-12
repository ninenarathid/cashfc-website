import sharp from "sharp";
import { ImageResponse } from "next/og";
import type { SlotRole } from "@/lib/party";
import { KIND_COLOR, KIND_ICON, KIND_LABEL } from "@/lib/party";
import { contentByKey } from "@/lib/party-seeds";
import type { PartyCard } from "@/lib/party-card";
import { cardNeeds, partyCard, partyCover, seatCount } from "@/lib/party-card";
import { coverFromBucket, gameIcon, kanit, stillFromDisk, uiIcon } from "@/lib/party-art.server";
import { TAG_ICON } from "@/lib/tag-icons";
import { STATICS_PICTURED } from "@/lib/discord/board";

/**
 * The statics' banners, stacked, as the one picture of the board's Static card.
 *
 * The owner, 2026-11-12: the board is one Discord message, its last card lists
 * the statics, and he wanted their banners shown too. An embed carries a single
 * image, so this draws the first few statics as strips one above the other, in
 * the list's own order: the picture or cover, the fight's name, whether it is
 * still looking and for which roles (the game's role icons), and how full it
 * is. The text under it keeps the links and the leads.
 *
 * Each strip is 1200 by 300, about 110 pixels tall once Discord shrinks it, so
 * the type is set large, like the evening banners'. Thai in Kanit, packed
 * beside the route. The ids come from the board's own message; anything that
 * is not a short list of numbers is refused.
 */

const W = 1200;
const STRIP = 300;
const GAP = 8;
const BG = "#0f1319";
const INK = "#eef1f6";
const MUTED = "#9aa3b2";
const ROLE_FILE: Record<SlotRole, string> = {
  tank: "roles/tank.png", healer: "roles/healer.png", dps: "roles/dps.png",
};

export const dynamic = "force-dynamic";

/** The renderer's PNG as a JPEG, a sixth of the size; a PNG where that fails. See the banner route. */
async function asJpeg(img: ImageResponse, headers: Record<string, string>): Promise<Response> {
  const png = Buffer.from(await img.arrayBuffer());
  try {
    const jpg = await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(jpg), { headers: { ...headers, "content-type": "image/jpeg" } });
  } catch {
    return new Response(new Uint8Array(png), { headers: { ...headers, "content-type": "image/png" } });
  }
}

interface Strip {
  card: PartyCard;
  art: string | null;
  kindIcon: string | null;
}

async function stripOf(id: string): Promise<Strip | null> {
  const [card, cover] = await Promise.all([partyCard(id), partyCover(id)]);
  if (!card) return null;
  const def = contentByKey(card.contentKey);
  const art = (cover ? await coverFromBucket(cover, W, STRIP) : null)
    ?? await stillFromDisk(def?.art, def?.focus, W, STRIP);
  const tag = def ? KIND_ICON[def.kind] : undefined;
  const kindIcon = !art && tag && TAG_ICON[tag] ? await gameIcon(TAG_ICON[tag].path) : null;
  return { card, art, kindIcon };
}

function StripView({ card, art, kindIcon }: Strip) {
  const def = contentByKey(card.contentKey);
  const tint = def ? KIND_COLOR[def.kind] : "#8b93a1";
  const name = def?.duty ?? def?.name ?? card.contentKey;
  const nameSize = name.length > 34 ? 42 : name.length > 24 ? 50 : 58;
  const kindLine = [def ? KIND_LABEL[def.kind] : null, def?.badge ?? null].filter(Boolean).join(" · ");
  const full = card.seatsTotal > 0 && card.seatsTaken >= card.seatsTotal;
  const needs = full ? [] : cardNeeds(card);
  const anyone = uiIcon("party.png");

  return (
    <div style={{
      position: "relative", display: "flex", width: W, height: STRIP,
      ...(art ? {} : { background: `linear-gradient(120deg, ${tint}66 0%, ${tint}22 55%, ${BG} 100%)` }),
    }}>
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" width={W} height={STRIP} style={{ width: W, height: STRIP }} />
      )}
      {kindIcon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={kindIcon} alt="" width={190} height={190}
             style={{ position: "absolute", right: 300, top: 55, width: 190, height: 190, opacity: 0.85 }} />
      )}
      {/* Dark from the left, where the words are; the renderer does not read `inset`. */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex",
        background: "linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.25) 100%)",
      }} />
      <div style={{
        position: "absolute", left: 44, top: 0, bottom: 0, right: 280,
        display: "flex", flexDirection: "column", justifyContent: "center", gap: 6,
      }}>
        {kindLine && (
          <div style={{
            display: "flex", fontSize: 26, fontWeight: 500, letterSpacing: 4,
            textTransform: "uppercase", color: tint, textShadow: "0 2px 8px rgba(0,0,0,0.9)",
          }}>
            {kindLine}
          </div>
        )}
        <div style={{
          display: "flex", fontSize: nameSize, fontWeight: 800, lineHeight: 1.1, color: INK,
          textShadow: "0 3px 12px rgba(0,0,0,0.95)",
        }}>
          {name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 6 }}>
          <div style={{
            display: "flex", fontSize: 30, fontWeight: 800, padding: "2px 16px", borderRadius: 999,
            color: full ? MUTED : "#0f1319", background: full ? "#2a303b" : tint,
          }}>
            {full ? "ครบแล้ว" : "กำลังหาคน"}
          </div>
          {needs.map(([roles, n]) => (
            <div key={roles.join("/") || "more"} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {roles.length
                ? roles.map((r, i) => {
                    const src = uiIcon(ROLE_FILE[r]);
                    return src ? (
                      <div key={r} style={{ display: "flex", alignItems: "center" }}>
                        {i > 0 && <div style={{ display: "flex", fontSize: 36, color: MUTED, margin: "0 3px" }}>/</div>}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" width={54} height={54} style={{ width: 54, height: 54 }} />
                      </div>
                    ) : null;
                  })
                : anyone && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={anyone} alt="" width={50} height={50} style={{ width: 50, height: 50 }} />
                )}
              <div style={{ display: "flex", fontSize: 42, fontWeight: 800, color: INK }}>{`×${n}`}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{
        position: "absolute", right: 40, top: 0, bottom: 0,
        display: "flex", alignItems: "center",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minWidth: 200, padding: "8px 22px", borderRadius: 24,
          border: `4px solid ${full ? "#3a4150" : tint}`,
          background: full ? "rgba(23,28,36,0.88)" : "rgba(15,19,25,0.78)",
        }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05, color: full ? MUTED : INK }}>
            {seatCount(card)}
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: full ? MUTED : tint }}>
            Static
          </div>
        </div>
      </div>
    </div>
  );
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = raw.split(",").filter((x) => /^\d{1,9}$/.test(x)).slice(0, STATICS_PICTURED);
  const headers = { "cache-control": "public, max-age=3600, s-maxage=86400" };
  const strips = (await Promise.all(ids.map(stripOf))).filter((s): s is Strip => !!s);
  const fonts = kanit();

  if (!strips.length) {
    return asJpeg(new ImageResponse(
      (
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", background: BG, color: MUTED, fontSize: 48,
          fontFamily: "Kanit", fontWeight: 500,
        }}>
          CASH Static Finder
        </div>
      ),
      { width: W, height: STRIP, fonts },
    ), headers);
  }

  const H = strips.length * STRIP + (strips.length - 1) * GAP;
  return asJpeg(new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: GAP,
        background: BG, color: INK, fontFamily: "Kanit",
      }}>
        {strips.map((s, i) => <StripView key={i} {...s} />)}
      </div>
    ),
    { width: W, height: H, fonts },
  ), headers);
}

import sharp from "sharp";
import { ImageResponse } from "next/og";
import type { SlotRole } from "@/lib/party";
import { KIND_COLOR, KIND_ICON, KIND_LABEL, endsAt, fmtTime } from "@/lib/party";
import { contentByKey } from "@/lib/party-seeds";
import { cardNeeds, partyCard, partyCover, seatCount } from "@/lib/party-card";
import { coverFromBucket, gameIcon, kanit, stillFromDisk, uiIcon } from "@/lib/party-art.server";
import { TAG_ICON } from "@/lib/tag-icons";

/**
 * A party, as the picture inside its row on the Discord board.
 *
 * Not the card a pasted link unfurls into (opengraph-image), though it reads
 * the same party. That card was drawn for a link preview, and inside the
 * board's embeds Discord shrinks it to about 440 pixels wide: its 26-pixel
 * lines came out at ten, the "Need 1 Healer" chips could not be read on a
 * phone, and the text around the picture said everything again anyway.
 *
 * So this one carries only what a glance decides on, at a size that survives
 * the shrink: the picture and the fight's name, when, what is still wanted —
 * as the game's own role icons — and how full it is. Everything in it is about
 * two and a half times the card's type. The embed's text keeps what is better
 * as text: who leads, the note, the free seats, and the time in the reader's
 * own timezone.
 *
 * Nothing in it changes with the clock — no "starts in", no "playing now" —
 * because Discord keeps the picture until its address changes, and the
 * address changes with the party, not with the time (see lib/discord/board).
 * The time on it is Bangkok's, the FC's, as everywhere on the site.
 *
 * Thai throughout, in Kanit, which is packed beside the route.
 */

const W = 1200;
const H = 600;
/** The picture's band: the duty banner's own shape, so nothing is stretched. */
const ART_H = 384;
const BG = "#0f1319";
const INK = "#eef1f6";
const MUTED = "#9aa3b2";

const ROLE_FILE: Record<SlotRole, string> = {
  tank: "roles/tank.png", healer: "roles/healer.png", dps: "roles/dps.png",
};
const DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

/** "พฤ. 12/11", in Bangkok. */
function thaiDay(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${DAY[d.getUTCDay()]} ${dd}/${mm}`;
}

export const dynamic = "force-dynamic";

/**
 * The renderer's PNG, as a JPEG.
 *
 * A banner with a picture in it came out at 700 to 900 KB as PNG, nine of
 * them a board; as a JPEG it is a sixth of that and looks the same, which is
 * the difference between a board that loads at once on a phone and one that
 * fills in row by row. A PNG where the conversion fails, rather than nothing.
 */
async function asJpeg(img: ImageResponse, headers: Record<string, string>): Promise<Response> {
  const png = Buffer.from(await img.arrayBuffer());
  try {
    const jpg = await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(jpg), { headers: { ...headers, "content-type": "image/jpeg" } });
  } catch {
    return new Response(new Uint8Array(png), { headers: { ...headers, "content-type": "image/png" } });
  }
}

export async function GET(
  _req: Request, { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [card, cover] = await Promise.all([partyCard(id), partyCover(id)]);
  const fonts = kanit();
  const headers = {
    // The address carries the party's version, so a copy may be kept; a day
    // at the edge spares the function, and any change is a new address.
    "cache-control": "public, max-age=3600, s-maxage=86400",
  };

  if (!card) {
    return asJpeg(new ImageResponse(
      (
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", background: BG, color: MUTED, fontSize: 52,
          fontFamily: "Kanit", fontWeight: 500,
        }}>
          CASH Party Finder
        </div>
      ),
      { width: W, height: H, fonts },
    ), headers);
  }

  const def = contentByKey(card.contentKey);
  const tint = def ? KIND_COLOR[def.kind] : "#8b93a1";
  const own = cover ? await coverFromBucket(cover, W, ART_H) : null;
  const art = own ?? await stillFromDisk(def?.art, def?.focus, W, ART_H);
  // Where there is no picture at all, the kind's own game icon, large.
  const kindTag = def ? KIND_ICON[def.kind] : undefined;
  const kindIcon = !art && kindTag && TAG_ICON[kindTag]
    ? await gameIcon(TAG_ICON[kindTag].path) : null;

  const name = def?.duty ?? def?.name ?? card.contentKey;
  const titleSize = name.length > 40 ? 46 : name.length > 28 ? 56 : 66;
  const kindLine = [def ? KIND_LABEL[def.kind] : null, def?.badge ?? null]
    .filter(Boolean).join(" · ");

  const full = card.seatsTotal > 0 && card.seatsTaken >= card.seatsTotal;
  const needs = full ? [] : cardNeeds(card);
  const anyone = uiIcon("party.png");

  const sub = card.lengthUnit === "runs" ? `${card.runs ?? 1} รอบ`
    : card.lengthUnit === "maps" ? "จนกว่าแมพจะหมด"
      : `ถึง ${fmtTime(endsAt({ startsAt: card.startsAt, lengthMinutes: card.lengthMinutes }))}`;

  return asJpeg(new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: BG, color: INK, fontFamily: "Kanit",
      }}>
        {/* ── the picture, and the fight's name over it ── */}
        <div style={{
          position: "relative", display: "flex", width: W, height: ART_H,
          ...(art ? {} : {
            background: `linear-gradient(120deg, ${tint}66 0%, ${tint}22 55%, ${BG} 100%)`,
          }),
        }}>
          {art && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art} alt="" width={W} height={ART_H} style={{ width: W, height: ART_H }} />
          )}
          {kindIcon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={kindIcon} alt="" width={230} height={230}
                 style={{ position: "absolute", right: 70, top: 50, width: 230, height: 230, opacity: 0.9 }} />
          )}
          {/* Each edge by name: the renderer does not read `inset`. */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex",
            background: own
              ? "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.1))"
              : "linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.35) 50%, rgba(0,0,0,0))",
          }} />
          <div style={{
            position: "absolute", left: 48, right: 48, bottom: 26,
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            {kindLine && (
              <div style={{
                display: "flex", fontSize: 30, fontWeight: 500, letterSpacing: 4,
                textTransform: "uppercase", color: tint,
                textShadow: "0 2px 8px rgba(0,0,0,0.9)",
              }}>
                {kindLine}
              </div>
            )}
            <div style={{
              display: "flex", fontSize: titleSize, fontWeight: 800, lineHeight: 1.1,
              textShadow: "0 3px 14px rgba(0,0,0,0.95)",
            }}>
              {name}
            </div>
          </div>
        </div>

        {/* ── when, what is wanted, how full ── */}
        <div style={{
          display: "flex", flex: 1, alignItems: "center",
          padding: "0 40px 0 48px", gap: 28,
        }}>
          {/*
            * Two rows on the left: when, then what is wanted. Side by side the
            * three of them did not fit a party wanting three kinds of seat, and
            * the date broke over two lines — the one line that must not.
            */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <div style={{ display: "flex", fontSize: 60, fontWeight: 800, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                {`${thaiDay(card.startsAt)} · ${fmtTime(card.startsAt)}`}
              </div>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 500, color: MUTED, whiteSpace: "nowrap" }}>
                {sub}
              </div>
            </div>

            {/* What is still wanted, as the game draws a role. */}
            {needs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
                {needs.map(([roles, n]) => (
                  <div key={roles.join("/") || "more"}
                       style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {roles.length
                      ? roles.map((r, i) => {
                          const src = uiIcon(ROLE_FILE[r]);
                          return src ? (
                            <div key={r} style={{ display: "flex", alignItems: "center" }}>
                              {i > 0 && (
                                <div style={{ display: "flex", fontSize: 48, color: MUTED, margin: "0 4px" }}>/</div>
                              )}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt="" width={76} height={76} style={{ width: 76, height: 76 }} />
                            </div>
                          ) : null;
                        })
                      : anyone && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={anyone} alt="" width={72} height={72} style={{ width: 72, height: 72 }} />
                      )}
                    <div style={{ display: "flex", fontSize: 58, fontWeight: 800 }}>{`×${n}`}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", minWidth: 220, padding: "10px 26px",
            borderRadius: 26, border: `4px solid ${full ? "#3a4150" : tint}`,
            background: full ? "#171c24" : `${tint}22`,
          }}>
            <div style={{
              display: "flex", fontSize: 88, fontWeight: 800, lineHeight: 1.05,
              color: full ? MUTED : INK,
            }}>
              {seatCount(card)}
            </div>
            <div style={{
              display: "flex", fontSize: 30, fontWeight: 500, color: full ? MUTED : tint,
            }}>
              {full ? "เต็มแล้ว" : card.seatsTotal ? "ในปาร์ตี้" : "คนมา"}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts },
  ), headers);
}

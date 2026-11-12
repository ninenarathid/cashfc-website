import { ImageResponse } from "next/og";
import {
  KIND_COLOR, KIND_LABEL, PROGRESS_LABEL, ROLE_COLOR, ROLE_LABEL, SHAPE_LABEL,
  endsAt, fmtDay, fmtTime,
  fmtFood, fmtLength, fmtRuns, lootText, mapsText, openLabel, spotText,
} from "@/lib/party";
import { contentByKey } from "@/lib/party-seeds";
import { cardNeeds, partyCard, partyCover, seatCount } from "@/lib/party-card";
import { coverFromBucket, stillFromDisk } from "@/lib/party-art.server";
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

export default async function Image(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Side by side: the picture is a separate question, and asking it after the
  // card would add its wait to every link anybody shares.
  const [card, cover] = await Promise.all([partyCard(id), partyCover(id)]);
  const def = card ? contentByKey(card.contentKey) : undefined;
  const tint = def ? KIND_COLOR[def.kind] : "#8b93a1";

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
  /*
   * What the party is short of, which is the line somebody reads and knows
   * whether it is them.
   *
   * "4/8" says there is room; "short 2 tanks" says whether the room is yours.
   * A member asked for this after a day of using the board, because it was the
   * one thing the link could not say and so people were typing it underneath —
   * which is the Discord scrollback the board exists to replace, reappearing in
   * the message used to escape it.
   */
  const needs = cardNeeds(card);
  /*
   * The picture gives up sixty pixels when there is a row of chips to fit.
   *
   * The card is a fixed six hundred and thirty tall and the middle section
   * takes what is left, so a third row added underneath does not make the card
   * taller — it takes the room out of whatever was already there, and the first
   * thing to go was the line with the lead's name on it.
   */
  const artH = needs.length ? ART_H - 64 : ART_H;
  // Cropped to the box it is going into, which is why it is read after the
  // height is known rather than alongside the card.
  // The lead's own picture where there is one (v332), the duty's still where not.
  const own = cover ? await coverFromBucket(cover, size.width, artH) : null;
  const art = own ?? await stillFromDisk(def?.art, def?.focus, size.width, artH);
  /*
   * A member's picture gets a darker foot than a banner does.
   *
   * The duty banners are the game's own key art, composed with room for a
   * title; a screenshot somebody cropped is as often as not a burst of light
   * across the whole frame, and the fight's name sat on it unreadable.
   */
  const scrim = own
    ? "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.7) 45%, rgba(0,0,0,0.2))"
    : "linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.15))";
  const lift = own ? { textShadow: "0 2px 10px rgba(0,0,0,0.9)" } : {};
  const terms = [
    // The length as the party said it. A run count is not a duration and the
    // card should not turn it into one.
    card.lengthUnit === "maps" ? "until the maps are done"
      : card.lengthUnit === "runs" ? fmtRuns(card.runs ?? 1)
        : card.lengthUnit === "food" ? fmtFood(card.lengthMinutes)
          : fmtLength(card.lengthMinutes),
    card.shape === "open" ? openLabel(def?.kind, def?.queueIn)
      : SHAPE_LABEL[card.shape],
    card.progress ? PROGRESS_LABEL[card.progress.at] : null,
    lootText(card.loot ?? undefined),
    mapsText(card.maps ?? undefined, mapLabel),
    card.roulettes?.length ? card.roulettes.join(", ") : null,
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
          position: "relative", display: "flex", width: "100%", height: artH,
          ...(art ? {} : { background: `${tint}33` }),
        }}>
          {art && (
            // eslint-disable-next-line @next/next/no-img-element
            /* Already cropped to this box, so it goes in as it is. */
            <img src={art} alt="" width={size.width} height={artH}
                 style={{ width: size.width, height: artH }} />
          )}
          <div style={{
            // Each edge by name: the card renderer does not read `inset`, and
            // with it this shading had no size at all, on every card.
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex",
            background: scrim,
          }} />
          <div style={{
            position: "absolute", left: 48, right: 48, bottom: 28,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{
              display: "flex", fontSize: 22, letterSpacing: 3, ...lift,
              textTransform: "uppercase", color: tint,
            }}>
              {def ? KIND_LABEL[def.kind] : "Party"}
              {def?.badge ? ` · ${def.badge}` : ""}
            </div>
            <div style={{ display: "flex", fontSize: 58, fontWeight: 700, ...lift }}>
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
              {/* An arrow to an end time nobody promised would be the card
                  inventing the number the party declined to give. */}
              {card.lengthUnit === "runs" || card.lengthUnit === "maps"
                ? `${fmtDay(card.startsAt)} · ${fmtTime(card.startsAt)}`
                : `${fmtDay(card.startsAt)} · ${fmtTime(card.startsAt)} → ${fmtTime(
                    endsAt({ startsAt: card.startsAt, lengthMinutes: card.lengthMinutes } as never))}`}
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

        {/*
          * The roles still wanted, along the foot.
          *
          * Under everything else and pushed right, so they sit below the seat
          * count and read as the same answer in more detail — "2/8" and then
          * which two. Drawn in the same three colours the board uses, so a chip
          * means the same thing in both places.
          *
          * Absent where there is nothing to say: a full party, a hunt train
          * with no seats, one whose every empty seat already has somebody
          * hovering over it, or an alliance, where three numbers adding up to
          * a dozen is not something anybody reads off a card.
          */}
        {needs.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            gap: 12, padding: "0 48px 30px",
          }}>
            {/* One badge per thing the party wants. Its colour is the first
                role named, which for every badge but the either/or is the
                only one — and for that one there is no single right colour,
                so the first is as good as flipping a coin and is at least
                the same every time.

                A badge with no roles on it at all is the remainder that could
                not be named without lying about how many of each could come.
                Grey, the same grey a seat with no role wears: there is no role
                to take a colour from, and reading one off an empty array is
                how this route came to render nothing at all. */}
            {needs.map(([roles, n]) => {
              const tint = roles.length ? ROLE_COLOR[roles[0]] : "#8b93a1";
              return (
                <div key={roles.join("/") || "more"} style={{
                  display: "flex", alignItems: "center",
                  padding: "6px 18px", borderRadius: 999,
                  border: `2px solid ${tint}`,
                  background: `${tint}1f`,
                  color: tint, fontSize: 23, fontWeight: 700,
                  letterSpacing: 0.5,
                }}>
                  {roles.length
                    ? `Need ${n} ${roles.map((r) => ROLE_LABEL[r]).join("/")}`
                    : `Need ${n} more`}
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";
import { memberTitle, TAG_COLOR, tagText } from "@/lib/tags";
import { GUEST_RANK, guestHome } from "@/lib/guest-data";

/**
 * The card Discord draws when somebody pastes a link to a member.
 *
 * The renderer here is Satori, not a browser: it lays out a deliberate subset of
 * CSS and refuses anything ambiguous, including a div with more than one child
 * that has not said how to stack them. A browser guesses; Satori throws, and one
 * unmarked div used to take the whole image down and leave "Image failed to
 * load" in every embed. Every element below therefore carries an explicit
 * display, which is the price of the layout being unambiguous rather than merely
 * working by accident.
 *
 * Pictures are fetched here and inlined as data URIs rather than handed over as
 * URLs. A remote fetch that fails inside the renderer fails the whole image —
 * exactly the blank card this set out to fix — and the Lodestone is not a host
 * this site controls. Fetched first, a picture that will not load simply is not
 * drawn, and the card still says who the member is.
 *
 * What it shows is what a member chose to show: their portrait, their cover, and
 * the tags that say how they play. A best-parse number used to sit in the corner
 * in enormous type, which made every shared link an argument about performance —
 * the wrong first impression for a link somebody pastes to introduce themselves.
 *
 * The card wears the member's own colour, and calls them by the title they wear
 * in game rather than by their rank in this Free Company. A rank says where
 * somebody sits in one guild's hierarchy; a title is the label they picked for
 * themselves, and it is the more interesting half of an introduction. Their level
 * is gone from the line entirely — everybody who matters here is at the cap, so
 * it said nothing and took the place of something that does.
 *
 * The tags are the board's tags: the same wording and the same colour per kind of
 * content, so somebody who has seen the member list recognises them instantly.
 * Grey pills said nothing that the words inside them did not already say.
 *
 * The background is the member's share picture, cut for this shape, and falls
 * back to their cover. The cover is a wide short banner and this card is nearly
 * square by comparison, so using one for the other kept the middle three fifths
 * and lost whoever was standing at the edges.
 *
 * Legibility cannot depend on the cover being dark. Members will set snowfields
 * and noon skies, so the card is built to survive the brightest thing anybody
 * could choose: an even tint takes the edge off, a heavy gradient rises from the
 * bottom, every word sits in that lower band, and the type carries its own
 * shadow. Nothing here asks the picture to be co-operative.
 *
 * The scrims are sized explicitly rather than with inset. Satori does not
 * implement the shorthand, so a div positioned with inset alone has no size and
 * is never drawn — which is exactly what happened: the covers rendered full
 * bleed and every wash over them silently did nothing.
 *
 * Nothing about this card is cached, on purpose. Next hands these routes a year
 * of immutable caching, which is right for a card built only from the build's own
 * data and wrong for this one: it reads the member's portrait, cover and colour
 * from the database, so any caching at all means somebody changes their picture,
 * pastes the link, and watches the old card come back.
 *
 * The cost is a render per unfurl — a database read and two image fetches, about
 * a second. For a Free Company of five hundred sharing a handful of links a day
 * that is nothing, and it buys the only behaviour worth having: change it, share
 * it, see it. What Discord does with its own copy afterwards is Discord's
 * business, and the profile page offers a one-off link for getting past that.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FC member card";

/** Long enough for a cold CDN, short enough that a hung host still yields a card. */
const FETCH_MS = 3500;

/**
 * Blend two hex colours into an opaque one.
 *
 * Satori has no colour functions and no alpha compositing worth relying on, so a
 * tinted pill is worked out here and handed over as a flat colour. Opaque on
 * purpose: a translucent pill over somebody's noon sky is a word nobody can read.
 */
function mix(a: string, b: string, weightOfA: number): string {
  const hex = (c: string) => {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const t = Math.min(1, Math.max(0, weightOfA));
  const c = (x: number, y: number) => Math.round(x * t + y * (1 - t));
  return `rgb(${c(ar, br)},${c(ag, bg)},${c(ab, bb)})`;
}

/** Satori has no inset shorthand, so every full-bleed layer states its size. */
const FILL = { position: "absolute" as const, top: 0, left: 0, width: 1200, height: 630 };
/** Enough separation to read against a white sky without muddying a dark one. */
const SHADOW = "0 2px 14px rgba(0,0,0,0.9)";

const INK = "#e3e8ef";
const MUTED = "#98a4b5";
/** Used when a member has never picked one, and the site's own accent besides. */
const DEFAULT_ACCENT = "#6aa9e0";

async function inline(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_MS) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Past a few megabytes the encode costs more than the card is worth, and
    // the sources here are a 512px avatar and a 1600px cover.
    if (buf.byteLength > 6_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * The member's own pictures, if they chose any. Never fatal: no row, no change.
 *
 * Asked for twice, because an unknown column fails the whole select rather than
 * just that field — so a database still a migration behind would have taken the
 * portrait and the cover down with the column it had never heard of. The same
 * ladder the member page climbs, one rung long.
 */
async function chosen(characterId: string) {
  const none = { avatar: null, cover: null, accent: DEFAULT_ACCENT,
                 name: null as string | null };
  if (!supabaseConfigured) return none;
  const ask = (columns: string) => fetch(
    `${SUPABASE_URL}/rest/v1/profiles?character_id=eq.${characterId}` +
    `&character_verified_at=not.is.null&select=${columns}`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(FETCH_MS),
    },
  );
  try {
    let res = await ask("avatar_url,cover_url,share_url,accent_color,character_name");
    if (!res.ok) res = await ask("avatar_url,cover_url,accent_color,character_name");
    if (!res.ok) return none;
    const rows = await res.json() as {
      avatar_url?: string; cover_url?: string; share_url?: string;
      accent_color?: string; character_name?: string;
    }[];
    // Only a hex colour, and only from this list of characters: it is written
    // straight into a style, and a value from the database has no business
    // deciding what the rest of that style says.
    const accent = /^#[0-9a-fA-F]{6}$/.test(rows[0]?.accent_color ?? "")
      ? rows[0]!.accent_color! : DEFAULT_ACCENT;
    return {
      avatar: rows[0]?.avatar_url ?? null,
      // Cut for this shape if they bothered; their banner if they did not.
      cover: rows[0]?.share_url ?? rows[0]?.cover_url ?? null,
      accent,
      // Verified only — the query says so — so this is a name the Lodestone
      // agreed with, not one somebody typed.
      name: rows[0]?.character_name ?? null,
    };
  } catch {
    return none;
  }
}

export default async function Image(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = raw as unknown as BoardData;
  const m = data.members.find((x) => String(x.id) === id);
  // Not on the roster: a friend, a static-mate, somebody's alt on another
  // world. The card should say whose company they are actually in.
  const home = m ? undefined : guestHome(Number(id));

  const mine = await chosen(id);
  const accent = mine.accent;
  // Their choice first, then the Lodestone — the same order the site uses
  // everywhere else, so the card matches the page it points at.
  const [face, cover] = await Promise.all([
    inline(mine.avatar ?? m?.portrait ?? m?.avatar),
    inline(mine.cover),
  ]);

  // Five is where a row of pills stops being a summary and starts being a list.
  const tiers = m?.achv_tiers ?? {};
  const tags = (m?.tags ?? []).slice(0, 5).map((tag) => {
    const base = TAG_COLOR[tag] ?? "#8b97a8";
    return {
      tag,
      // "Legendary crafter", not "CRAFTER" — the grade is most of the point.
      label: tagText(tag, tiers[tag]),
      // Dark enough to sit on any picture, tinted enough to still be the tag's
      // own colour; the text lifted towards white so it clears its own fill.
      fill: mix(base, "#0b0f15", 0.22),
      edge: mix(base, "#0b0f15", 0.62),
      ink: mix(base, "#ffffff", 0.62),
    };
  });
  const name = m?.name ?? home?.name ?? mine.name ?? "FC Member";
  // The plate at the top: this company for a member, theirs for a guest, and
  // the world underneath either way.
  const house = home ? (home.fc || GUEST_RANK).toUpperCase()
                     : (data.fc.name ?? "Cafe And SHabu").toUpperCase();
  const world = (home?.world ?? data.fc.world ?? "Tonberry").toUpperCase();
  // Nothing stands in for a title nobody set: the line is simply not there.
  const title = m ? memberTitle(m) : null;
  // Long names have to give way rather than run off the edge of the card.
  const nameSize = name.length > 26 ? 52 : name.length > 20 ? 60 : 70;

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", position: "relative",
        background: "#0f1319", color: INK,
      }}>
        {/* The cover, full bleed. */}
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={1200} height={630}
               style={{ ...FILL, objectFit: "cover" }} />
        )}

        {cover ? (
          <div style={{ ...FILL, display: "flex",
                        background: "rgba(10,13,18,0.42)" }} />
        ) : (
          <div style={{ ...FILL, display: "flex",
                        background: "linear-gradient(120deg,#141a24 0%,#1b2536 55%,#243349 100%)" }} />
        )}

        {/* The band everything is written in. Nearly solid where the name sits,
            thinning to almost nothing at the top so the cover still reads as a
            picture rather than as a dark rectangle with a photograph rumoured
            behind it. */}
        <div style={{
          ...FILL, display: "flex",
          background: cover
            ? "linear-gradient(0deg,rgba(8,11,16,0.97) 0%,rgba(8,11,16,0.93) 42%,rgba(8,11,16,0.62) 72%,rgba(8,11,16,0.12) 100%)"
            : "linear-gradient(0deg,rgba(8,11,16,0.45) 0%,rgba(8,11,16,0) 45%)",
        }} />

        <div style={{
          position: "relative", display: "flex", flexDirection: "column",
          width: "100%", height: "100%", justifyContent: "space-between",
          padding: "44px 60px 46px 60px",
        }}>
          {/* ── Who this is from. Carries its own plate, because the top of the
                card is the one place the gradient deliberately leaves bright. ── */}
          <div style={{ display: "flex" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 13,
              background: "rgba(8,11,16,0.55)", borderRadius: 999,
              padding: "9px 22px 9px 18px",
            }}>
              <div style={{ display: "flex", width: 11, height: 11, borderRadius: 999,
                            background: accent }} />
              <div style={{ display: "flex", color: accent, letterSpacing: 6, fontSize: 20 }}>
                {house}
              </div>
              <div style={{ display: "flex", color: MUTED, letterSpacing: 6, fontSize: 20 }}>
                {`\u00b7 ${world}`}
              </div>
            </div>
          </div>

          {/* ── Everything else, held low where the gradient is heaviest. ── */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
              {face && (
                <div style={{
                  display: "flex", padding: 5, borderRadius: 34,
                  background: mix(accent, "#0b0f15", 0.45),
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={face} alt="" width={252} height={252}
                       style={{ width: 252, height: 252, borderRadius: 29,
                                objectFit: "cover", objectPosition: "top" }} />
                </div>
              )}

              <div style={{
                display: "flex", flexDirection: "column", flex: 1, minWidth: 0,
                paddingBottom: 6,
              }}>
                <div style={{ display: "flex", fontSize: nameSize, fontWeight: 700,
                              lineHeight: 1.1, textShadow: SHADOW }}>
                  {name}
                </div>
                {title && (
                  <div style={{ display: "flex", color: INK, opacity: 0.72, fontSize: 27,
                                marginTop: 8, textShadow: SHADOW }}>
                    {title}
                  </div>
                )}

                {/* How they play, which is the part worth leading with. Each pill
                    is opaque enough to stand on its own, so a bright cover behind
                    one cannot swallow the word inside it. */}
                {tags.length > 0 && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap",
                                marginTop: title ? 22 : 18 }}>
                    {tags.map((t) => (
                      <div key={t.tag} style={{
                        display: "flex", borderRadius: 999, padding: "7px 20px",
                        fontSize: 21, color: t.ink,
                        background: t.fill, border: `1px solid ${t.edge}`,
                      }}>
                        {t.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Where it lives ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 15, marginTop: 30 }}>
              <div style={{ display: "flex", width: 58, height: 2,
                            background: mix(accent, "#0b0f15", 0.75) }} />
              <div style={{ display: "flex", color: MUTED, fontSize: 19, letterSpacing: 2,
                            textShadow: SHADOW }}>
                cashfc-website.vercel.app
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: { "cache-control": "no-store, max-age=0, must-revalidate" },
    },
  );
}

import { ImageResponse } from "next/og";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";

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
 * The cache header is set here on purpose. Next hands these routes a year of
 * immutable caching, which is right for a card built only from the build's own
 * data and wrong for this one: it reads the member's chosen portrait and cover
 * from the database, so a member who changed their picture would keep serving
 * the old card until the next deploy. Minutes at the edge instead, with a day of
 * stale-while-revalidate so the common case is still served instantly from
 * cache. What Discord does with its own copy afterwards is Discord's business.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FC member card";

/** Long enough for a cold CDN, short enough that a hung host still yields a card. */
const FETCH_MS = 3500;

const INK = "#e3e8ef";
const MUTED = "#98a4b5";
const ACCENT = "#6aa9e0";

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

/** The member's own pictures, if they chose any. Never fatal: no row, no change. */
async function chosen(characterId: string) {
  if (!supabaseConfigured) return { avatar: null, cover: null };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?character_id=eq.${characterId}` +
      `&character_verified_at=not.is.null&select=avatar_url,cover_url`,
      {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(FETCH_MS),
      },
    );
    if (!res.ok) return { avatar: null, cover: null };
    const rows = await res.json() as { avatar_url?: string; cover_url?: string }[];
    return { avatar: rows[0]?.avatar_url ?? null, cover: rows[0]?.cover_url ?? null };
  } catch {
    return { avatar: null, cover: null };
  }
}

export default async function Image(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = raw as unknown as BoardData;
  const m = data.members.find((x) => String(x.id) === id);

  const mine = await chosen(id);
  // Their choice first, then the Lodestone — the same order the site uses
  // everywhere else, so the card matches the page it points at.
  const [face, cover] = await Promise.all([
    inline(mine.avatar ?? m?.portrait ?? m?.avatar),
    inline(mine.cover),
  ]);

  // Five is where a row of pills stops being a summary and starts being a list.
  const tags = (m?.tags ?? []).slice(0, 5);
  const name = m?.name ?? "FC Member";
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
               style={{ position: "absolute", inset: 0, width: 1200, height: 630,
                        objectFit: "cover" }} />
        )}

        {/* Dark enough everywhere for light type to read, and no darker: the
            cover survives as atmosphere behind the name rather than being
            blacked out by a scrim that would make setting one pointless. */}
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          background: cover
            ? "linear-gradient(100deg,rgba(12,16,22,0.95) 0%,rgba(12,16,22,0.86) 52%,rgba(12,16,22,0.62) 100%)"
            : "linear-gradient(120deg,#141a24 0%,#1b2536 55%,#243349 100%)",
        }} />
        {/* A little weight along the bottom edge, so the card sits on something
            rather than stopping. */}
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          background: "linear-gradient(0deg,rgba(8,11,16,0.55) 0%,rgba(8,11,16,0) 38%)",
        }} />

        <div style={{
          position: "relative", display: "flex", flexDirection: "column",
          width: "100%", height: "100%", justifyContent: "space-between",
          padding: "52px 60px",
        }}>
          {/* ── Who this is from ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 999,
                          background: ACCENT }} />
            <div style={{ display: "flex", color: ACCENT, letterSpacing: 7, fontSize: 21 }}>
              CAFE AND SHABU
            </div>
            <div style={{ display: "flex", color: MUTED, letterSpacing: 7, fontSize: 21 }}>
              · TONBERRY
            </div>
          </div>

          {/* ── Who it is about ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
            {face && (
              <div style={{
                display: "flex", padding: 5, borderRadius: 34,
                background: "rgba(227,232,239,0.10)",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={face} alt="" width={272} height={272}
                     style={{ width: 272, height: 272, borderRadius: 29,
                              objectFit: "cover", objectPosition: "top" }} />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", fontSize: nameSize, fontWeight: 700,
                            lineHeight: 1.1 }}>
                {name}
              </div>
              <div style={{ display: "flex", color: MUTED, fontSize: 27, marginTop: 10 }}>
                {(m?.rank ?? "Member") + "  ·  Lv " + (m?.level ?? "-")}
              </div>

              {/* How they play, which is the part worth leading with. */}
              {tags.length > 0 && (
                <div style={{ display: "flex", gap: 11, marginTop: 24, flexWrap: "wrap" }}>
                  {tags.map((tag) => (
                    <div key={tag} style={{
                      display: "flex", borderRadius: 999, padding: "8px 22px",
                      fontSize: 21, letterSpacing: 1, color: INK,
                      background: "rgba(106,169,224,0.16)",
                      border: "1px solid rgba(106,169,224,0.45)",
                    }}>
                      {tag.toUpperCase()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Where it lives ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", width: 64, height: 2, background: "rgba(227,232,239,0.25)" }} />
            <div style={{ display: "flex", color: MUTED, fontSize: 20, letterSpacing: 2 }}>
              cashfc-website.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "cache-control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}

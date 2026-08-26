import { ImageResponse } from "next/og";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";

/**
 * The card Discord draws when somebody pastes a link to a member.
 *
 * It was rendering a 500 and showing "Image failed to load" in every embed. The
 * renderer here is Satori, not a browser: it lays out a deliberate subset of CSS
 * and refuses anything ambiguous, including a div with more than one child that
 * has not said how to stack them. A browser guesses; Satori throws, and one
 * unmarked div took the whole image down. Every element below therefore carries
 * an explicit display, which is the price of the layout being unambiguous rather
 * than merely working by accident.
 *
 * Pictures are fetched here and inlined as data URIs rather than handed over as
 * URLs. A remote fetch that fails inside the renderer fails the whole image —
 * exactly the blank card this is meant to fix — and the Lodestone is not a host
 * this site controls. Fetched first, a picture that will not load simply is not
 * drawn, and the card still says who the member is.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FC member card";

/** Long enough for a cold CDN, short enough that a hung host still yields a card. */
const FETCH_MS = 3500;

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
  const parse = m?.parse ?? null;
  const color =
    parse == null ? "#8b97a8" :
    parse >= 100 ? "#e5cc80" : parse >= 99 ? "#e268a8" :
    parse >= 95 ? "#ff8000" : parse >= 75 ? "#a335ee" :
    parse >= 50 ? "#2f7fd4" : "#4caf50";

  const mine = await chosen(id);
  // Their choice first, then the Lodestone — the same order the site uses
  // everywhere else, so the card matches the page it points at.
  const [face, cover] = await Promise.all([
    inline(mine.avatar ?? m?.portrait ?? m?.avatar),
    inline(mine.cover),
  ]);

  const tags = (m?.tags ?? []).slice(0, 4);

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", position: "relative",
        background: "#0f1319", color: "#e3e8ef",
      }}>
        {/* The cover, full bleed, under a wash. A name in light grey over a
            bright sky is a card nobody can read. */}
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={1200} height={630}
               style={{ position: "absolute", inset: 0, width: 1200, height: 630,
                        objectFit: "cover" }} />
        )}
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          background: cover
            ? "linear-gradient(90deg,rgba(15,19,25,0.96) 45%,rgba(15,19,25,0.55) 100%)"
            : "linear-gradient(135deg,#151b25,#22304a)",
        }} />

        <div style={{
          position: "relative", display: "flex", width: "100%", height: "100%",
          alignItems: "center", gap: 48, padding: 64,
        }}>
          {face && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={face} alt="" width={300} height={300}
                 style={{ width: 300, height: 300, borderRadius: 28,
                          border: "3px solid #2b3441", objectFit: "cover",
                          objectPosition: "top" }} />
          )}

          <div style={{
            display: "flex", flexDirection: "column", flex: 1, minWidth: 0,
          }}>
            <div style={{ display: "flex", color: "#6aa9e0", letterSpacing: 6, fontSize: 22 }}>
              CAFE AND SHABU · TONBERRY
            </div>
            <div style={{ display: "flex", fontSize: 66, fontWeight: 700, marginTop: 8 }}>
              {m?.name ?? "FC Member"}
            </div>
            <div style={{ display: "flex", color: "#8b97a8", fontSize: 28, marginTop: 4 }}>
              {(m?.rank ?? "Member") + "  ·  Lv " + (m?.level ?? "-")}
            </div>

            {tags.length > 0 && (
              <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
                {tags.map((tag) => (
                  <div key={tag} style={{
                    display: "flex", border: "2px solid #2b3441", borderRadius: 999,
                    padding: "6px 22px", fontSize: 22, color: "#8b97a8",
                  }}>
                    {tag.toUpperCase()}
                  </div>
                ))}
              </div>
            )}

            {parse != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 26 }}>
                <div style={{ display: "flex", fontSize: 20, color: "#8b97a8", letterSpacing: 4 }}>
                  BEST PARSE
                </div>
                <div style={{ display: "flex", fontSize: 60, fontWeight: 700, color }}>
                  {parse}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

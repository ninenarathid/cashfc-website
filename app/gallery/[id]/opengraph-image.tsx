import { ImageResponse } from "next/og";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";

/**
 * A post of several pictures, as one card.
 *
 * An embed shows one image. A post holding eight screenshots was therefore
 * represented by whichever happened to be first, which says nothing about the
 * other seven — and the link that promised a set delivered a single picture.
 *
 * So the several become one: up to four, laid out to fill the card, with a hair
 * of the page's own background between them so they read as separate pictures
 * rather than as one confusing photograph. A post with one picture never reaches
 * this route at all; it goes as itself, larger and sharper than any card drawn
 * around it could be.
 *
 * Every picture is fetched here and inlined. A remote fetch that fails inside the
 * renderer fails the whole image, and an empty embed is exactly what this exists
 * to fix, so a picture that will not load is simply left out of the arrangement.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pictures from the Cafe And SHabu gallery";

const FETCH_MS = 3500;
/** More than four and each one is a stamp; the point is to show what is in there. */
const MAX = 4;
const GAP = 6;
const BG = "#0f1319";

async function inline(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_MS) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 6_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function pictures(id: string): Promise<string[]> {
  if (!supabaseConfigured) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gallery_images?post_id=eq.${id}` +
      `&hidden=is.false&select=url&order=position.asc,id.asc&limit=${MAX}`,
      {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(FETCH_MS),
      },
    );
    if (!res.ok) return [];
    return (await res.json() as { url: string }[]).map((r) => r.url);
  } catch {
    return [];
  }
}

/** A picture in the arrangement: cropped to its box, never squashed into it. */
function Frame({ src, width, height }: { src: string; width: number; height: number }) {
  return (
    <div style={{ display: "flex", width, height, overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={width} height={height}
           style={{ width, height, objectFit: "cover" }} />
    </div>
  );
}

export default async function Image(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const urls = await pictures(id);
  const shots = (await Promise.all(urls.map(inline))).filter(Boolean) as string[];

  const W = size.width;
  const H = size.height;
  const half = Math.floor((W - GAP) / 2);
  const halfH = Math.floor((H - GAP) / 2);

  // Each arrangement is written out rather than computed, because four layouts
  // are fewer moving parts than one routine general enough to produce them.
  let body: React.ReactNode;
  if (shots.length >= 4) {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
        <div style={{ display: "flex", gap: GAP }}>
          <Frame src={shots[0]} width={half} height={halfH} />
          <Frame src={shots[1]} width={W - half - GAP} height={halfH} />
        </div>
        <div style={{ display: "flex", gap: GAP }}>
          <Frame src={shots[2]} width={half} height={H - halfH - GAP} />
          <Frame src={shots[3]} width={W - half - GAP} height={H - halfH - GAP} />
        </div>
      </div>
    );
  } else if (shots.length === 3) {
    // The first one gets the room: it is the cover, and the one the post leads
    // with is the one worth seeing at size.
    const big = Math.round(W * 0.58);
    body = (
      <div style={{ display: "flex", gap: GAP }}>
        <Frame src={shots[0]} width={big} height={H} />
        <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
          <Frame src={shots[1]} width={W - big - GAP} height={halfH} />
          <Frame src={shots[2]} width={W - big - GAP} height={H - halfH - GAP} />
        </div>
      </div>
    );
  } else if (shots.length === 2) {
    body = (
      <div style={{ display: "flex", gap: GAP }}>
        <Frame src={shots[0]} width={half} height={H} />
        <Frame src={shots[1]} width={W - half - GAP} height={H} />
      </div>
    );
  } else if (shots.length === 1) {
    body = <Frame src={shots[0]} width={W} height={H} />;
  } else {
    // Nothing loaded. A plain dark card is a poor embed and a much better one
    // than a broken image, which is what a thrown renderer produces.
    body = (
      <div style={{
        display: "flex", width: W, height: H, alignItems: "center",
        justifyContent: "center", color: "#8b97a8", fontSize: 30, letterSpacing: 6,
      }}>
        CAFE AND SHABU
      </div>
    );
  }

  return new ImageResponse(
    (
      <div style={{
        display: "flex", width: "100%", height: "100%", background: BG,
      }}>
        {body}
      </div>
    ),
    {
      ...size,
      // Pictures can be added to a post, hidden, or taken out of it, and the
      // arrangement changes with them. Nothing here is worth caching for a year.
      headers: { "cache-control": "no-store, max-age=0, must-revalidate" },
    },
  );
}

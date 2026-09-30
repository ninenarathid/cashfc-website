import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";
import { phaseOf, thumbUrl, type Contest, type Stage } from "@/lib/contest";

/**
 * A glamour contest, as the card Discord draws when its link is pasted.
 *
 * The poster was the whole preview, which made an announcement a picture with
 * no words: nothing said it was a contest, whether entries were open, or until
 * when. The card keeps the poster — it is the invitation, and Aqua chose it —
 * and sets beside it what the post announcing it would otherwise have to say:
 * the name, where it stands, the two windows, and how many have taken part,
 * with the newest looks along the bottom once there are some.
 *
 * Read as somebody with no session, the way the unfurler reads it, so a draft
 * is not there to draw and its link keeps the plain site card (v98). Every
 * picture is fetched and inlined with a time limit, and one that will not load
 * is left out rather than taking the card with it — the same rule as the
 * gallery's and the party's cards.
 */
export const CARD_SIZE = { width: 1200, height: 630 };
export const CARD_ALT = "A glamour contest at Cafe And SHabu";

const FETCH_MS = 3500;
const POSTER = { width: 408, height: 510 };
const THUMB = { width: 96, height: 120 };

/**
 * The card's own words. The site's dictionary lives in the browser.
 *
 * `ask` is the line along the bottom when there are no looks to show yet: what
 * somebody seeing the link can do about it now, which is different at every
 * stage — nobody should be invited to enter a contest that has been decided.
 */
const STAGE: Record<Stage, { th: string; tone: string; ask: string }> = {
  draft: { th: "ฉบับร่าง", tone: "#d14b3a", ask: "เร็วๆ นี้" },
  soon: { th: "เร็วๆ นี้", tone: "#7ea6c9", ask: "เตรียมลุคให้พร้อม · โหวตด้วย popoto" },
  entries: { th: "เปิดรับผลงาน", tone: "#4fb8a8", ask: "ส่งลุคของคุณได้แล้ว" },
  both: { th: "ส่งผลงานและโหวตได้", tone: "#4fb8a8", ask: "ส่งลุคของคุณ · โหวตด้วย popoto" },
  between: { th: "รอเปิดโหวต", tone: "#7ea6c9", ask: "ปิดรับผลงานแล้ว รอเปิดโหวต" },
  voting: { th: "กำลังโหวต", tone: "#6aa9e0", ask: "โหวตลุคที่ชอบด้วย popoto" },
  counting: { th: "รอประกาศผล", tone: "#e5cc80", ask: "ปิดโหวตแล้ว รอประกาศผล" },
  announced: { th: "ประกาศผลแล้ว", tone: "#e5cc80", ask: "ดูผลการประกวด" },
};

/* ── fonts ─────────────────────────────────────────────────────────────── */

/**
 * Kanit, because the card is Thai first and the renderer has no Thai of its
 * own: without a font that has the glyphs, every Thai letter comes out as a
 * box. Two weights, read once per server and kept (see next.config.ts, which
 * packs the files in beside the route).
 */
let fontsRead: { name: string; data: Buffer; weight: 500 | 800; style: "normal" }[] | null = null;
function fonts() {
  fontsRead ??= [
    { name: "Kanit", weight: 800, style: "normal",
      data: fs.readFileSync(path.join(process.cwd(), "assets/fonts/Kanit-ExtraBold.ttf")) },
    { name: "Kanit", weight: 500, style: "normal",
      data: fs.readFileSync(path.join(process.cwd(), "assets/fonts/Kanit-Medium.ttf")) },
  ];
  return fontsRead;
}

function popotoIcon(): string | null {
  try {
    const png = fs.readFileSync(path.join(process.cwd(), "assets/popoto/popoto-og.png"));
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/* ── what the card says ────────────────────────────────────────────────── */

export interface ContestCard {
  contest: Contest;
  poster: string | null;
  /** The poster's own colour, for the glow behind it. */
  tint: { r: number; g: number; b: number } | null;
  turnout: { entries: number; voters: number } | null;
  looks: string[];
}

const anon = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

async function rest<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${url}`, {
      ...init,
      headers: { ...anon, "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

/**
 * A picture from anywhere, as a JPEG the renderer can read, cut to its box.
 *
 * The renderer cannot read WebP, which is what the posters and every look
 * are stored as — the party card found that out as a card that failed whole.
 */
async function picture(
  url: string, box: { width: number; height: number }, withTint = false,
): Promise<{ src: string; tint: ContestCard["tint"] } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_MS) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    if (raw.byteLength > 8_000_000) return null;
    const img = sharp(raw).resize(box.width * 2, box.height * 2, { fit: "cover", position: "top" });
    const jpeg = await img.clone().jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    const tint = withTint ? (await sharp(raw).stats()).dominant : null;
    return { src: `data:image/jpeg;base64,${jpeg.toString("base64")}`, tint };
  } catch {
    return null;
  }
}

const COLUMNS = "id,title,title_en,poster_url,submit_opens_at,submit_closes_at,vote_opens_at,"
  + "vote_closes_at,published_at,announced_at,hide_names,show_votes,vote_limit,fc_only,"
  + "needs_approval,allow_mods,allow_shaders,body,body_en,created_at";

/** One contest by id, or the newest one anybody may see. Null for a draft. */
export async function contestCard(which: number | "current"): Promise<ContestCard | null> {
  if (!supabaseConfigured) return null;
  const rows = await rest<Contest[]>(which === "current"
    ? `contests?select=${COLUMNS}&order=submit_opens_at.desc&limit=1`
    : `contests?select=${COLUMNS}&id=eq.${Number(which) || -1}`);
  const contest = rows?.[0];
  if (!contest) return null;

  const [poster, turn, newest] = await Promise.all([
    contest.poster_url ? picture(contest.poster_url, POSTER, true) : Promise.resolve(null),
    rest<{ entries: number; voters: number }[]>("rpc/contest_turnout",
      { method: "POST", body: JSON.stringify({ p_contest: contest.id }) }),
    rest<{ id: number }[]>(`contest_entries?select=id&contest_id=eq.${contest.id}`
      + "&order=created_at.desc&limit=4"),
  ]);

  let looks: string[] = [];
  const ids = (newest ?? []).map((e) => e.id);
  if (ids.length) {
    const imgs = await rest<{ entry_id: number; path: string; thumb_path: string | null }[]>(
      `contest_images?select=entry_id,path,thumb_path&position=eq.0&entry_id=in.(${ids.join(",")})`);
    const byLook = new Map((imgs ?? []).map((i) => [i.entry_id, i]));
    const got = await Promise.all(ids.map((id) => {
      const img = byLook.get(id);
      return img ? picture(thumbUrl(img), THUMB) : Promise.resolve(null);
    }));
    looks = got.filter(Boolean).map((p) => p!.src);
  }

  const t = turn?.[0];
  return {
    contest,
    poster: poster?.src ?? null,
    tint: poster?.tint ?? null,
    turnout: t ? { entries: Number(t.entries), voters: Number(t.voters) } : null,
    looks,
  };
}

/* ── how it looks ──────────────────────────────────────────────────────── */

const day = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
const dayOnly = new Intl.DateTimeFormat("th-TH", { day: "numeric", timeZone: "Asia/Bangkok" });
const monthOf = new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "Asia/Bangkok" });

/** "20 – 27 ต.ค.", or "28 ต.ค. – 3 พ.ย." across a month, in Bangkok. */
export function span(from: string, to: string): string {
  const a = new Date(from), b = new Date(to);
  return monthOf.format(a) === monthOf.format(b)
    ? `${dayOnly.format(a)} – ${day.format(b)}`
    : `${day.format(a)} – ${day.format(b)}`;
}

/** Long names get smaller, so any name the admin form allows still fits. */
function titleSize(title: string): number {
  const n = [...title].length;
  return n <= 16 ? 70 : n <= 26 ? 60 : n <= 38 ? 52 : n <= 60 ? 44 : 38;
}

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** The site's own card, for a contest that is not there to draw. */
export function plainCard() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #1c0b35 0%, #0d0719 60%, #07040e 100%)",
        color: "#e5cc80", fontSize: 46, fontFamily: "Kanit", fontWeight: 800, letterSpacing: 2,
      }}>
        Cafe And SHabu · Glamour Contest
      </div>
    ),
    { ...CARD_SIZE, fonts: fonts() },
  );
}

export function renderContestCard(card: ContestCard, now = Date.now()) {
  const { contest: c, poster, tint, turnout, looks } = card;
  const stage = STAGE[phaseOf(c, now).stage];
  const glow = tint ? `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.55)` : "rgba(255, 150, 60, 0.45)";
  const title = c.title;
  const pop = popotoIcon();

  const star = (x: number, y: number, s: number, o: number) => (
    <div key={`${x}-${y}`} style={{
      position: "absolute", left: x, top: y, width: s, height: s, borderRadius: s,
      background: "#ffffff", opacity: o,
    }} />
  );

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", position: "relative",
        background: "linear-gradient(135deg, #1f0c3a 0%, #120828 48%, #07040e 100%)",
        fontFamily: "Kanit", color: "#f6ecff",
      }}>
        {/* The poster's own colour, spilling out behind it. */}
        <div style={{
          position: "absolute", left: -160, top: -120, width: 820, height: 860, display: "flex",
          backgroundImage: `radial-gradient(circle at 50% 50%, ${glow} 0%, rgba(0,0,0,0) 62%)`,
        }} />
        <div style={{
          position: "absolute", right: -200, bottom: -260, width: 700, height: 700, display: "flex",
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(229, 204, 128, 0.16) 0%, rgba(0,0,0,0) 60%)",
        }} />
        {star(560, 40, 3, 0.7)}{star(1130, 70, 4, 0.8)}{star(980, 30, 2, 0.5)}
        {star(1160, 250, 2, 0.5)}{star(640, 590, 2, 0.4)}{star(30, 600, 3, 0.5)}
        {star(24, 40, 2, 0.6)}{star(1080, 600, 3, 0.45)}

        {/* The poster, pinned up slightly crooked. */}
        <div style={{
          position: "absolute", left: 62, top: 60, width: POSTER.width, height: POSTER.height,
          display: "flex", borderRadius: 22, overflow: "hidden",
          border: "3px solid rgba(229, 204, 128, 0.85)",
          boxShadow: "0 26px 60px rgba(0,0,0,0.65), 0 0 0 8px rgba(229, 204, 128, 0.12)",
          transform: "rotate(-3deg)",
          background: "linear-gradient(160deg, #3a1a66 0%, #150a2a 100%)",
          alignItems: "center", justifyContent: "center",
        }}>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" width={POSTER.width} height={POSTER.height}
                 style={{ width: POSTER.width, height: POSTER.height, objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              {pop && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pop} alt="" width={140} height={140} style={{ width: 140, height: 140 }} />
              )}
              <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#e5cc80", letterSpacing: 3 }}>
                GLAMOUR
              </div>
            </div>
          )}
        </div>

        {/* What it is, where it stands, and until when. */}
        <div style={{
          position: "absolute", left: 540, top: 58, width: 610, display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", fontSize: 21, fontWeight: 500, letterSpacing: 4, color: "#e5cc80" }}>
            CAFE &amp; SHABU · GLAMOUR CONTEST
          </div>
          <div style={{
            display: "flex", marginTop: 14, fontSize: titleSize(title), fontWeight: 800, lineHeight: 1.12,
            color: "#fff4e2", textShadow: "0 4px 22px rgba(0,0,0,0.55)",
          }}>
            {title}
          </div>

          <div style={{ display: "flex", marginTop: 22 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "8px 20px 10px",
              borderRadius: 999, border: `2px solid ${rgba(stage.tone, 0.7)}`,
              background: rgba(stage.tone, 0.16), color: stage.tone, fontSize: 26, fontWeight: 500,
            }}>
              <div style={{ display: "flex", width: 12, height: 12, borderRadius: 12, background: stage.tone }} />
              {stage.th}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 20, fontSize: 25 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", width: 118, color: "#b7a8d8", fontWeight: 500 }}>ส่งผลงาน</div>
              <div style={{ display: "flex", color: "#f6ecff", fontWeight: 500 }}>
                {span(c.submit_opens_at, c.submit_closes_at)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", width: 118, color: "#b7a8d8", fontWeight: 500 }}>โหวต</div>
              <div style={{ display: "flex", color: "#f6ecff", fontWeight: 500 }}>
                {span(c.vote_opens_at, c.vote_closes_at)}
              </div>
            </div>
          </div>
        </div>

        {/* The newest looks, or the invitation to be the first. */}
        <div style={{
          position: "absolute", left: 540, bottom: 46, width: 610, display: "flex",
          alignItems: "flex-end", justifyContent: "space-between",
        }}>
          {looks.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", fontSize: 20, fontWeight: 500, color: "#b7a8d8" }}>
                {turnout
                  ? `${turnout.entries} ผลงาน · โหวตแล้ว ${turnout.voters} คน`
                  : "ผลงานล่าสุด"}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {looks.map((src, i) => (
                  <div key={i} style={{
                    display: "flex", width: THUMB.width, height: THUMB.height, borderRadius: 14,
                    overflow: "hidden", border: "2px solid rgba(255,255,255,0.22)",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.5)",
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" width={THUMB.width} height={THUMB.height}
                         style={{ width: THUMB.width, height: THUMB.height, objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: "#f6ecff" }}>
              {stage.ask}
            </div>
          )}
          {pop && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pop} alt="" width={64} height={64} style={{ width: 64, height: 64 }} />
          )}
        </div>
      </div>
    ),
    { ...CARD_SIZE, fonts: fonts() },
  );
}

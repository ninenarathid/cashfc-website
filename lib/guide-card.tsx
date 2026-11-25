import { ImageResponse } from "next/og";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";
import { kanit, stillFromDisk } from "@/lib/party-art.server";
import { guideDuties } from "@/lib/guides/duties";
import { CATEGORY_LABEL, isCategory, type Category } from "@/lib/guides";

/**
 * A guide, as the card Discord draws when somebody pastes the link (the owner,
 * 2026-11-25: "เพิ่มรูปตอน share discord ให้ด้วย"). Built like the party
 * finder's card: the fight's own banner across the top with its name over a
 * gradient, and under it what somebody deciding whether to open the link wants
 * — what it asks (level, item level, players, time), how much of the fight is
 * written up, and the prize worth chasing.
 *
 * Read as anybody would (the anon key), so a draft has no card and unfurls as
 * the site's plain one.
 */

export const GUIDE_CARD = { width: 1200, height: 630 };
const BG = "#0f1319";
const INK = "#e8ecf2";
const MUTED = "#8b93a1";
const ART_H = 360;
const FETCH_MS = 4000;

/** The party finder's colours for the kinds of fight. */
const TINT: Record<Category, string> = {
  savage: "#d19a66", extreme: "#e06c75", ultimate: "#c678dd", chaotic: "#61afef", other: "#8b93a1",
};

interface CardGuide {
  id: number;
  slug: string;
  name: string;
  short: string | null;
  category: Category;
  patch: string | null;
  content_key: string | null;
  source_name: string | null;
  req_level: number | null;
  req_ilvl: number | null;
  req_party: number | null;
  req_minutes: number | null;
}

async function rest<T>(q: string): Promise<{ rows: T[]; count: number | null } | null> {
  if (!supabaseConfigured) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Prefer: "count=exact" },
      signal: AbortSignal.timeout(FETCH_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const range = res.headers.get("content-range");
    const count = range?.includes("/") ? Number(range.split("/")[1]) : null;
    return { rows: await res.json() as T[], count: Number.isFinite(count) ? count : null };
  } catch {
    return null;
  }
}

const COLS = "id, slug, name, short, category, patch, content_key, source_name, req_level, req_ilvl, req_party, req_minutes";

function artFor(contentKey: string | null) {
  if (!contentKey) return null;
  return guideDuties().find((d) => d.key === contentKey) ?? null;
}

/** The card's own words for what a guide asks before you go in. */
function asks(g: CardGuide): string[] {
  return [
    g.req_level ? `Lv ${g.req_level}` : null,
    g.req_ilvl ? `IL ${g.req_ilvl}+` : null,
    g.req_party ? `${g.req_party} คน` : null,
    g.req_minutes ? `${g.req_minutes} นาที` : null,
  ].filter(Boolean) as string[];
}

function plain(title: string) {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: BG, color: MUTED, fontSize: 52, fontFamily: "Kanit", fontWeight: 800,
      }}>
        {title}
      </div>
    ),
    { ...GUIDE_CARD, fonts: kanit() },
  );
}

/* ── one guide ─────────────────────────────────────────────────────────── */

export async function renderGuideCard(slug: string) {
  const got = await rest<CardGuide>(`guides?select=${COLS.replace(/ /g, "")}&slug=eq.${encodeURIComponent(slug.slice(0, 40))}&published=eq.true`);
  const g = got?.rows?.[0];
  if (!g) return plain("Cafe And SHabu · ไกด์คอนเทนต์");
  const category = isCategory(g.category) ? g.category : "other";
  const tint = TINT[category];

  // The owner took the "guide by role" line off the card (2026-11-25), so the
  // card asks only for the rewards. Thai with two stacked marks loses the
  // second in this renderer ("ขั้น" drew as "ขัน"): keep such words off it.
  const rewards = await rest<{ kind: string; name: string; ilvl: number | null }>(
    `guide_rewards?select=kind,name,ilvl&guide_id=eq.${g.id}&order=sort`);
  const duty = artFor(g.content_key);
  const art = await stillFromDisk(duty?.art, duty?.focus, GUIDE_CARD.width, ART_H);

  const chips = asks(g);
  const prize = rewards?.rows.find((r) => r.kind === "mount") ?? rewards?.rows.find((r) => r.kind === "weapon");
  const kicker = [CATEGORY_LABEL[category], g.short, g.patch ? `patch ${g.patch}` : null].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: BG, color: INK, fontFamily: "Kanit",
      }}>
        <div style={{
          position: "relative", display: "flex", width: "100%", height: ART_H,
          ...(art ? {} : { background: `${tint}33` }),
        }}>
          {art && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art} alt="" width={GUIDE_CARD.width} height={ART_H}
                 style={{ width: GUIDE_CARD.width, height: ART_H }} />
          )}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex",
            background: "linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.15))",
          }} />
          <div style={{
            position: "absolute", left: 48, right: 48, bottom: 26,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase", color: tint }}>
              {kicker}
            </div>
            <div style={{ display: "flex", fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>
              {g.name.length > 46 ? `${g.name.slice(0, 46)}…` : g.name}
            </div>
          </div>
        </div>

        <div style={{
          display: "flex", flex: 1, flexDirection: "column", justifyContent: "center",
          padding: "0 48px", gap: 16,
        }}>
          {chips.length > 0 && (
            <div style={{ display: "flex", gap: 12 }}>
              {chips.map((c) => (
                <div key={c} style={{
                  display: "flex", fontSize: 26, fontWeight: 500, padding: "6px 18px",
                  borderRadius: 999, border: "2px solid #2b3240", background: "#161b23",
                }}>{c}</div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, fontWeight: 500, color: MUTED }}>
            <div style={{ display: "flex" }}>
              {prize ? `ของรางวัล: ${prize.name}${prize.ilvl ? ` (IL${prize.ilvl})` : ""}` : (g.source_name ? `อ้างอิงแผนจาก ${g.source_name}` : "")}
            </div>
            <div style={{ display: "flex" }}>Cafe And SHabu · ไกด์คอนเทนต์</div>
          </div>
        </div>
      </div>
    ),
    { ...GUIDE_CARD, fonts: kanit() },
  );
}

/* ── the shelf ─────────────────────────────────────────────────────────── */

/**
 * /guides, as Discord draws it: the title, and the banners of the guides that
 * are open to read, newest first, up to three side by side.
 */
export async function renderShelfCard() {
  const got = await rest<CardGuide>(`guides?select=${COLS.replace(/ /g, "")}&published=eq.true&order=id.desc&limit=12`);
  const guides = got?.rows ?? [];
  const shown = guides.slice(0, 3);
  const tileW = shown.length ? Math.floor((GUIDE_CARD.width - 96 - (shown.length - 1) * 16) / shown.length) : 0;
  const tileH = 230;
  const tiles = await Promise.all(shown.map(async (g) => {
    const duty = artFor(g.content_key);
    return { g, art: await stillFromDisk(duty?.art, duty?.focus, tileW, tileH) };
  }));

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: BG, color: INK, fontFamily: "Kanit", padding: "56px 48px", gap: 28,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: MUTED, letterSpacing: 2 }}>
            CAFE AND SHABU
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.1 }}>ไกด์คอนเทนต์</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "#c4ccd8" }}>
            {`ตำแหน่งยืนตาม role · ไทย / English${guides.length ? ` · ${guides.length} ไกด์` : ""}`}
          </div>
        </div>
        {tiles.length > 0 && (
          <div style={{ display: "flex", gap: 16 }}>
            {tiles.map(({ g, art }) => {
              const category = isCategory(g.category) ? g.category : "other";
              return (
                <div key={g.id} style={{
                  position: "relative", display: "flex", width: tileW, height: tileH, borderRadius: 18,
                  overflow: "hidden", ...(art ? {} : { background: `${TINT[category]}33` }),
                }}>
                  {art && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art} alt="" width={tileW} height={tileH} style={{ width: tileW, height: tileH }} />
                  )}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex",
                    background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.05))",
                  }} />
                  <div style={{
                    position: "absolute", left: 20, right: 20, bottom: 16, display: "flex", flexDirection: "column",
                  }}>
                    <div style={{ display: "flex", fontSize: 20, fontWeight: 500, letterSpacing: 2, color: TINT[category] }}>
                      {CATEGORY_LABEL[category].toUpperCase()}
                    </div>
                    <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>{g.short ?? g.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    { ...GUIDE_CARD, fonts: kanit() },
  );
}

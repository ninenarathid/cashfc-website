import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A rare popoto: one in a hundred arrives wrapped, with a line from somebody in
 * the Free Company inside. See v77.
 *
 * The line is only ever handed over by open_rare_popoto, which checks the
 * person asking is the one it was sent to. Listing what somebody has received
 * reads the popoto rows and leaves the line out, so a shelf of gifts can be
 * drawn without the page holding the words before they are unwrapped.
 */
/** How rare. See v77: Rare 70, Super rare 25, Ultra rare 5, of the one in a hundred. */
export type RareTier = "rare" | "super" | "ultra";

/** What the popoto turned out to be. A flavour, or none yet — the plain golden one. */
export interface Flavor {
  tier: RareTier;
  name: string | null;
  nameEn: string | null;
  color: string | null;
  image: string | null;
}

export interface RareGift extends Flavor {
  id: number;
  body: string;
  authorName: string;
  authorCharacterId: number | null;
  senderId: string | null;
  at: string;
  openedAt: string | null;
}

/** One on the shelf, before anybody has asked what is inside it. */
export interface RareSlot extends Flavor {
  id: number;
  at: string;
  senderId: string;
  openedAt: string | null;
  /** Its place on the public shelf, 1 to 10, or null when not on show. See v81. */
  showcase: number | null;
}

/** Where a parcel gets opened: the inventory on the edit-profile page. */
export const RARE_INVENTORY_ID = "rare-inventory";
export const RARE_INVENTORY = `/profile#${RARE_INVENTORY_ID}`;

/** How many gifts can be on show at once. The database holds the same number. */
export const SHOWCASE_MAX = 10;

/**
 * Sample gifts for the local-only test commands, when the real flavours cannot
 * be read (see realRareDemo). Never written anywhere.
 */
export const RARE_DEMO: RareGift[] = (() => {
  const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  const g = (id: number, tier: RareTier, name: string, nameEn: string, color: string,
             ago: number, opened: boolean, body: string): RareGift => ({
    id, tier, name, nameEn, color, image: null, body, authorName: "ตัวอย่าง (ข้อความทดสอบ)",
    authorCharacterId: null, senderId: null, at: day(ago), openedAt: opened ? day(ago) : null,
  });
  return [
    g(-1, "ultra", "Popoto รสโคล่า", "Cola Popoto", "#7b3f1d", 1, false, "ขอให้ลูตตกทุกไฟต์ตลอดทั้งเดือนนี้"),
    g(-2, "rare", "Popoto รสส้ม", "Orange Popoto", "#f08a24", 2, false, "วันนี้สดใสเหมือนส้มเลยนะ"),
    g(-3, "super", "Popoto รสองุ่น", "Grape Popoto", "#8e44ad", 4, true, "ขอให้ prog ผ่านเฟสที่ติดอยู่ในเร็ววัน"),
    g(-4, "rare", "Popoto รสสตรอว์เบอร์รี", "Strawberry Popoto", "#e74c6f", 6, true, "หวานๆ ให้กำลังใจทั้งวัน"),
    g(-5, "rare", "Popoto รสส้ม", "Orange Popoto", "#f08a24", 9, true, "วันนี้สดใสเหมือนส้มเลยนะ"),
    g(-6, "ultra", "Popoto รสโคล่า", "Cola Popoto", "#7b3f1d", 12, true, "ขอให้ลูตตกทุกไฟต์ตลอดทั้งเดือนนี้"),
  ];
})();

const asTier = (t: string | null | undefined): RareTier =>
  t === "ultra" || t === "super" ? t : "rare";

/** Unwrap it, or read it again. */
export async function openRare(
  supabase: SupabaseClient, id: number,
): Promise<RareGift | { error: string }> {
  const { data, error } = await supabase.rpc("open_rare_popoto", { p_kudos: id });
  if (error) return { error: error.message };
  const r = (Array.isArray(data) ? data[0] : data) as {
    id: number; body: string; author_name: string; author_character_id: number | null;
    sender_id: string | null; created_at: string; opened_at: string | null;
    tier: string | null; flavor_name: string | null; flavor_name_en: string | null;
    flavor_color: string | null; flavor_image: string | null;
  } | undefined;
  if (!r) return { error: "gone" };
  return {
    id: r.id, body: r.body, authorName: r.author_name,
    authorCharacterId: r.author_character_id, senderId: r.sender_id,
    at: r.created_at, openedAt: r.opened_at,
    tier: asTier(r.tier), name: r.flavor_name, nameEn: r.flavor_name_en,
    color: r.flavor_color, image: r.flavor_image,
  };
}

/**
 * Every rare this character has been sent, newest first.
 *
 * An error — the columns not being there yet, before v77 — is an empty shelf,
 * which is the truth about a site that cannot have given one.
 */
export async function raresFor(
  supabase: SupabaseClient, characterId: number,
): Promise<RareSlot[]> {
  const { data, error } = await supabase.from("kudos")
    .select("id, created_at, sender_id, rare_opened_at, rare_tier, rare_flavor_name,"
      + " rare_flavor_name_en, rare_flavor_color, rare_flavor_image, rare_showcase")
    .eq("receiver_character_id", characterId)
    .not("rare_body", "is", null)
    .order("created_at", { ascending: false })
    // Far more than anybody will hold (the most-given character has had a few
    // hundred popotos, so a handful of rares), and under PostgREST's 1000 cap.
    .limit(500);
  if (error) return [];
  return ((data ?? []) as unknown as {
    id: number; created_at: string; sender_id: string; rare_opened_at: string | null;
    rare_tier: string | null; rare_flavor_name: string | null;
    rare_flavor_name_en: string | null; rare_flavor_color: string | null;
    rare_flavor_image: string | null; rare_showcase: number | null;
  }[]).map((r) => ({
    id: r.id, at: r.created_at, senderId: r.sender_id, openedAt: r.rare_opened_at,
    tier: asTier(r.rare_tier), name: r.rare_flavor_name, nameEn: r.rare_flavor_name_en,
    color: r.rare_flavor_color, image: r.rare_flavor_image,
    showcase: r.rare_showcase ?? null,
  }));
}

/** Put exactly these on show, in this order. See set_rare_showcase (v81). */
export async function setShowcase(
  supabase: SupabaseClient, ids: number[],
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("set_rare_showcase", { p_ids: ids });
  return error ? { error: error.message } : {};
}

/**
 * What somebody has put on show, for anybody reading their profile.
 *
 * Whole gifts, line included: the owner opened each of these and chose to show
 * it, so the line is theirs to share. Nothing here is opened on their behalf.
 */
export async function showcaseFor(
  supabase: SupabaseClient, characterId: number,
): Promise<RareGift[]> {
  const { data, error } = await supabase.from("kudos")
    .select("id, created_at, sender_id, rare_opened_at, rare_tier, rare_flavor_name,"
      + " rare_flavor_name_en, rare_flavor_color, rare_flavor_image, rare_body,"
      + " rare_author_name, rare_author_character_id")
    .eq("receiver_character_id", characterId)
    .not("rare_showcase", "is", null)
    .not("rare_opened_at", "is", null)
    .order("rare_showcase", { ascending: true })
    .limit(SHOWCASE_MAX);
  if (error) return [];
  return ((data ?? []) as unknown as {
    id: number; created_at: string; sender_id: string; rare_opened_at: string;
    rare_tier: string | null; rare_flavor_name: string | null; rare_flavor_name_en: string | null;
    rare_flavor_color: string | null; rare_flavor_image: string | null; rare_body: string;
    rare_author_name: string; rare_author_character_id: number | null;
  }[]).map((r) => ({
    id: r.id, at: r.created_at, senderId: r.sender_id, openedAt: r.rare_opened_at,
    tier: asTier(r.rare_tier), name: r.rare_flavor_name, nameEn: r.rare_flavor_name_en,
    color: r.rare_flavor_color, image: r.rare_flavor_image, body: r.rare_body,
    authorName: r.rare_author_name, authorCharacterId: r.rare_author_character_id,
  }));
}

/**
 * The lines inside gifts that have been opened, for the owner's inventory.
 *
 * Asked for by id and only for opened ones, so a parcel's words are never on
 * the page before its owner has unwrapped it.
 */
export async function openedLines(
  supabase: SupabaseClient, ids: number[],
): Promise<Record<number, { body: string; authorName: string; authorCharacterId: number | null }>> {
  if (!ids.length) return {};
  const { data, error } = await supabase.from("kudos")
    .select("id, rare_body, rare_author_name, rare_author_character_id")
    .in("id", ids)
    .not("rare_opened_at", "is", null);
  if (error) return {};
  const out: Record<number, { body: string; authorName: string; authorCharacterId: number | null }> = {};
  for (const r of (data ?? []) as {
    id: number; rare_body: string; rare_author_name: string; rare_author_character_id: number | null;
  }[]) {
    out[r.id] = { body: r.rare_body, authorName: r.rare_author_name, authorCharacterId: r.rare_author_character_id };
  }
  return out;
}

/**
 * Sample gifts made from the real flavours — their names, pictures and lines as
 * the keeper has written them — for the local-only test commands. Reading the
 * flavours is keeper-only (v77), so for anybody else, or before any flavour
 * exists, this is null and the commands fall back to RARE_DEMO.
 *
 * One gift per flavour, newest first; the first two still wrapped so opening
 * can be tried, the rest opened so the shelf and the cards can be seen.
 */
export async function realRareDemo(supabase: SupabaseClient): Promise<RareGift[] | null> {
  const [{ data: fl, error: fe }, { data: bl, error: be }] = await Promise.all([
    supabase.from("popoto_flavors")
      .select("id, name, name_en, tier, color, image_url")
      .eq("active", true).order("created_at", { ascending: true }),
    supabase.from("popoto_blessings")
      .select("flavor_id, body, author_name, author_character_id")
      .eq("active", true).order("created_at", { ascending: true }),
  ]);
  if (fe || be || !fl?.length) return null;
  const line: Record<number, { body: string; author_name: string; author_character_id: number | null }> = {};
  for (const b of (bl ?? []) as { flavor_id: number; body: string; author_name: string;
    author_character_id: number | null }[]) line[b.flavor_id] ??= b;
  const ready = (fl as { id: number; name: string; name_en: string | null; tier: string;
    color: string; image_url: string | null }[]).filter((f) => line[f.id]);
  if (!ready.length) return null;
  const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  // Ultra first, so the wrapped pair and the start of the shelf show the best of it.
  const order = { ultra: 0, super: 1, rare: 2 } as Record<string, number>;
  return [...ready].sort((a, b) => (order[a.tier] ?? 3) - (order[b.tier] ?? 3))
    .map((f, i) => ({
      id: -(i + 1), tier: asTier(f.tier), name: f.name, nameEn: f.name_en,
      color: f.color, image: f.image_url,
      body: line[f.id].body, authorName: line[f.id].author_name,
      authorCharacterId: line[f.id].author_character_id,
      senderId: null, at: day(i * 2 + 1), openedAt: i < 2 ? null : day(i * 2 + 1),
    }));
}

/** A popoto sender's name, for "from Farcia". */
export async function senderName(
  supabase: SupabaseClient, profileId: string | null,
): Promise<string | null> {
  if (!profileId) return null;
  const { data } = await supabase.from("profiles")
    .select("character_name, display_name, discord_username")
    .eq("id", profileId).maybeSingle();
  const p = data as { character_name?: string | null; display_name?: string | null;
                      discord_username?: string | null } | null;
  return p?.character_name ?? p?.display_name ?? p?.discord_username ?? null;
}

/**
 * How each tier looks. The ring, the glow and the word; a flavour's own colour
 * sits on top of its tier's where it has one.
 */
export const TIER_LOOK: Record<RareTier, {
  label: string; short: string; color: string; crumbs: number;
}> = {
  rare:  { label: "RARE",       short: "R",  color: "#6aa9e0", crumbs: 18 },
  super: { label: "SUPER RARE", short: "SR", color: "#b07ce8", crumbs: 32 },
  ultra: { label: "ULTRA RARE", short: "UR", color: "#f3c969", crumbs: 56 },
};

/**
 * How loud the opening is, by tier — and it is meant to be loud: the rarer it
 * is, the more the screen does about it.
 *
 *  flash   how white the screen goes at the moment the paper splits (0–1)
 *  rings   shockwaves thrown out from the parcel
 *  rays    spokes of light turning behind the potato, and how far they reach
 *  stars   sparkles that keep twinkling around it
 *  aura    how much of the whole screen is washed in its colour afterwards
 *  shake   whether the screen jolts, and how hard
 *  charge  ms of the parcel straining with light leaking out before it bursts
 *  open    ms from the burst until the line comes up
 */
export const TIER_FX: Record<RareTier, {
  flash: number; rings: number; rays: number; raySize: number; stars: number;
  aura: number; shake: "" | "sm" | "lg"; charge: number; open: number; reach: number;
}> = {
  rare:  { flash: .45, rings: 1, rays: 12, raySize: 380, stars: 6,  aura: .10, shake: "",   charge: 0,   open: 950,  reach: 1 },
  super: { flash: .75, rings: 2, rays: 18, raySize: 520, stars: 14, aura: .22, shake: "sm", charge: 420, open: 1150, reach: 1.35 },
  ultra: { flash: 1,   rings: 4, rays: 28, raySize: 760, stars: 26, aura: .38, shake: "lg", charge: 900, open: 1500, reach: 1.9 },
};

/**
 * A CSS filter that tints the potato emoji towards a colour, for a flavour
 * nobody has uploaded a picture of yet.
 *
 * sepia turns the emoji a single brown hue, and from there hue-rotate swings
 * it round to the flavour's own. Near-greys come out as a warm tint rather
 * than a colour, which is what they are.
 */
export function tintFor(hex: string | null | undefined): string | undefined {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 0.08) return "sepia(0.4)";
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  // Sepia sits at about 38 degrees; rotate from there.
  return `sepia(1) saturate(3.2) hue-rotate(${h - 38}deg) brightness(1.02)`;
}

import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface MyFace {
  userId: string;
  characterId: number | null;
  name: string;
  avatar: string | null;
}
const nameOf = (...values: unknown[]) => values.find((v): v is string => typeof v === "string" && v.trim().length > 0)?.trim() ?? null;

/** Failed profile reads must not become a successfully loaded anonymous face. */
export async function loadMyFace(client: SupabaseClient, user: User, fetchFace = fetch): Promise<MyFace> {
  const { data: p, error } = await client.from("profiles")
    .select("character_id, character_name, display_name, discord_username, discord_avatar, avatar_url")
    .eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (!p) throw new Error("Profile unavailable");
  const characterId = p.character_id ?? null;
  let name = nameOf(p.character_name, p.display_name, p.discord_username);
  let avatar = p.avatar_url ?? null;
  if (characterId && (!avatar || !name)) {
    try {
      const res = await fetchFace(`/api/face/${characterId}`);
      if (res.ok) {
        const face = await res.json();
        name = name ?? nameOf(face.name);
        avatar = avatar ?? face.avatar ?? null;
      }
    } catch { /* a known name still works with the account's portrait */ }
  }
  name = name ?? nameOf(user.user_metadata.full_name, user.user_metadata.name, user.user_metadata.username, user.email?.split("@")[0]);
  if (!name) throw new Error("Character name unavailable");
  return { userId: user.id, characterId, name, avatar: avatar ?? p.discord_avatar ?? null };
}

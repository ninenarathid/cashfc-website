import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { loadMyFace } from "./my-face";
const user = { id: "A", user_metadata: {}, email: "account@example.invalid" } as User;
function client(data: unknown, error: unknown = null) {
  return { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error }) }) }) }) } as unknown as SupabaseClient;
}
describe("loading the member's real identity", () => {
  it("restores Aqua's character name and chosen portrait ahead of the Discord account name", async () => {
    const face = await loadMyFace(client({ character_id: 15308846, character_name: "Aqua Eleison", display_name: "Ayumi Nakamura", discord_username: "Ayumi Nakamura", avatar_url: "/aqua.png" }),
      { ...user, user_metadata: { full_name: "Ayumi Nakamura" } } as User);
    expect(face.name).toBe("Aqua Eleison"); expect(face.avatar).toBe("/aqua.png");
  });
  it("never turns failed or missing profile reads into a loaded fallback identity", async () => {
    await expect(loadMyFace(client(null, new Error("permission denied")), user)).rejects.toThrow("permission denied");
    await expect(loadMyFace(client(null), user)).rejects.toThrow("Profile unavailable");
  });
  it("keeps the character name and uploaded portrait", async () => {
    const fetchFace = vi.fn();
    expect(await loadMyFace(client({ character_id: 42, character_name: "Ninenine", display_name: "Account", avatar_url: "/portrait.png" }), user, fetchFace))
      .toEqual({ userId: "A", characterId: 42, name: "Ninenine", avatar: "/portrait.png" });
    expect(fetchFace).not.toHaveBeenCalled();
  });
  it("finds a missing character name in the roster even when an uploaded portrait exists", async () => {
    const fetchFace = vi.fn(async () => Response.json({ name: "Real Character", avatar: "/roster.png" }));
    const face = await loadMyFace(client({ character_id: 42, character_name: "", avatar_url: "/chosen.png" }), user, fetchFace);
    expect(face.name).toBe("Real Character"); expect(face.avatar).toBe("/chosen.png");
  });
  it("keeps a known name when the portrait endpoint is offline", async () => {
    const face = await loadMyFace(client({ character_id: 42, character_name: "Real Character", discord_avatar: "/discord.png" }), user,
      vi.fn(async () => { throw new Error("offline"); }));
    expect(face.name).toBe("Real Character"); expect(face.avatar).toBe("/discord.png");
  });
  it("uses an admin's actual account name when they have no linked character", async () => {
    expect((await loadMyFace(client({}), { ...user, user_metadata: { full_name: "Admin Name" } } as User)).name).toBe("Admin Name");
  });
});

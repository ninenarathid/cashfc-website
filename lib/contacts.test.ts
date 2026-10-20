import { describe, expect, it, vi } from "vitest";
import { facebookHref, refusalLine, saveContact, tidy } from "./contacts";

describe("tidy", () => {
  it("trims, and keeps nothing rather than a blank", () => {
    expect(tidy("  potato#1 ")).toBe("potato#1");
    expect(tidy("   ")).toBeNull();
    expect(tidy("")).toBeNull();
    expect(tidy(null)).toBeNull();
    expect(tidy(undefined)).toBeNull();
  });
});

describe("facebookHref", () => {
  it("makes a link of Facebook's own addresses", () => {
    expect(facebookHref("https://www.facebook.com/somebody")).toBe("https://www.facebook.com/somebody");
    expect(facebookHref("https://m.facebook.com/profile.php?id=100001"))
      .toBe("https://m.facebook.com/profile.php?id=100001");
    expect(facebookHref("https://fb.com/somebody")).toBe("https://fb.com/somebody");
    expect(facebookHref("https://m.me/somebody")).toBe("https://m.me/somebody");
  });

  it("takes the address the way people write it down", () => {
    expect(facebookHref("facebook.com/somebody")).toBe("https://facebook.com/somebody");
    expect(facebookHref("  www.facebook.com/somebody  ")).toBe("https://www.facebook.com/somebody");
    expect(facebookHref("FB.com/Somebody")).toBe("https://fb.com/Somebody");
  });

  it("moves http up to https", () => {
    expect(facebookHref("http://facebook.com/somebody")).toBe("https://facebook.com/somebody");
  });

  it("leaves a name as a name", () => {
    expect(facebookHref("Somchai Jaidee")).toBeNull();
    expect(facebookHref("สมชาย ใจดี")).toBeNull();
    expect(facebookHref("somchai.jaidee")).toBeNull();
    expect(facebookHref("")).toBeNull();
    expect(facebookHref(null)).toBeNull();
  });

  it("is not talked into another site", () => {
    expect(facebookHref("https://facebook.com.evil.example/somebody")).toBeNull();
    expect(facebookHref("https://evilfacebook.com/somebody")).toBeNull();
    expect(facebookHref("https://example.com/facebook.com/somebody")).toBeNull();
    expect(facebookHref("https://facebook.com@evil.example/somebody")).toBeNull();
    expect(facebookHref("https://user:pass@facebook.com/somebody")).toBeNull();
    expect(facebookHref("https://facebook.com:8443/somebody")).toBeNull();
  });

  it("is not talked into a scheme that runs something", () => {
    expect(facebookHref("javascript:alert(1)")).toBeNull();
    expect(facebookHref("javascript://facebook.com/%0aalert(1)")).toBeNull();
    expect(facebookHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(facebookHref("intent://facebook.com/somebody")).toBeNull();
  });
});

describe("saveContact", () => {
  const client = (session: object | null, lost: Error | null, rpcError: { code: string; message: string } | null) => {
    const rpc = vi.fn(async () => ({ data: null, error: rpcError }));
    const supabase = {
      auth: { getSession: async () => ({ data: { session }, error: lost }) },
      rpc,
    } as unknown as Parameters<typeof saveContact>[0];
    return { supabase, rpc };
  };
  const c = { discord: " helenago ", facebook: "" };

  it("keeps it, trimmed, when signed in", async () => {
    const { supabase, rpc } = client({ access_token: "x" }, null, null);
    expect(await saveContact(supabase, 7, c)).toBeNull();
    expect(rpc).toHaveBeenCalledWith("member_contact_set", { p_character: 7, p_discord: "helenago", p_facebook: null });
  });

  it("sends nothing as anon when the browser has no sign-in", async () => {
    const { supabase, rpc } = client(null, null, null);
    expect(await saveContact(supabase, 7, c)).toBe("contact.signedOut");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("says so when the sign-in could not be renewed just now", async () => {
    const { supabase, rpc } = client(null, new Error("Failed to fetch"), null);
    expect(await saveContact(supabase, 7, c)).toBe("contact.signInStalled");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reads a refusal of the call itself as a lost sign-in", async () => {
    const { supabase } = client({ access_token: "x" }, null,
      { code: "42501", message: "permission denied for function member_contact_set" });
    expect(await saveContact(supabase, 7, c)).toBe("contact.signedOut");
  });

  it("passes the database's own words on", async () => {
    const { supabase } = client({ access_token: "x" }, null, { code: "P0001", message: "admins and staff only" });
    expect(await saveContact(supabase, 7, c)).toBe("admins and staff only");
  });
});

describe("refusalLine", () => {
  const t = (key: string, vars?: Record<string, string | number>) => `${key}${vars ? `:${vars.why}` : ""}`;
  it("says a lost sign-in in its own words, and the rest as a failed save", () => {
    expect(refusalLine("contact.signedOut", t)).toBe("contact.signedOut");
    expect(refusalLine("contact.signInStalled", t)).toBe("contact.signInStalled");
    expect(refusalLine("admins and staff only", t)).toBe("adm.saveFailed:admins and staff only");
  });
});

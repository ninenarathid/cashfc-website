import { describe, expect, it } from "vitest";
import { facebookHref, tidy } from "./contacts";

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

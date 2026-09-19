import { describe, expect, it, beforeAll } from "vitest";
import { verifyDiscord } from "@/lib/discord/verify";

/**
 * The gate on /api/discord/interactions.
 *
 * That route is a public URL, so this function is the only thing standing
 * between a stranger's POST and the site acting on it. Every case below is a
 * shape a forged request can actually arrive in.
 *
 * Signed with a real Ed25519 key rather than a stubbed verifier: the point is
 * that the platform's crypto says no to these, and a mock that returns false on
 * cue would prove nothing about that.
 */

const hex = (b: ArrayBuffer) =>
  [...new Uint8Array(b)].map((n) => n.toString(16).padStart(2, "0")).join("");

let publicKey: string;
let otherKey: string;
let sign: (msg: string) => Promise<string>;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: "Ed25519" }, true, ["sign", "verify"]) as CryptoKeyPair;
  const other = await crypto.subtle.generateKey(
    { name: "Ed25519" }, true, ["sign", "verify"]) as CryptoKeyPair;

  publicKey = hex(await crypto.subtle.exportKey("raw", pair.publicKey));
  otherKey = hex(await crypto.subtle.exportKey("raw", other.publicKey));

  sign = async (msg) => hex(await crypto.subtle.sign(
    { name: "Ed25519" }, pair.privateKey, new TextEncoder().encode(msg)));
});

const body = '{"type":1,"id":"42"}';
const ts = "1700000000";

describe("a request Discord really sent", () => {
  it("verifies", async () => {
    const sig = await sign(ts + body);
    await expect(verifyDiscord(body, sig, ts, publicKey)).resolves.toBe(true);
  });

  it("verifies with an uppercase signature, which the header may carry", async () => {
    const sig = (await sign(ts + body)).toUpperCase();
    await expect(verifyDiscord(body, sig, ts, publicKey)).resolves.toBe(true);
  });
});

describe("a request somebody edited in flight", () => {
  it("refuses a changed body", async () => {
    const sig = await sign(ts + body);
    const forged = '{"type":1,"id":"43"}';
    await expect(verifyDiscord(forged, sig, ts, publicKey)).resolves.toBe(false);
  });

  /*
   * The timestamp is inside the signed bytes, which is what stops a captured
   * request being replayed later under a fresh timestamp.
   */
  it("refuses a changed timestamp", async () => {
    const sig = await sign(ts + body);
    await expect(verifyDiscord(body, sig, "1700009999", publicKey))
      .resolves.toBe(false);
  });

  /*
   * The claim in verify.ts's own header: parsing the JSON and stringifying it
   * again breaks the signature. This is that claim as a test — same object, one
   * byte of whitespace different, and the request is no longer signed.
   */
  it("refuses a body that was re-stringified rather than passed through", async () => {
    const sig = await sign(ts + body);
    const reencoded = JSON.stringify(JSON.parse(body), null, 1);
    expect(reencoded).not.toBe(body);
    await expect(verifyDiscord(reencoded, sig, ts, publicKey))
      .resolves.toBe(false);
  });
});

describe("a request signed by somebody else", () => {
  it("refuses a signature that does not belong to the key", async () => {
    const sig = await sign(ts + body);
    await expect(verifyDiscord(body, sig, ts, otherKey)).resolves.toBe(false);
  });
});

/*
 * All of these must come back false rather than throw: the route answers every
 * rejection the same way, and an exception here would be a 500 where a 401
 * belongs.
 */
describe("a malformed request is turned away, not thrown on", () => {
  const cases: [string, Parameters<typeof verifyDiscord>][] = [
    ["no signature header", [body, null, ts, "00".repeat(32)]],
    ["no timestamp header", [body, "ab".repeat(64), null, "00".repeat(32)]],
    ["no configured public key", [body, "ab".repeat(64), ts, ""]],
    ["signature that is not hex", [body, "z".repeat(128), ts, "00".repeat(32)]],
    ["signature too short", [body, "ab".repeat(63), ts, "00".repeat(32)]],
    ["signature too long", [body, "ab".repeat(65), ts, "00".repeat(32)]],
    ["public key that is not hex", [body, "ab".repeat(64), ts, "z".repeat(64)]],
    ["public key of the wrong length", [body, "ab".repeat(64), ts, "00".repeat(31)]],
  ];

  it.each(cases)("refuses: %s", async (_name, args) => {
    await expect(verifyDiscord(...args)).resolves.toBe(false);
  });

  /*
   * Well-formed hex of the right length, but not a point on the curve. This
   * reaches importKey and fails inside it, which is the catch rather than a
   * guard — the one case that proves the try/wrapper earns its place.
   */
  it("refuses a key that is the right shape but not a real key", async () => {
    await expect(verifyDiscord(body, "ab".repeat(64), ts, "ff".repeat(32)))
      .resolves.toBe(false);
  });
});

/**
 * Proving a request really came from Discord.
 *
 * Every interaction arrives at a public URL, which means anybody can send one:
 * without this check a stranger could post "user 123 pressed Join" and be
 * seated. Discord signs each request with the application's key, and the
 * signature covers the timestamp and the exact bytes of the body — so a
 * replayed or edited request fails.
 *
 * The raw body has to be the bytes as sent. Parsing the JSON and stringifying
 * it again is the classic way to break this: JSON.stringify is not obliged to
 * reproduce key order or number formatting, and one changed byte is a failed
 * signature. So the route reads text() first and parses afterwards.
 *
 * Web Crypto rather than a library, because Ed25519 is in the platform now and
 * this is the one place the site verifies somebody else's signature — a
 * dependency for thirty lines that the runtime already does is a dependency
 * to keep patched for no reason.
 */

/*
 * Backed by a plain ArrayBuffer on purpose.
 *
 * Web Crypto takes a BufferSource, and a Uint8Array over an unknown buffer no
 * longer satisfies that type — a SharedArrayBuffer cannot be handed to it, so
 * the array has to say which kind it is over.
 */
const hex = (s: string): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(new ArrayBuffer(s.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

/** The same, for text: the signature covers the timestamp and the body bytes. */
const utf8 = (s: string): Uint8Array<ArrayBuffer> => {
  const raw = new TextEncoder().encode(s);
  const out = new Uint8Array(new ArrayBuffer(raw.byteLength));
  out.set(raw);
  return out;
};

/**
 * Whether this body really was signed by the application named in the key.
 *
 * False for anything malformed rather than throwing: a request with a
 * half-written signature header is a request to turn away, not an exception to
 * report, and the caller answers all of them the same way.
 */
export async function verifyDiscord(
  body: string, signature: string | null, timestamp: string | null,
  publicKey: string,
): Promise<boolean> {
  if (!signature || !timestamp || !publicKey) return false;
  if (!/^[0-9a-f]+$/i.test(signature) || signature.length !== 128) return false;
  if (!/^[0-9a-f]+$/i.test(publicKey) || publicKey.length !== 64) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw", hex(publicKey), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify(
      { name: "Ed25519" }, key, hex(signature),
      utf8(timestamp + body));
  } catch {
    return false;
  }
}

import { createHmac } from "crypto";

/**
 * The one-time code somebody pastes into their Lodestone character profile to
 * prove the character is theirs. This is how FF Logs, FFXIV Collect and
 * Lalachievements all do it, so it is a step members may already recognise.
 *
 * Derived rather than stored: an HMAC over the account id and the character id
 * means no table to write, no expiry to sweep, and no way for two requests to
 * disagree about which code is current. Recomputing it costs nothing.
 *
 * Publishing the code on a public Lodestone page is safe. It is bound to one
 * account id, so somebody who reads it there cannot use it to claim the character
 * for themselves — their own account would need a different code, which only the
 * server can produce.
 */
export function claimToken(profileId: string, characterId: number): string {
  const secret = process.env.VERIFY_SECRET;
  if (!secret) throw new Error("VERIFY_SECRET is not set");
  const mac = createHmac("sha256", secret)
    .update(`${profileId}:${characterId}`)
    .digest("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10)
    .toLowerCase();
  return `cashfc-${mac}`;
}

/** Where the code has to appear. Same host the pipeline already scrapes. */
export const lodestoneProfileUrl = (characterId: number) =>
  `https://na.finalfantasyxiv.com/lodestone/character/${characterId}/`;

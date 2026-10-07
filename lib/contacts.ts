import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * How to reach a member outside the game: a Discord name and a Facebook, typed
 * in by an admin from what the member told them (v157).
 *
 * Not the Discord somebody signed in with, which only a member with an account
 * has. These are kept by character, for anybody on the roster, and neither is
 * ever filled in by the site.
 *
 * Who reads which is the database's to decide and it does: the Discord goes to
 * signed-in members of the FC and to admins, the Facebook to admins alone, and
 * the function below is simply not sent what the asker may not see. Nothing
 * here should be mistaken for the rule.
 */
export interface Contact {
  discord: string | null;
  facebook: string | null;
}

export interface ContactRow extends Contact {
  character_id: number;
}

/** The lengths the database holds them to, so a field can stop at the same place. */
export const DISCORD_MAX = 64;
export const FACEBOOK_MAX = 200;

/** As the database will keep it: trimmed, and nothing at all rather than a blank. */
export const tidy = (v: string | null | undefined): string | null => {
  const s = (v ?? "").trim();
  return s ? s : null;
};

/** Facebook's own addresses, and nobody else's. */
const FACEBOOK_HOSTS = new Set(["facebook.com", "fb.com", "fb.me", "m.me"]);

/**
 * A Facebook that can be opened, as an address safe to put in a link.
 *
 * The field takes whatever Aqua was given, which is as often a name as an
 * address. Only something that is plainly Facebook's becomes a link, and only
 * over https: a value an admin pasted is still a value from a text box, and
 * `javascript:` in an href is the oldest trick there is. Anything else comes
 * back null and is shown as the words it is.
 */
export function facebookHref(value: string | null | undefined): string | null {
  const raw = tidy(value);
  if (!raw || /\s/.test(raw)) return null;
  // "facebook.com/somebody" is how people write it down.
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase();
  const known = [...FACEBOOK_HOSTS].some((h) => host === h || host.endsWith(`.${h}`));
  if (!known) return null;
  u.protocol = "https:";
  return u.href;
}

type Client = SupabaseClient;

/**
 * What the reader may know about reaching this character, or null.
 *
 * Null covers everything that is not an answer: signed out, not in the FC,
 * nothing on file, and a database that has not had v157 yet. They all draw the
 * same way, which is not at all.
 */
export async function readContact(supabase: Client, characterId: number): Promise<Contact | null> {
  const { data, error } = await supabase.rpc("member_contact", { p_character: characterId });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as Partial<Contact> | null | undefined;
  if (!row) return null;
  const c = { discord: row.discord ?? null, facebook: row.facebook ?? null };
  return c.discord || c.facebook ? c : null;
}

/**
 * Keep what an admin typed. Both fields every time; both blank takes the row
 * away. Answers with the reason when it was refused, and null when it was not.
 */
export async function saveContact(
  supabase: Client, characterId: number, c: Contact,
): Promise<string | null> {
  const { error } = await supabase.rpc("member_contact_set", {
    p_character: characterId,
    p_discord: tidy(c.discord),
    p_facebook: tidy(c.facebook),
  });
  return error ? error.message : null;
}

/** Every one on file, for the admin page. `missing` when the table is not there to ask. */
export async function allContacts(supabase: Client): Promise<{ rows: ContactRow[]; missing: boolean }> {
  const { data, error } = await supabase.from("member_contacts")
    .select("character_id, discord, facebook");
  if (error) return { rows: [], missing: true };
  return { rows: (data ?? []) as ContactRow[], missing: false };
}

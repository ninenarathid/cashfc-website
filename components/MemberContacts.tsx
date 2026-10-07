"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { DiscordGlyph, FacebookGlyph, LockGlyph } from "@/components/ui/ContactIcons";
import { useAdmin } from "@/lib/admin";
import {
  DISCORD_MAX, FACEBOOK_MAX, facebookHref, readContact, saveContact, tidy, type Contact,
} from "@/lib/contacts";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

const fieldCls =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-read text-ink placeholder:text-muted";

/**
 * How to reach this member outside the game, on their own page.
 *
 * Two things an admin typed in from what the member told them (v157): a
 * Discord name, which the FC sees, and a Facebook, which only admins do. For
 * nearly everybody who opens the page there is nothing to show, and then this
 * draws nothing at all, not an empty row saying so: a stranger should not
 * learn from the page that there is something here they are not being shown.
 *
 * Who sees which is settled in the database. A member of the FC is never sent
 * the Facebook, so there is none here to hide from them; the `isAdmin` below
 * only follows the admin's own switch, which is a way of looking and not a
 * lock.
 *
 * The Discord is a button that copies, because a name is all Discord can be
 * found by: there is no address to open for somebody you only know by name.
 */
export default function MemberContacts(
  { characterId, name, viewer }: {
    characterId: number;
    name: string;
    /** Who is signed in. Nobody is asked anything on a signed-out visit. */
    viewer: string | null;
  },
) {
  const { t } = useLang();
  const { isAdmin } = useAdmin();
  const [supabase] = useState(createClient);
  /** Kept with the character it is about, so the next page cannot inherit it. */
  const [held, setHeld] = useState<{ of: number; c: Contact | null } | null>(null);
  const [copied, setCopied] = useState<"discord" | "facebook" | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!supabase || !viewer) return;
    let live = true;
    void readContact(supabase, characterId).then((c) => {
      if (live) setHeld({ of: characterId, c });
    });
    return () => { live = false; };
  }, [supabase, characterId, viewer]);

  const c = viewer && held?.of === characterId ? held.c : null;
  const discord = c?.discord ?? null;
  // Not drawn with the switch off, which is the point of the switch: seeing
  // the page as the FC does.
  const facebook = isAdmin ? c?.facebook ?? null : null;
  const fbHref = facebookHref(facebook);

  if (!discord && !isAdmin) return null;

  const copy = async (what: "discord" | "facebook", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // The same way out the tell button has: the words, selected, and Ctrl+C.
      window.prompt(t("contact.copy"), text);
      return;
    }
    setCopied(what);
    setTimeout(() => setCopied(null), 1400);
  };

  const chip =
    "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border bg-bg/40 px-3 py-1 text-ui text-ink/85 no-underline transition-colors hover:text-ink";
  /** Told apart from what the FC sees, at a glance and not by a tooltip. */
  const adminTag = (
    <span className="inline-flex shrink-0 items-center gap-1 font-data text-label text-gold">
      <LockGlyph /> {t("contact.adminTag")}
    </span>
  );

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      {discord && (
        <button type="button" onClick={() => copy("discord", discord)}
                title={t("contact.fcOnly")}
                aria-label={t("contact.copyDiscord", { name: discord })}
                className={`${chip} border-[#5865F2]/70 hover:bg-[#5865F2]/20`}>
          {copied === "discord"
            ? <span aria-hidden className="w-[15px] shrink-0 text-center leading-none text-jade">✓</span>
            : <DiscordGlyph className="text-[#a5b2ff]" />}
          <span className="truncate">{discord}</span>
        </button>
      )}

      {facebook && (fbHref ? (
        <a href={fbHref} target="_blank" rel="noopener noreferrer"
           aria-label={t("contact.openFacebook", { name })}
           className={`${chip} border-gold/50 hover:bg-gold/10`}>
          <FacebookGlyph />
          <span className="truncate">{facebook.replace(/^https?:\/\/(www\.)?/i, "")}</span>
          {adminTag}
        </a>
      ) : (
        <button type="button" onClick={() => copy("facebook", facebook)}
                aria-label={t("contact.copyFacebook", { name: facebook })}
                className={`${chip} border-gold/50 hover:bg-gold/10`}>
          {copied === "facebook"
            ? <span aria-hidden className="w-[15px] shrink-0 text-center leading-none text-jade">✓</span>
            : <FacebookGlyph />}
          <span className="truncate">{facebook}</span>
          {adminTag}
        </button>
      ))}

      {isAdmin && (
        <button type="button" onClick={() => setEditing(true)}
                className="shrink-0 rounded-md border border-dashed border-line bg-bg/40 px-3 py-1 text-ui text-ink/70 transition-colors hover:border-muted hover:text-ink">
          {c ? t("contact.edit") : t("contact.add")}
        </button>
      )}

      {editing && supabase && (
        <ContactDialog name={name} was={c}
                       onClose={() => setEditing(false)}
                       save={(next) => saveContact(supabase, characterId, next)}
                       onSaved={(next) => {
                         setHeld({ of: characterId, c: next.discord || next.facebook ? next : null });
                         setEditing(false);
                         toast({
                           text: next.discord || next.facebook ? t("adm.saved") : t("contact.removed"),
                           tone: "good",
                         });
                       }} />
      )}
    </div>
  );
}

/**
 * The two fields, and under each one who will see it.
 *
 * Said on the form and not left to be remembered: the admin typing a Facebook
 * in is trusting that it stays with the admins, and the moment to tell them
 * so is while it is under their fingers.
 */
function ContactDialog(
  { name, was, onClose, save, onSaved }: {
    name: string;
    was: Contact | null;
    onClose: () => void;
    save: (c: Contact) => Promise<string | null>;
    onSaved: (c: Contact) => void;
  },
) {
  const { t } = useLang();
  const [discord, setDiscord] = useState(was?.discord ?? "");
  const [facebook, setFacebook] = useState(was?.facebook ?? "");
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next = { discord: tidy(discord), facebook: tidy(facebook) };
    setBusy(true);
    setWhy("");
    const error = await save(next);
    setBusy(false);
    if (error) { setWhy(error); return; }
    onSaved(next);
  };

  return (
    <Modal open onOpenChange={(v) => { if (!v) onClose(); }}
           title={t("contact.title", { name })}>
      <form onSubmit={submit} className="flex flex-col gap-3.5 pt-1">
        <label className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 font-display text-read font-semibold text-ink">
            <DiscordGlyph className="text-[#a5b2ff]" /> Discord
          </span>
          <input value={discord} maxLength={DISCORD_MAX}
                 onChange={(e) => setDiscord(e.target.value)}
                 placeholder={t("contact.discordPh")}
                 autoComplete="off" autoCapitalize="none" spellCheck={false}
                 className={fieldCls} />
          <span className="text-meta leading-relaxed text-muted">{t("contact.discordHint")}</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 font-display text-read font-semibold text-ink">
            <FacebookGlyph /> Facebook
            <span className="inline-flex items-center gap-1 font-data text-label font-medium text-gold">
              <LockGlyph /> {t("contact.adminTag")}
            </span>
          </span>
          <input value={facebook} maxLength={FACEBOOK_MAX}
                 onChange={(e) => setFacebook(e.target.value)}
                 placeholder={t("contact.facebookPh")}
                 autoComplete="off" autoCapitalize="none" spellCheck={false}
                 className={fieldCls} />
          <span className="text-meta leading-relaxed text-muted">{t("contact.facebookHint")}</span>
        </label>

        {why && (
          <p role="alert"
             className="rounded-lg border border-chili/60 bg-chili/10 px-3 py-2 text-ui leading-relaxed text-ink">
            {t("adm.saveFailed", { why })}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-meta leading-relaxed text-muted">{t("contact.blankRemoves")}</span>
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={onClose}
                    className="rounded-lg border border-line px-4 py-2 text-read text-muted hover:border-muted hover:text-ink">
              {t("adm.cancel")}
            </button>
            <button type="submit" disabled={busy}
                    className="rounded-lg border border-accent bg-accent/15 px-4 py-2 text-read text-accent hover:bg-accent/25 disabled:opacity-60">
              {t("adm.save")}
            </button>
          </span>
        </div>
      </form>
    </Modal>
  );
}

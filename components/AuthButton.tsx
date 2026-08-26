"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { useMyFace } from "@/lib/avatars";
import { useAdmin } from "@/lib/admin";

/**
 * Who you are, in the header, and where that can take you.
 *
 * The name is a link and goes where clicking your own face should go: your page,
 * as everybody else sees it. The rest are different enough to be worth naming —
 * looking at your page, changing it, running the site, and leaving are not the
 * same errand — but not important enough to spend four slots of a header on, so
 * they live under a caret beside the name. Signing out sits below a rule: it is
 * the one entry that is not a place to go, and the one nobody wants to hit while
 * reaching for the one above it.
 *
 * The admin entry follows the powers switch rather than the database. Off means
 * off: an admin browsing as a member should not be looking at a door nobody else
 * can see. The switch itself lives on the profile page, which this menu always
 * offers, so turning the powers off never hides the way to turn them back on.
 */
export default function AuthButton() {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [user, setUser] = useState<{ name: string; avatar: string | null } | null>(null);
  const [ready, setReady] = useState(false);
  // The character, not the account: the same name and face the rest of the site
  // uses for this member. The account's own details only stand in for a guest.
  const me = useMyFace();
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u ? {
        name: (u.user_metadata.full_name ?? u.user_metadata.name
               ?? u.email?.split("@")[0] ?? "Member") as string,
        avatar: (u.user_metadata.avatar_url ?? u.user_metadata.picture
                 ?? null) as string | null,
      } : null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? {
        name: (u.user_metadata.full_name ?? u.user_metadata.name
               ?? u.email?.split("@")[0] ?? "Member") as string,
        avatar: (u.user_metadata.avatar_url ?? u.user_metadata.picture
                 ?? null) as string | null,
      } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Clicking anywhere else puts it away, which is what everybody expects of a
  // menu hanging off a button.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!supabase || !ready) return null;

  if (!user) {
    return (
      <Link
        href="/profile"
        className="rounded-lg border border-[#5865F2]/60 bg-[#5865F2]/15 px-3.5 py-1.5 text-[13.5px] text-[#a5b2ff] no-underline transition-colors hover:bg-[#5865F2]/25"
      >
        {t("nav.signIn")}
      </Link>
    );
  }

  // A guest with no character has no page to go to, so for them this stays the
  // profile — which is also where they would go to claim one.
  const home = me.characterId ? `/member/${me.characterId}` : "/profile";

  const item =
    "block px-3.5 py-2 text-[13px] text-ink no-underline transition-colors hover:bg-card hover:text-accent";

  return (
    <div ref={box} className="relative">
      <div className="flex items-stretch overflow-hidden rounded-lg border border-line bg-card text-[13px] text-ink transition-colors hover:border-accent">
        <Link href={home} onClick={() => setOpen(false)}
              className="flex items-center gap-2 py-1.5 pl-2.5 pr-1.5 text-ink no-underline">
          {(me.avatar ?? user.avatar) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatar ?? user.avatar ?? ""} alt=""
                 className="size-5 rounded-full object-cover" />
          ) : null}
          <span className="max-w-28 truncate">{me.name ?? user.name}</span>
        </Link>
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
                aria-label={t("nav.profile")}
                className="grid w-6 place-items-center border-l border-line text-muted transition-colors hover:text-accent">
          <svg viewBox="0 0 24 24" aria-hidden width="13" height="13"
               fill="none" stroke="currentColor" strokeWidth="2.4"
               strokeLinecap="round" strokeLinejoin="round"
               style={open ? { transform: "rotate(180deg)" } : undefined}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-2xl">
          <Link href={home} onClick={() => setOpen(false)} className={item}>
            {t("nav.myPage")}
          </Link>
          <Link href="/profile" onClick={() => setOpen(false)} className={item}>
            {t("nav.editProfile")}
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)}
                  className={`${item} text-chili hover:text-chili`}>
              {t("nav.admin")}
            </Link>
          )}
          {/* Below a rule, because it is the one entry here that is not a place
              to go — and the one nobody wants to hit while reaching for the one
              above it. */}
          <div className="my-1 border-t border-line" />
          <button
            onClick={async () => {
              setOpen(false);
              await supabase.auth.signOut();
              location.href = "/";
            }}
            className={`${item} w-full text-left text-muted hover:text-ink`}>
            {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
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

  // focus: as well as hover — a menu reached by keyboard highlights the item
  // under the arrow keys, and Radix marks that one instead of hovering it.
  const item =
    "block cursor-pointer px-3.5 py-2 text-[13px] text-ink no-underline outline-none transition-colors hover:bg-card hover:text-accent data-[highlighted]:bg-card data-[highlighted]:text-accent";

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-line bg-card text-[13px] text-ink transition-colors hover:border-accent">
        {/* The name is a link to their page, not part of the menu button. Two
            different things to want, and merging them made the common one — go
            to my page — cost an extra click. */}
        <Link href={home}
              className="flex items-center gap-2 py-1.5 pl-2.5 pr-1.5 text-ink no-underline">
          {(me.avatar ?? user.avatar) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatar ?? user.avatar ?? ""} alt=""
                 className="size-5 rounded-full object-cover" />
          ) : null}
          <span className="max-w-28 truncate">{me.name ?? user.name}</span>
        </Link>
        <Menu.Trigger aria-label={t("nav.profile")}
                className="grid w-6 place-items-center border-l border-line text-muted transition-colors hover:text-accent data-[state=open]:text-accent">
          <svg viewBox="0 0 24 24" aria-hidden width="13" height="13"
               fill="none" stroke="currentColor" strokeWidth="2.4"
               strokeLinecap="round" strokeLinejoin="round"
               className="transition-transform duration-150"
               style={open ? { transform: "rotate(180deg)" } : undefined}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </Menu.Trigger>
      </div>

      <Menu.Portal>
        <Menu.Content align="end" sideOffset={7} collisionPadding={10}
                      className="pop-in z-50 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-2xl shadow-black/50">
          {/* asChild on every item so Next's Link does the navigating and Radix
              only does the menu: arrow keys, type-ahead, closing on choose, and
              putting focus back on the trigger afterwards. */}
          <Menu.Item asChild>
            <Link href={home} className={item}>{t("nav.myPage")}</Link>
          </Menu.Item>
          <Menu.Item asChild>
            <Link href="/profile" className={item}>{t("nav.editProfile")}</Link>
          </Menu.Item>
          {isAdmin && (
            <Menu.Item asChild>
              <Link href="/admin" className={`${item} text-chili hover:text-chili`}>
                {t("nav.admin")}
              </Link>
            </Menu.Item>
          )}
          {/* Below a rule, because it is the one entry here that is not a place
              to go — and the one nobody wants to hit while reaching for the one
              above it. */}
          <Menu.Separator className="my-1 border-t border-line" />
          <Menu.Item asChild>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                location.href = "/";
              }}
              className={`${item} w-full text-left text-muted hover:text-ink`}>
              {t("nav.signOut")}
            </button>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

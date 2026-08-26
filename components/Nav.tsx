"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "@/components/AuthButton";
import LangToggle from "@/components/LangToggle";
import { useLang, type Key } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { GALLERY_PUBLIC_KEY } from "@/lib/gallery";

// Events and Minigames are built but unlinked until that phase is picked up again —
// their routes 404 in the meantime (see app/events, app/games).
const TABS: { href: string; label: Key; match?: (p: string) => boolean }[] = [
  { href: "/", label: "nav.home" },
  // A member's own page belongs to the roster, so the tab stays lit while you read
  // one. The default prefix test misses it: "/member/123" does not start with
  // "/members".
  { href: "/members", label: "nav.members", match: (p) => p.startsWith("/member") },
  { href: "/leaderboards", label: "nav.leaderboards" },
];

// Shown only to whoever the gallery is open to, so the header never offers a
// tab that answers with a 404.
const GALLERY_TAB: (typeof TABS)[number] = { href: "/gallery", label: "nav.gallery" };

export default function Nav() {
  const pathname = usePathname();
  const { t } = useLang();

  // Asked rather than assumed: while the gallery is admins only, everybody else
  // would be offered a tab that answers 404.
  const [showGallery, setShowGallery] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data: setting } = await supabase
        .from("site_settings").select("value").eq("key", GALLERY_PUBLIC_KEY).maybeSingle();
      if ((setting as { value?: string } | null)?.value !== "off") { setShowGallery(true); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: prof } = await supabase
        .from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
      setShowGallery(!!(prof as { is_admin?: boolean } | null)?.is_admin);
    })();
  }, []);

  const tabs = showGallery ? [...TABS, GALLERY_TAB] : TABS;
  // The header takes its own artwork, since a mark that works at 56px in a nav bar is
  // rarely the same one that works at 450px on the front page. Falls back to the
  // shared logo, then to the text wordmark, so the header is never a broken image
  // whichever files happen to exist.
  const [logoSrc, setLogoSrc] = useState("/logo-header.png");
  const logoBroken = logoSrc === "";
  return (
    <nav className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-b border-line py-4">
      <Link href="/" className="flex items-center no-underline">
        {logoBroken ? (
          <span className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">
            Cafe And SHabu
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="Cafe And SHabu"
               className="h-12 w-auto sm:h-14"
               onError={() =>
                 setLogoSrc((s) => (s === "/logo-header.png" ? "/logo.png" : ""))} />
        )}
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const active = tab.match ? tab.match(pathname)
            : tab.href === "/" ? pathname === "/"
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg border px-3.5 py-1.5 text-[13.5px] no-underline transition-colors ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-muted hover:border-muted hover:text-ink"
              }`}
            >
              {t(tab.label)}
            </Link>
          );
        })}
        <LangToggle />
        <AuthButton />
      </div>
    </nav>
  );
}

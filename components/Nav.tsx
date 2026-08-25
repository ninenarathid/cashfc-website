"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "@/components/AuthButton";

// Events and Minigames are built but unlinked until that phase is picked up again —
// their routes 404 in the meantime (see app/events, app/games).
const TABS: { href: string; label: string; match?: (p: string) => boolean }[] = [
  { href: "/", label: "Home" },
  // A member's own page belongs to the roster, so the tab stays lit while you read
  // one. The default prefix test misses it: "/member/123" does not start with
  // "/members".
  { href: "/members", label: "Members", match: (p) => p.startsWith("/member") },
  { href: "/leaderboards", label: "Leaderboards" },
];

export default function Nav() {
  const pathname = usePathname();
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
          <span className="font-data text-[11px] uppercase tracking-[0.22em] text-amber">
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
        {TABS.map((t) => {
          const active = t.match ? t.match(pathname)
            : t.href === "/" ? pathname === "/"
            : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-lg border px-3.5 py-1.5 text-[13.5px] no-underline transition-colors ${
                active
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-line text-muted hover:border-muted hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
        <AuthButton />
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "@/components/AuthButton";

const TABS = [
  { href: "/", label: "หน้าแรก" },
  { href: "/members", label: "สมาชิก" },
  { href: "/events", label: "กิจกรรม" },
  { href: "/games", label: "มินิเกม" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-b border-line py-4">
      <Link href="/" className="font-data text-[11px] uppercase tracking-[0.22em] text-amber no-underline">
        Cafe And SHabu
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
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

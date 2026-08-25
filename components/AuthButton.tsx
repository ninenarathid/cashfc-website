"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AuthButton() {
  const [supabase] = useState(createClient);
  const [user, setUser] = useState<{ name: string; avatar: string | null } | null>(null);
  const [ready, setReady] = useState(false);

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
        Sign in
      </Link>
    );
  }

  return (
    <Link
      href="/profile"
      className="flex items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink no-underline transition-colors hover:border-amber"
    >
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt="" className="size-5 rounded-full" />
      ) : null}
      <span className="max-w-28 truncate">{user.name}</span>
    </Link>
  );
}

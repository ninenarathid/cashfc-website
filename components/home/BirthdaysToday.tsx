"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Member } from "@/lib/types";
import { isOnVacation } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface Person { id: number; name: string }

/**
 * Real birthdays, not the in-game Eorzean nameday: only members who entered one
 * themselves, and only those still playing. Wishing a happy birthday to someone who
 * has not logged in for a year is worse than saying nothing.
 */
export default function BirthdaysToday({ members }: { members: Member[] }) {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const now = new Date();
    supabase
      .from("profiles")
      .select("character_id, birth_month, birth_day")
      .eq("birth_month", now.getMonth() + 1)
      .eq("birth_day", now.getDate())
      .not("character_id", "is", null)
      .then(({ data, error }) => {
        // Silently absent before migration_v3.sql adds the columns.
        if (error || !data) return;
        const active = new Map(
          members.filter((m) => !isOnVacation(m)).map((m) => [m.id, m.name]),
        );
        setPeople(
          data
            .map((r) => ({ id: r.character_id as number,
                           name: active.get(r.character_id as number) ?? "" }))
            .filter((p) => p.name),
        );
      });
  }, [members]);

  if (!people.length) return null;

  return (
    <section className="mt-5 rounded-xl border border-gold/40 bg-gold/8 px-4 py-3">
      <span className="font-display font-semibold text-gold">🎂 Birthday today: </span>
      {people.map((p, i) => (
        <span key={p.id}>
          {i > 0 && " · "}
          <Link href={`/member/${p.id}`}
                className="text-ink no-underline hover:text-gold">
            {p.name}
          </Link>
        </span>
      ))}
      <span className="text-[13px] text-muted"> — go wish them well!</span>
    </section>
  );
}

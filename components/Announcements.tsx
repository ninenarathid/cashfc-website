"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Announcement {
  id: number;
  title: string;
  body: string | null;
  created_at: string;
}

export default function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setItems(data ?? []));
  }, []);

  if (!items.length) return null;

  return (
    <section className="mt-5 flex flex-col gap-2">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-amber">
        ประกาศจาก FC
      </div>
      {items.map((a) => (
        <div key={a.id} className="rounded-xl border border-amber/30 bg-amber/5 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-display font-semibold">{a.title}</div>
            <div className="font-data text-[11px] text-muted">
              {new Date(a.created_at).toLocaleDateString("th-TH", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </div>
          </div>
          {a.body ? (
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink/85">
              {a.body}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}

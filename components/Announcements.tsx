"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";

interface Announcement {
  id: number;
  title: string;
  body: string | null;
  created_at: string;
  image_url: string | null;
  title_en: string | null;
  body_en: string | null;
}

export default function Announcements() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from("announcements")
      // Asked for twice: selecting a column the database has not heard of
      // fails the whole query, and a site whose announcements vanished because
      // migration_v25 had not been run yet would be a worse trade than a card
      // in one language. The same ladder the rest of this codebase climbs.
      .select("id, title, body, created_at, image_url, title_en, body_en")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(async ({ data, error }) => {
        if (!error) { setItems(data ?? []); return; }
        const { data: older } = await supabase
          .from("announcements")
          .select("id, title, body, created_at, image_url")
          .order("created_at", { ascending: false })
          .limit(3);
        setItems((older ?? []) as unknown as Announcement[]);
      });
  }, []);

  if (!items.length) return null;

  return (
    <section className="mt-4 flex flex-col gap-2">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">
        {t("home.announcements")}
      </div>
      {items.map((a) => (
        <div key={a.id} className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {/* The reader's language when there is one, the Thai when there
                is not. A blank where a headline should be is worse than a
                headline in the other language. */}
            <div className="font-display font-semibold">
              {(lang === "en" ? a.title_en : null) || a.title}
            </div>
            <div className="font-data text-[11px] text-muted">
              {fmtDate(a.created_at)}
            </div>
          </div>
          {((lang === "en" ? a.body_en : null) || a.body) ? (
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink/85">
              {(lang === "en" ? a.body_en : null) || a.body}
            </p>
          ) : null}
          {a.image_url && (
            // Announcements are usually about something that happened in a
            // screenshot, so the picture gets real space rather than a thumbnail.
            //
            // contain, and capped by height rather than stretched to the width.
            // object-cover was doing nothing here — it needs a height to crop
            // against — and a full-width portrait poster came out taller than
            // the screen. Now a wide banner still fills the card and a tall one
            // sits in the middle at its own shape, whole.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.image_url} alt="" loading="lazy"
                 className="mt-2.5 max-h-[26rem] w-full rounded-lg border border-line bg-card object-contain" />
          )}
        </div>
      ))}
    </section>
  );
}

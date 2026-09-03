"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
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
            // A poster is meant to be read, and these carry the rules of an
            // event in small type down one side. Contained rather than cropped,
            // given most of the height of a screen, and openable at full size —
            // 26rem was enough to see there was writing and not enough to read
            // it, which is the worst of both.
            <Dialog.Root>
              <Dialog.Trigger asChild>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image_url} alt="" loading="lazy"
                     className="mt-2.5 max-h-[38rem] w-full cursor-zoom-in rounded-lg border border-line bg-card object-contain transition-opacity hover:opacity-90" />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="pop-in fixed inset-0 z-[80] bg-bg/90 backdrop-blur-sm" />
                <Dialog.Content
                  className="pop-in fixed inset-0 z-[81] flex items-center justify-center p-4 outline-none sm:p-8">
                  <Dialog.Title className="sr-only">
                    {(lang === "en" ? a.title_en : null) || a.title}
                  </Dialog.Title>
                  {/* The whole backdrop closes it: at this size the picture is
                      the page, and hunting for a small × in a corner is the
                      only other way out. Escape works too. */}
                  <Dialog.Close asChild>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.image_url} alt=""
                         className="max-h-full max-w-full cursor-zoom-out rounded-lg object-contain shadow-2xl shadow-black/60" />
                  </Dialog.Close>
                  <Dialog.Close
                    aria-label={t("common.close")}
                    className="fixed right-4 top-4 grid size-9 place-items-center rounded-lg border border-line bg-surface/90 text-muted outline-none transition-colors hover:border-accent hover:text-accent">
                    <svg viewBox="0 0 24 24" aria-hidden width="16" height="16" fill="none"
                         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
        </div>
      ))}
    </section>
  );
}

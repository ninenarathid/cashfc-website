import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { everyone } from "@/lib/people";
import { picsOf, type Notice } from "@/lib/events";
import EventBody from "@/components/home/EventBody";

/**
 * One notice, by link.
 *
 * The front page shows these in a slider and opens them in a window, which is
 * right for somebody already here and no use at all to somebody being told
 * about it: there was nothing to send. So an event has an address, and this is
 * it — the same pictures, the same words and the same conversation, in a page
 * that Discord can read.
 *
 * Which is the point of the metadata below. An unfurler runs no JavaScript and
 * holds no session, so everything it is going to show has to be in the HTML
 * that comes off the server. The poster goes as itself rather than as a card
 * drawn around it: it is already a picture designed to be looked at, and
 * cropping it into a 1200×630 frame would throw away the half with the dates
 * on it.
 */
const FALLBACK: Metadata = { title: "Events — Cafe And SHabu" };

async function noticeOf(id: string): Promise<Notice | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, image_url, images, title_en, body_en,"
      + " comment_count")
    .eq("id", Number(id) || -1)
    .maybeSingle();
  return (data as unknown as Notice) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const n = await noticeOf(id);
  if (!n) return FALLBACK;

  const title = `${n.title} · Cafe And SHabu`;
  // The first two lines of it. An embed gives a description a few lines and
  // then stops mid-word, and an event's opening sentence is the part that says
  // what it is; the rules underneath are what the link is for.
  const description = (n.body ?? "").split("\n").filter(Boolean).slice(0, 2)
    .join(" ").slice(0, 280) || "An event at Cafe And SHabu";
  const pics = picsOf(n);

  return {
    title,
    description,
    openGraph: {
      title, description, siteName: "Cafe And SHabu", type: "article",
      ...(pics.length ? { images: [{ url: pics[0], alt: n.title }] } : {}),
    },
    twitter: {
      // The card that gives a poster the width it deserves rather than a
      // thumbnail beside a paragraph.
      card: pics.length ? "summary_large_image" : "summary",
      title, description, ...(pics.length ? { images: [pics[0]] } : {}),
    },
  };
}

export default async function Page(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const n = await noticeOf(id);
  if (!n) notFound();

  const data = raw as unknown as BoardData;

  return (
    <main className="pt-7">
      {/* Back to where the rest of them are. A page reached from Discord has no
          history behind it, so the browser's own back button goes nowhere. */}
      <Link href="/"
            className="inline-flex items-center gap-1.5 font-data text-meta uppercase tracking-[0.22em] text-accent no-underline hover:underline">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
             stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
             strokeLinejoin="round" aria-hidden>
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Cafe And SHabu
      </Link>

      <div className="mt-2">
        {/* The title is drawn in there rather than here: it has a Thai and an
            English version, and which one a reader gets is only known on the
            other side of the client boundary. */}
        <EventBody notice={n} people={everyone(data)} heading />
      </div>
    </main>
  );
}

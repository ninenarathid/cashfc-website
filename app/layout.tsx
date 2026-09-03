import type { Metadata } from "next";
import { Mitr, Noto_Sans_Thai_Looped, Bai_Jamjuree } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import CommandPalette from "@/components/CommandPalette";
import roster from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { LangProvider } from "@/lib/i18n";
import { AvatarProvider } from "@/lib/avatars";
import { AdminProvider } from "@/lib/admin";

// This is a Free Company hangout, not a spreadsheet, so all three faces lean warm
// and all three carry a full Thai set — the FC is Thai and the site is in English,
// and mixing a Thai fallback into a Latin face makes the two halves of a sentence
// look like different websites.
//
// Mitr's rounded terminals do the friendliness in the headings; Noto Sans Thai
// Looped sets the body in looped Thai letterforms, which read as conversational to
// Thai readers where the plain loopless style reads as officialese; Bai Jamjuree
// keeps numbers and small caps labels distinct without the angular military look
// the board had before.
const display = Mitr({
  subsets: ["thai", "latin"],
  weight: ["500", "600"],
  variable: "--font-display-face",
  display: "swap",
});
const body = Noto_Sans_Thai_Looped({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body-face",
  display: "swap",
});
const data = Bai_Jamjuree({
  subsets: ["thai", "latin"],
  weight: ["500", "600"],
  variable: "--font-data-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cafe And SHabu — Member Board",
  description:
    "Free Company member board: see who raids, collects and crafts at a glance. Updated daily.",
  // Reachable by link, not by search. This is a board about real people —
  // names, faces, birthdays, what they play and when they were last online —
  // put together for the FC, and a member did not agree to be a search result
  // when they let the pipeline read their Lodestone page.
  //
  // Set once here and inherited by every page: no page sets its own `robots`,
  // and Next merges the field down from the root layout.
  //
  // follow stays true on purpose. The pages are already out there and Google
  // has to fetch each one to learn it should be dropped; letting the crawler
  // walk the links is how the noindex reaches five hundred member pages
  // without waiting for it to rediscover each on its own. See app/robots.ts
  // for why this is not done with a Disallow instead.
  robots: {
    index: false,
    follow: true,
    noarchive: true,
    googleBot: { index: false, follow: true, noimageindex: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Names and ids, and nothing else. The import is resolved on the server, so
  // what crosses to the browser is this array rather than the 800 KB file it
  // came out of — about 12 KB, which is what a search over five hundred people
  // costs and is worth paying on every page for.
  const index = (roster as unknown as BoardData).members
    .map((m) => ({ id: m.id, name: m.name }));

  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${data.variable} font-body antialiased`}
      >
        <LangProvider>
          {/* One small query for the faces members chose, shared by the board,
              their pages, and every byline and tag in the gallery. */}
          <AdminProvider>
          <AvatarProvider>
          <CommandPalette members={index} />
          <div className="mx-auto max-w-5xl px-4 pb-16">
            <Nav />
            {children}
          <footer className="mt-9 border-t border-line pt-4 text-[12.5px] leading-relaxed text-muted">
            Data from{" "}
            <a className="text-accent no-underline" href="https://na.finalfantasyxiv.com/lodestone/" target="_blank" rel="noopener noreferrer">The Lodestone</a>{" "}
            (© SQUARE ENIX),{" "}
            <a className="text-accent no-underline" href="https://www.fflogs.com/" target="_blank" rel="noopener noreferrer">FF Logs</a>{" "}
            and{" "}
            <a className="text-accent no-underline" href="https://ffxivcollect.com/" target="_blank" rel="noopener noreferrer">FFXIV Collect</a>{" "}
            (non-commercial) · members with a private profile show as
            &ldquo;No data&rdquo; · refreshed every four hours by GitHub Actions
            </footer>
          </div>
          </AvatarProvider>
          </AdminProvider>
        </LangProvider>
      </body>
    </html>
  );
}

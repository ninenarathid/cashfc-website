import type { Metadata } from "next";
import { Mitr, Noto_Sans_Thai_Looped, Bai_Jamjuree } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { LangProvider } from "@/lib/i18n";

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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${data.variable} font-body antialiased`}
      >
        <LangProvider>
          <div className="mx-auto max-w-5xl px-4 pb-16">
            <Nav />
            {children}
          <footer className="mt-9 border-t border-line pt-4 text-[12.5px] leading-relaxed text-muted">
            Data from{" "}
            <a className="text-amber no-underline" href="https://na.finalfantasyxiv.com/lodestone/" target="_blank" rel="noopener noreferrer">The Lodestone</a>{" "}
            (© SQUARE ENIX),{" "}
            <a className="text-amber no-underline" href="https://www.fflogs.com/" target="_blank" rel="noopener noreferrer">FF Logs</a>{" "}
            and{" "}
            <a className="text-amber no-underline" href="https://ffxivcollect.com/" target="_blank" rel="noopener noreferrer">FFXIV Collect</a>{" "}
            (non-commercial) · members with a private profile show as
            &ldquo;No data&rdquo; · refreshed every four hours by GitHub Actions
            </footer>
          </div>
        </LangProvider>
      </body>
    </html>
  );
}

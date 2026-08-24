import type { Metadata } from "next";
import { Prompt, Anuphan, Chakra_Petch } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});
const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  variable: "--font-anuphan",
  display: "swap",
});
const chakra = Chakra_Petch({
  subsets: ["thai", "latin"],
  weight: ["500", "600"],
  variable: "--font-chakra",
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
        className={`${prompt.variable} ${anuphan.variable} ${chakra.variable} font-body antialiased`}
      >
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
            &ldquo;No data&rdquo; · refreshed daily by GitHub Actions
          </footer>
        </div>
      </body>
    </html>
  );
}

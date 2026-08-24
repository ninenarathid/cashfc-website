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
    "กระดานสมาชิก Free Company: ใครเป็นสาย Raider / Collector / Crafter ดูได้ในหน้าเดียว อัปเดตทุกวัน",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body
        className={`${prompt.variable} ${anuphan.variable} ${chakra.variable} font-body antialiased`}
      >
        <div className="mx-auto max-w-5xl px-4 pb-16">
          <Nav />
          {children}
          <footer className="mt-9 border-t border-line pt-4 text-[12.5px] leading-relaxed text-muted">
            ข้อมูลจาก{" "}
            <a className="text-amber no-underline" href="https://na.finalfantasyxiv.com/lodestone/" target="_blank" rel="noopener noreferrer">The Lodestone</a>{" "}
            (© SQUARE ENIX),{" "}
            <a className="text-amber no-underline" href="https://www.fflogs.com/" target="_blank" rel="noopener noreferrer">FF Logs</a>{" "}
            และ{" "}
            <a className="text-amber no-underline" href="https://ffxivcollect.com/" target="_blank" rel="noopener noreferrer">FFXIV Collect</a>{" "}
            (non-commercial) · สมาชิกที่ตั้งค่าโปรไฟล์เป็น private จะแสดงเป็น
            &ldquo;ไม่มีข้อมูล&rdquo; · อัปเดตอัตโนมัติทุกวันด้วย GitHub Actions
          </footer>
        </div>
      </body>
    </html>
  );
}

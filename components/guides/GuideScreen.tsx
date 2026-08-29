"use client";

import Link from "next/link";
import { useAdmin } from "@/lib/admin";
import GuideView from "@/components/guides/GuideView";
import type { Guide } from "@/lib/guides/types";

/**
 * One guide, with the things that belong around it rather than inside it.
 *
 * The credit is not a footnote. These are read from somebody else's work — the
 * mechanic list, the names, the order — and the link belongs at the top where a
 * reader can go and check, not at the bottom where a reader can miss it.
 *
 * A draft says so as loudly as it needs to. A guide is a thing people act on
 * while standing in the fight, and a wrong one is worse than none: it is not
 * enough for the page to be technically unfinished, the reader has to know it.
 */
export default function GuideScreen({ guide }: { guide: Guide }) {
  const { isAdmin, ready } = useAdmin();
  if (!ready) return null;
  if (!isAdmin) {
    return (
      <main className="pt-7">
        <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
          กำลังเขียนอยู่ครับ — จะเปิดให้ทุกคนอ่านเมื่อไกด์นี้เสร็จ
        </div>
      </main>
    );
  }

  return (
    <main className="pt-7">
      <Link href="/guides"
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted no-underline transition-colors hover:text-accent">
        <span aria-hidden>←</span> ไกด์ทั้งหมด
      </Link>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-3xl font-bold">{guide.short ?? guide.name}</h1>
        {guide.boss && <span className="text-[15px] text-muted">{guide.boss}</span>}
      </div>
      <div className="mt-0.5 text-[12.5px] text-muted">
        {guide.expansion} · patch {guide.patch} · {guide.name}
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        อ้างอิงจาก{" "}
        <a href={guide.source.url} target="_blank" rel="noopener noreferrer"
           className="text-accent underline decoration-accent/40 underline-offset-2">
          {guide.source.name}
        </a>{" "}
        — ชื่อท่าและลำดับมาจากที่นั่น ขอบคุณครับ
      </p>

      {guide.draft && (
        <p className="mt-3 rounded-xl border border-chili/50 bg-chili/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink/90">
          <b className="text-chili">ยังเป็นร่าง — อย่าเพิ่งเชื่อตำแหน่ง</b><br />
          ชื่อท่าและลำดับถูกต้องตามต้นทาง แต่พิกัดที่ยืนทั้งหมดยังเป็นการกะเอา
          ยังไม่ได้ตรวจกับการลงจริง ใช้ดูโครงว่าไฟต์เป็นยังไงได้ แต่อย่าเอาไปยืนตาม
        </p>
      )}

      <GuideView guide={guide} />
    </main>
  );
}

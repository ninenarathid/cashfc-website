"use client";

import Link from "next/link";
import { useAdmin } from "@/lib/admin";
import { CATEGORIES, CATEGORY_LABEL, EXPANSIONS, guidesIn } from "@/lib/guides";

/**
 * The shelf.
 *
 * Admins only for now, which is a decision about readiness rather than about
 * secrecy: a half-written guide is worse than no guide, because somebody will
 * stand where it says. It opens to the FC when the first one is finished.
 */
export default function GuidesPage() {
  const { isAdmin, ready } = useAdmin();
  if (!ready) return null;
  if (!isAdmin) {
    return (
      <main className="pt-7">
        <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
          กำลังเขียนอยู่ครับ — จะเปิดให้ทุกคนอ่านเมื่อไกด์แรกเสร็จ
        </div>
      </main>
    );
  }

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">
        Guides
      </div>
      <h1 className="font-display text-3xl font-bold">ไกด์คอนเทนต์</h1>

      {EXPANSIONS.map((expansion) => (
        <section key={expansion} className="mt-6">
          <h2 className="font-display text-lg font-semibold">{expansion}</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {CATEGORIES.map((category) => {
              const rows = guidesIn(expansion, category);
              return (
                <div key={category}
                     className="rounded-xl border border-line bg-surface p-3.5">
                  <div className="font-data text-[11px] uppercase tracking-[0.14em] text-muted">
                    {CATEGORY_LABEL[category]}
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {rows.map((g) => (
                      <Link key={g.slug} href={`/guides/${g.slug}`}
                            className="rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink no-underline transition-colors hover:border-accent hover:text-accent">
                        {g.short ?? g.name}
                        {g.boss && (
                          <span className="ml-1.5 text-[12px] text-muted">{g.boss}</span>
                        )}
                        {g.draft && (
                          <span className="ml-1.5 rounded-full border border-line px-1.5 text-[10.5px] text-muted">
                            ร่าง
                          </span>
                        )}
                      </Link>
                    ))}
                    {rows.length === 0 && (
                      <span className="text-[12.5px] text-muted">ยังไม่มี</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

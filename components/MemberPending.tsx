"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import type { PendingMember } from "@/lib/pending-member";

/**
 * The page for somebody the site knows of but knows nothing about.
 *
 * Deliberately not a hollow MemberView. Rendering the usual page with every
 * number blank would look like a member with no achievements, no clears and no
 * collection — a worse lie than a 404, because it reads as a fact about them
 * rather than as a fact about the site. This says which of the two it is.
 */
export default function MemberPending({ m }: { m: PendingMember }) {
  const { t } = useLang();
  const verified = !!m.verifiedAt;

  return (
    <main className="pt-7">
      <section className="rounded-xl border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          <span className="size-16 shrink-0 rounded-full border border-dashed border-line bg-card" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold">
              {m.name ?? t("pending.character", { id: m.id })}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-dashed border-line px-2 py-0.5 text-[11.5px] text-muted">
                {verified ? t("pending.badge") : t("pending.badgeUnverified")}
              </span>
              {m.name && (
                <span className="font-data text-[11.5px] text-muted">
                  {t("pending.character", { id: m.id })}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-5 max-w-prose text-[13.5px] leading-relaxed text-muted">
          {verified ? t("pending.body") : t("pending.bodyUnverified")}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <a href={`https://na.finalfantasyxiv.com/lodestone/character/${m.id}/`}
             target="_blank" rel="noopener noreferrer"
             className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-ink no-underline hover:border-accent hover:text-accent">
            {t("pending.lodestone")}
          </a>
          {!verified && (
            <Link href="/profile"
                  className="rounded-lg border border-accent bg-accent/15 px-3.5 py-1.5 text-[13px] text-accent no-underline hover:bg-accent/25">
              {t("pending.verify")}
            </Link>
          )}
          <Link href="/members"
                className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted no-underline hover:border-muted hover:text-ink">
            {t("pending.back")}
          </Link>
        </div>
      </section>
    </main>
  );
}

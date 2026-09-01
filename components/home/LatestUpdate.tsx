"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import Changelog from "@/components/Changelog";
import { CHANGELOG } from "@/lib/changelog";

/**
 * The newest day of changes, on the front page.
 *
 * One day, not the list. Somebody landing on the home page wants to know
 * whether anything is different since they last looked, which is a question the
 * most recent entry answers on its own — and the link is there for the person
 * who has been away longer than that.
 */
export default function LatestUpdate() {
  const { t } = useLang();
  if (!CHANGELOG.length) return null;
  return (
    <section className="mt-5 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{t("log.latest")}</h2>
        <Link href="/updates"
              className="text-[12.5px] text-accent no-underline hover:underline">
          {t("log.all")} →
        </Link>
      </div>
      <div className="mt-2.5">
        <Changelog limit={1} />
      </div>
    </section>
  );
}

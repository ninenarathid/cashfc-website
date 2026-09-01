"use client";

import { useLang } from "@/lib/i18n";
import Changelog from "@/components/Changelog";

/**
 * Everything that has changed on the site, in one place.
 *
 * The front page carries the newest day only; somebody who has been away for a
 * fortnight wants the rest, and wants it without scrolling a home page built
 * for something else.
 */
export default function UpdatesPage() {
  const { t } = useLang();
  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">
        {t("nav.updates")}
      </div>
      <h1 className="font-display text-3xl font-bold">{t("log.title")}</h1>
      <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-muted">
        {t("log.intro")}
      </p>
      <div className="mt-5 max-w-prose">
        <Changelog />
      </div>
    </main>
  );
}

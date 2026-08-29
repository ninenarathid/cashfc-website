"use client";

import { useLang } from "@/lib/i18n";
import Feedback from "@/components/Feedback";

/**
 * Somewhere to say something to the admins.
 *
 * A client page rather than a server one, because who you are decides what is on
 * it, and there is nothing here worth rendering before that is known. The
 * component underneath shows a sign-in line to anybody who is not — the header
 * already hides the tab, and a page that 404s at somebody who followed a link
 * from a friend is ruder than one that tells them what to do about it.
 */
export default function FeedbackPage() {
  const { t } = useLang();
  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">
        {t("nav.feedback")}
      </div>
      <h1 className="font-display text-3xl font-bold">{t("feedback.title")}</h1>
      <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-muted">
        {t("feedback.intro")}
      </p>
      <Feedback />
    </main>
  );
}

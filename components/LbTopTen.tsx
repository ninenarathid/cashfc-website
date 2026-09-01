"use client";

import { useLang } from "@/lib/i18n";

/**
 * "Top 10 in the FC", in the reader's language.
 *
 * A component for one line because the leaderboards page is a server component
 * — it reads the roster file at build time — and the only thing on it that
 * needs to know the language is this label and the heading above it.
 */
export default function LbTopTen() {
  const { t } = useLang();
  return <span className="text-[11.5px] text-muted">{t("lb.topTen")}</span>;
}

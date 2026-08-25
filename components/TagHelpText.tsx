"use client";

import { tagHelp } from "@/components/MemberTags";
import { useLang } from "@/lib/i18n";

/**
 * A tag's explanation as visible copy rather than a tooltip, for the leaderboard
 * headings. The page around it is a server component, so this one line is what
 * has to know the reader's language.
 */
export default function TagHelpText(
  { tag, className = "" }: { tag: string; className?: string },
) {
  const { lang } = useLang();
  return <span className={className}>{tagHelp(tag, lang)}</span>;
}

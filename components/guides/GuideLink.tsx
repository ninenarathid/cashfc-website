"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { GuidesIcon } from "@/components/ui/NavIcons";

type Found = { slug: string; short: string | null; name: string };

/*
 * The published guides by the duty they are for, asked once a visit.
 *
 * One small question for the whole party board rather than one per party: a
 * board shows thirty parties and the guides number a handful. A database
 * without v344 answers with an error, which is read as "no guides" and asked
 * again on the next visit.
 */
let asked: Promise<Record<string, Found>> | null = null;

function guidesByDuty(): Promise<Record<string, Found>> {
  if (asked) return asked;
  const sb = createClient();
  if (!sb) return Promise.resolve({});
  asked = (async () => {
    const { data, error } = await sb.from("guides")
      .select("slug, short, name, content_key")
      .eq("published", true).not("content_key", "is", null);
    if (error || !data) { asked = null; return {}; }
    const out: Record<string, Found> = {};
    for (const g of data as (Found & { content_key: string })[]) {
      if (!out[g.content_key]) out[g.content_key] = { slug: g.slug, short: g.short, name: g.name };
    }
    return out;
  })();
  return asked;
}

export function useGuideFor(contentKey: string | null | undefined): Found | null {
  const [map, setMap] = useState<Record<string, Found>>({});
  useEffect(() => {
    let live = true;
    void guidesByDuty().then((m) => { if (live) setMap(m); });
    return () => { live = false; };
  }, []);
  return contentKey ? map[contentKey] ?? null : null;
}

/**
 * "The guide for this fight", wherever a party names one.
 *
 * Nothing at all when the fight has no published guide, so a party for a map
 * run or a fight nobody has written up looks exactly as it did. `newTab` for
 * the party form, where following the link must not throw away the form.
 */
export default function GuideLink(
  { contentKey, newTab = false, className = "" }:
  { contentKey: string | null | undefined; newTab?: boolean; className?: string },
) {
  const { t } = useLang();
  const g = useGuideFor(contentKey);
  if (!g) return null;
  return (
    <Link href={`/guides/${g.slug}`} prefetch={false}
          {...(newTab ? { target: "_blank", rel: "noopener" } : {})}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-read text-ink no-underline transition-colors hover:border-accent hover:text-accent ${className}`}>
      <GuidesIcon size={16} />
      {t("guide.forParty", { name: g.short ?? g.name })}
    </Link>
  );
}

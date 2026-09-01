"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import Changelog from "@/components/Changelog";
import { CHANGELOG } from "@/lib/changelog";

/** How many days of changes are shown before the rest is folded away. */
const SHOWN = 2;

/**
 * What has changed on the site, on the front page.
 *
 * On the front page and nowhere else: a changelog behind its own tab is one
 * nobody visits, because reading it is a thing you have to decide to do. Here
 * it is in the way of somebody who came for something else, which is the only
 * moment they will find out the gallery got faster or their birthday now shows.
 *
 * Folded after the newest couple of days so it stays a note rather than the
 * page. The rest is one click away and does not move anybody off the page they
 * are already on.
 */
export default function LatestUpdate() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  if (!CHANGELOG.length) return null;
  const more = CHANGELOG.length > SHOWN;

  return (
    <section className="mt-5 rounded-xl border border-line bg-surface p-4">
      <h2 className="font-display text-lg font-semibold">{t("log.title")}</h2>
      <div className="mt-2.5">
        <Changelog limit={open ? undefined : SHOWN} />
      </div>
      {more && (
        <button onClick={() => setOpen(!open)}
                className="mt-3 text-[12.5px] text-accent hover:underline">
          {open ? t("log.less") : t("log.more")} {open ? "↑" : "↓"}
        </button>
      )}
    </section>
  );
}

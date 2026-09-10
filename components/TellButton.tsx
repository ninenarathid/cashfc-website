"use client";

import { useState } from "react";
import TagIcon from "@/components/TagIcon";
import { tellCommand } from "@/lib/world";
import { useLang } from "@/lib/i18n";

/**
 * Copy the line that starts a conversation in game.
 *
 * On the member page and nowhere else. Somebody who has opened a person's page
 * has already decided they want to talk to them, which is the moment for it; a
 * button on every name in every list was the same idea spread until it was
 * furniture.
 *
 * The last step used to be the same every time: read the name off the screen,
 * alt-tab, type it out, get the apostrophe wrong, try again. Names on the
 * Lodestone are spelled exactly as the game spells them, so the site can hand
 * over a line that works rather than a name to copy by eye.
 *
 * The world matters and is easy to forget: `/tell Name` only reaches somebody
 * standing on your own, and a fair number of the people listed here are not.
 *
 * It stops the click dead all the same: it sits inside a heading that has been
 * a link before now, and a tell button that also navigated would be a button
 * doing the thing you were trying not to do.
 */
export default function TellButton(
  { name, characterId, world, size = 16, className = "" }: {
    name: string;
    /** For looking up a guest's world. Members are all on the FC's. */
    characterId?: number | null;
    /** Where the real value is to hand, which beats the default. */
    world?: string | null;
    size?: number;
    className?: string;
  },
) {
  const { t } = useLang();
  const [done, setDone] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const line = tellCommand(name, characterId, world);
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      // No clipboard permission, or an insecure origin. A prompt is not
      // nothing: the line is in front of them, selected, and Ctrl+C works —
      // better than a button that quietly does nothing.
      window.prompt(t("tell.copy"), line);
      return;
    }
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  };

  return (
    <button type="button" onClick={copy}
            aria-label={t("tell.copyFor", { name })}
            title={done ? t("tell.copied") : tellCommand(name, characterId, world)}
            className={`inline-flex shrink-0 items-center justify-center rounded-md p-0.5 align-middle opacity-55 transition-opacity hover:opacity-100 focus-visible:opacity-100 ${className}`}>
      {done
        ? <span style={{ fontSize: size - 2 }} className="leading-none text-jade">✓</span>
        : <TagIcon tag="tell" size={size} />}
    </button>
  );
}

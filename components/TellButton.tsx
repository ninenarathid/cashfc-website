"use client";

import { useState } from "react";
import TagIcon from "@/components/TagIcon";
import { tellCommand } from "@/lib/world";
import { useLang } from "@/lib/i18n";

/**
 * Copy the line that starts a conversation in game.
 *
 * Every list on this site is a list of people somebody eventually wants to talk
 * to — who is short a healer, who cleared the fight, whose birthday it is — and
 * the last step was always the same: read the name off the screen, alt-tab,
 * type it out, get the apostrophe wrong, try again. Names on the Lodestone are
 * spelled exactly as the game spells them, so the site can hand over a line
 * that works rather than a name to copy by eye.
 *
 * The world matters and is easy to forget: `/tell Name` only reaches somebody
 * standing on your own, and a fair number of the people listed here are not.
 *
 * Rows are usually links or buttons, so this stops the event dead. A tell
 * button that also opened the member page would be a button that did the thing
 * you were trying not to do.
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

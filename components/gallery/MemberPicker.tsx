"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";

export interface MemberOption { id: number; name: string; avatar?: string | null }

/**
 * Find one member by typing part of their name.
 *
 * Search rather than a dropdown because the FC is long past the size where a
 * list of every character is something you can scan. Two characters before
 * anything appears, so the first keystroke does not dump half the roster on
 * screen, and eight results at most so the picker never pushes the form it sits
 * inside off the page.
 */
export default function MemberPicker(
  { options, exclude = [], onPick, placeholder, autoFocus = false }: {
    options: MemberOption[];
    /** Already chosen — offering them again would only produce a duplicate. */
    exclude?: number[];
    onPick: (o: MemberOption) => void;
    placeholder?: string;
    autoFocus?: boolean;
  },
) {
  const { t } = useLang();
  const [typed, setTyped] = useState("");
  const q = typed.trim().toLowerCase();
  const hits = q.length >= 2
    ? options.filter((o) => !exclude.includes(o.id) && o.name.toLowerCase().includes(q))
        .slice(0, 8)
    : [];

  return (
    <div>
      <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus={autoFocus}
             placeholder={placeholder ?? t("gallery.findMember")}
             className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink placeholder:text-muted" />
      {hits.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {hits.map((o) => (
            <button key={o.id} onClick={() => { onPick(o); setTyped(""); }}
                    className="flex items-center gap-1.5 rounded-md border border-line bg-card py-1 pl-1 pr-2.5 text-[12.5px] text-ink hover:border-accent hover:text-accent">
              {o.avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.avatar} alt="" className="size-5 rounded-full object-cover" />
              )}
              {o.name}
            </button>
          ))}
        </div>
      )}
      {q.length >= 2 && hits.length === 0 && (
        <p className="mt-1.5 text-[12px] text-muted">{t("gallery.nothingFound")}</p>
      )}
    </div>
  );
}

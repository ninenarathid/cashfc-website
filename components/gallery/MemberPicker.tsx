"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useAvatarOverrides } from "@/lib/avatars";

export interface MemberOption { id: number; name: string; avatar?: string | null }

/** What comes back: a member, or a name with nobody behind it. */
export interface Picked { id: number | null; name: string; avatar?: string | null }

/**
 * Find one member by typing part of their name.
 *
 * Search rather than a dropdown because the FC is long past the size where a
 * list of every character is something you can scan. Two characters before
 * anything appears, so the first keystroke does not dump half the roster on
 * screen, and eight results at most so the picker never pushes the form it sits
 * inside off the page.
 *
 * The roster is not everybody who has ever been in one of these pictures. A
 * static from another company, somebody's friend at a wedding, a member who has
 * since left — all of them are in the shot and none of them are in the list, and
 * until there was a way to write the name anyway the honest answer to "who is
 * that?" was a blank. So the typed name is itself an option, offered under the
 * matches rather than instead of them: a guest is the fallback, not the default.
 */
export default function MemberPicker(
  { options, exclude = [], onPick, placeholder, autoFocus = false,
    allowGuest = false }: {
    options: MemberOption[];
    /** Already chosen — offering them again would only produce a duplicate. */
    exclude?: number[];
    onPick: (o: Picked) => void;
    placeholder?: string;
    autoFocus?: boolean;
    /** Offer the typed name as somebody who is not in the Free Company. */
    allowGuest?: boolean;
  },
) {
  const { t } = useLang();
  const faces = useAvatarOverrides();
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
              {(faces[o.id] ?? o.avatar) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={faces[o.id] ?? o.avatar ?? ""} alt=""
                     className="size-5 rounded-full object-cover" />
              )}
              {o.name}
            </button>
          ))}
        </div>
      )}
      {/* Dashed, and under the matches: this is the way out when none of them
          is the answer, and it should not look like one of them. */}
      {allowGuest && q.length >= 2 && (
        <button onClick={() => { onPick({ id: null, name: typed.trim() }); setTyped(""); }}
                className="mt-1.5 w-full rounded-md border border-dashed border-line px-2.5 py-1 text-left text-[12px] text-muted hover:border-accent hover:text-accent">
          {t("gallery.tagGuestAs", { name: typed.trim() })}
        </button>
      )}

      {q.length >= 2 && hits.length === 0 && !allowGuest && (
        <p className="mt-1.5 text-[12px] text-muted">{t("gallery.nothingFound")}</p>
      )}
    </div>
  );
}

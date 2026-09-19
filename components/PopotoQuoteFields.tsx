"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";

export type Author = { id: number | null; name: string };

/*
 * A flavour's line is kept as one body, Thai on the first line and English on
 * the second, which is also how the unwrapped gift shows it. The two boxes here
 * are that body taken apart and put back together, so neither language can be
 * edited into the other's line.
 */
const TH_MAX = 150, EN_MAX = 149; // with the newline between, the body's 300

export const splitBody = (body: string) => {
  const cut = body.indexOf("\n");
  if (cut < 0) {
    // A single line with no Thai in it is the English half on its own.
    return /[฀-๿]/.test(body) ? { th: body, en: "" } : { th: "", en: body };
  }
  return { th: body.slice(0, cut).trim(), en: body.slice(cut + 1).replace(/\n+/g, " ").trim() };
};
// While typing: no line breaks, but a space at the end stays so the next word
// can follow it. On saving: trimmed too.
const noBreaks = (s: string) => s.replace(/\r?\n+/g, " ");
const oneLine = (s: string) => noBreaks(s).replace(/\s{2,}/g, " ").trim();
export const joinBody = (th: string, en: string) =>
  [oneLine(th), oneLine(en)].filter(Boolean).join("\n");

const inputCls = "rounded-lg border border-line bg-surface px-3 py-2 text-lead text-ink placeholder:text-muted";

/** The two halves of a line, one box each. */
export function QuoteFields(
  { th, en, onTh, onEn }: { th: string; en: string; onTh: (v: string) => void; onEn: (v: string) => void },
) {
  const { t } = useLang();
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-ui text-muted">{t("adm.quoteTh")}</span>
        <textarea value={th} rows={2} maxLength={TH_MAX}
                  onChange={(e) => onTh(noBreaks(e.target.value))} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ui text-muted">{t("adm.quoteEn")}</span>
        <textarea value={en} rows={2} maxLength={EN_MAX}
                  onChange={(e) => onEn(noBreaks(e.target.value))} className={inputCls} />
      </label>
    </div>
  );
}

/** Who wrote a line: an FC member from the list, or a name typed as it is. */
export function AuthorField(
  { who, onWho, memberOptions }: {
    who: Author | null;
    onWho: (a: Author | null) => void;
    memberOptions: { id: number; name: string }[];
  },
) {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return memberOptions.filter((m) => m.name.toLowerCase().includes(s)).slice(0, 6);
  }, [q, memberOptions]);

  if (who) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-lead text-ink">
        {t("adm.quoteAuthor")}: <b className="font-medium">{who.name}</b>
        {who.id == null && <span className="text-ui text-muted">{t("adm.quoteAuthorTyped")}</span>}
        <button type="button" onClick={() => { onWho(null); setQ(""); }}
                className="rounded-md border border-line px-2 py-0.5 text-ui text-muted hover:border-accent hover:text-accent">
          {t("adm.quoteAuthorChange")}
        </button>
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <input value={q} onChange={(e) => setQ(e.target.value)}
             placeholder={t("adm.quoteAuthor")} className={inputCls} />
      <div className="flex flex-wrap gap-1.5">
        {found.map((m) => (
          <button key={m.id} type="button" onClick={() => onWho({ id: m.id, name: m.name })}
                  className="rounded-full border border-line px-2.5 py-1 text-read text-ink hover:border-accent">
            {m.name}
          </button>
        ))}
        {q.trim().length >= 2 && !found.length && (
          <button type="button" onClick={() => onWho({ id: null, name: q.trim() })}
                  className="rounded-full border border-dashed border-line px-2.5 py-1 text-read text-muted hover:border-accent">
            “{q.trim()}”
          </button>
        )}
      </div>
    </div>
  );
}

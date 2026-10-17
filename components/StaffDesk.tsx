"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DiscordGlyph, FacebookGlyph, LockGlyph } from "@/components/ui/ContactIcons";
import { useAdmin } from "@/lib/admin";
import { allContacts, facebookHref, type Contact } from "@/lib/contacts";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export interface StaffPerson { id: number; name: string; face?: string | null }
interface Row extends StaffPerson { c: Contact; gone?: boolean }

/** A screenful at a time, as on Aqua's list. */
const PAGE = 40;

/**
 * The staff page (v279): every member's Discord and Facebook, to read.
 *
 * Staff are ordinary members everywhere else on the site; this is the one
 * thing more they have. The admins type the contacts in on Aqua's page and
 * see this page too, with a way back there to change one.
 *
 * Who may read the contacts is the database's to say, and it says so on the
 * table: an account that is neither staff nor admin is handed no rows at all.
 * `canSeeStaff` below only decides whether to draw the page or the notice.
 *
 * Only the members with something on file are listed. Staff come here to
 * find how to reach somebody, and five hundred names with nothing beside them
 * would bury the forty that have.
 */
export default function StaffDesk({ people }: { people: StaffPerson[] }) {
  const { t } = useLang();
  const { canSeeStaff, isAdmin, ready } = useAdmin();
  const [supabase] = useState(createClient);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [onFile, setOnFile] = useState<Map<number, Contact>>(new Map());
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const query = useDeferredValue(q).trim().toLowerCase();

  useEffect(() => {
    if (!canSeeStaff) return;
    if (!supabase) { setState("missing"); return; }
    let live = true;
    void allContacts(supabase).then(({ rows, missing }) => {
      if (!live) return;
      setOnFile(new Map(rows.map((r) => [r.character_id, { discord: r.discord, facebook: r.facebook }])));
      setState(missing ? "missing" : "ready");
    });
    return () => { live = false; };
  }, [supabase, canSeeStaff]);

  const rows = useMemo<Row[]>(() => {
    const byId = new Map(people.map((p) => [p.id, p]));
    const out: Row[] = [];
    for (const [id, c] of onFile) {
      const p = byId.get(id);
      out.push(p ? { ...p, c } : { id, name: `#${id}`, c, gone: true });
    }
    return out.sort((a, b) => Number(!!a.gone) - Number(!!b.gone) || a.name.localeCompare(b.name));
  }, [people, onFile]);

  const shown = useMemo(() => (query ? rows.filter((r) =>
    r.name.toLowerCase().includes(query)
    || !!r.c.discord?.toLowerCase().includes(query)
    || !!r.c.facebook?.toLowerCase().includes(query)) : rows), [rows, query]);

  if (!ready) return null;

  if (!canSeeStaff) {
    return (
      <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
        {t("staff.denied")}
      </div>
    );
  }

  return (
    <main className="pt-7">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="font-data text-meta uppercase tracking-[0.22em] text-accent">{t("staff.eyebrow")}</div>
          <h1 className="mt-1 font-display text-lead font-semibold text-ink">{t("staff.title")}</h1>
        </div>
        {isAdmin && (
          <Link href="/admin/aqua#contacts"
                className="rounded-lg border border-line px-3 py-1.5 text-ui text-muted no-underline hover:border-gold hover:text-gold">
            {t("staff.editAtAqua")} ↗
          </Link>
        )}
      </header>
      <p className="mt-2 max-w-prose text-read leading-relaxed text-muted">{t("staff.lead")}</p>

      {state === "loading" && <div className="skeleton mt-5 h-40 rounded-xl" aria-hidden />}
      {state === "missing" && (
        <p className="mt-5 text-read leading-relaxed text-muted">{t("staff.notYet")}</p>
      )}

      {state === "ready" && (
        <section className="mt-5 rounded-xl border border-line bg-card p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <input value={q} type="search"
                   onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }}
                   placeholder={t("contact.search")} aria-label={t("contact.search")}
                   className="min-h-11 min-w-0 flex-1 basis-full rounded-lg border border-line bg-bg/40 px-3 py-2 text-ink placeholder:text-muted sm:basis-56" />
            <span className="font-data text-ui text-muted">{t("staff.count", { n: rows.length })}</span>
          </div>

          {/* The two columns named once, where there is room for columns. */}
          <div className="mt-3 hidden grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-2.5 font-data text-meta text-muted sm:grid">
            <span />
            <span className="flex items-center gap-1.5"><DiscordGlyph size={13} /> Discord</span>
            <span className="flex items-center gap-1.5">
              <FacebookGlyph size={13} /> Facebook
              <span className="inline-flex items-center gap-1 text-gold">
                <LockGlyph size={11} /> {t("contact.adminOnly")}
              </span>
            </span>
          </div>

          <ul className="mt-2 flex flex-col gap-2 sm:mt-1.5">
            {shown.slice(0, limit).map((r) => <StaffRow key={r.id} row={r} />)}
          </ul>
          {shown.length === 0 && (
            <p className="mt-3 text-read text-muted">{rows.length ? t("contact.none") : t("staff.empty")}</p>
          )}
          {shown.length > limit && (
            <button type="button" onClick={() => setLimit(limit + PAGE)}
                    className="mt-3 rounded-lg border border-line px-3 py-2 text-ui text-muted hover:border-accent hover:text-accent">
              {t("contact.more", { n: Math.min(PAGE, shown.length - limit) })}
            </button>
          )}
        </section>
      )}
    </main>
  );
}

const chip =
  "inline-flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-md border bg-bg/40 px-3 py-1 text-ui text-ink/85 no-underline transition-colors hover:text-ink sm:min-h-9";

/** One member: a face to know them by, and the two ways to reach them. */
function StaffRow({ row }: { row: Row }) {
  const { t } = useLang();
  const [copied, setCopied] = useState<"discord" | "facebook" | null>(null);
  const { discord, facebook } = row.c;
  const fbHref = facebookHref(facebook);

  const copy = async (what: "discord" | "facebook", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt(t("contact.copy"), text);
      return;
    }
    setCopied(what);
    setTimeout(() => setCopied(null), 1400);
  };
  const tick = <span aria-hidden className="w-[15px] shrink-0 text-center leading-none text-jade">✓</span>;
  const none = <span className="px-1 text-ui text-muted/70">{t("staff.none")}</span>;

  return (
    <li className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-bg/40 p-2.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {row.face ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.face} alt="" width={28} height={28} loading="lazy" decoding="async"
               className="size-7 shrink-0 rounded-full border border-line object-cover" />
        ) : (
          <span aria-hidden className="size-7 shrink-0 rounded-full border border-line bg-bg" />
        )}
        <span className="min-w-0">
          {row.gone ? (
            <span className="block truncate font-data font-semibold text-ink">{row.name}</span>
          ) : (
            <Link href={`/member/${row.id}`} prefetch={false}
                  className="block truncate font-data font-semibold text-ink no-underline hover:text-accent">
              {row.name}
            </Link>
          )}
          {row.gone && <span className="block text-meta text-gold">{t("contact.gone")}</span>}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="w-20 shrink-0 font-data text-meta text-muted sm:hidden">Discord</span>
        {discord ? (
          <button type="button" onClick={() => copy("discord", discord)}
                  aria-label={t("contact.copyDiscord", { name: discord })}
                  className={`${chip} border-[#5865F2]/70 hover:bg-[#5865F2]/20`}>
            {copied === "discord" ? tick : <DiscordGlyph className="text-[#a5b2ff]" />}
            <span className="truncate">{discord}</span>
          </button>
        ) : none}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="w-20 shrink-0 font-data text-meta text-muted sm:hidden">Facebook</span>
        {facebook ? (fbHref ? (
          <a href={fbHref} target="_blank" rel="noopener noreferrer"
             aria-label={t("contact.openFacebook", { name: row.name })}
             className={`${chip} border-gold/50 hover:bg-gold/10`}>
            <FacebookGlyph />
            {/* The mark already says Facebook; the part after the address is the part that tells people apart. */}
            <span className="truncate">{fbHref.replace(/^https:\/\/(www\.|m\.)?(facebook\.com|fb\.com)\//i, "") || facebook}</span>
          </a>
        ) : (
          <button type="button" onClick={() => copy("facebook", facebook)}
                  aria-label={t("contact.copyFacebook", { name: facebook })}
                  className={`${chip} border-gold/50 hover:bg-gold/10`}>
            {copied === "facebook" ? tick : <FacebookGlyph />}
            <span className="truncate">{facebook}</span>
          </button>
        )) : none}
      </div>
    </li>
  );
}

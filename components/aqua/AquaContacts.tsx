"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DiscordGlyph, FacebookGlyph, LockGlyph } from "@/components/ui/ContactIcons";
import {
  DISCORD_MAX, FACEBOOK_MAX, allContacts, saveContact, tidy, type Contact,
} from "@/lib/contacts";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export interface ContactPerson { id: number; name: string; face?: string | null; gone?: boolean }
type Mode = "all" | "filled" | "empty";

/** A screenful. Five hundred pairs of fields is a page nobody can scroll. */
const PAGE = 30;
const fieldCls =
  "min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-1.5 text-read text-ink placeholder:text-muted";

/**
 * Everybody's Discord and Facebook, for the one who types them in.
 *
 * On Aqua's page because the typing is hers: she fills these by hand from
 * what members tell her (v157), which is five hundred characters and no
 * shortcut. So this is the list to work down, with a name to look somebody up
 * by and "not yet" to see who is left. The same two fields open from each
 * member's own page for an admin, for the one that turns up in passing.
 *
 * Folded until it is asked for. Thirty pairs of fields in the middle of her
 * page would push the gil she came to read off the bottom of a phone, and
 * most evenings she is not here to type. The heading still says how many are
 * on file, and /admin/aqua#contacts opens it.
 *
 * A row saves by itself. A Save for the whole list would be a button that
 * loses forty names the first time the tab is closed without it.
 *
 * Somebody who has left the roster keeps their row here, named by number,
 * until an admin clears it. The site would otherwise be holding a Facebook
 * for a person nobody could find to remove.
 */
export default function AquaContacts(
  { people: roster, className = "" }: {
    /** Everybody with a page: the roster, then the guests. */
    people: ContactPerson[];
    className?: string;
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const box = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  /** Once opened the rows stay, so folding it does not throw away what was being typed. */
  const [everOpen, setEverOpen] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [onFile, setOnFile] = useState<Map<number, Contact>>(new Map());
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [limit, setLimit] = useState(PAGE);
  /** The last thing that happened, said once for the whole list. */
  const [said, setSaid] = useState("");
  const query = useDeferredValue(q).trim().toLowerCase();

  useEffect(() => {
    if (!supabase) { setState("missing"); return; }
    let live = true;
    void allContacts(supabase).then(({ rows, missing }) => {
      if (!live) return;
      setOnFile(new Map(rows.map((r) => [r.character_id, { discord: r.discord, facebook: r.facebook }])));
      setState(missing ? "missing" : "ready");
    });
    return () => { live = false; };
  }, [supabase]);

  // Linked to by name, the way the admin page's tabs are.
  useEffect(() => {
    const jump = () => {
      if (window.location.hash !== "#contacts") return;
      setOpen(true);
      setEverOpen(true);
      box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    jump();
    window.addEventListener("hashchange", jump);
    return () => window.removeEventListener("hashchange", jump);
  }, []);

  const people = useMemo<ContactPerson[]>(() => {
    const known = new Set(roster.map((o) => o.id));
    const gone = [...onFile.keys()].filter((id) => !known.has(id))
      .map((id) => ({ id, name: `#${id}`, gone: true }));
    return [...roster, ...gone];
  }, [roster, onFile]);

  const counts = useMemo(() => {
    const filled = people.filter((p) => onFile.has(p.id)).length;
    return { all: people.length, filled, empty: people.length - filled };
  }, [people, onFile]);

  const shown = useMemo(() => people.filter((p) => {
    const c = onFile.get(p.id);
    if (mode === "filled" && !c) return false;
    if (mode === "empty" && c) return false;
    if (!query) return true;
    // By what was typed in as well: "whose Discord is this" is asked from the
    // other end as often as from the name.
    return p.name.toLowerCase().includes(query)
      || !!c?.discord?.toLowerCase().includes(query)
      || !!c?.facebook?.toLowerCase().includes(query);
  }), [people, onFile, mode, query]);

  const MODES: [Mode, string][] = [
    ["all", t("contact.all", { n: counts.all })],
    ["filled", t("contact.filled", { n: counts.filled })],
    ["empty", t("contact.empty", { n: counts.empty })],
  ];

  return (
    <details ref={box} id="contacts" open={open} className={`scroll-mt-24 ${className}`}
             onToggle={(e) => {
               const now = e.currentTarget.open;
               setOpen(now);
               if (now) setEverOpen(true);
             }}>
      <summary className="cursor-pointer font-display text-title font-semibold">
        {t("contact.listTitle")}
        {state === "ready" && (
          <span className="ml-2 font-body text-ui font-normal text-muted">
            {t("contact.listCount", { n: counts.filled, all: counts.all })}
          </span>
        )}
      </summary>

      {everOpen && state === "loading" && (
        <div className="skeleton mt-3 h-24 rounded-lg" aria-hidden />
      )}
      {everOpen && state === "missing" && (
        <p className="mt-3 text-read leading-relaxed text-muted">{t("contact.notYet")}</p>
      )}

      {everOpen && state === "ready" && (
        <>
          <p className="mt-2 text-ui leading-relaxed text-muted">{t("contact.listHint")}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input value={q}
                   onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }}
                   placeholder={t("contact.search")} aria-label={t("contact.search")}
                   className="min-w-[200px] flex-1 rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted" />
            <div className="flex flex-wrap gap-1.5">
              {MODES.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={mode === k}
                        onClick={() => { setMode(k); setLimit(PAGE); }}
                        className={`rounded-md border px-2.5 py-1 text-ui transition-colors ${
                          mode === k ? "border-accent bg-accent/15 text-accent"
                                     : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Always there, so a screen reader hears what is put into it. */}
          <div role="status" className="mt-2 min-h-5 text-ui text-jade">{said}</div>

          {/* The two columns named once, where there is room for columns. */}
          <div className="mt-1 hidden grid-cols-[minmax(0,13rem)_1fr_1fr_5rem] gap-2 px-2.5 font-data text-meta text-muted sm:grid">
            <span />
            <span className="flex items-center gap-1.5">
              <DiscordGlyph size={13} /> Discord · {t("contact.fcOnly")}
            </span>
            <span className="flex items-center gap-1.5">
              <FacebookGlyph size={13} /> Facebook ·
              <span className="inline-flex items-center gap-1 text-gold">
                <LockGlyph size={11} /> {t("contact.adminOnly")}
              </span>
            </span>
            <span />
          </div>

          <div className="mt-1.5 flex flex-col gap-2">
            {shown.slice(0, limit).map((p) => (
              <Row key={p.id} person={p} was={onFile.get(p.id) ?? null}
                   save={(next) => saveContact(supabase!, p.id, next)}
                   onSaved={(next) => {
                     const stands = !!(next.discord || next.facebook);
                     setOnFile((m) => {
                       const n = new Map(m);
                       if (stands) n.set(p.id, next); else n.delete(p.id);
                       return n;
                     });
                     setSaid(t(stands ? "contact.savedFor" : "contact.removedFor", { name: p.name }));
                   }} />
            ))}
            {shown.length === 0 && (
              <div className="text-read text-muted">{t("contact.none")}</div>
            )}
            {shown.length > limit && (
              <button type="button" onClick={() => setLimit(limit + PAGE)}
                      className="self-start rounded-lg border border-line px-3 py-1.5 text-ui text-muted hover:border-accent hover:text-accent">
                {t("contact.more", { n: Math.min(PAGE, shown.length - limit) })}
              </button>
            )}
          </div>
        </>
      )}
    </details>
  );
}

/** One member: a face to know them by, two fields, and a Save that wakes when either has changed. */
function Row(
  { person, was, save, onSaved }: {
    person: ContactPerson;
    was: Contact | null;
    save: (c: Contact) => Promise<string | null>;
    onSaved: (c: Contact) => void;
  },
) {
  const { t } = useLang();
  const [discord, setDiscord] = useState(was?.discord ?? "");
  const [facebook, setFacebook] = useState(was?.facebook ?? "");
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState("");
  const dirty = tidy(discord) !== (was?.discord ?? null) || tidy(facebook) !== (was?.facebook ?? null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || busy) return;
    const next = { discord: tidy(discord), facebook: tidy(facebook) };
    setBusy(true);
    setWhy("");
    const error = await save(next);
    setBusy(false);
    if (error) { setWhy(error); return; }
    // As the database kept them, so the fields and the row agree again.
    setDiscord(next.discord ?? "");
    setFacebook(next.facebook ?? "");
    onSaved(next);
  };

  return (
    <form onSubmit={submit}
          className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-bg/40 p-2.5 sm:grid-cols-[minmax(0,13rem)_1fr_1fr_5rem] sm:items-center">
      <div className="flex min-w-0 items-center gap-2">
        {person.face ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.face} alt="" width={28} height={28} loading="lazy" decoding="async"
               className="size-7 shrink-0 rounded-full border border-line object-cover" />
        ) : (
          <span aria-hidden className="size-7 shrink-0 rounded-full border border-line bg-bg" />
        )}
        <span className="min-w-0">
          {person.gone ? (
            <span className="block truncate font-data font-semibold text-ink">{person.name}</span>
          ) : (
            <Link href={`/member/${person.id}`} prefetch={false}
                  className="block truncate font-data font-semibold text-ink no-underline hover:text-accent">
              {person.name}
            </Link>
          )}
          {person.gone && (
            <span className="block text-meta text-gold">{t("contact.gone")}</span>
          )}
        </span>
      </div>

      <label className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="flex w-24 shrink-0 items-center gap-1.5 font-data text-meta text-muted sm:hidden">
          <DiscordGlyph size={13} /> Discord
        </span>
        <span className="sr-only">Discord · {person.name}</span>
        <input value={discord} maxLength={DISCORD_MAX}
               onChange={(e) => setDiscord(e.target.value)}
               placeholder={t("contact.discordPh")}
               autoComplete="off" autoCapitalize="none" spellCheck={false}
               className={fieldCls} />
      </label>

      <label className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="flex w-24 shrink-0 items-center gap-1.5 font-data text-meta text-muted sm:hidden">
          <FacebookGlyph size={13} /> Facebook
          <LockGlyph size={11} className="text-gold" />
        </span>
        <span className="sr-only">Facebook · {person.name}</span>
        <input value={facebook} maxLength={FACEBOOK_MAX}
               onChange={(e) => setFacebook(e.target.value)}
               placeholder={t("contact.facebookPh")}
               autoComplete="off" autoCapitalize="none" spellCheck={false}
               className={fieldCls} />
      </label>

      <button type="submit" disabled={!dirty || busy}
              className="justify-self-end rounded-lg border border-accent bg-accent/15 px-3 py-1.5 text-ui text-accent hover:bg-accent/25 disabled:border-line disabled:bg-transparent disabled:text-muted sm:justify-self-stretch">
        {t("adm.save")}
      </button>

      {why && (
        <p role="alert"
           className="rounded-lg border border-chili/60 bg-chili/10 px-3 py-1.5 text-ui leading-relaxed text-ink sm:col-span-4">
          {t("adm.saveFailed", { why })}
        </p>
      )}
    </form>
  );
}

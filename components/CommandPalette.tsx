"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { Drawer } from "vaul";
import { motion } from "motion/react";
import { useLang } from "@/lib/i18n";

/**
 * Find anybody, or go anywhere, without reaching for the mouse.
 *
 * Five hundred people are on this board and finding one of them meant loading
 * the member list, finding the search box and typing into it — three steps for
 * the thing people do here more than anything else. Slash opens this from any
 * page, and Enter is on the member's page.
 *
 * The index is names and ids only, built in the server layout. members.json is
 * 800 KB and none of the rest of it is needed to answer "who did you mean" —
 * shipping the whole file to every page so the palette could read two fields
 * would cost more than the feature is worth.
 *
 * A dialog on a desktop and a sheet on a phone, which is the same decision every
 * native app makes: a centred box with a keyboard over it leaves nowhere to
 * show results, while a sheet rises to meet the keyboard and keeps the list in
 * the half of the screen a thumb can reach.
 */

export interface PaletteMember { id: number; name: string }

const PAGES: { href: string; key: string }[] = [
  { href: "/members", key: "nav.members" },
  { href: "/leaderboards", key: "nav.leaderboards" },
  { href: "/gallery", key: "nav.gallery" },
  { href: "/guides", key: "nav.guides" },
  { href: "/feedback", key: "nav.feedback" },
];

export default function CommandPalette({ members }: { members: PaletteMember[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState(false);
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Slash is the one people reach for, and the one that has to be given up
      // the moment somebody is typing a name into a box of their own.
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA"
                            || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    // The button in the header asks through an event rather than through shared
    // state: the palette lives at the top of the tree and the button is several
    // levels down inside the nav, and threading a setter between them would
    // have meant a context for one boolean.
    const onAsk = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", onAsk);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", onAsk);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  // Capped, because a list of five hundred is not a list anybody reads and
  // cmdk would be scoring every one of them on every keystroke.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 8);
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 40);
  }, [members, query]);

  const body = (
    <Command
      // Filtering is done above, on the substring somebody actually typed.
      // cmdk's own fuzzy scoring turned "Aka" into a list led by names with no
      // A, k and a in that order anywhere near each other.
      shouldFilter={false}
      className="flex max-h-[70vh] flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line px-4">
        <svg viewBox="0 0 24 24" aria-hidden width="15" height="15" fill="none"
             stroke="currentColor" strokeWidth="2.2" className="shrink-0 text-muted">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <Command.Input
          value={query} onValueChange={setQuery}
          placeholder={t("palette.placeholder")}
          className="w-full bg-transparent py-3.5 text-[14px] text-ink outline-none placeholder:text-muted" />
        <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 font-data text-[10.5px] text-muted sm:block">
          esc
        </kbd>
      </div>

      <Command.List className="overflow-y-auto overscroll-contain px-2 py-2">
        <Command.Empty className="px-2 py-6 text-center text-[13px] text-muted">
          {t("palette.empty")}
        </Command.Empty>

        {!query && (
          <Command.Group heading={t("palette.pages")}
                         className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:font-data [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted">
            {PAGES.map((p) => (
              <Command.Item key={p.href} value={p.href} onSelect={() => go(p.href)}
                            className="flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-[13.5px] text-ink data-[selected=true]:bg-card data-[selected=true]:text-accent">
                {t(p.key as Parameters<typeof t>[0])}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading={t("palette.members")}
                       className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:font-data [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted">
          {shown.map((m, i) => (
            <Command.Item key={m.id} value={`${m.name}#${m.id}`}
                          onSelect={() => go(`/member/${m.id}`)}
                          asChild>
              {/* Staggered, but only just: enough that the list reads as
                  arriving rather than blinking, and capped so the twentieth
                  result is not still waiting its turn. */}
              <motion.div
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.14, delay: Math.min(i, 8) * 0.012 }}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-[13.5px] text-ink data-[selected=true]:bg-card data-[selected=true]:text-accent">
                <span className="truncate font-data">{m.name}</span>
                <span className="shrink-0 font-data text-[11px] text-muted">
                  #{m.id}
                </span>
              </motion.div>
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command>
  );

  if (phone) {
    return (
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[70] bg-bg/80 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[71] mt-24 flex flex-col rounded-t-2xl border border-line bg-surface outline-none">
            <Drawer.Title className="sr-only">{t("palette.placeholder")}</Drawer.Title>
            {/* The handle is not decoration: it is the affordance that says this
                can be dragged away, which on a phone is how people close things. */}
            <div className="mx-auto my-2.5 h-1 w-10 shrink-0 rounded-full bg-line" />
            {body}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="pop-in fixed inset-0 z-[70] bg-bg/80 backdrop-blur-sm" />
        <Dialog.Content className="pop-in fixed left-1/2 top-[15vh] z-[71] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/60">
          <Dialog.Title className="sr-only">{t("palette.placeholder")}</Dialog.Title>
          {body}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

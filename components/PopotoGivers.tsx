"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { useAvatarOverrides } from "@/lib/avatars";
import { HoverCard } from "@/components/ui/HoverCard";
import { fmtDateTime } from "@/lib/dates";

export interface Giver {
  name: string;
  avatar: string | null;
  at: string;
}

/** Where the potatoes came from. The two sources keep separate books. */
export type PopotoKind = "profile" | "post";

const PEEK = 6;     // how many the hover shows
const PAGE = 30;    // how many the dialog fetches at a time

/**
 * Who gave the potatoes, on hover and then in full.
 *
 * A count on its own says a picture or a person was liked and nothing about by
 * whom, which is the part people actually want — this is an FC, not an audience.
 * The hover answers it for the handful most recent; the dialog behind it is the
 * same list without a ceiling, fetched a page at a time as it is scrolled.
 *
 * The two sources are separate tables on purpose and stay separate here: the
 * button on a profile is once per person per day and lives in `kudos`, and the
 * one under a picture is once per person ever and lives in `gallery_likes`.
 * They are counted apart on the leaderboards, so they are read apart here.
 */
export default function PopotoGivers(
  { kind, id, count, className = "", children }: {
    kind: PopotoKind;
    /** The character for a profile, the post for a picture. */
    id: number;
    count: number;
    /** For the trigger itself — how it sits against whatever it is joined to. */
    className?: string;
    /** The thing being pointed at — usually the count itself. */
    children: React.ReactNode;
  },
) {
  const { t } = useLang();
  const supabase = useMemo(() => createClient(), []);
  const chosen = useAvatarOverrides();
  const [peek, setPeek] = useState<Giver[] | null>(null);
  const [all, setAll] = useState<Giver[]>([]);
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);

  /**
   * One page of givers, newest first.
   *
   * The join is done here rather than through an embedded select: a potato on a
   * profile is filed against the character it was given to and the account that
   * gave it, and a potato on a picture against the account alone, so the two
   * queries do not have the same shape and would each need their own embed
   * anyway.
   */
  const fetchPage = useCallback(async (from: number, take: number): Promise<Giver[]> => {
    if (!supabase) return [];
    const table = kind === "profile" ? "kudos" : "gallery_likes";
    const owner = kind === "profile" ? "receiver_character_id" : "post_id";
    const who = kind === "profile" ? "sender_id" : "profile_id";
    const { data } = await supabase.from(table)
      .select(`${who}, created_at`).eq(owner, id)
      .order("created_at", { ascending: false })
      .range(from, from + take - 1);
    const rows = (data ?? []) as Record<string, string>[];
    if (!rows.length) return [];

    const ids = [...new Set(rows.map((r) => r[who]).filter(Boolean))];
    const { data: people } = await supabase.from("profiles")
      .select("id, character_id, character_name, display_name, discord_username, discord_avatar")
      .in("id", ids);
    const by: Record<string, { name: string; avatar: string | null; cid: number | null }> = {};
    for (const p of (people ?? []) as Record<string, unknown>[]) {
      by[p.id as string] = {
        name: (p.character_name as string | null)
          ?? (p.display_name as string | null)
          ?? (p.discord_username as string | null) ?? "—",
        avatar: (p.discord_avatar as string | null) ?? null,
        cid: (p.character_id as number | null) ?? null,
      };
    }
    return rows.map((r) => {
      const p = by[r[who]];
      return {
        name: p?.name ?? "—",
        // The face they chose, the same as everywhere else on the site.
        avatar: (p?.cid ? chosen[p.cid] : null) ?? p?.avatar ?? null,
        at: r.created_at,
      };
    });
  }, [supabase, kind, id, chosen]);

  // Only when somebody points at it. A page of pictures should not fetch the
  // givers of every potato on it before anybody has asked.
  const onPeek = async () => {
    if (peek || !count) return;
    setPeek(await fetchPage(0, PEEK));
  };

  useEffect(() => {
    if (!open || all.length) return;
    void (async () => {
      setBusy(true);
      const first = await fetchPage(0, PAGE);
      setAll(first);
      setMore(first.length === PAGE);
      setBusy(false);
    })();
  }, [open, all.length, fetchPage]);

  const loadMore = async () => {
    if (busy || !more) return;
    setBusy(true);
    const next = await fetchPage(all.length, PAGE);
    setAll((v) => [...v, ...next]);
    setMore(next.length === PAGE);
    setBusy(false);
  };

  if (!count) return <>{children}</>;

  const row = (g: Giver, i: number) => (
    <div key={i} className="flex items-center gap-2 py-1">
      {g.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={g.avatar} alt="" loading="lazy"
             className="size-6 shrink-0 rounded-full border border-line object-cover" />
      ) : (
        <span className="size-6 shrink-0 rounded-full border border-line bg-card" />
      )}
      <span className="min-w-0 flex-1 truncate font-data text-[12.5px] text-ink">
        {g.name}
      </span>
      <span className="shrink-0 text-[11.5px] text-muted">{fmtDateTime(g.at)}</span>
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <HoverCard
        side="top"
        trigger={
          <Dialog.Trigger asChild>
            <button type="button" onMouseEnter={onPeek} onFocus={onPeek}
                    className={`inline-flex cursor-pointer ${className}`}>
              {children}
            </button>
          </Dialog.Trigger>
        }>
        <div className="flex flex-col gap-1">
          <div className="mb-0.5 text-[12px] text-muted">
            {t("popoto.whoGave", { n: count })}
          </div>
          {peek === null
            ? <div className="text-[12px] text-muted">{t("common.loading")}</div>
            : peek.map(row)}
          {count > PEEK && (
            // A second way into the same dialog. The line was already telling
            // people to click, and a hover card is somewhere the pointer can
            // go, so the sentence that says "click" may as well be the thing
            // that answers to it.
            <Dialog.Trigger asChild>
              <button type="button"
                      className="mt-1 w-full cursor-pointer border-t border-line/70 pt-1.5 text-left text-[11.5px] text-accent hover:underline">
                {t("popoto.seeAll", { n: count })}
              </button>
            </Dialog.Trigger>
          )}
        </div>
      </HoverCard>

      <Dialog.Portal>
        <Dialog.Overlay className="pop-in fixed inset-0 z-[60] bg-bg/80 backdrop-blur-sm" />
        <Dialog.Content
          className="pop-in fixed left-1/2 top-1/2 z-[61] flex max-h-[80vh] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-line bg-surface shadow-2xl shadow-black/60">
          <Dialog.Title className="border-b border-line px-4 py-3 font-display text-[14px] font-semibold text-ink">
            {t("popoto.whoGave", { n: count })}
          </Dialog.Title>
          {/* The list scrolls and asks for more when it nears the end, rather
              than putting a page number under it — this is a list of names, and
              paging one is a chore invented by databases. */}
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight > el.scrollHeight - 80) void loadMore();
            }}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
            {all.map(row)}
            {busy && (
              <div className="py-2 text-center text-[12px] text-muted">
                {t("common.loading")}
              </div>
            )}
          </div>
          <Dialog.Close className="border-t border-line px-4 py-2.5 text-[13px] text-muted hover:text-ink">
            {t("common.close")}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

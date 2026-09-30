"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import type { Message } from "@/lib/threads";
import Modal, { SHEET_WIDE, Sheet, useIsPhone, useRoomBeside } from "@/components/ui/Modal";

/**
 * A picture in a window of its own, with its conversation beside it.
 *
 * The party finder's arrangement, for the gallery and the glamour contest:
 * the thing itself on the left and what people are saying about it on the
 * right, where the screen has room for both; the conversation covering the
 * window where it has not; and on a phone the two sharing the height, the
 * picture above and the talk below. See ui/Modal's `beside` and `Sheet`.
 *
 * It opened as one long column — the picture, the caption, the buttons and
 * then the comments at the foot — which put the newest thing anybody said
 * under a 4K screenshot, and a reply meant scrolling past the photograph to
 * write it. Here the conversation is a room of its own, open from the start
 * where there is room for it and one tap away where there is not, with the
 * last thing said on the door.
 *
 * `talk` is null for a window with no conversation to show.
 */
export default function TalkWindow(
  { onClose, title, subtitle, icon, children, talk }: {
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    children: ReactNode;
    talk: {
      /** The messages, for the door: how many, and the last one. */
      messages: Message[];
      /** The panel's heading. */
      title: string;
      /** The conversation itself — ui/Messages in its `chat` shape. */
      body: ReactNode;
    } | null;
  },
) {
  const { t } = useLang();
  const [chatting, setChatting] = useState(false);
  const roomBeside = useRoomBeside();
  const phone = useIsPhone();

  /*
   * Open with the window where there is room for it, once, on the way in —
   * the same rule as a party. Somebody who closes it has closed it, and the
   * media query settling a moment after the first render is not a reason to
   * open it over them again.
   */
  const greeted = useRef(false);
  useEffect(() => {
    if (!talk || !roomBeside || greeted.current) return;
    greeted.current = true;
    setChatting(true);
  }, [roomBeside, talk]);

  const said = (talk?.messages ?? []).filter((m) => !m.deletedAt);
  const last = talk?.messages.length ? talk.messages[talk.messages.length - 1] : null;

  return (
    <Modal open wide onOpenChange={(v) => { if (!v) onClose(); }}
           beside={talk && chatting ? SHEET_WIDE : undefined}
           /* Side by side the pair keeps one ✕, the panel's. */
           hideClose={!!talk && chatting && roomBeside}
           title={title} subtitle={subtitle} icon={icon}>
      <div className="flex flex-col gap-3">
        {children}

        {/*
          * The door into the conversation, with the last thing said on it.
          *
          * A count of messages does not tell anybody whether to open it; the
          * newest line does. Gone while the conversation is open, because it
          * is then on the screen already.
          */}
        {talk && !chatting && (
          <button type="button" onClick={() => setChatting(true)}
                  className="flex items-center gap-3 rounded-xl border border-line bg-card/40 px-3 py-2.5 text-left transition-colors hover:border-accent/60">
            <span aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-[18px]">
              💬
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-data text-read uppercase tracking-[0.12em] text-muted">
                {said.length === 1 ? t("pf.commentOne")
                  : said.length ? t("pf.commentsN", { n: said.length })
                  : t("party.chatNone")}
              </span>
              {last && (
                <span className="truncate text-lead text-ink/80">
                  <span className="text-accent/80">{last.author.name}</span>
                  {": "}
                  {last.deletedAt ? t("party.msgGone") : last.text || "🖼"}
                </span>
              )}
            </span>
            <span className="ml-auto shrink-0 text-lead text-accent">
              {t("party.chatOpen")} →
            </span>
          </button>
        )}

        {talk && (
          <Sheet open={chatting}
                 /*
                  * Beside the window the two are one thing and this is its ✕,
                  * so closing the conversation closes the pair. Covering the
                  * window, or below it on a phone, it only closes itself.
                  */
                 onOpenChange={(v) => {
                   setChatting(v);
                   if (!v && roomBeside) onClose();
                 }}
                 wide flush split
                 hideClose={phone}
                 quiet={roomBeside || phone}
                 title={talk.title}
                 subtitle={title}>
            {talk.body}
          </Sheet>
        )}
      </div>
    </Modal>
  );
}

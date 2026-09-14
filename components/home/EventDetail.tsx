"use client";

import Modal from "@/components/ui/Modal";
import EventBody from "@/components/home/EventBody";
import type { PersonOption } from "@/lib/people";
import { fmtDate } from "@/lib/dates";
import { useLang } from "@/lib/i18n";
import type { Notice } from "@/lib/events";

/**
 * One notice, opened where it was found.
 *
 * The front page has never been able to hold a whole announcement: a poster is
 * most of a screen on its own, and three of them stacked is a front page that
 * is entirely last month. So the card says what and when, and this says the
 * rest — every picture at the size it was drawn to be read at, the body in
 * full, and the thing an announcement has never had anywhere on this site,
 * which is a reply.
 *
 * The questions were being asked anyway. They were going to Discord, where a
 * costume contest posted on Tuesday is eight messages up by Wednesday and the
 * second person to ask when it starts gets no answer at all.
 *
 * A window rather than a page because a reader who was on the front page should
 * be put back on it — and the same notice has a page of its own at /events/[id]
 * for the link that gets sent. Both draw EventBody.
 */
export default function EventDetail(
  { notice, people, onClose, onCount }: {
    notice: Notice;
    people: PersonOption[];
    onClose: () => void;
    /** So the card behind can say the new number without being reloaded. */
    onCount?: (n: number) => void;
  },
) {
  const { lang } = useLang();
  // The window is headed in the language being read, the same as the card that
  // opened it and the page it can also be reached at.
  const title = (lang === "en" ? notice.title_en : null) || notice.title;
  return (
    <Modal open wide onOpenChange={(v) => { if (!v) onClose(); }}
           title={title} subtitle={fmtDate(notice.created_at)}>
      <EventBody notice={notice} people={people} onCount={onCount} />
    </Modal>
  );
}

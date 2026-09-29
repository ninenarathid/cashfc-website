import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Somebody's page, from wherever their face or name is drawn.
 *
 * A plain span for somebody with no character, who has no page to go to — a
 * friend from off the site written into a seat by name.
 *
 * Not prefetched. A member page is rendered per request (see
 * app/member/[id]/page.tsx), and an alliance with its conversation beside it
 * puts thirty of them on screen at once: a press is worth a fetch, and a
 * glance at the grid is not worth thirty.
 */
export default function ToMember(
  { id, className, children }: {
    id: number | null | undefined;
    className?: string;
    children: ReactNode;
  },
) {
  if (id == null) return <span className={className}>{children}</span>;
  return (
    <Link href={`/member/${id}`} prefetch={false}
          className={`no-underline ${className ?? ""}`}>
      {children}
    </Link>
  );
}

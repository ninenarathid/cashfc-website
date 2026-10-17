import raw from "@/data/members.json";
import StaffDesk from "@/components/StaffDesk";
import type { BoardData } from "@/lib/types";
import { everyone } from "@/lib/people";

export const metadata = { title: "Staff — Cafe And SHabu" };

/**
 * The staff page (v279). A name and a face for everybody with a page, as
 * Aqua's list is handed; the contacts themselves come from the database, and
 * only to staff and admins.
 */
export default function StaffPage() {
  const people = everyone(raw as unknown as BoardData)
    .map((p) => ({ id: p.id, name: p.name, face: p.avatar }));
  return <StaffDesk people={people} />;
}

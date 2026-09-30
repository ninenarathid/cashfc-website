import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import AdminContests from "@/components/contest/AdminContests";
import { everyone } from "@/lib/people";

export const metadata = { title: "Glamour contests — Cafe And SHabu" };

/**
 * The glamour contests, set up and announced. A page of its own rather than
 * a tab on /admin, the way Aqua's gil has one: running a contest is a job
 * somebody comes here to do from start to finish, not a setting in passing.
 */
export default function AdminContestPage() {
  const data = raw as unknown as BoardData;
  return <AdminContests memberOptions={everyone(data)} />;
}

import raw from "@/data/members.json";
import historyRaw from "@/data/history.json";
import MemberBoard from "@/components/MemberBoard";
import FcCharts from "@/components/FcCharts";
import type { BoardData, HistoryRow } from "@/lib/types";

export const metadata = { title: "Members — Cafe And SHabu" };

export default function MembersPage() {
  const data = raw as unknown as BoardData;
  const history = ((historyRaw as { rows?: HistoryRow[] }).rows ?? []);

  // The overview slices its own numbers rather than being handed totals: the activity
  // toggles have to re-cut every chart, which is only possible with the members in
  // hand. No extra payload — the board on this page already ships them.
  return (
    <main className="pt-2">
      <FcCharts
        members={data.members}
        labels={data.current_tier?.labels ?? ["M9S", "M10S", "M11S", "M12S"]}
        history={history}
      />
      <MemberBoard data={data} />
    </main>
  );
}

import raw from "@/data/members.json";
import historyRaw from "@/data/history.json";
import MemberBoard from "@/components/MemberBoard";
import FcCharts from "@/components/FcCharts";
import type { BoardData, HistoryRow } from "@/lib/types";

export const metadata = { title: "สมาชิก — Cafe And SHabu" };

export default function MembersPage() {
  const data = raw as unknown as BoardData;
  const history = ((historyRaw as { rows?: HistoryRow[] }).rows ?? []);
  const labels = data.current_tier?.labels ?? ["M9S", "M10S", "M11S", "M12S"];

  const tagCount = (t: string) =>
    data.members.filter((m) => m.tags.includes(t)).length;
  const tagCounts = [
    { name: "Raider", value: tagCount("raider"), color: "#d14b3a" },
    { name: "Ultimate", value: tagCount("ultimate"), color: "#e5cc80" },
    { name: "Collector", value: tagCount("collector"), color: "#4fb8a8" },
    { name: "Crafter", value: tagCount("crafter"), color: "#c98a5b" },
    { name: "PvP", value: tagCount("pvp"), color: "#7ea6c9" },
    { name: "Casual", value: tagCount("casual"), color: "#9c8f78" },
    { name: "ไม่มีข้อมูล", value: tagCount("unknown"), color: "#55493a" },
  ].filter((x) => x.value > 0);

  const brackets = [
    { name: "100", min: 100, max: 100, color: "#e5cc80" },
    { name: "99", min: 99, max: 99, color: "#e268a8" },
    { name: "95+", min: 95, max: 98, color: "#ff8000" },
    { name: "75+", min: 75, max: 94, color: "#a335ee" },
    { name: "50+", min: 50, max: 74, color: "#2f7fd4" },
    { name: "25+", min: 25, max: 49, color: "#4caf50" },
    { name: "<25", min: 0, max: 24, color: "#7a7a7a" },
  ];
  const parseDist = brackets.map((b) => ({
    name: b.name, color: b.color,
    value: data.members.filter(
      (m) => m.parse != null && m.parse >= b.min && m.parse <= b.max).length,
  }));

  const prog = labels.map((label, i) => ({
    label,
    cleared: data.members.filter((m) => m.current_clears?.[i]).length,
  }));

  return (
    <main className="pt-2">
      <FcCharts
        tagCounts={tagCounts}
        parseDist={parseDist}
        prog={prog}
        total={data.fc.total}
        history={history}
      />
      <MemberBoard data={data} />
    </main>
  );
}

import raw from "@/data/members.json";
import historyRaw from "@/data/history.json";
import MemberBoard from "@/components/MemberBoard";
import FcCharts from "@/components/FcCharts";
import type { BoardData, HistoryRow } from "@/lib/types";
import { RACE_ORDER, isOnVacation } from "@/lib/types";

// One colour per playable race, reused by the overview donut.
const RACE_COLORS: Record<string, string> = {
  Hyur: "#e8a33d", Elezen: "#7ea6c9", Lalafell: "#4fb8a8", "Miqo'te": "#d14b3a",
  Roegadyn: "#c98a5b", "Au Ra": "#a37fd1", Hrothgar: "#e5cc80", Viera: "#8fbf6a",
};

export const metadata = { title: "Members — Cafe And SHabu" };

export default function MembersPage() {
  const data = raw as unknown as BoardData;
  const history = ((historyRaw as { rows?: HistoryRow[] }).rows ?? []);
  const labels = data.current_tier?.labels ?? ["M9S", "M10S", "M11S", "M12S"];

  const tagCount = (t: string) =>
    data.members.filter((m) => m.tags.includes(t)).length;
  const tagCounts = [
    { name: "Raider", value: tagCount("raider"), color: "#d14b3a" },
    { name: "Ultimate", value: tagCount("ultimate"), color: "#e5cc80" },
    { name: "Extreme", value: tagCount("extreme"), color: "#c86fd1" },
    { name: "Crafter", value: tagCount("crafter"), color: "#c98a5b" },
    { name: "Gatherer", value: tagCount("gatherer"), color: "#6aa84f" },
    { name: "Relic", value: tagCount("relic"), color: "#b07ce8" },
    { name: "Explorer", value: tagCount("explorer"), color: "#4fa8b8" },
    { name: "Treasure", value: tagCount("treasure"), color: "#d9a441" },
    { name: "Gold Saucer", value: tagCount("goldsaucer"), color: "#e07bb0" },
    { name: "Seasonal", value: tagCount("seasonal"), color: "#8fa3d9" },
    { name: "Old-timer", value: tagCount("oldtimer"), color: "#a58b6a" },
    { name: "PvP", value: tagCount("pvp"), color: "#7ea6c9" },
    { name: "Casual", value: tagCount("casual"), color: "#9c8f78" },
    { name: "No data", value: tagCount("unknown"), color: "#55493a" },
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

  // Head count per race. Stays empty until the pipeline has scraped character pages,
  // and the overview hides the donut in that case rather than drawing an empty circle.
  const raceTally: Record<string, number> = {};
  for (const m of data.members) if (m.race) raceTally[m.race] = (raceTally[m.race] ?? 0) + 1;
  const raceCounts = Object.entries(raceTally)
    .sort((a, b) => (RACE_ORDER.indexOf(a[0]) + 99) - (RACE_ORDER.indexOf(b[0]) + 99))
    .map(([name, value]) => ({ name, value, color: RACE_COLORS[name] ?? "#7a7a7a" }));

  // Race comes from scraping each character page, and a handful always fail — the
  // gap belongs in the chart rather than being quietly rounded away, so the shares
  // are shares of the whole FC and not of "whoever we managed to read".
  const raceUnknown = data.members.length - Object.values(raceTally).reduce((a, b) => a + b, 0);
  if (raceUnknown > 0) {
    raceCounts.push({ name: "No data", value: raceUnknown, color: "#55493a" });
  }

  const vacation = data.members.filter(isOnVacation).length;
  const activity = { active: data.members.length - vacation, vacation };

  return (
    <main className="pt-2">
      <FcCharts
        tagCounts={tagCounts}
        parseDist={parseDist}
        prog={prog}
        total={data.fc.total}
        history={history}
        raceCounts={raceCounts}
        activity={activity}
      />
      <MemberBoard data={data} />
    </main>
  );
}

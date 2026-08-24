"use client";

import type { HistoryRow } from "@/lib/types";
import {
  Bar, BarChart, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface Slice { name: string; value: number; color: string }

const tooltipStyle = {
  background: "#262017", border: "1px solid #3a3226", borderRadius: 8,
  color: "#efe6d3", fontSize: 12.5,
};

export default function FcCharts({
  tagCounts, parseDist, prog, total, history,
}: {
  tagCounts: Slice[];
  parseDist: Slice[];
  prog: { label: string; cleared: number }[];
  total: number;
  history: HistoryRow[];
}) {
  const anyParse = parseDist.some((p) => p.value > 0);
  const anyProg = prog.some((p) => p.cleared > 0);

  return (
    <details className="mt-5 rounded-xl border border-line bg-surface open:pb-4">
      <summary className="cursor-pointer select-none px-4 py-3 font-display font-semibold marker:text-amber">
        📊 ภาพรวม FC
      </summary>

      <div className="grid gap-6 px-4 sm:grid-cols-2">
        {/* สัดส่วนแท็ก */}
        <div>
          <div className="mb-1 text-[13px] font-medium text-muted">สัดส่วนสายผู้เล่น</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tagCounts} dataKey="value" nameKey="name"
                     innerRadius={45} outerRadius={75} paddingAngle={2} stroke="none">
                  {tagCounts.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted">
            {tagCounts.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.name} {s.value}
              </span>
            ))}
          </div>
        </div>

        {/* การกระจาย parse */}
        <div>
          <div className="mb-1 text-[13px] font-medium text-muted">
            การกระจาย parse (best)
          </div>
          {anyParse ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={parseDist}>
                  <XAxis dataKey="name" tick={{ fill: "#9c8f78", fontSize: 11 }}
                         axisLine={{ stroke: "#3a3226" }} tickLine={false} />
                  <YAxis allowDecimals={false} width={28}
                         tick={{ fill: "#9c8f78", fontSize: 11 }}
                         axisLine={{ stroke: "#3a3226" }} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#efe6d30d" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {parseDist.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-line text-[13px] text-muted">
              รอข้อมูลจาก FF Logs (ตั้งค่า API แล้วรัน pipeline)
            </div>
          )}
        </div>

        {/* Prog board tier ปัจจุบัน */}
        <div>
          <div className="mb-1 text-[13px] font-medium text-muted">
            ความคืบหน้า tier ปัจจุบัน
          </div>
          <div className="flex flex-col gap-2.5">
            {prog.map((p) => (
              <div key={p.label}>
                <div className="mb-0.5 flex justify-between font-data text-[12px]">
                  <span className="text-ink">{p.label}</span>
                  <span className="text-muted">เคลียร์แล้ว {p.cleared}/{total}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-card">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-chili to-amber transition-[width]"
                    style={{ width: `${total ? Math.round((p.cleared / total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {!anyProg && (
              <div className="text-[12px] text-muted">
                ยังไม่มีข้อมูลการเคลียร์ — จะขึ้นอัตโนมัติเมื่อเชื่อม FF Logs
              </div>
            )}
          </div>
        </div>

        {/* กราฟประวัติ FC */}
        <div>
          <div className="mb-1 text-[13px] font-medium text-muted">ประวัติ FC ตามเวลา</div>
          {history.length >= 2 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis dataKey="date" tick={{ fill: "#9c8f78", fontSize: 10 }}
                         axisLine={{ stroke: "#3a3226" }} tickLine={false} />
                  <YAxis allowDecimals={false} width={28}
                         tick={{ fill: "#9c8f78", fontSize: 11 }}
                         axisLine={{ stroke: "#3a3226" }} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="raider" name="Raider"
                        stroke="#d14b3a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ultimate" name="Ultimate"
                        stroke="#e5cc80" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="final_boss" name="เคลียร์บอสสุดท้าย"
                        stroke="#4fb8a8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-line px-4 text-center text-[13px] leading-relaxed text-muted">
              กราฟจะเริ่มวาดเมื่อมีข้อมูลสะสมตั้งแต่ 2 วันขึ้นไป
              — pipeline เก็บสถิติให้ทุกคืนอัตโนมัติ
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

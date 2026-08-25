import { ImageResponse } from "next/og";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FC member card";

export default async function Image(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = raw as unknown as BoardData;
  const m = data.members.find((x) => String(x.id) === id);
  const parse = m?.parse ?? null;
  const color =
    parse == null ? "#8b97a8" :
    parse >= 100 ? "#e5cc80" : parse >= 99 ? "#e268a8" :
    parse >= 95 ? "#ff8000" : parse >= 75 ? "#a335ee" :
    parse >= 50 ? "#2f7fd4" : "#4caf50";

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "space-between", background: "#0f1319",
        color: "#e3e8ef", padding: 64,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#6aa9e0", letterSpacing: 8, fontSize: 26 }}>
            CAFE AND SHABU · TONBERRY [ELEMENTAL]
          </div>
          <div style={{
            width: 22, height: 22, borderRadius: 999, background: "#6aa9e0",
          }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 78, fontWeight: 700 }}>{m?.name ?? "FC Member"}</div>
          <div style={{ color: "#8b97a8", fontSize: 30, marginTop: 6 }}>
            {(m?.rank ?? "Member") + "  ·  Lv " + (m?.level ?? "-")}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {(m?.tags ?? []).slice(0, 4).map((t) => (
              <div key={t} style={{
                border: "2px solid #2b3441", borderRadius: 999,
                padding: "8px 26px", fontSize: 26, color: "#8b97a8",
              }}>
                {t.toUpperCase()}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 24, color: "#8b97a8", letterSpacing: 6 }}>BEST PARSE</div>
            <div style={{ fontSize: 100, fontWeight: 700, color, lineHeight: 1 }}>
              {parse ?? "-"}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

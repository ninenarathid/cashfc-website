import raw from "@/data/members.json";
import AdminPanel from "@/components/AdminPanel";
import type { BoardData } from "@/lib/types";

export const metadata = { title: "จัดการเว็บไซต์ — Cafe And SHabu" };

export default function AdminPage() {
  const data = raw as unknown as BoardData;
  const options = data.members.map((m) => ({ id: m.id, name: m.name }));
  return <AdminPanel memberOptions={options} />;
}

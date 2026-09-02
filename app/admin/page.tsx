import raw from "@/data/members.json";
import AdminPanel from "@/components/AdminPanel";
import type { BoardData } from "@/lib/types";

export const metadata = { title: "Site admin — Cafe And SHabu" };

export default function AdminPage() {
  const data = raw as unknown as BoardData;
  const options = data.members.map((m) => ({ id: m.id, name: m.name }));
  // The Lodestone portrait for anybody who has not chosen a picture. Sent as a
  // map rather than importing the roster into the browser: it is 800 KB, and
  // what the admin page needs from it is a few dozen faces.
  const portraits = Object.fromEntries(
    data.members.flatMap((m) => (m.avatar ? [[m.id, m.avatar]] : [])));
  return <AdminPanel memberOptions={options} portraits={portraits} />;
}

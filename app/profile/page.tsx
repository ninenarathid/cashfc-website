import raw from "@/data/members.json";
import ProfileForm from "@/components/ProfileForm";
import type { BoardData } from "@/lib/types";

export const metadata = { title: "My profile — Cafe And SHabu" };

export default function ProfilePage() {
  const data = raw as unknown as BoardData;
  const options = data.members.map((m) => ({ id: m.id, name: m.name }));
  return <ProfileForm memberOptions={options} />;
}

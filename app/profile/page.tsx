import raw from "@/data/members.json";
import ProfileForm from "@/components/ProfileForm";
import type { BoardData } from "@/lib/types";

export const metadata = { title: "My profile — Cafe And SHabu" };

export default function ProfilePage() {
  const data = raw as unknown as BoardData;
  // The portrait travels too: the picture editor shows what taking yours down
  // would fall back to, which is the Lodestone's.
  const options = data.members.map((m) => ({
    id: m.id, name: m.name, avatar: m.avatar ?? null,
  }));
  return <ProfileForm memberOptions={options} />;
}

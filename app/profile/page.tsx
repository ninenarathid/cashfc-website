import raw from "@/data/members.json";
import ProfileForm from "@/components/ProfileForm";
import type { BoardData } from "@/lib/types";
import { everyone } from "@/lib/people";

export const metadata = { title: "My profile — Cafe And SHabu" };

export default function ProfilePage() {
  const data = raw as unknown as BoardData;
  // The portrait travels too: the picture editor shows what taking yours down
  // would fall back to, which is the Lodestone's.
  const options = everyone(data);
  return <ProfileForm memberOptions={options} />;
}

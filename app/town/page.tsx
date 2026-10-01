import TownGate from "@/components/town/TownGate";

export const metadata = { title: "Cash Town — Cafe And SHabu" };

/**
 * Cash Town: the FC's town, where avatars walk and people talk by microphone
 * when they are close. A prototype for the admins first (TownGate says who);
 * the page is the same static shell for everybody, and the town is fetched
 * only by those let in.
 */
export default function TownPage() {
  return <TownGate />;
}

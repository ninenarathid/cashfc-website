import TownGate from "@/components/town/TownGate";

export const metadata = { title: "Cash Town — Cafe And SHabu" };

/**
 * Cash Town, where avatars walk and people talk by microphone. A beta for
 * members with a verified character (TownGate says who); the page is the same
 * static shell for everybody, and the town is fetched only by those let in.
 */
export default function TownPage() {
  return <TownGate />;
}

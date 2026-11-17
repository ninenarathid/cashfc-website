import HdTownTest from "@/components/town-hd/HdTownTest";

export const metadata = { title: "Cash Town HD-2D (ทดลอง) — Cafe And SHabu" };

/**
 * The HD-2D trial of Cash Town (the owner, 2026-11-17): the town's own map stood up in depth, one test character to
 * walk it with. Open to anybody who has this address ("เข้าได้ทุกคนที่มี url"): it asks for no session, reads nothing
 * from the database and writes nothing, so there is no gate before it. The live town at /town is not touched by it.
 */
export default function HdTownTestPage() {
  return <HdTownTest />;
}

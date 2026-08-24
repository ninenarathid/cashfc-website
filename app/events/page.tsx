import { notFound } from "next/navigation";

// Parked until the events phase resumes: unlinked from the nav and 404 by design so
// an unfinished page is never publicly reachable. The original placeholder markup is
// in git history at commit ed32fee if you want it back.
export default function EventsPage() {
  notFound();
}

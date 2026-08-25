import { notFound } from "next/navigation";

// Parked alongside events and minigames: unlinked from the roster and 404 by design
// so an unfinished page is never publicly reachable. The working version is in git
// history, and components/CompareClient.tsx is untouched.
export default function ComparePage() {
  notFound();
}

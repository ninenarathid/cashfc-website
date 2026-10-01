"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { resumable, useTownActive } from "@/lib/town/active";

const TownBar = dynamic(() => import("./TownBar"), { ssr: false });

/**
 * Cash Town on every page that is not the town: the dock (TownBar) while this
 * tab is in town, so looking at the gallery does not mean leaving it.
 *
 * This much is in every page. The dock and the town's code come only for a
 * tab that is in town, or was a moment ago and is coming back after a reload.
 */
export default function TownDock() {
  const active = useTownActive();
  const path = usePathname();
  const [resume, setResume] = useState(false);
  useEffect(() => { setResume(resumable() !== null); }, []);
  // The town's own page shows all of it already.
  if (path === "/town") return null;
  if (!active && !resume) return null;
  return <TownBar />;
}

import type { ReactNode } from "react";
import styles from "./TownAdventure.module.css";

/** A local starting clue, folded away until the player asks to read it. */
export default function TownDiscoveryNote({ title, children }: { title: string; children: ReactNode }) {
  return <details className={styles.discoveryNote} data-discovery-note>
    <summary>{title}</summary>
    <div className={styles.discoveryBody}>{children}</div>
  </details>;
}

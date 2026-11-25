"use client";

import { useEffect, useState, type ReactNode } from "react";

const KEY = (id: string) => `cashfc_guide_fold_${id}`;

/**
 * A part of a guide that folds away (the owner, 2026-11-25: "เงื่อนไขก่อนเข้า
 * Cheatsheet Macro ของรางวัล ทำให้พับเก็บได้").
 *
 * Open at first; a part somebody folds stays folded on their next visit (per
 * browser, per part — a raider who knows the macro by heart folds it once).
 * A link to the part (#rewards) opens it, so a jump never lands on a closed
 * door.
 */
export function useFold(id: string): [boolean, () => void] {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try { if (window.localStorage.getItem(KEY(id)) === "0") setOpen(false); } catch { /* private window */ }
    const onHash = () => { if (window.location.hash === `#${id}`) setOpen(true); };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [id]);
  const toggle = () => setOpen((v) => {
    try { window.localStorage.setItem(KEY(id), v ? "0" : "1"); } catch { /* ignore */ }
    return !v;
  });
  return [open, toggle];
}

/** The heading that folds its part: the whole line is the button. */
export function FoldHead(
  { open, onToggle, children, controls, className = "" }:
  { open: boolean; onToggle: () => void; children: ReactNode; controls: string; className?: string },
) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={controls}
            className={`flex min-h-10 w-full items-center justify-between gap-2 text-left ${className}`}>
      <span className="min-w-0">{children}</span>
      <span aria-hidden className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
    </button>
  );
}

/** A section of a guide with a heading that folds it. */
export default function Fold(
  { id, title, children, className = "" }:
  { id: string; title: ReactNode; children: ReactNode; className?: string },
) {
  const [open, toggle] = useFold(id);
  return (
    <section id={id} className={`scroll-mt-[calc(var(--nav-h)+1rem)] ${className}`}>
      <h2 className="mb-1.5 font-display text-lg font-semibold">
        <FoldHead open={open} onToggle={toggle} controls={`${id}-body`}>{title}</FoldHead>
      </h2>
      <div id={`${id}-body`} hidden={!open}>{children}</div>
    </section>
  );
}

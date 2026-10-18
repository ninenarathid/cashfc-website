"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Escape closes a panel; its close button takes the focus once, as it opens, and not from a box being typed in.
 * Not again at every redraw: the farm hands a new `onClose` each render, and the chat box lost its focus to the
 * button the moment a letter was typed into it (a member, 2026-10-16: "เปิดหน้าต่างUIคุณภาพผัก(ปุ๋ย) ไม่สามารถพิมพ์ช่องแชทได้").
 */
export function useCloses(onClose: () => void, close: RefObject<HTMLButtonElement | null>) {
  const last = useRef(onClose);
  useEffect(() => { last.current = onClose; });
  useEffect(() => {
    const typing = document.activeElement;
    if (!(typing instanceof HTMLInputElement || typing instanceof HTMLTextAreaElement || (typing instanceof HTMLElement && typing.isContentEditable))) close.current?.focus();
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); last.current(); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [close]);
}

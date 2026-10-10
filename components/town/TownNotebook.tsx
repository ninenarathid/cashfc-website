"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import TownIcon, { type IconName } from "./TownIcon";
import styles from "./TownAdventure.module.css";

export interface NotebookEntry { key: string; title: string; searchText?: string; icon?: IconName; category?: string; body: ReactNode }

/** Only supplied discoveries are rendered; this component never imports hidden rules. */
export default function TownNotebook({ title, entries, th, icon = "wellBook", initiallyOpen = false, first, onClose }: {
  title: string; entries: readonly NotebookEntry[]; th: boolean; icon?: IconName;
  initiallyOpen?: boolean; first?: string | null; onClose?: () => void;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(Math.max(0, entries.findIndex(e => e.key === first)));
  const cover = useRef<HTMLButtonElement>(null), closeButton = useRef<HTMLButtonElement>(null);
  const dialog=useRef<HTMLDialogElement>(null),titleId=useId();
  const categories = [...new Set(entries.flatMap(e => e.category ? [e.category] : []))];
  const shown = entries.filter(e => (!category || e.category === category) && `${e.title} ${e.searchText ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const current = Math.min(page, Math.max(0, shown.length - 1)), entry = shown[current];
  const indexStart = Math.floor(current / 10) * 10;
  const close = () => { if (onClose) onClose(); else { setOpen(false); requestAnimationFrame(() => cover.current?.focus()); } };
  useEffect(() => {
    if (!open) return;
    const modal=dialog.current;
    modal?.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => modal?.close();
  }, [open]);
  return <section className={styles.book} data-town-notebook data-state={open ? "open" : "closed"} aria-label={title}>
    <button type="button" ref={cover} onClick={() => setOpen(true)} aria-expanded={open} className={styles.cover}>
      <TownIcon name={icon} size={38}/><span className="min-w-0"><span className={`${styles.coverTitle} font-display`}>{title}</span>
        <span className={styles.coverHint}>{th ? `บันทึกไว้ ${entries.length} เรื่อง · เปิดสมุด` : `${entries.length} discoveries · Open the notebook`}</span></span>
    </button>
    {open&&createPortal(<dialog ref={dialog} className={styles.notebookDialog} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();close();}} onKeyDown={e=>e.stopPropagation()}>
      <div className={styles.book} data-notebook-reader><div className={styles.binding}>
      <header className={styles.bookHeader}><TownIcon name={icon} size={24}/><h3 id={titleId} className="font-display">{title}</h3>
        <button type="button" ref={closeButton} onClick={close} aria-label={th ? `ปิด${title}` : `Close ${title}`}>{th ? "ปิดสมุด" : "Close book"}</button></header>
      {categories.length > 1 && <div className={styles.bookCategories} role="group" aria-label={th ? "หมวดในสมุด" : "Notebook categories"}>
        {[null, ...categories].map(c => <button key={c ?? "all"} type="button" aria-pressed={category === c} onClick={() => { setCategory(c); setPage(0); }}>{c ?? (th ? "ทั้งหมด" : "All")} <span>{c ? entries.filter(e => e.category === c).length : entries.length}</span></button>)}
      </div>}
      {entries.length > 12 && <label className={styles.bookSearch}>{th ? "ค้นหาในสมุด" : "Search the notebook"}<input name="notebook-search" type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} autoComplete="off"/></label>}
      <div className={styles.spread}>
        <nav className={styles.index} aria-label={th ? "สารบัญสมุด" : "Notebook contents"}>
          {shown.slice(indexStart, indexStart + 10).map((e, i) => <button key={e.key} type="button" aria-pressed={current === indexStart + i} onClick={() => setPage(indexStart + i)}>
            {e.icon && <TownIcon name={e.icon} size={22}/>}<span>{e.title}</span>
          </button>)}
          {shown.length > 10 && <div className={styles.indexPager}><button type="button" disabled={!indexStart} onClick={() => setPage(indexStart - 10)} aria-label={th ? "สารบัญหน้าก่อน" : "Previous contents page"}>←</button><span>{indexStart + 1}–{Math.min(indexStart + 10, shown.length)} / {shown.length}</span><button type="button" disabled={indexStart + 10 >= shown.length} onClick={() => setPage(indexStart + 10)} aria-label={th ? "สารบัญหน้าถัดไป" : "Next contents page"}>→</button></div>}
        </nav>
        <article className={styles.leaf}>
          <div key={entry?.key ?? "empty"} className={styles.turn} data-notebook-page={entry?.key}>
            <div className={styles.leafHeading}>{entry?.icon && <TownIcon name={entry.icon} size={48}/>}<h4 className="font-display">{entry?.title ?? (search ? th ? "ไม่พบรายการที่ค้นหา" : "No matching entries" : th ? "หน้าที่ยังว่าง" : "An unwritten page")}</h4></div>
            <div className={styles.leafBody}>{entry?.body ?? <p>{search ? th ? "ลองเปลี่ยนคำค้นหรือเลือกหมวดอื่น" : "Try another search or category." : th ? "สิ่งที่พบระหว่างเดินทางจะถูกจดไว้ในสมุดนี้" : "Discoveries along your journey will be written here."}</p>}</div>
          </div>
          <footer className={styles.bookFoot}>
            <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label={th ? "พลิกไปหน้าก่อน" : "Previous page"}>← {th ? "ก่อนหน้า" : "Previous"}</button>
            <span aria-live="polite">{th ? "หน้า" : "Page"} {shown.length ? current + 1 : 0} / {shown.length}</span>
            <button type="button" disabled={current >= shown.length - 1} onClick={() => setPage(current + 1)} aria-label={th ? "พลิกไปหน้าถัดไป" : "Next page"}>{th ? "ถัดไป" : "Next"} →</button>
          </footer>
        </article>
      </div>
    </div></div></dialog>,document.body)}
  </section>;
}

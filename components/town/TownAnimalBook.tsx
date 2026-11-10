"use client";

import { useEffect, useState } from "react";
import { SPECIES, type Tier } from "@/lib/town/animals";
import { animalBook, breedsFound, towardsHabit, type BreedPage } from "@/lib/town/animal-book";
import type { AnimalWorld } from "@/lib/town/animal-act";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import { loadPastureArt } from "@/lib/town/pasture-art";
import type { SceneryKit } from "@/lib/town/scenery";
import { SPECIAL } from "@/lib/town/specials";
import type { Purse } from "@/lib/town/trade";
import { createClient } from "@/lib/supabase/client";
import { AnimalPic } from "./AnimalPic";
import { CHIP } from "./TownFarmBook";
import TownNotebook, { type NotebookEntry } from "./TownNotebook";
import TownIcon, { type IconName } from "./TownIcon";
import { HabitTold, KIND_ICON, KIND_WORD } from "./TownRound";

/**
 * The village's animal book in the bag (the owner, 2026-11-10: "จะมีสมุดสายเลี้ยงสัตว์ไหม", then "ทำเลย"), beside the books
 * of insects, fish and the farm: every breed a page (lib/town/animal-book, which the pasture's own book reads too), its
 * picture (a silhouette until somebody in the village has bred it), its tier, who bred it first, its special (a shadow
 * until the village finds it, then who found it first, and how many times I have), its habit's kind, and the habit
 * itself once I have found its special three times. Pictures and a few words: the recipes are the pasture's book's.
 *
 * `world` is the pasture as the keeper last read it (TownTrade reads it once when the bag opens, if it has none).
 */
const TIER: Record<Tier, [string, string]> = { starter: ["พันธุ์เริ่มต้น", "Starter"], real: ["พันธุ์แท้", "Real breed"], fantasy: ["พันธุ์แฟนตาซี", "Fantasy"], legend: ["ตำนาน", "Legend"] };
const MUTED = "text-label text-[#7a6040]", INK = "text-[#4a3520]";
/** A special not found yet: its shape in shadow, as the farm book's pages are. */
const SHADE = "brightness-0 opacity-50";

/* ── the pictures: the pasture's own sheets, fetched once a tab, and only once a page of the book is open ── */
let kitHeld: SceneryKit | null | undefined;
function usePastureKit(): SceneryKit | null | undefined {
  const [kit, setKit] = useState(kitHeld);
  useEffect(() => {
    if (kit !== undefined) return;
    let on = true;
    void loadPastureArt().then((k) => { kitHeld = k; if (on) setKit(k); });
    return () => { on = false; };
  }, [kit]);
  return kit;
}
function BreedPic({ page, size }: { page: BreedPage; size: number }) {
  const kit = usePastureKit();
  // (nothing while the sheet comes: no stand-in flashes before the picture; a sheet that never comes leaves the stand-in)
  if (kit === undefined) return <span aria-hidden className="block shrink-0" style={{ width: size, height: size }} />;
  return <AnimalPic species={page.breed.species} breed={page.breed.id} stage="adult" size={size} kit={kit} dark={!page.seen} />;
}

/* ── names: the first breeders' and finders', read from the members' profiles once a page of the book is open ── */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const named = new Map<string, string>();
const asked = new Set<string>();
const hearing = new Set<() => void>();
/** The names of those not asked yet, in one read; every page open is told when they come. */
function askNames(ids: readonly string[]) {
  const want = ids.filter((id) => UUID.test(id) && !asked.has(id)), db = want.length ? createClient() : null;
  if (!db) return;
  for (const id of want) asked.add(id);
  void db.from("profiles").select("id,character_name,display_name,discord_username").in("id", want).then(({ data }) => {
    for (const p of (data ?? []) as Array<{ id: string; character_name: string | null; display_name: string | null; discord_username: string | null }>) {
      const n = p.character_name ?? p.display_name ?? p.discord_username;
      if (n) named.set(p.id, n);
    }
    for (const tell of hearing) tell();
  });
}
function useNames(ids: readonly string[]): (id: string) => string | null {
  const [, setTick] = useState(0);
  const key = ids.join(",");
  useEffect(() => {
    const tell = () => setTick((n) => n + 1);
    hearing.add(tell);
    askNames(key ? key.split(",") : []);
    return () => { hearing.delete(tell); };
  }, [key]);
  return (id) => named.get(id) ?? null;
}

function Page({ p, me, ids, found, all, th }: { p: BreedPage; me: string; ids: readonly string[]; found: number; all: number; th: boolean }) {
  const t = (a: string, b: string) => (th ? a : b);
  const look = useNames(ids);
  // (my own name from the profiles where it is one; the trial's made-up friends are named in their ids, as on the pasture)
  const who = (id: string) => look(id) ?? (id === me ? t("ฉัน", "Me") : id.startsWith("trial-friend-") ? id.slice("trial-friend-".length) : t("สมาชิก", "A member"));
  const s = p.special;
  return (
    <div className="space-y-3" data-animal-page={p.breed.id} data-found={p.seen}>
      <p className="flex flex-wrap items-center gap-1.5">
        <span className={CHIP} data-animal-tier={p.breed.tier}><b className="font-data">{p.breed.letter}</b>{TIER[p.breed.tier][th ? 0 : 1]}</span>
        {p.breed.letter === "A" && <span className={CHIP}><TownIcon name="coin" size={16} />{t("จากร้านลุง", "From the stall")}</span>}
      </p>
      {p.first ? <p className={`flex items-center gap-1.5 ${MUTED}`} data-animal-first><TownIcon name="rosette" size={16} />{t("เพาะได้คนแรก", "First bred by")} <b className={INK}>{who(p.first.by)}</b></p>
        : !p.seen && <p className={MUTED} data-animal-shut>{t("ยังไม่มีใครในหมู่บ้านเพาะได้", "Nobody in the village has bred it yet")}</p>}
      {s && (
        <div data-animal-special={s.special.id} data-seen={!!s.first} data-mine={s.mine}>
          <p className={MUTED}>{t("ของพิเศษ", "Its special")}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="grid size-12 shrink-0 place-items-center rounded border border-[#bda578] bg-[#f0dfb6]" title={s.first ? ITEMS[s.special.id as ItemId]?.name[th ? "th" : "en"] : "???"}>
              <TownIcon name={iconOf(s.special.id as ItemId) as IconName} size={32} className={s.first ? "" : SHADE} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-ui font-semibold ${INK}`}>{s.first ? ITEMS[s.special.id as ItemId]?.name[th ? "th" : "en"] : "???"}</span>
              {s.first && <span className={`flex items-center gap-1 ${MUTED}`} data-special-first><TownIcon name="rosette" size={14} />{t("พบคนแรก", "First found by")} <b className={INK}>{who(s.first.by)}</b></span>}
            </span>
            {s.mine > 0 && <span className={`${CHIP} shrink-0 font-data tabular-nums`} title={t("ฉันพบแล้ว", "Found by me")} data-special-mine>{t("ฉันพบ", "Mine")} {towardsHabit(s)}/{SPECIAL.reveal}</span>}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-1.5" data-animal-habit={s.special.habit.kind}>
            <span className={CHIP}><TownIcon name={KIND_ICON[s.special.habit.kind]} size={16} />{KIND_WORD[s.special.habit.kind][th ? 0 : 1]}</span>
            {s.habit ? <span data-habit-known><HabitTold habit={s.habit} th={th} ink="text-[#7a4e10] font-semibold" /></span>
              : <span className={MUTED}>{t(`รู้นิสัยเมื่อพบครบ ${SPECIAL.reveal} ครั้ง`, `Told at ${SPECIAL.reveal} finds`)}</span>}
          </p>
        </div>
      )}
      <p className="text-label text-[#7a6040]">{t(`หมู่บ้านพบแล้ว ${found}/${all} พันธุ์`, `The village has ${found}/${all} breeds`)}</p>
    </div>
  );
}

export default function TownAnimalBook({ world, purse, me, th }: { world: Pick<AnimalWorld, "found" | "specials">; purse: Purse; me: string; th: boolean }) {
  const pages = animalBook(world, purse), { found, all } = breedsFound(world);
  // (every name the book may show, asked together the first time a page is open)
  const ids = [...new Set(pages.flatMap((p) => [p.first?.by, p.special?.first?.by]).filter((x): x is string => !!x))];
  const entries: NotebookEntry[] = pages.map((p) => ({
    key: p.breed.id, title: p.seen ? p.breed.name[th ? "th" : "en"] : (th ? "ยังไม่พบ" : "Not found yet"), shade: !p.seen,
    category: SPECIES[p.breed.species].name[th ? "th" : "en"], picture: (size) => <BreedPic page={p} size={size} />,
    ...(p.seen ? { searchText: `${p.breed.name.th} ${p.breed.name.en}` } : {}),
    body: <Page p={p} me={me} ids={ids} found={found} all={all} th={th} />,
  }));
  return <div data-animal-book><TownNotebook title={th ? "สมุดเลี้ยงสัตว์ของหมู่บ้าน" : "The village's animal book"} th={th} icon="animalBook" entries={entries} /></div>;
}

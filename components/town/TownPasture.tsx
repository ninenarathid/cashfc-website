"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { ANIMALS, SPECIES, breedOf, gateAt as gateOpenAt, mayCare, stageOf, type Animal } from "@/lib/town/animals";
import { ANIMAL_GIFTS, viewOf, wagonAt, wagonEnds, type AnimalInput, type AnimalReply, type AnimalWorld } from "@/lib/town/animal-act";
import { MEADOW_SPOTS, BARN, COOP, NURSERY, NEST, POPOTO, TABLE, TROUGHS, GATE, PASTURE_PROPS, WAGON_STOPS, animalSpot, homeOf } from "@/lib/town/pasture";
import { forageAt, bandOf, dayOf, MEADOW } from "@/lib/town/animals";
import { FORAGE_BANDS } from "@/lib/town/animal-items";
import { loadPastureArt, pastureSprite, POPOTO_TALK } from "@/lib/town/pasture-art";
import { loadScenery, type SceneryKit, type Sprite } from "@/lib/town/scenery";
import { artOf } from "@/lib/town/decor";
import { knowWagons, wagonSpot, WAGON_LEG } from "@/lib/town/seats";
import { RAM, ramSeat, riderOf, runOf, wagonSeat } from "@/lib/town/riding";
import { hasThing, usesLeft, wearing, type CharmId, type ThingId } from "@/lib/town/gifts";
import { isSpent } from "@/lib/town/stamina";
import { ITEMS, type ItemId } from "@/lib/town/items";
import { GRADES } from "@/lib/town/quality";
import { animalIcon } from "@/lib/town/animal-icons";
import { placeOf, type Vec } from "@/lib/town/world";
import { createClient } from "@/lib/supabase/client";
import type { FarmFrame } from "./TownFarm";
import TownFoot from "./TownFoot";
import type { IconName } from "./TownIcon";
import TownAnimals, { why, type AnimalsView } from "./TownAnimals";
import { EggsGame, MilkGame, ShearGame } from "./TownAnimalGames";
import { animalSize, drawAnimal, drawBlock, drawBubble, drawEggOut, drawForage, drawGateArt, drawHouse, drawPopoto, drawWagon } from "./pasture-draw";
import type { Play } from "@/lib/town/animals";

/*
 * The pasture on the map (docs/plans/animals/README.md): its buildings, troughs, nest, Uncle Popoto at his stall, the
 * village gate, the meadow's forage spots, everybody's animals where each is at the moment (lib/town/pasture's
 * animalSpot: the same on every page), the eggs laid out on the meadow, the hay wagon on whichever map it is; what a
 * tap on any of them does; the gifts' buttons where they apply; the three games; and Uncle Popoto's panel.
 */

export interface PastureHooks {
  draw: (frame: FarmFrame) => void;
  /** A tap at a point of the screen: done (true), a walk to make first, or nothing of the pasture's (null). `peek`: only whether there is something. */
  tap: (x: number, y: number, peek?: boolean) => true | { walk: Vec } | null;
  /** Whether a point is on a small thing on the ground (an egg laid out of mine, a forage spot): a tap there is it, not whoever stands over it. */
  feet: (x: number, y: number) => boolean;
  /** Open Uncle Popoto's panel at one of its leaves (his talk's choices). */
  open: (view: AnimalsView, focus?: string | null) => void;
}
export interface PastureProps {
  keeper: Keeper;
  th: boolean;
  phone: boolean;
  tabbar: boolean;
  reduced: boolean;
  /** Which map I am on, and my tile while I stand still with nothing open over the map (null otherwise). */
  place: string | null;
  here: [number, number] | null;
  /** Where I am, now. */
  self: () => Vec | null;
  myName: string;
  /** Everybody else on my page: where, what follows them, where they sit. */
  people: () => Array<{ id: string; name: string; x: number; y: number; pet?: string; seat?: string; sit?: number }>;
  /** My familiar, whether I sit, and my seat that is no seat of mine (lib/town/riding). */
  pet: string | null;
  sitting: boolean;
  seat: string;
  takeSeat: (seat: string) => void;
  getDown: () => void;
  walkTo: (tile: Vec) => boolean;
  /** A word to one member (lib/town/session's pair), and hearing them. */
  pairSend: (to: string, data: unknown) => void;
  pairHear: (fn: ((from: string, data: unknown) => void) | null) => void;
  /** A word to the whole room (lib/town/session's nudge): "wind", "wagon". */
  tellRoom: (what: string) => void;
  /** Uncle Popoto's talk (the map's talk box). */
  onTalk: () => void;
  register: (hooks: PastureHooks | null) => void;
  /** The town's portrait pictures (the uncle's stand in for Uncle Popoto's). */
  art: (name: string) => Sprite | null;
}
type Box = { x0: number; y0: number; x1: number; y1: number };
type Hit = Box & ({ kind: "popoto" } | { kind: "nest" } | { kind: "trough" } | { kind: "gate" } | { kind: "table" } | { kind: "animal"; id: string } | { kind: "egg"; id: string; spot: number; at: [number, number] } | { kind: "forage"; spot: number } | { kind: "wagon"; run: string; at: Vec; standing: boolean });
const inBox = (b: Box, x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
const near = (a: readonly [number, number] | null, x: number, y: number, r = 1) => !!a && Math.max(Math.abs(a[0] - x), Math.abs(a[1] - y)) <= r;
const FORAGE_TINT: Record<string, string> = { mistVetch: "#b8a0e0", ghostReed: "#d8e4ee", dewClover: "#a8e0ff", dawnOats: "#f8c0a8", meadowOats: "#e8d090", sweetTimothy: "#c8e090", sunAlfalfa: "#b080e0", pondMillet: "#f0e8c8", copperSedge: "#d08850", orchardPea: "#a8e080", amberClover: "#f0a040", reedSeed: "#b89070", lanternGrass: "#fff080", velvetVetch: "#407050", moonOats: "#d8dcf0", nightDuckweed: "#305040" };
const gradeOf = (q: number) => (q >= 95 ? 3 : q >= 70 ? 2 : q >= 40 ? 1 : 0);
const GATE_REACH = 3, WAGON_REACH = 3, RAM_REACH = 3;

export default function TownPasture(props: PastureProps) {
  const { keeper, th, phone, tabbar, reduced, place, here, register } = props;
  const propsRef = useRef(props);
  propsRef.current = props;
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const world = keeper.animalWorld();
  const worldRef = useRef<AnimalWorld | null>(world);
  worldRef.current = world;
  const now = keeper.now(), me = keeper.id, purse = keeper.purse();
  const onFarm = place === "farm";
  const t = (a: string, b: string) => (th ? a : b);

  // ── the pictures: the pasture's sheet (none yet: stand-ins) and the town's scenery (the fence, the rim's woods, the uncle's frames)
  const kit = useRef<SceneryKit | null>(null), scenery = useRef<SceneryKit | null>(null);
  const [kitNow, setKitNow] = useState<SceneryKit | null>(null);
  useEffect(() => {
    let gone = false;
    void loadPastureArt().then((k) => { if (!gone) { kit.current = k; setKitNow(k); } });
    void loadScenery().then((k) => { if (!gone) scenery.current = k; }).catch(() => {});
    return () => { gone = true; };
  }, []);

  // ── reading the world: while on the farm; and anywhere while the wagon tours, or for a while after word of one
  const [watchTill, setWatchTill] = useState(0);
  const liveRun = !!world?.wagons.some((r) => now < wagonEnds(r));
  const watching = onFarm || liveRun || watchTill > Date.now();
  useEffect(() => (watching ? keeper.look("animals") : undefined), [keeper, watching]);
  useEffect(() => { knowWagons(world?.wagons ?? [], () => keeper.now()); }, [world, keeper]);

  // ── coming onto the farm: the barn cat's pets and the spring wind's gifts ride on it (once each arrival; again for a new wind)
  const entered = useRef<string | null>(null);
  const wind = world?.spells.find((x) => x.kind === "wind" && x.from <= now && now < x.until) ?? null;
  const windKey = wind ? `${wind.by}:${wind.from}` : "";
  useEffect(() => {
    if (!onFarm) { entered.current = null; return; }
    if (!world) return;
    const key = `in:${windKey}`;
    if (entered.current === key) return;
    entered.current = key;
    void keeper.animals({ action: "enter" });
  }, [onFarm, !!world, windKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── words over the map's foot, a while each
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((text: string) => { setNote(text); if (noteTimer.current) clearTimeout(noteTimer.current); noteTimer.current = setTimeout(() => setNote(null), 5200); }, []);
  // (the room's word of a wind called or a wagon set off, anywhere in town: told, and the pasture read for a while)
  useEffect(() => {
    const heard = (e: Event) => { const what = (e as CustomEvent<string>).detail; if (what === "wagon" || what === "wind") { setWatchTill(Date.now() + 5 * 60_000); if (what === "wind") say(t("ลมฤดูใบไม้ผลิพัดมาแล้ว! เข้าฟาร์มภายในชั่วโมงนี้ สัตว์โตได้ผลผลิตพร้อมเก็บทันที", "The spring wind is blowing! Come onto the farm within the hour.")); else say(t("เกวียนหญ้าแห้งออกเดินทางแล้ว ขึ้นได้ที่ป้ายของแต่ละแมพ", "The hay wagon is touring: hop on at a map's stop.")); } };
    window.addEventListener("cashtown:pasture-word", heard);
    return () => window.removeEventListener("cashtown:pasture-word", heard);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const busy = useRef(false);
  const act = useCallback(async (input: AnimalInput, ok?: string): Promise<{ ok: boolean; got?: AnimalReply["got"] }> => {
    if (busy.current) return { ok: false };
    busy.current = true;
    try {
      const r = await keeper.animals(input, crypto.randomUUID());
      say(r.ok ? ok ?? t("เรียบร้อย", "Done.") : why(r.why, th));
      return r;
    } finally { busy.current = false; }
  }, [keeper, say, th]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── the panel and the games
  const [view, setView] = useState<AnimalsView | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [game, setGame] = useState<Animal | null>(null);
  const open = useCallback((v: AnimalsView, f: string | null = null) => { setGame(null); setFocus(f); setView(v); }, []);
  const harpFor = !!world?.spells.some((x) => x.kind === "harp" && x.from <= now && now < x.until && (x.who ?? []).includes(me));
  const ease = { tired: isSpent(purse, now), harp: harpFor };
  const collected = useCallback(async (a: Animal, play: Play, cracked?: number) => {
    const r = await keeper.animals({ action: "collect", id: a.id, play, ...(cracked !== undefined ? { cracked } : {}) }, crypto.randomUUID());
    setGame(null);
    if (!r.ok) { say(why(r.why, th)); return; }
    const g = r.got;
    if (g?.item && g.n) {
      const by = [0, 0, 0, 0];
      for (const q of g.grades ?? []) by[gradeOf(q)]++;
      const grades = by.map((n, i) => (n ? `${GRADES[i][th ? "th" : "en"].replace(/^★+ /, "")} ${n}` : "")).filter(Boolean).join(", ");
      say(`${t("ได้", "Got")} ${ITEMS[g.item]?.name[th ? "th" : "en"]} ×${g.n}${grades ? ` (${grades})` : ""}${g.whole ? t(" · ขนเต็มผืน!", " · a whole fleece!") : ""}${g.find ? ` + ${ITEMS[g.find]?.name[th ? "th" : "en"]}` : ""}`);
    } else say(t("เก็บแล้ว", "Collected."));
  }, [keeper, say, th]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── names: mine, whoever is here, and the site's members (asked for once the panel is open)
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    if (!view || profiles.length) return;
    const db = createClient();
    if (!db) return;
    void db.from("profiles").select("id,character_name,display_name,discord_username").or("is_admin.eq.true,and(character_id.not.is.null,character_verified_at.not.is.null)").order("character_name").limit(500)
      .then(({ data }) => setProfiles(((data ?? []) as Array<{ id: string; character_name: string | null; display_name: string | null; discord_username: string | null }>).map((p) => ({ id: p.id, name: p.character_name ?? p.display_name ?? p.discord_username ?? "Member" }))));
  }, [view, profiles.length]);
  const nameOf = useCallback((id: string) => {
    if (id === me) return propsRef.current.myName;
    return propsRef.current.people().find((p) => p.id === id)?.name ?? profiles.find((p) => p.id === id)?.name ?? t("สมาชิก", "a member");
  }, [me, profiles, th]); // eslint-disable-line react-hooks/exhaustive-deps
  const members = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of props.people()) seen.set(p.id, p.name);
    for (const p of profiles) if (!seen.has(p.id)) seen.set(p.id, p.name);
    seen.delete(me);
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [profiles, view]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── the herd bell: rung, my animals come to me for a while
  const bell = useRef<{ at: Vec; till: number } | null>(null);

  // ── what a tap asked for, done once I have walked up to it
  const want = useRef<null | { kind: "egg"; id: string; spot: number; at: [number, number] } | { kind: "forage"; spot: number } | { kind: "gate" }>(null);
  const hereKey = here ? `${here[0]},${here[1]}` : "";
  useEffect(() => {
    const w = want.current;
    if (!w || !here) return;
    if (w.kind === "egg" && near(here, w.at[0], w.at[1])) { want.current = null; void pick(w.id, w.spot); }
    else if (w.kind === "forage") { const [x, y] = MEADOW_SPOTS[w.spot]; if (near(here, x, y)) { want.current = null; void forage(w.spot); } }
    else if (w.kind === "gate" && near(here, GATE.x + 1, GATE.y, GATE_REACH)) { want.current = null; void toggleGate(); }
  }, [hereKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const gateOpen = !!world && gateOpenAt(world.gate, now).open;
  const toggleGate = async () => { await act({ action: "gate", open: !gateOpenAt(worldRef.current?.gate ?? [], keeper.now()).open }, gateOpen ? t("ปิดประตูทุ่งแล้ว สัตว์กลับเข้าคอก", "The gate is shut: they come home.") : t("เปิดประตูทุ่งแล้ว สัตว์ออกไปกินหญ้า", "The gate is open: out they go to graze.")); };
  const pick = async (id: string, spot: number) => { const r = await act({ action: "pick", id, spot }); if (r.ok && r.got?.item) say(`${t("เก็บไข่ได้", "Picked up")} ${ITEMS[r.got.item]?.name[th ? "th" : "en"]} ×${r.got.n}`); };
  const forage = async (spot: number) => { const r = await act({ action: "forage", spot }); if (r.ok && r.got?.item) say(`${t("เก็บได้", "Gathered")} ${ITEMS[r.got.item]?.name[th ? "th" : "en"]}`); };

  // ── the map: what is drawn, and what a tap on it comes to
  const hits = useRef<Hit[]>([]);
  const fontRef = useRef("");
  /** Each animal's view (settled, its stage, hunger, rounds), worked out once a second, not every frame. */
  const views = useRef(new Map<string, { at: number; key: string; v: ReturnType<typeof viewOf> }>());
  useEffect(() => {
    const draw = (frame: FarmFrame) => {
      const { ctx, things, project, onScreen, s, now: tick, still, self, over } = frame;
      const P = propsRef.current, w = worldRef.current, k = kit.current, sc = scenery.current, clock = keeper.now();
      const px = Math.abs(ctx.getTransform().a) || 1;
      const out: Hit[] = [];
      hits.current = out;
      const map = self ? placeOf(Math.floor(self.x), Math.floor(self.y)) : null;
      if (!fontRef.current) fontRef.current = getComputedStyle(document.body).getPropertyValue("--font-body-face").trim() || "sans-serif";
      const font = fontRef.current;
      const tag = (text: string, x: number, y: number, fg = "#f3e3c3") => over?.(() => {
        ctx.save(); ctx.font = `600 10px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const tw = ctx.measureText(text).width + 10; ctx.fillStyle = "rgba(15,19,25,0.74)"; ctx.beginPath(); ctx.roundRect(x - tw / 2, y - 8, tw, 16, 8); ctx.fill();
        ctx.fillStyle = fg; ctx.fillText(text, x, y + 0.5); ctx.restore();
      });
      // the hay wagon, on whichever map it is now
      for (const run of w?.wagons ?? []) {
        const at = wagonSpot(run, clock);
        if (!at || at.map !== map) continue;
        const c = project(at.at);
        if (!onScreen(c)) continue;
        things.push({ depth: at.at.x + at.at.y + 0.2, draw: () => drawWagon(ctx, k, c, s, at.right, tick, !at.standing && !still, px) });
        out.push({ kind: "wagon", run: run.id, at: at.at, standing: at.standing, x0: c.x - 30 * s, y0: c.y - 40 * s, x1: c.x + 40 * s, y1: c.y + 6 * s });
        if (at.standing) tag(t("เกวียนหญ้า · ขึ้นได้", "Hay wagon · hop on"), c.x, c.y - 46 * s, "#e5cc80");
      }
      // the stops: a little sign at each
      if (map && WAGON_STOPS[map] && sc?.has("signpost")) { const [sx, sy] = WAGON_STOPS[map], c = project({ x: sx - 1.2, y: sy - 0.6 }); if (onScreen(c)) things.push({ depth: sx + sy - 1.5, draw: () => sc.drawProp(ctx, "signpost", c.x, c.y, s * 0.7, px) }); }
      if (map !== "farm") return;
      const look = (r: { x: number; y: number; w: number; h: number }) => onScreen(project({ x: r.x + r.w / 2, y: r.y + r.h / 2 }));
      // ── the buildings (ART: stand-ins; their pictures are pa_barn, pa_coop, pa_nursery)
      const myFront = w?.herds.find((h) => h.owner === me)?.facade ?? 0;
      if (look(BARN)) things.push({ depth: BARN.x + BARN.y + (BARN.w + BARN.h) / 2, draw: () => drawHouse(ctx, project, BARN, { wall: ["#a8442e", "#4a6a8a", "#5a7a3a", "#8a5aa0"][myFront] ?? "#a8442e", roof: "#5a3424", trim: "#f0e2c8", wallH: 46, roofH: 30, door: 0.22, windows: 2 }, s) });
      if (look(COOP)) things.push({ depth: COOP.x + COOP.y + (COOP.w + COOP.h) / 2, draw: () => drawHouse(ctx, project, COOP, { wall: "#d8c090", roof: "#8a4a2a", trim: "#5a3a1a", wallH: 30, roofH: 20, door: 0.2, windows: 2 }, s) });
      if (look(NURSERY)) things.push({ depth: NURSERY.x + NURSERY.y + (NURSERY.w + NURSERY.h) / 2, draw: () => drawHouse(ctx, project, NURSERY, { wall: "#f0d8a8", roof: "#c8604a", trim: "#7a4a2a", wallH: 22, roofH: 14, door: 0.3, windows: 0 }, s) });
      // ── the troughs (food in each: the fuller, the greener), the nest, the stall and the table
      const trough = (at: readonly [number, number], fill: string) => {
        const r = { x: at[0] + 0.1, y: at[1] + 0.25, w: 1.8, h: 0.5 }, c = project({ x: at[0] + 1, y: at[1] + 0.5 });
        if (!onScreen(c)) return;
        things.push({ depth: at[0] + at[1] + 1.5, draw: () => drawBlock(ctx, project, r, "#7a5432", fill, 9, s) });
        out.push({ kind: "trough", x0: c.x - 34 * s, y0: c.y - 22 * s, x1: c.x + 34 * s, y1: c.y + 10 * s });
      };
      trough(TROUGHS.barn, "#b8c870"); trough(TROUGHS.coop, "#e0c870"); trough(TROUGHS.village, "#6aa8d8");
      { const c = project({ x: NEST[0] + 0.5, y: NEST[1] + 0.5 }); if (onScreen(c)) {
        const eggs = (w?.animals ?? []).filter((a) => a.born > clock && SPECIES[a.species].kind === "bird").length;
        things.push({ depth: NEST[0] + NEST[1] + 1, draw: () => {
          drawBlock(ctx, project, { x: NEST[0] + 0.1, y: NEST[1] + 0.1, w: 0.8, h: 0.8 }, "#a07838", "#d8b050", 5, s);
          // ART: pa_nest / pa_nestEgg: the straw ring and an egg in it for each child coming
          for (let i = 0; i < Math.min(4, eggs); i++) { ctx.fillStyle = "#f4ead0"; ctx.strokeStyle = "#8a6a3a"; ctx.beginPath(); ctx.ellipse(c.x + (i - 1.5) * 6 * s, c.y - 7 * s, 3 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        } });
        out.push({ kind: "nest", x0: c.x - 22 * s, y0: c.y - 22 * s, x1: c.x + 22 * s, y1: c.y + 8 * s });
        tag(t("รังผสมพันธุ์", "Breeding nest"), c.x, c.y - 26 * s);
      } }
      { const r = { x: POPOTO.tiles[0][0], y: POPOTO.tiles[0][1], w: 3, h: 1 }, c = project({ x: r.x + 1.5, y: r.y + 0.5 }); if (onScreen(c)) {
        // ART: pa_stall: a market stall with a striped awning
        things.push({ depth: r.x + r.y + 2, draw: () => {
          drawBlock(ctx, project, { x: r.x + 0.1, y: r.y + 0.1, w: 2.8, h: 0.9 }, "#8a5a2a", "#c89050", 16, s);
          const a = project({ x: r.x, y: r.y }), b = project({ x: r.x + 3, y: r.y });
          ctx.save(); for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? "#f4eee0" : "#3a8a5a"; const x0 = a.x + ((b.x - a.x) * i) / 6, y0 = a.y + ((b.y - a.y) * i) / 6, x1 = a.x + ((b.x - a.x) * (i + 1)) / 6, y1 = a.y + ((b.y - a.y) * (i + 1)) / 6; ctx.beginPath(); ctx.moveTo(x0, y0 - 44 * s); ctx.lineTo(x1, y1 - 44 * s); ctx.lineTo(x1 + 8 * s, y1 - 32 * s); ctx.lineTo(x0 + 8 * s, y0 - 32 * s); ctx.fill(); } ctx.restore();
          ctx.fillStyle = "#6a4a2a"; ctx.fillRect(a.x - 1 * s, a.y - 44 * s, 2 * s, 44 * s); ctx.fillRect(b.x - 1 * s, b.y - 44 * s, 2 * s, 44 * s);
        } });
      } }
      { const at = project(POPOTO.at); if (onScreen(at)) {
        const beat = still ? 0 : Math.floor(tick / 700) % 14;
        things.push({ depth: POPOTO.at.x + POPOTO.at.y, draw: () => { drawPopoto(ctx, sc, k, at, s, px, beat); } });
        out.push({ kind: "popoto", x0: at.x - 22 * s, y0: at.y - 66 * s, x1: at.x + 22 * s, y1: at.y + 4 * s });
        tag(t("ลุง Popoto", "Uncle Popoto"), at.x, at.y - 74 * s, "#e5cc80");
      } }
      { const c = project({ x: TABLE[0] + 1, y: TABLE[1] + 0.5 }); if (onScreen(c)) {
        things.push({ depth: TABLE[0] + TABLE[1] + 1.5, draw: () => drawBlock(ctx, project, { x: TABLE[0] + 0.1, y: TABLE[1] + 0.2, w: 1.8, h: 0.6 }, "#8a6a40", "#b89060", 14, s) });
        out.push({ kind: "table", x0: c.x - 30 * s, y0: c.y - 26 * s, x1: c.x + 30 * s, y1: c.y + 8 * s });
      } }
      // ── the gate, open or shut, and the fence and the rim's woods
      { const c = project({ x: GATE.x + 1.5, y: GATE.y + 0.5 }); if (onScreen(c)) {
        things.push({ depth: GATE.x + GATE.y + 1.5, draw: () => drawGateArt(ctx, k, project, GATE, gateOpen, s, px) });
        out.push({ kind: "gate", x0: c.x - 50 * s, y0: c.y - 36 * s, x1: c.x + 50 * s, y1: c.y + 10 * s });
        tag(gateOpen ? t("ประตูทุ่ง · เปิด", "Meadow gate · open") : t("ประตูทุ่ง · ปิด", "Meadow gate · shut"), c.x, c.y - 42 * s, gateOpen ? "#a8f0c0" : "#e5cc80");
      } }
      if (sc) for (const p of PASTURE_PROPS) {
        const c = project({ x: p.x + 0.5, y: p.y + 0.62 });
        if (!onScreen(c)) continue;
        const art = p.kind === "fence" ? "fence" : (() => { const a = artOf({ kind: p.kind, x: p.x, y: p.y }); return sc.has(a) ? a : p.kind; })();
        if (sc.has(art)) things.push({ depth: p.x + p.y + 1, draw: () => sc.drawProp(ctx, art, c.x, c.y, s, px, 0, !!p.across) });
      }
      // (what is no building is drawn only where whoever keeps the game has a pasture: v291's town_animals)
      if (!w) return;
      // ── the meadow's forage spots: what each gives this band, plain grass once I took it
      const meadow = (keeper.purse() as { meadow?: { k: number; spots: number[] } }).meadow, key = dayOf(clock) * 8 + bandOf(clock);
      MEADOW_SPOTS.forEach(([x, y], i) => {
        const c = project({ x: x + 0.5, y: y + 0.6 });
        if (!onScreen(c)) return;
        const item = forageAt(FORAGE_BANDS, dayOf(clock), bandOf(clock), i), taken = !!meadow && meadow.k === key && meadow.spots.includes(i);
        things.push({ depth: x + y + 0.9, draw: () => drawForage(ctx, k, c, s, FORAGE_TINT[item ?? ""] ?? "#f0e0a0", taken, tick, still, px) });
        if (!taken) out.push({ kind: "forage", spot: i, x0: c.x - 14 * s, y0: c.y - 20 * s, x1: c.x + 14 * s, y1: c.y + 6 * s });
      });
      // ── the animals, everybody's, and the eggs laid out
      const openAt = (tt: number) => gateOpenAt(w.gate, tt).open;
      // (they lie down when the sky this page shows is night: the same for everybody, the lamps' own measure)
      const night = (frame.dark ?? 0) > 0.55;
      const bellNow = bell.current && clock < bell.current.till ? bell.current : null;
      const myPurse = keeper.purse();
      const glints = wearing(myPurse, ANIMAL_GIFTS.bell as CharmId);
      for (const a of w.animals) {
        const st = stageOf(a, clock);
        if (st === "coming") continue;
        const young = st !== "adult", mine = a.owner === me;
        let spot = animalSpot(a.id, a.species, young, clock, openAt, night);
        if (mine && bellNow) { const f = Math.min(1, (bellNow.till - clock) > 15_000 ? (20_000 - (bellNow.till - clock)) / 5000 : 1); const ang = (a.id.charCodeAt(0) % 8) / 8 * Math.PI * 2; spot = { ...spot, x: spot.x + (bellNow.at.x + Math.cos(ang) * 1.3 - spot.x) * f, y: spot.y + (bellNow.at.y + Math.sin(ang) * 1.3 - spot.y) * f, pose: f < 1 ? "walk" : "happy" as never }; }
        const c = project({ x: spot.x, y: spot.y });
        if (!onScreen(c)) continue;
        const pose = spot.pose;
        things.push({ depth: spot.x + spot.y, draw: () => drawAnimal(ctx, k, { species: a.species, breed: a.breed, stage: st, pose, right: spot.right }, c, s, px, tick, still) });
        const box = animalSize(k, { species: a.species, breed: a.breed, stage: st });
        const care = !mine && mayCare(w.herds.find((h) => h.owner === a.owner), me);
        if (mine || care) out.push({ kind: "animal", id: a.id, x0: c.x - (box.w / 2 + 6) * s, y0: c.y - (box.h + 8) * s, x1: c.x + (box.w / 2 + 6) * s, y1: c.y + 6 * s });
        // bubbles over mine and those I may care for; a name over mine
        const sec = Math.floor(clock / 1000), key = `${a.at}:${a.food}:${a.banked}:${a.hearts}:${w.gate.length}`, had = views.current.get(a.id);
        const v = had && had.at === sec && had.key === key ? had.v : viewOf(a, clock, { gate: w.gate });
        views.current.set(a.id, { at: sec, key, v });
        const head = c.y - (box.h + 4) * s;
        if (mine && v.ready > 0 && a.place === "producing") over?.(() => drawBubble(ctx, k, "ready", SPECIES[a.species].game, c.x, head, s, tick, still, px));
        else if (v.hungry && (mine || care)) over?.(() => drawBubble(ctx, k, mine ? "hungry" : "care", SPECIES[a.species].game, c.x, head, s, tick, still, px));
        if (mine && s >= 0.8) tag((a.name || breedOf(a.breed)?.name[th ? "th" : "en"] || "").slice(0, 12), c.x, c.y + 10 * s, "#cfe6ff");
        else if (a.name && s >= 1.4) tag(a.name.slice(0, 12), c.x, c.y + 10 * s);
      }
      // the eggs laid out on the meadow, wherever their hens are now: everybody sees whose; only the owner picks them up
      for (const a of w.animals) {
        const mine = a.owner === me;
        a.outside.forEach((o, i) => {
          const e = project({ x: o.at[0] + 0.5, y: o.at[1] + 0.55 });
          if (!onScreen(e)) return;
          things.push({ depth: o.at[0] + o.at[1] + 0.8, draw: () => drawEggOut(ctx, k, e, s, mine && glints, tick, still, px) });
          if (mine) out.push({ kind: "egg", id: a.id, spot: i, at: [o.at[0], o.at[1]], x0: e.x - 14 * s, y0: e.y - 18 * s, x1: e.x + 14 * s, y1: e.y + 6 * s });
          if (s >= 0.9 || mine) tag(t(`ไข่ของ${mine ? "เรา" : ` ${P.people().find((p) => p.id === a.owner)?.name ?? "เพื่อน"}`}`, `${mine ? "Your" : (P.people().find((p) => p.id === a.owner)?.name ?? "A friend") + "'s"} eggs`), e.x, e.y - 22 * s, mine ? "#fff1a0" : "#f3e3c3");
        });
      }
      void homeOf; void NURSERY;
    };
    const tap = (x: number, y: number, peek = false): true | { walk: Vec } | null => {
      const P = propsRef.current, at = P.self(), tile: [number, number] | null = at ? [Math.floor(at.x), Math.floor(at.y)] : null;
      // (the one in front first: the last drawn of what is under the point)
      const hit = [...hits.current].reverse().find((h) => inBox(h, x, y));
      if (!hit) return null;
      if (peek) return true;
      if (hit.kind === "popoto") { P.onTalk(); return true; }
      if (!worldRef.current) return null;
      switch (hit.kind) {
        case "nest": open("nest"); return true;
        case "trough": open("mine"); return true;
        case "table": say(t("โต๊ะแปรรูป: ทำครีม เนย ชีส ไหมพรม ได้ที่หน้าครัวเหมือนของแปรรูปอื่นๆ (ต้องมีเครื่องมือ)", "The making table: cream, butter, cheese and yarn are made as other preparations are (with their tools).")); return true;
        case "animal": {
          const a = worldRef.current.animals.find((x) => x.id === hit.id);
          if (!a) return true;
          open(a.owner === me ? "mine" : "care", a.id);
          return true;
        }
        case "egg": if (near(tile, hit.at[0], hit.at[1])) { void pick(hit.id, hit.spot); return true; } want.current = { kind: "egg", id: hit.id, spot: hit.spot, at: hit.at }; return { walk: { x: hit.at[0] + 0.5, y: hit.at[1] + 0.5 } };
        case "forage": { const [fx, fy] = MEADOW_SPOTS[hit.spot]; if (near(tile, fx, fy)) { void forage(hit.spot); return true; } want.current = { kind: "forage", spot: hit.spot }; return { walk: { x: fx + 0.5, y: fy + 1.5 } }; }
        case "gate": if (near(tile, GATE.x + 1, GATE.y, GATE_REACH)) { void toggleGate(); return true; } want.current = { kind: "gate" }; return { walk: { x: GATE.x + 1.5, y: GATE.y - 1.5 } };
        case "wagon": if (hit.standing) { if (tile && Math.hypot(tile[0] + 0.5 - hit.at.x, tile[1] + 0.5 - hit.at.y) <= WAGON_REACH) { void board(hit.run); return true; } return { walk: { x: hit.at.x, y: hit.at.y + 1 } }; } say(t("เกวียนกำลังวิ่ง รอขึ้นที่ป้ายถัดไปนะ", "It's rolling: hop on at the next stop.")); return true;
      }
      return null;
    };
    const feet = (x: number, y: number) => hits.current.some((h) => (h.kind === "egg" || h.kind === "forage") && inBox(h, x, y));
    register({ draw, tap, feet, open });
    return () => register(null);
  }); // (re-registered each render: what it draws reads the latest of everything through refs)

  // ── the hay wagon: boarding, the ride counted, getting down
  const board = async (run: string) => {
    const w = worldRef.current?.wagons.find((r) => r.id === run);
    if (!w) return;
    const r = await act({ action: "ride", run, leg: wagonAt(w, keeper.now()).leg }, t("ขึ้นเกวียนแล้ว นั่งให้ครบสองช่วงทาง สัตว์ทุกตัวของเราได้ +1 หัวใจ", "On the wagon. Ride two legs and every animal of yours gets a heart."));
    if (r.ok) props.takeSeat(wagonSeat(run));
  };
  const rodeFor = useRef<string | null>(null);
  const myRun = runOf(props.seat), run = myRun ? world?.wagons.find((r) => r.id === myRun) : null;
  useEffect(() => {
    if (!run || rodeFor.current === run.id) return;
    const rider = run.riders.find((r) => r.who === me);
    if (!rider) return;
    const legMs = (ANIMALS.wagon.mins * 60_000) / Math.max(1, run.stops.length);
    if (keeper.now() >= rider.on + ANIMALS.wagon.legs * legMs) { rodeFor.current = run.id; void act({ action: "rode", run: run.id }, t("นั่งครบสองช่วงแล้ว! สัตว์ทุกตัวของเราได้ +1 หัวใจ", "Two legs ridden! Every animal of yours gets a heart.")); }
  });

  // ── the cloud ram's second seat: asked, taken, let down
  const [invite, setInvite] = useState<{ from: string; name: string } | null>(null);
  const [passenger, setPassenger] = useState<string | null>(null);
  useEffect(() => {
    props.pairHear((from, data) => {
      const d = data as { k?: string; m?: string; n?: string } | null;
      if (!d || d.k !== "ram") return;
      if (d.m === "ask") setInvite({ from, name: d.n || t("เพื่อน", "A friend") });
      else if (d.m === "yes") { setPassenger(from); say(t("เพื่อนขึ้นมานั่งข้างหลังแล้ว", "Your friend is up behind you.")); }
      else if (d.m === "no") say(t("เพื่อนยังไม่ขึ้นตอนนี้", "Not this time."));
      else if (d.m === "off" && riderOf(propsRef.current.seat) === from) propsRef.current.getDown();
    });
    return () => props.pairHear(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const riding = props.pet === RAM && !props.sitting && !props.seat;
  const nearby = riding ? props.people().filter((p) => !p.seat && (p.sit ?? -1) === -1 && p.pet !== RAM && (() => { const a = props.self(); return !!a && Math.hypot(p.x - a.x, p.y - a.y) <= RAM_REACH; })()).slice(0, 2) : [];
  const behind = riderOf(props.seat);
  useEffect(() => { if (passenger && !props.people().some((p) => p.id === passenger && riderOf(p.seat) === me)) { const t0 = setTimeout(() => setPassenger((x) => (x === passenger && !propsRef.current.people().some((p) => p.id === passenger && riderOf(p.seat) === me) ? null : x)), 4000); return () => clearTimeout(t0); } });

  // ── the gifts' buttons, where they apply: the bell, the harp, the wind and the wagon (on the farm)
  const gives = (id: string) => (keeper as { gives?: (id: string) => boolean }).gives?.(id) !== false;
  const bellOn = onFarm && wearing(purse, ANIMAL_GIFTS.bell as CharmId);
  const harpHas = onFarm && hasThing(purse, ANIMAL_GIFTS.harp as ThingId) && gives(ANIMAL_GIFTS.harp);
  const windHas = onFarm && hasThing(purse, ANIMAL_GIFTS.wind as ThingId) && gives(ANIMAL_GIFTS.wind);
  const wagonHas = onFarm && hasThing(purse, ANIMAL_GIFTS.wagon as ThingId) && gives(ANIMAL_GIFTS.wagon);
  const ringBell = () => { const a = props.self(); if (!a) return; bell.current = { at: a, till: keeper.now() + 20_000 }; say(t("กริ๊งๆ สัตว์ของเราวิ่งมาหาแล้ว ไข่ในทุ่งจะเรืองให้เห็น", "Ding! Your animals come running; your eggs on the meadow glint.")); };
  const playHarp = async () => { const a = props.self(); const ids = a ? props.people().filter((p) => Math.hypot(p.x - a.x, p.y - a.y) <= ANIMALS.harp.near).map((p) => p.id) : []; await act({ action: "harp", near: ids }, t(`บรรเลงพิณแล้ว ${ids.length + 1} คนเล่นเกมสัตว์ได้ง่ายขึ้น 30 นาที`, `The harp plays: ${ids.length + 1} of you play the animal games easier for 30 minutes.`)); };
  const callWind = async () => { const r = await act({ action: "wind" }, t("เรียกลมฤดูใบไม้ผลิแล้ว! ทั้งเมืองได้ยิน ใครเข้าฟาร์มในชั่วโมงนี้ได้ของขวัญ", "You call the spring wind! The whole town hears: whoever comes onto the farm this hour is gifted.")); if (r.ok) props.tellRoom("wind"); };
  const callWagon = async () => { const r = await act({ action: "wagon", stops: ["farm", "town", "forest"] }, t("เกวียนหญ้าแห้งออกจากฟาร์มแล้ว ขึ้นได้ที่ป้ายทุกแมพ", "The hay wagon sets off from the farm: hop on at any map's stop.")); if (r.ok) props.tellRoom("wagon"); };

  // ── the gate's own chip, near it
  const byGate = onFarm && !!here && near(here, GATE.x + 1, GATE.y, GATE_REACH);
  // ── the wagon to board, standing at a stop near me
  const boardable = !props.seat && world ? world.wagons.map((r) => ({ r, at: wagonSpot(r, now) })).find(({ at }) => { const a = props.self(); return !!at && at.standing && at.map === place && !!a && Math.hypot(a.x - at.at.x, a.y - at.at.y) <= WAGON_REACH + 1; }) : undefined;

  // ── for scripts trying things out (`next dev`): open the panel, play a game's go, read the world
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __townPasture?: unknown };
    w.__townPasture = { open: (v: AnimalsView, f?: string) => open(v, f ?? null), close: () => setView(null), world: () => keeper.animalWorld(),
      hits: () => hits.current.map((h) => ({ ...h, x: (h.x0 + h.x1) / 2, y: (h.y0 + h.y1) / 2 })), view: () => view, self: () => propsRef.current.self(), seat: () => propsRef.current.seat, people: () => propsRef.current.people(), pet: () => propsRef.current.pet, play: (id: string) => { const a = keeper.animalWorld()?.animals.find((x) => x.id === id); if (a) { setView(null); setGame(a); } }, collect: (id: string, play: Play, cracked?: number) => { const a = keeper.animalWorld()?.animals.find((x) => x.id === id); if (a) void collected(a, play, cracked); } };
    return () => { delete w.__townPasture; };
  }, [keeper, open, collected, view]);

  if (!world) return null;
  const G = game ? SPECIES[game.species].game : null;
  return (
    <>
      {note && !view && (
        <TownFoot rank="note" order={12}>
          <p className="pop-in max-w-full rounded-full bg-bg/90 px-4 py-1.5 text-center text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-pasture-note>{note}</p>
        </TownFoot>
      )}
      {game && G && (
        <TownFoot rank="board" order={60} wide>
          {G === "milk" ? <MilkGame animal={game} ease={ease} th={th} kit={kitNow} reduced={reduced} onDone={(p) => void collected(game, p)} onQuit={() => setGame(null)} />
            : G === "eggs" ? <EggsGame animal={game} ease={ease} th={th} kit={kitNow} reduced={reduced} onDone={(p, c) => void collected(game, p, c)} onQuit={() => setGame(null)} />
              : <ShearGame animal={game} ease={ease} th={th} kit={kitNow} reduced={reduced} onDone={(p) => void collected(game, p)} onQuit={() => setGame(null)} />}
        </TownFoot>
      )}
      {!view && !game && (byGate || boardable || myRun || behind || invite || nearby.length > 0 || passenger) && (
        <TownFoot rank="chip" order={33}>
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2" data-pasture-chips>
            {byGate && <button type="button" className="pressable min-h-11 rounded-full border border-line-lit bg-surface/92 px-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm" onClick={() => void toggleGate()} data-gate={gateOpen ? "open" : "shut"}>{gateOpen ? t("ปิดประตูทุ่ง", "Shut the meadow gate") : t("เปิดประตูทุ่ง", "Open the meadow gate")}</button>}
            {boardable && <button type="button" className="pressable min-h-11 rounded-full bg-accent px-4 text-ui font-semibold text-bg shadow-lg" onClick={() => void board(boardable.r.id)} data-wagon-board>{t("ขึ้นเกวียนหญ้า", "Hop on the hay wagon")}</button>}
            {myRun && <button type="button" className="pressable min-h-11 rounded-full border border-line-lit bg-surface/92 px-4 text-ui text-ink shadow-lg" onClick={() => props.getDown()} data-wagon-off>{t("ลงจากเกวียน", "Get off the wagon")}</button>}
            {behind && <button type="button" className="pressable min-h-11 rounded-full border border-line-lit bg-surface/92 px-4 text-ui text-ink shadow-lg" onClick={() => props.getDown()} data-ram-off>{t("ลงจากหลังแกะ", "Get down")}</button>}
            {invite && <span className="flex items-center gap-2 rounded-full border border-gold/60 bg-surface/95 py-1 pl-4 pr-1 text-ui text-ink shadow-lg" data-ram-invite={invite.from}>
              {t(`${invite.name} ชวนขี่แกะปุยเมฆด้วยกัน`, `${invite.name} asks you onto the cloud ram`)}
              <button type="button" className="pressable min-h-11 rounded-full bg-accent px-3 font-semibold text-bg" onClick={() => { props.takeSeat(ramSeat(invite.from)); props.pairSend(invite.from, { k: "ram", m: "yes" }); setInvite(null); }}>{t("ขึ้นเลย", "Hop on")}</button>
              <button type="button" className="pressable min-h-11 rounded-full border border-line-strong px-3 text-ink" onClick={() => { props.pairSend(invite.from, { k: "ram", m: "no" }); setInvite(null); }}>{t("ไม่เป็นไร", "No thanks")}</button>
            </span>}
            {nearby.filter((p) => p.id !== passenger).map((p) => <button key={p.id} type="button" className="pressable min-h-11 rounded-full border border-line-lit bg-surface/92 px-4 text-ui text-ink shadow-lg" onClick={() => { props.pairSend(p.id, { k: "ram", m: "ask", n: props.myName }); say(t(`ชวน ${p.name} แล้ว รอตอบ`, `Asked ${p.name}.`)); }} data-ram-ask={p.id}>{t(`ชวน ${p.name} ขี่ด้วย`, `Ask ${p.name} to ride`)}</button>)}
            {passenger && <button type="button" className="pressable min-h-11 rounded-full border border-line-lit bg-surface/92 px-4 text-ui text-ink shadow-lg" onClick={() => { props.pairSend(passenger, { k: "ram", m: "off" }); setPassenger(null); }} data-ram-let-down>{t("ให้เพื่อนลง", "Let your friend down")}</button>}
          </div>
        </TownFoot>
      )}
      {!view && !game && bellOn && <TownFoot rank="power" order={21} icon={animalIcon("charmHerdBell") as IconName}><button type="button" onClick={ringBell} aria-label={t("สั่นกระดิ่งเรียกฝูง", "Ring the herd bell")} data-power="bell" /></TownFoot>}
      {!view && !game && harpHas && <TownFoot rank="power" order={22} icon={animalIcon("thingHarp") as IconName} badge={usesLeft(purse, ANIMAL_GIFTS.harp, now)}><button type="button" onClick={() => void playHarp()} disabled={usesLeft(purse, ANIMAL_GIFTS.harp, now) < 1} aria-label={t("เล่นพิณทุ่งหญ้า", "Play the pasture harp")} data-power="harp" /></TownFoot>}
      {!view && !game && windHas && <TownFoot rank="power" order={23} icon={animalIcon("thingSpringWind") as IconName} badge={usesLeft(purse, ANIMAL_GIFTS.wind, now)}><button type="button" onClick={() => void callWind()} disabled={usesLeft(purse, ANIMAL_GIFTS.wind, now) < 1} aria-label={t("เรียกลมฤดูใบไม้ผลิ", "Call the spring wind")} data-power="wind" /></TownFoot>}
      {!view && !game && wagonHas && <TownFoot rank="power" order={24} icon={animalIcon("thingHayWagon") as IconName} badge={usesLeft(purse, ANIMAL_GIFTS.wagon, now)}><button type="button" onClick={() => void callWagon()} disabled={usesLeft(purse, ANIMAL_GIFTS.wagon, now) < 1} aria-label={t("เรียกเกวียนหญ้าแห้ง", "Call the hay wagon")} data-power="wagon" /></TownFoot>}
      {view && (
        <div className={`pop-in absolute z-40 overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone ? "inset-x-0 h-[min(86%,44rem,calc(100%-8.5rem))] rounded-t-2xl" : "right-3 top-16 w-[26rem] rounded-2xl"}`}
             style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { bottom: "0.75rem" }} data-state="open" data-pasture-panel>
          <TownAnimals keeper={keeper} th={th} view={view} onView={setView} onClose={() => setView(null)} focus={focus} nameOf={nameOf} members={members}
                       onCollect={(a) => { setView(null); setGame(a); }} kit={kitNow} face={pastureSprite(kitNow, POPOTO_TALK[0]) ?? props.art("un_stand")} />
        </div>
      )}
    </>
  );
}

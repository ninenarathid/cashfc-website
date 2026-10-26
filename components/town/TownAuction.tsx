"use client";

import { useEffect, useRef, useState } from "react";
import { bidElsewhere, minBid, stepOf, type AuctionBoard, type Bid } from "@/lib/town/auction";
import type { Look } from "@/lib/town/look";
import { FACE_WEAR, HAIR_WEAR, HATS, NECK_WEAR, OUTFITS } from "@/lib/town/wear";
import DollPreview from "./DollPreview";
import TownIcon from "./TownIcon";
import { ShopHead, type ShopWindowProps } from "./TownTailor";

/** Where each thing of a set goes in a look. */
const SLOTS = [["outfit", OUTFITS], ["hat", HATS], ["faceWear", FACE_WEAR], ["neck", NECK_WEAR], ["hairWear", HAIR_WEAR]] as const;
/** A look in a whole set: a woman shows its hair thing where it has one, a man its hat (the two take turns). */
export function setLook(look: Look, wearables: readonly string[]): Look {
  const found = wearables.flatMap((id) => SLOTS.flatMap(([slot, list]) => { const i = (list as readonly { id: string }[]).findIndex((w) => w.id === id); return i < 0 ? [] : [{ slot, i }]; }));
  const hats = found.filter((f) => f.slot === "hat"), tops = found.filter((f) => f.slot === "hairWear" && !!HAIR_WEAR[f.i]?.top);
  const left = new Set(look.gender === 0 ? (tops.length ? hats : []) : (hats.length ? tops : []));
  // (a set that has something for the head takes the head whole: what I have on it goes, a hat bought before included)
  const out: Look = { ...look, ...(hats.length || found.some((f) => f.slot === "hairWear") ? { hat: 0, hairWear: 0 } : {}) };
  for (const f of found) if (!left.has(f)) (out as unknown as Record<string, number>)[f.slot] = f.i;
  return out;
}
const nameOf = (id: string) => SLOTS.flatMap(([, l]) => l as readonly { id: string; th: string; en: string }[]).find((w) => w.id === id);

/**
 * The week's auction of limited outfits (the owner, 2026-10-25; the rules are lib/town/auction's and the database's,
 * v297): each design up with so many copies, the top bids at the close have them and pay what they bid. A bid is paid
 * and held at once, given back whole the moment it is pushed out, and is never taken back; a raise pays the difference.
 * Every round open, to come or closed of late is a lot here: the set on my own doll (a try puts it on my avatar in the
 * shop), its copies and round, the close and the time left, the bids by name, where I stand, and the bid. Codex's look
 * at the mock-ups: the close and what a bid takes plainly, the rules folded away, 44 px to press on a phone. One design at
 * a time (the owner, 2026-10-26): where my bid stands on another round, a lot says so and its bid moves it here.
 */
export default function TownAuction(p: ShopWindowProps) {
  const { th, keeper, kit, look, coins, tryOn, onDressed, dressMannequin } = p;
  const [boards, setBoards] = useState<AuctionBoard[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [skew, setSkew] = useState(0);
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [said, setSaid] = useState<Record<number, string>>({});
  const [trying, setTrying] = useState<number | null>(null);
  const requests = useRef(new Map<string, string>());
  const settled = useRef(new Set<number>());

  // the rounds, asked again every fifteen seconds while the board is open; the clock ticks every second
  useEffect(() => {
    if (!keeper) return;
    let on = true;
    const ask = () => void keeper.auctions().then((b) => {
      if (!on || !b) return;
      setBoards(b.auctions);
      setSkew(b.now - Date.now());
      // (a round I won, settled since I last looked: the wardrobe asks again)
      for (const a of b.auctions) if (a.settledAt && !settled.current.has(a.id)) { settled.current.add(a.id); if (a.had) onDressed(); }
    });
    ask();
    const id = window.setInterval(ask, 15_000), tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { on = false; window.clearInterval(id); window.clearInterval(tick); };
  }, [keeper]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { tryOn(null); dressMannequin(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const t = (n: { th: string; en: string } | undefined) => (n ? (th ? n.th : n.en) : "");
  const fmt = (n: number) => n.toLocaleString(th ? "th-TH" : "en-US");
  const at = now + skew;
  const left = (ms: number) => {
    const s = Math.max(0, Math.floor((ms - at) / 1000)), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return d ? (th ? `${d} วัน ${h} ชม.` : `${d}d ${h}h`) : h ? (th ? `${h} ชม. ${m} นาที` : `${h}h ${m}m`) : (th ? `${m} นาที ${s % 60} วิ` : `${m}m ${s % 60}s`);
  };
  const when = (ms: number) => new Date(ms).toLocaleString(th ? "th-TH" : "en-GB", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const bidsOf = (a: AuctionBoard): Bid[] => a.bids.map((b, i) => ({ member: b.mine ? "me" : `o${i}`, name: b.name, amount: b.amount, at: b.at }));
  // (my bid on another round still open, which a bid here would move: none where I have one here)
  const awayOf = (a: AuctionBoard) => (a.bids.some((b) => b.mine) ? null : bidElsewhere((boards ?? []).filter((x) => at < x.closesAt), a.id));
  const heldOf = (a: AuctionBoard) => a.bids.find((b) => b.mine)?.amount ?? awayOf(a)?.amount ?? 0;
  const leastOf = (a: AuctionBoard) => minBid(a, bidsOf(a), "me", awayOf(a)?.amount ?? 0);
  const amountOf = (a: AuctionBoard) => Math.max(amounts[a.id] ?? 0, leastOf(a));

  const place = async (a: AuctionBoard) => {
    if (!keeper || busy !== null) return;
    const amount = amountOf(a), mine = heldOf(a), away = awayOf(a);
    if (amount - mine > coins) { setSaid((s) => ({ ...s, [a.id]: th ? "เหรียญไม่พอจ้ะ" : "Not enough coins." })); return; }
    const key = `${a.id}:${amount}`, req = requests.current.get(key) ?? crypto.randomUUID();
    requests.current.set(key, req);
    setBusy(a.id);
    const did = await keeper.bid(a.id, amount, req);
    setBusy(null);
    const board = did.auction, from = did.ok ? did.from : undefined;
    if (board) setBoards((bs) => bs?.map((x) => (x.id === board.id ? board : from && x.id === from.id ? from : x)) ?? bs);
    // (a bid asked again after its answer was lost takes nothing more: said as placed, without a sum)
    if (did.ok) {
      requests.current.delete(key);
      const moved = from ?? (away && !did.repeated ? away.round : undefined), was = moved ? t(nameOf(moved.wearables[0])) : "";
      setSaid((s) => ({ ...s, [moved ? moved.id : -1]: "", [a.id]: did.repeated || typeof did.pay !== "number" ? (th ? "เสนอแล้ว" : "Bid placed")
        : moved ? (th ? `ย้ายการประมูลจาก${was}มาแล้ว หักเพิ่ม ${fmt(did.pay)} เหรียญ` : `Bid moved here from ${was}: ${fmt(did.pay)} more coins held`)
        : th ? `เสนอแล้ว หัก ${fmt(did.pay)} เหรียญ` : `Bid placed: ${fmt(did.pay)} coins held` }));
      return;
    }
    setSaid((s) => ({ ...s, [a.id]: did.why === "low" ? (th ? `ต่ำไปจ้ะ ขั้นต่ำตอนนี้ ${fmt(did.least ?? leastOf(a))}` : `Too low: at least ${fmt(did.least ?? leastOf(a))} now`)
      : did.why === "coins" ? (th ? "เหรียญไม่พอจ้ะ" : "Not enough coins.")
      : did.why === "closed" ? (th ? "ปิดประมูลแล้วจ้ะ" : "This round has closed.")
      : did.why === "known" ? (th ? "คุณมีชุดนี้แล้วจ้ะ" : "You have this design already.")
      : did.why === "away" ? (th ? "ติดต่อเมืองไม่ได้ ลองใหม่อีกครั้งนะ" : "The town can't be reached. Try again.")
      : (th ? "เสนอไม่ได้จ้ะ" : "That bid can't be placed.") }));
  };

  const lots = (boards ?? []).filter((a) => !a.settledAt || at - a.settledAt < 14 * 86400_000);
  return (
    <section aria-labelledby="town-auction-h" className="flex h-full flex-col">
      <ShopHead id="town-auction-h" {...p} panel="auction" />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-16 pt-3">
        <details className="mb-3 rounded-xl border border-[#4d3a1f] bg-[#241c12] px-3 py-1 text-meta text-[#f0cf95]">
          <summary className="min-h-11 cursor-pointer content-center font-semibold">{th ? "ประมูลลิมิเต็ด: แต่ละแบบมีไม่กี่ชุด · ดูกติกา" : "Limited auction: only a few copies · rules"}</summary>
          <ul className="mb-2 mt-1 list-disc space-y-1 pl-4 text-read">
            <li>{th ? "คนที่เสนอสูงสุดตามจำนวนชุดตอนปิดได้ชุด จ่ายเท่าที่ตัวเองเสนอ เท่ากันคนที่เสนอก่อนได้" : "The top bids at the close get the copies and pay what they bid; a tie goes to whoever bid first."}</li>
            <li>{th ? "เหรียญถูกหักและพักไว้ทันทีที่เสนอ ถ้าโดนแซงหลุดอันดับได้คืนครบทันที เพิ่มราคาจ่ายแค่ส่วนต่าง ถอนราคาไม่ได้" : "Coins are taken and held the moment you bid, given back in full the moment you are outbid; a raise pays the difference; a bid can't be withdrawn."}</li>
            <li>{th ? "ประมูลได้ทีละชุด เปลี่ยนใจได้: เสนอชุดอื่น = ย้ายการประมูลไปชุดนั้น เหรียญที่พักไว้ย้ายตามไป ชื่อคุณออกจากชุดเดิม" : "One design at a time; you may change your mind: a bid on another design moves yours there, the coins held go with it and your name leaves the first."}</li>
            <li>{th ? "เสนอหรือย้ายออกใน 5 นาทีสุดท้าย เวลาปิดเลื่อนออกไป 5 นาที แต่ไม่เกินเวลาปิดสุดท้าย" : "A bid, or a bid moving away, in the last five minutes moves the close five minutes on, never past the final close."}</li>
            <li>{th ? "ชุดผูกกับตัว ขายหรือแลกไม่ได้ มีเลขประจำชุดและรอบ แบบเดิมอาจกลับมาประมูลรอบใหม่" : "A copy is yours for good (no trade), numbered with its round; a design may come back for a new round."}</li>
          </ul>
        </details>
        {!boards ? <p className="text-meta text-muted">{th ? "กำลังโหลด…" : "Loading…"}</p>
          : !lots.length ? <p className="text-meta text-muted">{th ? "ยายยังไม่ได้ติดรายการประมูลสัปดาห์นี้จ้ะ" : "Nothing is up for auction this week yet."}</p> : (
          <div className="grid grid-cols-1 gap-3">
            {lots.map((a) => {
              const open = !a.settledAt && at >= a.opensAt && at < a.closesAt, early = at < a.opensAt, done = !!a.settledAt || at >= a.closesAt;
              const ranked = [...a.bids].sort((x, y) => y.amount - x.amount || x.at - y.at), myRank = ranked.findIndex((b) => b.mine);
              const away = awayOf(a), mine = heldOf(a), amount = amountOf(a), step = stepOf(Math.max(amount, a.start), a.stepPct, a.stepMin);
              const set = setLook(look, a.wearables), title = nameOf(a.wearables[0]);
              return (
                <article key={a.id} className="rounded-2xl border border-[#4b3a6e] bg-gradient-to-b from-[#221a33] to-card p-3">
                  <div className="flex gap-3">
                    <div className="grid w-20 shrink-0 place-items-center rounded-xl border border-[#3b2f57] bg-[#120f1c]">
                      <DollPreview w={64} h={84} deps={[kit, JSON.stringify(set)]}
                                   draw={(ctx, W, H) => {
                                     if (!kit) return;
                                     const s = (H * 0.9) / (kit.heightOf(set) ?? 52);
                                     kit.draw(ctx, set, "front", false, W / 2, H - Math.round(H * 0.05), s, {}, 1);
                                   }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-ui font-semibold text-ink">{t(title)}</h3>
                      <span className="mt-0.5 inline-block rounded-md bg-gradient-to-r from-[#d8b4ff] to-[#f7d58b] px-1.5 text-[11px] font-extrabold tracking-wide text-[#1c1230]">
                        LIMITED · {th ? `รอบ ${a.run} · ${a.copies} ชุด` : `round ${a.run} · ${a.copies} copies`}
                      </span>
                      {/* (what comes with the outfit: the title already names the outfit) */}
                      {a.wearables.length > 1 && <p className="mt-1 text-meta leading-snug text-muted">+ {a.wearables.slice(1).map((w) => t(nameOf(w))).join(" · ")}</p>}
                      <p className="mt-1 text-meta font-semibold text-gold">
                        {early ? (th ? `เปิด ${when(a.opensAt)}` : `Opens ${when(a.opensAt)}`)
                          : done ? (th ? "ปิดประมูลแล้ว" : "Closed")
                          : `${th ? "ปิด" : "Closes"} ${when(a.closesAt)} · ${th ? "อีก " : ""}${left(a.closesAt)}`}
                      </p>
                      {!done && (
                        <button type="button" onClick={() => { const on = trying === a.id; setTrying(on ? null : a.id); tryOn(on ? null : set); }}
                                className={`pressable mt-1.5 min-h-11 rounded-full border px-3 text-meta ${trying === a.id ? "border-accent bg-accent/15 text-accent" : "border-line-strong text-ink"}`}>
                          {trying === a.id ? (th ? "ถอดชุดที่ลอง" : "Take it off") : (th ? "ลองใส่ในร้าน" : "Try it on")}
                        </button>
                      )}
                    </div>
                  </div>
                  {done && a.owners.length > 0 ? (
                    <ol className="mt-2.5 grid gap-1">
                      {a.owners.map((o) => (
                        <li key={o.edition} className="flex justify-between rounded-lg bg-bg/60 px-2.5 py-1.5 text-meta text-ink">
                          <span>#{o.edition}/{a.copies} · {o.name}</span><span className="text-muted">{th ? `รอบ ${a.run}` : `round ${a.run}`}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <ol className="mt-2.5 grid gap-1">
                      {Array.from({ length: a.copies }, (_, i) => ranked[i] ?? null).map((b, i) => (
                        <li key={i} className={`flex justify-between rounded-lg px-2.5 py-1.5 text-meta ${b?.mine ? "bg-accent/15 text-ink ring-1 ring-accent" : b ? "bg-bg/60 text-ink" : "bg-bg/40 italic text-muted"}`}>
                          <span>{i + 1}. {b ? (b.mine ? (th ? "คุณ" : "You") : b.name || "?") : (th ? "ว่าง" : "Free")}</span>
                          <span className="flex items-center gap-1 font-semibold tabular-nums text-gold">{b ? <><TownIcon name="coin" size={12} />{fmt(b.amount)}</> : (th ? `เริ่ม ${fmt(a.start)}` : `from ${fmt(a.start)}`)}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  <p className={`mt-1.5 text-meta ${myRank >= 0 || a.had ? "text-ok" : "text-muted"}`}>
                    {a.had ? (th ? "คุณมีชุดนี้แล้ว" : "You have this design.")
                      : myRank >= 0 ? (th ? `คุณอยู่อันดับ ${myRank + 1} · ถ้าปิดตอนนี้ได้ชุด #${myRank + 1}` : `You're number ${myRank + 1}: copy #${myRank + 1} if it closed now`)
                      : done ? (th ? "คุณไม่ได้ชุดในรอบนี้" : "You didn't win a copy this round.") : (th ? "ยังไม่ได้เสนอ" : "No bid yet")}
                  </p>
                  {open && !a.had && (
                    <>
                      {/* (one design at a time: my bid stands on another, and a bid here moves it) */}
                      {away && (
                        <p className="mt-2 rounded-lg border border-[#6b5420] bg-[#2a2110] px-2.5 py-1.5 text-meta leading-snug text-[#f0cf95]">
                          {th ? <>คุณประมูล<b>{t(nameOf(away.round.wearables[0]))}</b>อยู่ <b className="tabular-nums">{fmt(away.amount)}</b> · เสนอชุดนี้ = ย้ายการประมูลมา เหรียญย้ายตาม ชื่อออกจากชุดเดิม</>
                            : <>Your bid of <b className="tabular-nums">{fmt(away.amount)}</b> is on <b>{t(nameOf(away.round.wearables[0]))}</b>. A bid here moves it, coins and all; your name leaves that one.</>}
                        </p>
                      )}
                      {/* (what a bid takes and when it comes back, right above the bid itself) */}
                      <p className="mt-2 text-meta leading-snug text-muted">
                        {th ? <>หักเพิ่ม <b className="text-gold">{fmt(Math.max(0, amount - mine))}</b> · ขั้นต่ำ {fmt(leastOf(a))} · คืนทันทีเมื่อหลุด {a.copies} อันดับ · ถอนไม่ได้</>
                          : <>Takes <b className="text-gold">{fmt(Math.max(0, amount - mine))}</b> more · at least {fmt(leastOf(a))} · back at once if pushed out of the top {a.copies} · can&apos;t be withdrawn</>}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button type="button" aria-label={th ? "ลดราคา" : "Lower"} disabled={amount - step < leastOf(a)}
                                onClick={() => setAmounts((s) => ({ ...s, [a.id]: Math.max(leastOf(a), amount - step) }))}
                                className="pressable grid size-11 shrink-0 place-items-center rounded-xl border border-line-strong text-title text-ink disabled:opacity-40">−</button>
                        <input inputMode="numeric" aria-label={th ? "ราคาที่เสนอ" : "Your bid"} value={fmt(amount)}
                               onChange={(e) => { const v = Number(e.target.value.replace(/[^0-9]/g, "")); if (Number.isFinite(v)) setAmounts((s) => ({ ...s, [a.id]: v })); }}
                               className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-bg text-center font-data text-ui font-semibold tabular-nums text-ink" />
                        <button type="button" aria-label={th ? "เพิ่มราคา" : "Raise"} onClick={() => setAmounts((s) => ({ ...s, [a.id]: amount + step }))}
                                className="pressable grid size-11 shrink-0 place-items-center rounded-xl border border-line-strong text-title text-ink">+</button>
                        <button type="button" disabled={busy !== null || amount - mine > coins} onClick={() => place(a)}
                                className="pressable min-h-11 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
                          {busy === a.id ? "…" : away ? (th ? "ย้ายมาชุดนี้" : "Move here") : th ? "เสนอ" : "Bid"}
                        </button>
                      </div>
                    </>
                  )}
                  {said[a.id] && <p role="status" className="mt-1 text-meta text-ink">{said[a.id]}</p>}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

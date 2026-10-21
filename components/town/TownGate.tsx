"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { useAdmin } from "@/lib/admin";
import { useMyFace } from "@/lib/avatars";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { resumable, useTownActive, type TownRecord } from "@/lib/town/active";
import type { TownMe } from "./Town";
import TownIcon from "./TownIcon";

/**
 * Who may walk into Cash Town, and the town itself loaded only for them.
 *
 * Members with a verified character, and the admins (v102, 2026-10-01: open
 * to the FC to find out how many one room holds). This gate is the courtesy;
 * the lock is in the database: the room's name is told only to those members
 * and its channel only lets them in. The town's code is a separate chunk,
 * fetched only once somebody is let through, so the rest of the site pays
 * nothing for it.
 *
 * A tab already in town (TownSession, still going while you looked at other
 * pages) goes straight back to it, with nothing to check again.
 *
 * In `next dev` only, `?townTest=A` skips the gate and uses a throwaway public
 * room, so two browsers can test walking and voice without anybody signing
 * in, and `&townCap=N` makes the room full at N so a test can reach that
 * without thirty browsers. A tester keeps one identity per tab, across
 * reloads, the way a member does. A production build compiles the switch away (the
 * address is never read there), so the test room cannot be reached.
 */
const Town = dynamic(() => import("./Town"), {
  ssr: false,
  loading: () => <Waiting />,
});

const TEST_TOPIC = "town:dev-test";
const CasinoGate = dynamic(() => import('@/components/casino/CasinoGate'), { ssr:false });

export default function TownGate() {
  return <Suspense fallback={<Waiting />}><TownMapGate /></Suspense>;
}
function TownMapGate() {
  const params=useSearchParams(),active=useTownActive();
  const map=params.get('map')??(active?.testTopic==='casino-lab'?'casino-test':active?.testTopic==='casino-live'?'casino':'town');
  if (map === 'casino-test') return <CasinoGate />;
  if (map === 'casino') return <CasinoGate live />;
  return <><VillageGate /><CasinoEntrance /></>;
}
/** The door appears only when Aqua opens LIVE. TEST remains a private direct link. */
function CasinoEntrance(){
  const {canEnterTown,realAdmin}=useAdmin();const [open,setOpen]=useState(false);
  useEffect(()=>{if(!canEnterTown)return;const client=createClient();if(!client)return;let gone=false;
    const read=async()=>{const {data}=await client.from('casino_live_settings').select('open,starts_at,ends_at').eq('id',1).maybeSingle();const now=Date.now();if(!gone)setOpen(!!data?.open&&(!data.starts_at||now>=Date.parse(data.starts_at))&&(!data.ends_at||now<Date.parse(data.ends_at)));};
    // (read every half minute; it no longer listens to the change feed, whose poll of the database ran ten times a second while anybody listened, 2026-10-16)
    void read();const timer=setInterval(()=>void read(),30000);
    return()=>{gone=true;clearInterval(timer);};
  },[canEnterTown]);
  return open||realAdmin?<Link href={open?"/town?map=casino":"/town?map=casino-test"} className="fixed right-3 top-[calc(var(--nav-h)+4rem)] z-[44] rounded-lg border border-amber-300 bg-[#402a37] px-3 py-2 text-sm text-amber-100">เทศบาล Popoto · Casino ↗</Link>:null;
}
/**
 * Which main town the database says is the town now (`town_map()`, supabase v295: the owner's switch between the town of
 * 2026-10-02 and the editor's, lib/town/town-map), told to the town before it is loaded. A page that had read the town
 * already (the dock, resuming) with the other one loads again once. Not waited on for more than a moment: without an
 * answer the town is the one this browser was last told. In `next dev`, `?townMap=town2` (or `classic`) says it instead.
 */
function useTownMap(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let settled = false;
    const done = (m: unknown) => {
      if (settled) return;
      settled = true;
      if (m === "classic" || m === "town2") {
        try { localStorage.setItem("cashtown:map", m); } catch { /* asked again next time */ }
        const g = globalThis as { __cashTownMap?: string; __cashTownMapUsed?: string };
        g.__cashTownMap = m;
        if (g.__cashTownMapUsed && g.__cashTownMapUsed !== m) { window.location.reload(); return; }
      }
      setReady(true);
    };
    const asked = process.env.NODE_ENV !== "production" ? new URLSearchParams(window.location.search).get("townMap") : null;
    if (asked) { done(asked); return; }
    const supabase = createClient();
    if (!supabase) { done(null); return; }
    const late = setTimeout(() => done(null), 2500);
    void Promise.resolve(supabase.rpc("town_map")).then(({ data, error }) => done(error ? null : data)).catch(() => done(null));
    return () => { settled = true; clearTimeout(late); };
  }, []);
  return ready;
}

function VillageGate() {
  const mapReady = useTownMap();
  const { lang } = useLang();
  const th = lang === "th";
  const { realAdmin, ready } = useAdmin();
  const face = useMyFace();
  const [userId, setUserId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [color, setColor] = useState("#6aa9e0");
  const [checked, setChecked] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [test, setTest] = useState<string | null>(null);
  const [testCap, setTestCap] = useState<number | undefined>(undefined);
  const [testId, setTestId] = useState<string | null>(null);
  /**
   * A test room of one's own (dev only): `&townRoom=check` is another room than plain `?townTest=A`. The scripts that
   * try the town use one, so that their testers neither walk about the room the owner is trying things in nor count
   * him among their cooks.
   */
  const [testRoom, setTestRoom] = useState("");
  // A tester coming back after a reload of /town without ?townTest (dev only).
  const [testBack, setTestBack] = useState<TownRecord | null>(null);
  const active = useTownActive();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const q = new URLSearchParams(window.location.search);
      const letter = q.get("townTest");
      setTest(letter);
      setTestCap(Number(q.get("townCap")) || undefined);
      setTestRoom((q.get("townRoom") ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 24));
      if (letter) setTestId(testerId(letter));
      else { const rec = resumable(); if (rec?.testTopic) setTestBack(rec); }
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setChecked(true); return; }
    let cancelled = false;
    setChecked(false);
    setProfileError(false);
    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (cancelled) return;
      if (error) throw error;
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) {
        const { data: p, error: profileError } = await supabase.from("profiles")
          .select("accent_color, character_id, character_verified_at").eq("id", id).maybeSingle();
        if (cancelled) return;
        if (profileError || !p) throw profileError ?? new Error("Profile unavailable");
        const row = p as {
          accent_color?: string | null; character_id?: number | null; character_verified_at?: string | null;
        } | null;
        if (row?.accent_color) setColor(row.accent_color);
        setVerified(!!row?.character_id && !!row?.character_verified_at);
      }
      setChecked(true);
    }).catch(() => { if (!cancelled) { setProfileError(true); setChecked(true); } });
    return () => { cancelled = true; };
  }, [face.error, profileAttempt]);
  const retryProfile = () => { face.retry(); setProfileAttempt(n => n + 1); };

  let body: React.ReactNode;
  // The town (or the wait for it) fills the window; only a message for
  // somebody who cannot come in sits on the page under its title.
  let stage = true;
  if (!mapReady) {
    body = <Waiting />;
  } else if (test) {
    const me: TownMe = { id: testId ?? "", name: th ? `ทดสอบ ${test}` : `Tester ${test}`, face: null, color: test === "B" ? "#c98a5b" : "#4fb8a8" };
    body = testId ? <Town me={me} testTopic={testRoom ? `${TEST_TOPIC}:${testRoom}` : TEST_TOPIC} cap={testCap} /> : <Waiting />;
  } else if (testBack) {
    body = <Town me={testBack.me} testTopic={testBack.testTopic} cap={testBack.cap} />;
  } else if (active && !active.testTopic?.startsWith("casino-")) {
    // Already in town in this tab (the dock brought you back): straight to it.
    const me = !active.testTopic && face.userId === active.me.id && face.name
      ? { ...active.me, name: face.name, face: face.avatar } : active.me;
    body = <Town me={me} testTopic={active.testTopic} cap={active.cap} />;
  } else if (!ready || !checked || !face.ready) {
    body = <Waiting />;
  } else if (profileError || (userId && face.error && !face.name)) {
    stage = false;
    body = <NameUnavailable th={th} retry={retryProfile} />;
  } else if (!userId || !(verified || realAdmin)) {
    stage = false;
    body = (
      <div className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center">
        <TownIcon name="town" size={44} className="mx-auto block" />
        <p className="mt-2 text-read text-ink">
          {!userId
            ? (th ? "เข้าสู่ระบบด้วย Discord แล้วยืนยันตัวละครก่อน ถึงจะเข้า Cash Town ได้" : "Sign in with Discord and verify your character to enter Cash Town.")
            : (th ? "Cash Town เปิดให้สมาชิกที่ยืนยันตัวละครแล้ว ยืนยันที่หน้าโปรไฟล์ได้เลย ใช้เวลาแป๊บเดียว" : "Cash Town is open to members with a verified character. Verify yours on your profile; it only takes a moment.")}
        </p>
        <Link href="/profile" className="mt-3 inline-block text-ui text-accent no-underline hover:underline">
          {!userId ? (th ? "เข้าสู่ระบบ" : "Sign in") : (th ? "ไปยืนยันตัวละคร" : "Verify a character")}
        </Link>
      </div>
    );
  } else if (!face.name || face.userId !== userId) {
    stage = false;
    body = <NameUnavailable th={th} retry={retryProfile} />;
  } else {
    const me: TownMe = { id: userId, name: face.name, face: face.avatar, color };
    body = <Town me={me} />;
  }

  return (
    <main className="pt-7">
      <div className={stage ? "sr-only" : ""}>
        <div className="font-data text-meta uppercase tracking-[0.22em] text-accent">{th ? "ทดลอง · Beta" : "Beta"}</div>
        <h1 className="font-display text-3xl font-bold">Cash Town</h1>
      </div>
      {body}
    </main>
  );
}

function NameUnavailable({ th, retry }: { th: boolean; retry(): void }) {
  return <div role="alert" className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center">
    <p className="text-read text-ink">{th ? "ยังโหลดข้อมูลตัวละครไม่สำเร็จ กรุณาลองอีกครั้ง" : "Could not load your character profile. Please try again."}</p>
    <button onClick={retry} className="mt-3 text-ui text-accent">{th ? "ลองอีกครั้ง" : "Try again"}</button>
  </div>;
}

/** One tester identity per tab and letter, kept across reloads (dev only). */
function testerId(letter: string): string {
  const key = `cashTown:test:${letter}`;
  const fresh = `test-${letter}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const known = sessionStorage.getItem(key);
    if (known) return known;
    sessionStorage.setItem(key, fresh);
  } catch { /* storage blocked: a new tester each time */ }
  return fresh;
}

/** The town's shape while it loads: the window under the header, as the town will fill it. */
function Waiting() {
  return <div className="skeleton fixed inset-x-0 bottom-0 top-[var(--nav-h)] z-[30] block" aria-hidden />;
}

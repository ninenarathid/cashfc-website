"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function TownGate() {
  const { lang } = useLang();
  const th = lang === "th";
  const { realAdmin, ready } = useAdmin();
  const face = useMyFace();
  const [userId, setUserId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [color, setColor] = useState("#6aa9e0");
  const [checked, setChecked] = useState(false);
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
    void supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) {
        const { data: p } = await supabase.from("profiles")
          .select("accent_color, character_id, character_verified_at").eq("id", id).maybeSingle();
        const row = p as {
          accent_color?: string | null; character_id?: number | null; character_verified_at?: string | null;
        } | null;
        if (row?.accent_color) setColor(row.accent_color);
        setVerified(!!row?.character_id && !!row?.character_verified_at);
      }
      setChecked(true);
    });
  }, []);

  let body: React.ReactNode;
  // The town (or the wait for it) fills the window; only a message for
  // somebody who cannot come in sits on the page under its title.
  let stage = true;
  if (test) {
    const me: TownMe = { id: testId ?? "", name: th ? `ทดสอบ ${test}` : `Tester ${test}`, face: null, color: test === "B" ? "#c98a5b" : "#4fb8a8" };
    body = testId ? <Town me={me} testTopic={testRoom ? `${TEST_TOPIC}:${testRoom}` : TEST_TOPIC} cap={testCap} /> : <Waiting />;
  } else if (testBack) {
    body = <Town me={testBack.me} testTopic={testBack.testTopic} cap={testBack.cap} />;
  } else if (active) {
    // Already in town in this tab (the dock brought you back): straight to it.
    body = <Town me={active.me} testTopic={active.testTopic} cap={active.cap} />;
  } else if (!ready || !checked || !face.ready) {
    body = <Waiting />;
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
  } else {
    const me: TownMe = { id: userId, name: face.name ?? "Member", face: face.avatar, color };
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

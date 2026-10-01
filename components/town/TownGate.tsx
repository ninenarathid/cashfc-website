"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/admin";
import { useMyFace } from "@/lib/avatars";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { TownMe } from "./Town";

/**
 * Who may walk into Cash Town, and the town itself loaded only for them.
 *
 * Admins only while it is a prototype (2026-10). This gate is the courtesy;
 * the lock is in the database (v101): the room's name is told only to admins
 * and its channel only lets admins in. The town's code is a separate chunk,
 * fetched only once somebody is let through, so the rest of the site pays
 * nothing for it.
 *
 * In `next dev` only, `?townTest=A` skips the gate and uses a throwaway public
 * room, so two browsers can test walking and voice without anybody signing
 * in. A production build compiles that branch away.
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
  const [color, setColor] = useState("#6aa9e0");
  const [checked, setChecked] = useState(false);
  const [test, setTest] = useState<string | null>(null);
  const [testId] = useState(() => `test-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      setTest(new URLSearchParams(window.location.search).get("townTest"));
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setChecked(true); return; }
    void supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) {
        const { data: p } = await supabase.from("profiles").select("accent_color").eq("id", id).maybeSingle();
        const accent = (p as { accent_color?: string | null } | null)?.accent_color;
        if (accent) setColor(accent);
      }
      setChecked(true);
    });
  }, []);

  let body: React.ReactNode;
  if (test) {
    const me: TownMe = { id: testId, name: th ? `ทดสอบ ${test}` : `Tester ${test}`, face: null, color: test === "B" ? "#c98a5b" : "#4fb8a8" };
    body = <Town me={me} testTopic={TEST_TOPIC} />;
  } else if (!ready || !checked || !face.ready) {
    body = <Waiting />;
  } else if (!realAdmin || !userId) {
    body = (
      <div className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center">
        <div className="text-4xl" aria-hidden>🏙️</div>
        <p className="mt-2 text-read text-ink">
          {th ? "Cash Town ยังไม่เปิดนะ ตอนนี้แอดมินกำลังทดลองกันอยู่" : "Cash Town isn't open yet — the admins are trying it out."}
        </p>
        <Link href="/" className="mt-3 inline-block text-ui text-accent no-underline hover:underline">
          {th ? "กลับหน้าแรก" : "Back home"}
        </Link>
      </div>
    );
  } else {
    const me: TownMe = { id: userId, name: face.name ?? "Admin", face: face.avatar, color };
    body = <Town me={me} />;
  }

  return (
    <main className="pt-7">
      <div className="font-data text-meta uppercase tracking-[0.22em] text-accent">Cash Town</div>
      <h1 className="font-display text-3xl font-bold">
        {th ? "เมืองของร้าน" : "The FC's town"}
      </h1>
      {body}
    </main>
  );
}

function Waiting() {
  return <div className="skeleton mt-4 block h-[min(74dvh,700px)] min-h-[440px] w-full rounded-2xl" aria-hidden />;
}

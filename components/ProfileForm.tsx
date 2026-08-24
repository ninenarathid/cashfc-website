"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LFG_OPTIONS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface Option { id: number; name: string }

interface ProfileRow {
  id: string;
  discord_username: string | null;
  discord_avatar: string | null;
  character_id: number | null;
  character_name: string | null;
  bio: string | null;
  favorite_job: string | null;
  accent_color: string | null;
  lfg: string[] | null;
  banner: string | null;
  is_admin: boolean;
}

const JOBS = ["PLD","WAR","DRK","GNB","WHM","SCH","AST","SGE","MNK","DRG","NIN","SAM","RPR","VPR","BRD","MCH","DNC","BLM","SMN","RDM","PCT","BLU"];
const COLORS = ["#e8a33d","#d14b3a","#e5cc80","#4fb8a8","#c98a5b","#7ea6c9","#e268a8","#a335ee"];
const BANNERS = [
  "linear-gradient(135deg,#241b10,#3a2c14)",
  "linear-gradient(135deg,#2a130f,#d14b3a33)",
  "linear-gradient(135deg,#0f1f1c,#4fb8a833)",
  "linear-gradient(135deg,#101827,#7ea6c933)",
  "linear-gradient(135deg,#1d1226,#a335ee33)",
  "linear-gradient(135deg,#261c10,#e5cc8040)",
];

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
      {children}
    </div>
  );
}

export default function ProfileForm({ memberOptions }: { memberOptions: Option[] }) {
  const [supabase] = useState(createClient);
  const [phase, setPhase] = useState<"loading" | "no-config" | "logged-out" | "ready">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [charId, setCharId] = useState<number | null>(null);
  const [charName, setCharName] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [job, setJob] = useState("");
  const [color, setColor] = useState("");
  const [banner, setBanner] = useState("");
  const [lfg, setLfg] = useState<string[]>([]);
  const [hidden, setHidden] = useState(false);
  const [pick, setPick] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!supabase) { setPhase("no-config"); return; }
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setPhase("logged-out"); return; }
      setUser(data.user);
      const { data: row } = await supabase
        .from("profiles").select("*").eq("id", data.user.id).single();
      if (row) {
        const p = row as ProfileRow;
        setProfile(p);
        setCharId(p.character_id);
        setCharName(p.character_name);
        setBio(p.bio ?? "");
        setJob(p.favorite_job ?? "");
        setColor(p.accent_color ?? "");
        setBanner(p.banner ?? "");
        setLfg(p.lfg ?? []);
        if (p.character_id) {
          const { data: ov } = await supabase
            .from("member_overrides").select("hidden")
            .eq("character_id", p.character_id).maybeSingle();
          setHidden(!!ov?.hidden);
        }
      }
      setPhase("ready");
    })();
  }, [supabase]);

  const suggestions = useMemo(() => {
    const q = pick.trim().toLowerCase();
    if (q.length < 2) return [];
    return memberOptions.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [pick, memberOptions]);

  async function save() {
    if (!supabase || !user) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        character_id: charId,
        character_name: charName,
        bio: bio.trim() || null,
        favorite_job: job || null,
        accent_color: color || null,
        banner: banner || null,
        lfg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    setMsg(error
      ? { ok: false,
          text: error.code === "23505"
            ? "ตัวละครนี้ถูกคนอื่น claim ไปแล้ว — ถ้าเป็นของคุณจริง แจ้งแอดมินให้ปลดได้"
            : `บันทึกไม่สำเร็จ: ${error.message}` }
      : { ok: true, text: "บันทึกแล้ว — โปรไฟล์และกระดานอัปเดตทันที" });
  }

  async function toggleHide() {
    if (!supabase || !charId) return;
    const next = !hidden;
    const { error } = await supabase.from("member_overrides").upsert({
      character_id: charId, hidden: next,
      updated_at: new Date().toISOString(),
    });
    if (!error) setHidden(next);
    setMsg(error
      ? { ok: false, text: "ทำรายการไม่สำเร็จ (ต้องรัน migration_v2.sql ก่อน)" }
      : { ok: true, text: next ? "ซ่อนคุณจากกระดานแล้ว" : "กลับมาแสดงบนกระดานแล้ว" });
  }

  if (phase === "loading") return <Notice>กำลังโหลด…</Notice>;

  if (phase === "no-config")
    return (
      <Notice>
        ยังไม่ได้เชื่อม Supabase — ตั้งค่า <b className="text-amber">NEXT_PUBLIC_SUPABASE_URL</b> และ{" "}
        <b className="text-amber">NEXT_PUBLIC_SUPABASE_ANON_KEY</b> ตาม README ก่อน
        แล้วหน้านี้จะเปิดใช้งานเอง
      </Notice>
    );

  if (phase === "logged-out")
    return (
      <Notice>
        เข้าสู่ระบบด้วย Discord เพื่อ claim ตัวละครและแต่งโปรไฟล์ของคุณ
        <div className="mt-4">
          <button
            onClick={() =>
              supabase!.auth.signInWithOAuth({
                provider: "discord",
                options: { redirectTo: `${location.origin}/auth/callback` },
              })}
            className="rounded-lg border border-[#5865F2]/60 bg-[#5865F2]/15 px-5 py-2 text-[#a5b2ff] transition-colors hover:bg-[#5865F2]/25">
            Login ด้วย Discord
          </button>
        </div>
      </Notice>
    );

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-amber">Profile</div>
      <h1 className="font-display text-3xl font-bold">โปรไฟล์ของฉัน</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        {profile?.discord_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.discord_avatar} alt="" className="size-9 rounded-full" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="font-data text-sm font-semibold">
            {profile?.discord_username ?? "สมาชิก Discord"}
          </div>
          <div className="text-[12px] text-muted">เชื่อมผ่าน Discord แล้ว</div>
        </div>
        {charId && (
          <Link href={`/member/${charId}`}
                className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted no-underline hover:border-amber hover:text-amber">
            ดูหน้าของฉัน
          </Link>
        )}
        {profile?.is_admin && (
          <Link href="/admin"
                className="rounded-lg border border-chili/50 bg-chili/10 px-3 py-1.5 text-[13px] text-chili no-underline hover:bg-chili/20">
            หน้าแอดมิน
          </Link>
        )}
        <button
          onClick={async () => { await supabase!.auth.signOut(); location.href = "/"; }}
          className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted hover:border-muted hover:text-ink">
          ออกจากระบบ
        </button>
      </div>

      {/* claim ตัวละคร */}
      <section className="mt-5 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">ตัวละครของฉัน</div>
        {charId ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-data text-[15px] font-semibold"
                  style={color ? { color } : undefined}>
              {charName} <span className="text-amber">✦</span>
            </span>
            <button onClick={() => { setCharId(null); setCharName(null); }}
                    className="rounded-lg border border-line px-3 py-1 text-[12.5px] text-muted hover:border-muted hover:text-ink">
              ยกเลิกการเชื่อม
            </button>
            <button onClick={toggleHide}
                    className={`rounded-lg border px-3 py-1 text-[12.5px] ${
                      hidden ? "border-jade/50 text-jade hover:bg-jade/10"
                             : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {hidden ? "เลิกซ่อนจากกระดาน" : "ซ่อนฉันจากกระดาน"}
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <input value={pick} onChange={(e) => setPick(e.target.value)}
                   placeholder="พิมพ์ชื่อตัวละครของคุณอย่างน้อย 2 ตัวอักษร…"
                   className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted" />
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s.id}
                          onClick={() => { setCharId(s.id); setCharName(s.name); setPick(""); }}
                          className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink transition-colors hover:border-amber hover:text-amber">
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          หนึ่งตัวละคร claim ได้คนเดียว — claim แล้วจะมี ✦ บนกระดาน และแต่งหน้าโปรไฟล์ตัวเองได้
        </p>
      </section>

      {/* แต่งโปรไฟล์ */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">แต่งโปรไฟล์</div>

        <label className="mt-3 block text-[13px] text-muted">
          Bio / สเตตัส (ไม่เกิน 200 ตัวอักษร)
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    rows={2}
                    placeholder="เช่น หา static ลง savage / รับปั้มเมนเทอร์ / ขายเค้ก popoto"
                    className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted" />
        </label>

        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-4">
          <label className="block text-[13px] text-muted">
            จ๊อบโปรด
            <select value={job} onChange={(e) => setJob(e.target.value)}
                    className="mt-1 block rounded-lg border border-line bg-card px-3 py-2 text-ink">
              <option value="">— ไม่ระบุ —</option>
              {JOBS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </label>

          <div className="text-[13px] text-muted">
            สีประจำตัว
            <div className="mt-1.5 flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(color === c ? "" : c)}
                        aria-label={`เลือกสี ${c}`}
                        className={`size-7 rounded-full border-2 transition-transform ${
                          color === c ? "scale-110 border-ink" : "border-transparent"}`}
                        style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-[13px] text-muted">
          แบนเนอร์หน้าโปรไฟล์
          <div className="mt-1.5 flex flex-wrap gap-2">
            {BANNERS.map((bnr) => (
              <button key={bnr} onClick={() => setBanner(banner === bnr ? "" : bnr)}
                      aria-label="เลือกแบนเนอร์"
                      className={`h-10 w-20 rounded-lg border-2 transition-transform ${
                        banner === bnr ? "scale-105 border-amber" : "border-line"}`}
                      style={{ background: bnr }} />
            ))}
          </div>
        </div>

        <div className="mt-4 text-[13px] text-muted">
          สถานะ &ldquo;กำลังหา&rdquo; (โชว์บนกระดาน + ใช้เป็นตัวกรอง)
          <div className="mt-1.5 flex flex-wrap gap-2">
            {LFG_OPTIONS.map((o) => {
              const on = lfg.includes(o.key);
              return (
                <button key={o.key}
                        onClick={() => setLfg(on ? lfg.filter((k) => k !== o.key)
                                               : [...lfg, o.key])}
                        className={`rounded-full border px-3.5 py-1.5 text-[13px] ${
                          on ? "border-amber bg-amber/12 text-amber"
                             : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} disabled={saving}
                  className="rounded-lg border border-amber bg-amber/15 px-5 py-2 text-amber transition-colors hover:bg-amber/25 disabled:opacity-50">
            {saving ? "กำลังบันทึก…" : "บันทึกโปรไฟล์"}
          </button>
          {msg && (
            <span className={`text-[13px] ${msg.ok ? "text-jade" : "text-chili"}`}>
              {msg.text}
            </span>
          )}
        </div>
      </section>
    </main>
  );
}

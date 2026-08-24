"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Option { id: number; name: string }
interface Announcement { id: number; title: string; body: string | null; created_at: string }
interface TimelinePost { id: number; title: string; body: string | null; url: string | null; posted_at: string }
interface Override { character_id: number; hidden: boolean; note: string | null }
interface ClaimedProfile { id: string; discord_username: string | null; character_id: number; character_name: string | null }

const inputCls = "rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted";

export default function AdminPanel({ memberOptions }: { memberOptions: Option[] }) {
  const [supabase] = useState(createClient);
  const [phase, setPhase] = useState<"loading" | "denied" | "ready">("loading");
  const [msg, setMsg] = useState("");

  const [anns, setAnns] = useState<Announcement[]>([]);
  const [aTitle, setATitle] = useState("");
  const [aBody, setABody] = useState("");

  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [pTitle, setPTitle] = useState("");
  const [pBody, setPBody] = useState("");
  const [pUrl, setPUrl] = useState("");
  const [pDate, setPDate] = useState(new Date().toISOString().slice(0, 10));

  const [serverId, setServerId] = useState("");
  const [invite, setInvite] = useState("");

  const [overrides, setOverrides] = useState<Override[]>([]);
  const [pick, setPick] = useState("");
  const [selected, setSelected] = useState<Option | null>(null);
  const [note, setNote] = useState("");

  const [claims, setClaims] = useState<ClaimedProfile[]>([]);

  const nameOf = useMemo(() => {
    const m = new Map(memberOptions.map((o) => [o.id, o.name]));
    return (id: number) => m.get(id) ?? `#${id}`;
  }, [memberOptions]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3000); };

  async function refresh() {
    if (!supabase) return;
    const [a, t, s, o, c] = await Promise.all([
      supabase.from("announcements").select("id, title, body, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("timeline_posts").select("id, title, body, url, posted_at")
        .order("posted_at", { ascending: false }),
      supabase.from("site_settings").select("key, value"),
      supabase.from("member_overrides").select("character_id, hidden, note"),
      supabase.from("profiles").select("id, discord_username, character_id, character_name")
        .not("character_id", "is", null),
    ]);
    setAnns((a.data as Announcement[]) ?? []);
    setPosts((t.data as TimelinePost[]) ?? []);
    for (const r of s.data ?? []) {
      if (r.key === "discord_server_id") setServerId(r.value ?? "");
      if (r.key === "discord_invite_url") setInvite(r.value ?? "");
    }
    setOverrides((o.data as Override[]) ?? []);
    setClaims((c.data as ClaimedProfile[]) ?? []);
  }

  useEffect(() => {
    (async () => {
      if (!supabase) { setPhase("denied"); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setPhase("denied"); return; }
      const { data: row } = await supabase
        .from("profiles").select("is_admin").eq("id", data.user.id).single();
      if (!row?.is_admin) { setPhase("denied"); return; }
      await refresh();
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const suggestions = useMemo(() => {
    const q = pick.trim().toLowerCase();
    if (q.length < 2) return [];
    return memberOptions.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [pick, memberOptions]);

  if (phase === "loading")
    return <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center text-muted">กำลังตรวจสอบสิทธิ์…</div>;

  if (phase === "denied")
    return (
      <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
        หน้านี้เฉพาะแอดมิน — ถ้าคุณควรเป็นแอดมิน ให้รันคำสั่งตั้งสิทธิ์ท้ายไฟล์{" "}
        <b className="text-amber">supabase/schema.sql</b> ใน SQL Editor ก่อน
      </div>
    );

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-chili">Admin</div>
      <h1 className="font-display text-3xl font-bold">จัดการเว็บไซต์</h1>
      {msg && <div className="mt-2 text-[13px] text-jade">{msg}</div>}

      {/* ── Discord settings ── */}
      <section className="mt-5 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">Discord ของ FC</div>
        <p className="mt-1 text-[12.5px] text-muted">
          Server ID (เปิด Server Widget ใน Discord ก่อน) + invite link — ใช้แสดง widget บนหน้าแรก
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <input value={serverId} onChange={(e) => setServerId(e.target.value)}
                 placeholder="Discord Server ID" className={`${inputCls} min-w-[200px] flex-1`} />
          <input value={invite} onChange={(e) => setInvite(e.target.value)}
                 placeholder="https://discord.gg/…" className={`${inputCls} min-w-[200px] flex-1`} />
          <button
            onClick={async () => {
              const now = new Date().toISOString();
              const { error } = await supabase!.from("site_settings").upsert([
                { key: "discord_server_id", value: serverId.trim() || null, updated_at: now },
                { key: "discord_invite_url", value: invite.trim() || null, updated_at: now },
              ]);
              flash(error ? "บันทึกไม่สำเร็จ (รัน migration_v2.sql หรือยัง?)" : "บันทึกแล้ว");
            }}
            className="rounded-lg border border-amber bg-amber/15 px-4 py-2 text-amber hover:bg-amber/25">
            บันทึก
          </button>
        </div>
      </section>

      {/* ── ประกาศ ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">ประกาศจาก FC (การ์ดเด่นหน้าแรก)</div>
        <div className="mt-3 flex flex-col gap-2">
          <input value={aTitle} onChange={(e) => setATitle(e.target.value.slice(0, 120))}
                 placeholder="หัวข้อประกาศ" className={inputCls} />
          <textarea value={aBody} onChange={(e) => setABody(e.target.value.slice(0, 2000))}
                    rows={3} placeholder="รายละเอียด (ไม่บังคับ)" className={inputCls} />
          <button
            onClick={async () => {
              if (!aTitle.trim()) return;
              const { data: u } = await supabase!.auth.getUser();
              const { error } = await supabase!.from("announcements")
                .insert({ title: aTitle.trim(), body: aBody.trim() || null,
                          created_by: u.user?.id });
              if (!error) { setATitle(""); setABody(""); await refresh(); flash("โพสต์ประกาศแล้ว"); }
            }}
            className="self-start rounded-lg border border-amber bg-amber/15 px-4 py-2 text-amber hover:bg-amber/25">
            โพสต์ประกาศ
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {anns.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2">
              <div className="min-w-0">
                <div className="font-medium">{a.title}</div>
                {a.body && <div className="truncate text-[12.5px] text-muted">{a.body}</div>}
              </div>
              <button
                onClick={async () => {
                  await supabase!.from("announcements").delete().eq("id", a.id);
                  await refresh(); flash("ลบประกาศแล้ว");
                }}
                className="shrink-0 rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                ลบ
              </button>
            </div>
          ))}
          {anns.length === 0 && <div className="text-[13px] text-muted">ยังไม่มีประกาศ</div>}
        </div>
      </section>

      {/* ── Timeline posts ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">โพสต์ลง Timeline (คู่กับข่าว official)</div>
        <p className="mt-1 text-[12.5px] text-muted">
          เช่น &ldquo;FC house ย้ายบ้านใหม่&rdquo;, &ldquo;นัดถ่ายรูปหมู่ 7.5&rdquo; — ขึ้นเรียงเวลาเดียวกับข่าวเกม
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input value={pTitle} onChange={(e) => setPTitle(e.target.value.slice(0, 120))}
                   placeholder="หัวข้อ" className={`${inputCls} min-w-[200px] flex-1`} />
            <input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)}
                   className={inputCls} aria-label="วันที่" />
          </div>
          <textarea value={pBody} onChange={(e) => setPBody(e.target.value.slice(0, 1000))}
                    rows={2} placeholder="รายละเอียด (ไม่บังคับ)" className={inputCls} />
          <input value={pUrl} onChange={(e) => setPUrl(e.target.value)}
                 placeholder="ลิงก์ (ไม่บังคับ)" className={inputCls} />
          <button
            onClick={async () => {
              if (!pTitle.trim()) return;
              const { data: u } = await supabase!.auth.getUser();
              const { error } = await supabase!.from("timeline_posts").insert({
                title: pTitle.trim(), body: pBody.trim() || null,
                url: pUrl.trim() || null, posted_at: pDate,
                created_by: u.user?.id,
              });
              if (!error) { setPTitle(""); setPBody(""); setPUrl(""); await refresh();
                            flash("โพสต์ลง timeline แล้ว"); }
              else flash("โพสต์ไม่สำเร็จ (รัน migration_v2.sql หรือยัง?)");
            }}
            className="self-start rounded-lg border border-jade bg-jade/15 px-4 py-2 text-jade hover:bg-jade/25">
            โพสต์ลง timeline
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2">
              <div className="min-w-0">
                <div className="font-medium">
                  <span className="mr-2 font-data text-[11.5px] text-muted">{p.posted_at}</span>
                  {p.title}
                </div>
                {p.body && <div className="truncate text-[12.5px] text-muted">{p.body}</div>}
              </div>
              <button
                onClick={async () => {
                  await supabase!.from("timeline_posts").delete().eq("id", p.id);
                  await refresh(); flash("ลบโพสต์แล้ว");
                }}
                className="shrink-0 rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                ลบ
              </button>
            </div>
          ))}
          {posts.length === 0 && <div className="text-[13px] text-muted">ยังไม่มีโพสต์</div>}
        </div>
      </section>

      {/* ── ซ่อนสมาชิก / โน้ต ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">ควบคุมกระดานสมาชิก</div>
        <input value={pick}
               onChange={(e) => { setPick(e.target.value); setSelected(null); }}
               placeholder="ค้นหาชื่อสมาชิก…" className={`${inputCls} mt-3 w-full`} />
        {suggestions.length > 0 && !selected && (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s.id}
                      onClick={() => {
                        setSelected(s); setPick(s.name);
                        setNote(overrides.find((o) => o.character_id === s.id)?.note ?? "");
                      }}
                      className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] hover:border-amber hover:text-amber">
                {s.name}
              </button>
            ))}
          </div>
        )}
        {selected && (
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="font-data font-semibold">{selected.name}</span>
            <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))}
                   placeholder="โน้ตภายใน (ไม่บังคับ)"
                   className={`${inputCls} min-w-[180px] flex-1 py-1.5 text-[13px]`} />
            {[false, true].map((h) => (
              <button key={String(h)}
                      onClick={async () => {
                        await supabase!.from("member_overrides").upsert({
                          character_id: selected.id, hidden: h,
                          note: note.trim() || null,
                          updated_at: new Date().toISOString(),
                        });
                        await refresh();
                        flash(h ? "ซ่อนจากกระดานแล้ว" : "บันทึกแล้ว (แสดงปกติ)");
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-[13px] ${
                        h ? "border-chili/50 text-chili hover:bg-chili/10"
                          : "border-jade/50 text-jade hover:bg-jade/10"}`}>
                {h ? "ซ่อนจากกระดาน" : "แสดงปกติ + บันทึกโน้ต"}
              </button>
            ))}
          </div>
        )}
        {overrides.length > 0 && (
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="text-[12px] uppercase tracking-wider text-muted">รายการ override</div>
            {overrides.map((o) => (
              <div key={o.character_id}
                   className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2 text-[13px]">
                <span className="min-w-0 truncate">
                  <b className="font-data">{nameOf(o.character_id)}</b>
                  {o.hidden && <span className="ml-2 text-chili">ซ่อนอยู่</span>}
                  {o.note && <span className="ml-2 text-muted">— {o.note}</span>}
                </span>
                <button
                  onClick={async () => {
                    await supabase!.from("member_overrides").delete()
                      .eq("character_id", o.character_id);
                    await refresh(); flash("ลบ override แล้ว");
                  }}
                  className="shrink-0 rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:border-muted hover:text-ink">
                  ล้าง
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── จัดการ claim ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">ตัวละครที่ถูก claim</div>
        <div className="mt-3 flex flex-col gap-1.5">
          {claims.map((c) => (
            <div key={c.id}
                 className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2 text-[13px]">
              <span className="min-w-0 truncate">
                <b className="font-data">{c.character_name ?? nameOf(c.character_id)}</b>
                <span className="ml-2 text-muted">← Discord: {c.discord_username ?? "?"}</span>
              </span>
              <button
                onClick={async () => {
                  await supabase!.from("profiles")
                    .update({ character_id: null, character_name: null })
                    .eq("id", c.id);
                  await refresh(); flash("ปลด claim แล้ว");
                }}
                className="shrink-0 rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                ปลด
              </button>
            </div>
          ))}
          {claims.length === 0 && <div className="text-[13px] text-muted">ยังไม่มีใคร claim ตัวละคร</div>}
        </div>
      </section>
    </main>
  );
}

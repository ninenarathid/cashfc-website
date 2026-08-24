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
    return <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center text-muted">Checking permissions…</div>;

  if (phase === "denied")
    return (
      <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
        Admins only — if you should be an admin, run the grant statement at the end of{" "}
        <b className="text-amber">supabase/schema.sql</b> in the SQL Editor first.
      </div>
    );

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-chili">Admin</div>
      <h1 className="font-display text-3xl font-bold">Site admin</h1>
      {msg && <div className="mt-2 text-[13px] text-jade">{msg}</div>}

      {/* ── Discord settings ── */}
      <section className="mt-5 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">FC Discord</div>
        <p className="mt-1 text-[12.5px] text-muted">
          Server ID (enable Server Widget in Discord first) + invite link — powers the widget on the home page
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
              flash(error ? "Save failed (has migration_v2.sql been run?)" : "Saved");
            }}
            className="rounded-lg border border-amber bg-amber/15 px-4 py-2 text-amber hover:bg-amber/25">
            Save
          </button>
        </div>
      </section>

      {/* ── Announcements ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">FC announcements (featured card on the home page)</div>
        <div className="mt-3 flex flex-col gap-2">
          <input value={aTitle} onChange={(e) => setATitle(e.target.value.slice(0, 120))}
                 placeholder="Announcement title" className={inputCls} />
          <textarea value={aBody} onChange={(e) => setABody(e.target.value.slice(0, 2000))}
                    rows={3} placeholder="Details (optional)" className={inputCls} />
          <button
            onClick={async () => {
              if (!aTitle.trim()) return;
              const { data: u } = await supabase!.auth.getUser();
              const { error } = await supabase!.from("announcements")
                .insert({ title: aTitle.trim(), body: aBody.trim() || null,
                          created_by: u.user?.id });
              if (!error) { setATitle(""); setABody(""); await refresh(); flash("Announcement posted"); }
            }}
            className="self-start rounded-lg border border-amber bg-amber/15 px-4 py-2 text-amber hover:bg-amber/25">
            Post announcement
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
                  await refresh(); flash("Announcement deleted");
                }}
                className="shrink-0 rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                Delete
              </button>
            </div>
          ))}
          {anns.length === 0 && <div className="text-[13px] text-muted">No announcements yet</div>}
        </div>
      </section>

      {/* ── Timeline posts ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">Timeline posts (alongside official news)</div>
        <p className="mt-1 text-[12.5px] text-muted">
          e.g. &ldquo;FC house has moved&rdquo;, &ldquo;7.5 group photo meetup&rdquo; — interleaved with game news by date
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input value={pTitle} onChange={(e) => setPTitle(e.target.value.slice(0, 120))}
                   placeholder="Title" className={`${inputCls} min-w-[200px] flex-1`} />
            <input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)}
                   className={inputCls} aria-label="Date" />
          </div>
          <textarea value={pBody} onChange={(e) => setPBody(e.target.value.slice(0, 1000))}
                    rows={2} placeholder="Details (optional)" className={inputCls} />
          <input value={pUrl} onChange={(e) => setPUrl(e.target.value)}
                 placeholder="Link (optional)" className={inputCls} />
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
                            flash("Posted to the timeline"); }
              else flash("Post failed (has migration_v2.sql been run?)");
            }}
            className="self-start rounded-lg border border-jade bg-jade/15 px-4 py-2 text-jade hover:bg-jade/25">
            Post to timeline
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
                  await refresh(); flash("Post deleted");
                }}
                className="shrink-0 rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                Delete
              </button>
            </div>
          ))}
          {posts.length === 0 && <div className="text-[13px] text-muted">No posts yet</div>}
        </div>
      </section>

      {/* ── Hide members / internal notes ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">Member board controls</div>
        <input value={pick}
               onChange={(e) => { setPick(e.target.value); setSelected(null); }}
               placeholder="Search member name…" className={`${inputCls} mt-3 w-full`} />
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
                   placeholder="Internal note (optional)"
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
                        flash(h ? "Hidden from the board" : "Saved (still visible)");
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-[13px] ${
                        h ? "border-chili/50 text-chili hover:bg-chili/10"
                          : "border-jade/50 text-jade hover:bg-jade/10"}`}>
                {h ? "Hide from board" : "Keep visible + save note"}
              </button>
            ))}
          </div>
        )}
        {overrides.length > 0 && (
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="text-[12px] uppercase tracking-wider text-muted">Active overrides</div>
            {overrides.map((o) => (
              <div key={o.character_id}
                   className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2 text-[13px]">
                <span className="min-w-0 truncate">
                  <b className="font-data">{nameOf(o.character_id)}</b>
                  {o.hidden && <span className="ml-2 text-chili">hidden</span>}
                  {o.note && <span className="ml-2 text-muted">— {o.note}</span>}
                </span>
                <button
                  onClick={async () => {
                    await supabase!.from("member_overrides").delete()
                      .eq("character_id", o.character_id);
                    await refresh(); flash("Override cleared");
                  }}
                  className="shrink-0 rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:border-muted hover:text-ink">
                  Clear
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Claim management ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">Claimed characters</div>
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
                  await refresh(); flash("Claim released");
                }}
                className="shrink-0 rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                Release
              </button>
            </div>
          ))}
          {claims.length === 0 && <div className="text-[13px] text-muted">Nobody has claimed a character yet</div>}
        </div>
      </section>
    </main>
  );
}

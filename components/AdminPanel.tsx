"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NOTICE_KEY } from "@/components/home/ShowYourData";
import { GALLERY_PUBLIC_KEY } from "@/lib/gallery";
import ImagePicker from "@/components/ImagePicker";

interface Option { id: number; name: string }
interface Announcement {
  id: number; title: string; body: string | null; created_at: string;
  image_url: string | null;
}
interface TimelinePost {
  id: number; title: string; body: string | null; url: string | null;
  posted_at: string; image_url: string | null;
}
interface Override { character_id: number; hidden: boolean; note: string | null }
interface ClaimedProfile { id: string; discord_username: string | null; character_id: number; character_name: string | null }

const inputCls = "rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted";

export default function AdminPanel({ memberOptions }: { memberOptions: Option[] }) {
  const [supabase] = useState(createClient);
  const [phase, setPhase] = useState<"loading" | "denied" | "ready">("loading");
  const [msg, setMsg] = useState("");

  // One form per section, in one of two modes: writing something new, or editing
  // the row whose id is held here. Sharing the form keeps the two from drifting
  // apart the way a separate edit dialog always does.
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [aTitle, setATitle] = useState("");
  const [aBody, setABody] = useState("");
  const [aImage, setAImage] = useState<string | null>(null);
  const [aEditing, setAEditing] = useState<number | null>(null);

  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [pTitle, setPTitle] = useState("");
  const [pBody, setPBody] = useState("");
  const [pUrl, setPUrl] = useState("");
  const [pImage, setPImage] = useState<string | null>(null);
  const [pEditing, setPEditing] = useState<number | null>(null);
  const [pDate, setPDate] = useState(new Date().toISOString().slice(0, 10));

  const [serverId, setServerId] = useState("");
  const [invite, setInvite] = useState("");
  // Defaults to on, matching the notice itself: no row means nobody has retired it yet.
  const [noticeOn, setNoticeOn] = useState(true);
  // Starts closed: the gallery goes to the whole FC when an admin says so.
  const [galleryOn, setGalleryOn] = useState(false);

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
      supabase.from("announcements").select("id, title, body, created_at, image_url")
        .order("created_at", { ascending: false }),
      supabase.from("timeline_posts").select("id, title, body, url, posted_at, image_url")
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
      if (r.key === NOTICE_KEY) setNoticeOn(r.value !== "off");
      if (r.key === GALLERY_PUBLIC_KEY) setGalleryOn(r.value === "on");
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
        <b className="text-accent">supabase/schema.sql</b> in the SQL Editor first.
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
            className="rounded-lg border border-accent bg-accent/15 px-4 py-2 text-accent hover:bg-accent/25">
            Save
          </button>
        </div>
      </section>

      {/* ── The how-to notice on the front page ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">
          &ldquo;Want your data on the board?&rdquo; notice
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          The bilingual walkthrough on the home page telling members how to make
          their achievements public and register on FFXIV Collect. Worth retiring
          once most of the FC has done it, so the front page is not permanently
          nagging people who already have.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <button
            onClick={async () => {
              const next = noticeOn ? "off" : "on";
              const { error } = await supabase!.from("site_settings").upsert([
                { key: NOTICE_KEY, value: next, updated_at: new Date().toISOString() },
              ]);
              if (!error) setNoticeOn(!noticeOn);
              flash(error ? "Save failed (has migration_v2.sql been run?)"
                          : next === "on" ? "Notice is showing" : "Notice hidden");
            }}
            className={`rounded-lg border px-4 py-2 ${
              noticeOn ? "border-accent bg-accent/15 text-accent hover:bg-accent/25"
                       : "border-line text-muted hover:border-muted hover:text-ink"}`}>
            {noticeOn ? "Showing on the home page" : "Hidden"}
          </button>
          <span className="text-[12.5px] text-muted">
            {noticeOn ? "Click to hide it" : "Click to show it again"}
          </span>
        </div>
      </section>

      {/* ── Gallery visibility ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">Gallery</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Members post screenshots to /gallery and they appear on their own member
          page too. Closed means admins only — the rows are readable either way, so
          this is about who is shown the page, not about hiding the pictures.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <button
            onClick={async () => {
              const next = galleryOn ? "off" : "on";
              const { error } = await supabase!.from("site_settings").upsert([
                { key: GALLERY_PUBLIC_KEY, value: next, updated_at: new Date().toISOString() },
              ]);
              if (!error) setGalleryOn(!galleryOn);
              flash(error ? "Save failed (has migration_v9.sql been run?)"
                          : next === "on" ? "Gallery is open to everyone" : "Gallery is admins only");
            }}
            className={`rounded-lg border px-4 py-2 ${
              galleryOn ? "border-jade bg-jade/15 text-jade hover:bg-jade/25"
                        : "border-line text-muted hover:border-muted hover:text-ink"}`}>
            {galleryOn ? "Open to everyone" : "Admins only"}
          </button>
          <span className="text-[12.5px] text-muted">
            {galleryOn ? "Click to close it again" : "Click to open it to the FC"}
          </span>
        </div>
      </section>

      {/* ── Announcements ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">FC announcements (featured card on the home page)</div>
        <div className="mt-3 flex flex-col gap-2">
          {aEditing !== null && (
            <div className="text-[12.5px] text-accent">Editing an existing announcement</div>
          )}
          <input value={aTitle} onChange={(e) => setATitle(e.target.value.slice(0, 120))}
                 placeholder="Announcement title" className={inputCls} />
          <textarea value={aBody} onChange={(e) => setABody(e.target.value.slice(0, 2000))}
                    rows={3} placeholder="Details (optional)" className={inputCls} />
          <ImagePicker supabase={supabase!} value={aImage} onChange={setAImage} />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                if (!aTitle.trim()) return;
                const fields = {
                  title: aTitle.trim(), body: aBody.trim() || null, image_url: aImage,
                };
                const { error } = aEditing !== null
                  ? await supabase!.from("announcements").update(fields).eq("id", aEditing)
                  : await supabase!.from("announcements").insert({
                      ...fields,
                      created_by: (await supabase!.auth.getUser()).data.user?.id,
                    });
                if (error) { flash(`Save failed: ${error.message}`); return; }
                setATitle(""); setABody(""); setAImage(null); setAEditing(null);
                await refresh();
                flash(aEditing !== null ? "Announcement updated" : "Announcement posted");
              }}
              className="self-start rounded-lg border border-accent bg-accent/15 px-4 py-2 text-accent hover:bg-accent/25">
              {aEditing !== null ? "Save changes" : "Post announcement"}
            </button>
            {aEditing !== null && (
              <button
                onClick={() => { setAEditing(null); setATitle(""); setABody(""); setAImage(null); }}
                className="rounded-lg border border-line px-4 py-2 text-muted hover:border-muted hover:text-ink">
                Cancel
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {anns.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2">
              {a.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image_url} alt="" className="size-10 shrink-0 rounded-md border border-line object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{a.title}</div>
                {a.body && <div className="truncate text-[12.5px] text-muted">{a.body}</div>}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => {
                    setAEditing(a.id); setATitle(a.title); setABody(a.body ?? "");
                    setAImage(a.image_url);
                  }}
                  className="rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:border-accent hover:text-accent">
                  Edit
                </button>
                <button
                  onClick={async () => {
                    await supabase!.from("announcements").delete().eq("id", a.id);
                    if (aEditing === a.id) {
                      setAEditing(null); setATitle(""); setABody(""); setAImage(null);
                    }
                    await refresh(); flash("Announcement deleted");
                  }}
                  className="rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                  Delete
                </button>
              </div>
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
          <ImagePicker supabase={supabase!} value={pImage} onChange={setPImage} />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                if (!pTitle.trim()) return;
                const fields = {
                  title: pTitle.trim(), body: pBody.trim() || null,
                  url: pUrl.trim() || null, posted_at: pDate, image_url: pImage,
                };
                const { error } = pEditing !== null
                  ? await supabase!.from("timeline_posts").update(fields).eq("id", pEditing)
                  : await supabase!.from("timeline_posts").insert({
                      ...fields,
                      created_by: (await supabase!.auth.getUser()).data.user?.id,
                    });
                if (error) { flash(`Save failed: ${error.message}`); return; }
                setPTitle(""); setPBody(""); setPUrl(""); setPImage(null); setPEditing(null);
                await refresh();
                flash(pEditing !== null ? "Post updated" : "Posted to the timeline");
              }}
              className="self-start rounded-lg border border-jade bg-jade/15 px-4 py-2 text-jade hover:bg-jade/25">
              {pEditing !== null ? "Save changes" : "Post to timeline"}
            </button>
            {pEditing !== null && (
              <button
                onClick={() => {
                  setPEditing(null); setPTitle(""); setPBody(""); setPUrl(""); setPImage(null);
                }}
                className="rounded-lg border border-line px-4 py-2 text-muted hover:border-muted hover:text-ink">
                Cancel
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2">
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="size-10 shrink-0 rounded-md border border-line object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  <span className="mr-2 font-data text-[11.5px] text-muted">{p.posted_at}</span>
                  {p.title}
                </div>
                {p.body && <div className="truncate text-[12.5px] text-muted">{p.body}</div>}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => {
                    setPEditing(p.id); setPTitle(p.title); setPBody(p.body ?? "");
                    setPUrl(p.url ?? ""); setPDate(p.posted_at); setPImage(p.image_url);
                  }}
                  className="rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:border-accent hover:text-accent">
                  Edit
                </button>
                <button
                  onClick={async () => {
                    await supabase!.from("timeline_posts").delete().eq("id", p.id);
                    if (pEditing === p.id) {
                      setPEditing(null); setPTitle(""); setPBody(""); setPUrl(""); setPImage(null);
                    }
                    await refresh(); flash("Post deleted");
                  }}
                  className="rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                  Delete
                </button>
              </div>
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
                      className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] hover:border-accent hover:text-accent">
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

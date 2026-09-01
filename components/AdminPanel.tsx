"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
interface UpdateItem { kind: "new" | "better" | "fix"; th: string; en: string }
interface SiteUpdate {
  id: number; on_date: string;
  title_th: string | null; title_en: string | null;
  items: UpdateItem[] | null;
}
const UPDATE_KINDS: UpdateItem["kind"][] = ["new", "better", "fix"];
interface ClaimedProfile {
  id: string;
  discord_username: string | null;
  discord_avatar: string | null;
  character_id: number;
  character_name: string | null;
  auth_providers: string[] | null;
  character_verified_at: string | null;
}

const PROVIDER_NAME: Record<string, string> = {
  discord: "Discord", google: "Google", email: "Email",
};

/**
 * Which services somebody signed in with. Plural, and that is the point.
 *
 * An account can have both Discord and Google linked to it, and showing only
 * one would answer "which door did they come through" with half the truth.
 *
 * `auth_providers` is the record and comes from migration_v21. Before that has
 * been run every row is null, so the avatar's host is read instead — Discord
 * and Google serve theirs from their own CDNs. That can only ever find the one
 * that supplied the picture, so it is shown dimmed with a "?" and says on hover
 * where it came from: a guess presented as a fact is worse than a blank.
 */
function providers(c: ClaimedProfile): { names: string[]; sure: boolean } | null {
  if (c.auth_providers?.length) {
    return {
      names: c.auth_providers.map((p) => PROVIDER_NAME[p] ?? p),
      sure: true,
    };
  }
  const host = c.discord_avatar ?? "";
  if (host.includes("discordapp.com") || host.includes("discord.com")) {
    return { names: ["Discord"], sure: false };
  }
  if (host.includes("googleusercontent.com")) return { names: ["Google"], sure: false };
  return null;
}

type ClaimSort = "character" | "account" | "provider" | "claimed";

/**
 * What each column sorts on, as one comparable value.
 *
 * A string for the text columns and a number for the date, with null meaning
 * "nothing here". Nulls are kept at the bottom whichever way the sort is
 * pointing: a row with no date is not the oldest claim, it is a claim nobody
 * has verified, and letting those float to the top on one click would bury the
 * answer somebody was looking for.
 */
function claimKey(c: ClaimedProfile, by: ClaimSort, name: string): string | number | null {
  switch (by) {
    case "character": return name.toLowerCase();
    case "account": return c.discord_username?.toLowerCase() ?? null;
    case "provider": return providers(c)?.names.join(" ").toLowerCase() ?? null;
    case "claimed": return c.character_verified_at
      ? Date.parse(c.character_verified_at) : null;
  }
}

const PROVIDER_TONE: Record<string, string> = {
  Discord: "border-[#5865F2]/50 bg-[#5865F2]/10 text-[#8b93f5]",
  Google: "border-[#ea4335]/50 bg-[#ea4335]/10 text-[#f08379]",
  Email: "border-line bg-card text-muted",
};

const inputCls = "rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted";

/** Longer than this and a body is worth folding away until somebody asks. */
const LONG = 150;

/**
 * What was actually written, rather than the first line of it.
 *
 * These lists used to truncate to a single line, which made them a list of
 * titles: the one place an admin can go to read back what the FC was told, and
 * it showed everything except the message. The notification that brings people
 * here carries only the title too, so if the panel does not have the words,
 * nothing does.
 *
 * Long ones fold, because a page of announcements is also something you scan.
 * Newlines survive — an announcement written as three bullet points was meant
 * to be read as three bullet points.
 */
function Body({ text, id, open, toggle }: {
  text: string;
  id: string;
  open: Set<string>;
  toggle: (id: string) => void;
}) {
  const long = text.length > LONG || text.includes("\n");
  const shown = open.has(id);
  return (
    <div className="mt-0.5">
      <p className={`whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted ${
        long && !shown ? "line-clamp-2" : ""}`}>
        {text}
      </p>
      {long && (
        <button onClick={() => toggle(id)}
                className="mt-0.5 text-[11.5px] text-accent hover:underline">
          {shown ? "Show less" : "Show all"}
        </button>
      )}
    </div>
  );
}
import AdminSwitch from "@/components/AdminSwitch";
import { useAdmin } from "@/lib/admin";
import AdminLog from "@/components/AdminLog";

/**
 * The claimed characters, on a database that may or may not have had v21 run.
 *
 * Selecting a column that does not exist fails the whole query rather than
 * dropping that one field, and the section would go blank saying nobody has
 * claimed anything — which is both wrong and alarming. So the provider is asked
 * for, and if the database has not heard of it yet the older column list is
 * used and the badge falls back to a guess.
 */
const CLAIM_BASE =
  "id, discord_username, discord_avatar, character_id, character_name, character_verified_at";

async function claimRows(supabase: NonNullable<ReturnType<typeof createClient>>)
: Promise<ClaimedProfile[]> {
  const full = await supabase.from("profiles")
    .select(`${CLAIM_BASE}, auth_providers`).not("character_id", "is", null);
  const rows = full.error
    ? (await supabase.from("profiles").select(CLAIM_BASE)
        .not("character_id", "is", null)).data
    : full.data;
  return ((rows ?? []) as unknown as ClaimedProfile[]);
}

export default function AdminPanel({ memberOptions }: { memberOptions: Option[] }) {
  const [supabase] = useState(createClient);
  const [phase, setPhase] = useState<"loading" | "denied" | "ready">("loading");
  const { isAdmin: adminMode } = useAdmin();
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
  const [galleryOn, setGalleryOn] = useState(true);

  const [overrides, setOverrides] = useState<Override[]>([]);
  const [pick, setPick] = useState("");
  const [selected, setSelected] = useState<Option | null>(null);
  const [note, setNote] = useState("");

  const [claims, setClaims] = useState<ClaimedProfile[]>([]);

  // Site updates. The form holds one day at a time: a date, an optional
  // headline in both languages, and the lines under it.
  const [updates, setUpdates] = useState<SiteUpdate[]>([]);
  const [uDate, setUDate] = useState(new Date().toISOString().slice(0, 10));
  const [uTitleTh, setUTitleTh] = useState("");
  const [uTitleEn, setUTitleEn] = useState("");
  const [uItems, setUItems] = useState<UpdateItem[]>([{ kind: "new", th: "", en: "" }]);
  const [uEditing, setUEditing] = useState<number | null>(null);

  const resetUpdate = () => {
    setUEditing(null); setUTitleTh(""); setUTitleEn("");
    setUDate(new Date().toISOString().slice(0, 10));
    setUItems([{ kind: "new", th: "", en: "" }]);
  };
  // Which way the claims table is pointing. Newest-first is the useful default
  // for a date and A-to-Z for a name, so a column brings its own direction the
  // first time it is clicked rather than always starting ascending.
  const [claimSort, setClaimSort] = useState<{ by: ClaimSort; dir: 1 | -1 }>(
    { by: "character", dir: 1 });
  const sortClaims = (by: ClaimSort) => setClaimSort((v) =>
    v.by === by ? { by, dir: (v.dir === 1 ? -1 : 1) as 1 | -1 }
                : { by, dir: by === "claimed" ? -1 : 1 });

  // Which bodies are unfolded. One set for both lists: the key says which.
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((v) => {
    const next = new Set(v);
    if (!next.delete(id)) next.add(id);
    return next;
  });

  const nameOf = useMemo(() => {
    const m = new Map(memberOptions.map((o) => [o.id, o.name]));
    return (id: number) => m.get(id) ?? `#${id}`;
  }, [memberOptions]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3000); };

  async function refresh() {
    if (!supabase) return;
    const [a, t, s, o, c, u] = await Promise.all([
      supabase.from("announcements").select("id, title, body, created_at, image_url")
        .order("created_at", { ascending: false }),
      supabase.from("timeline_posts").select("id, title, body, url, posted_at, image_url")
        .order("posted_at", { ascending: false }),
      supabase.from("site_settings").select("key, value"),
      supabase.from("member_overrides").select("character_id, hidden, note"),
      claimRows(supabase),
      supabase.from("site_updates")
        .select("id, on_date, title_th, title_en, items")
        .order("on_date", { ascending: false }).order("id", { ascending: false }),
    ]);
    setAnns((a.data as Announcement[]) ?? []);
    setPosts((t.data as TimelinePost[]) ?? []);
    for (const r of s.data ?? []) {
      if (r.key === "discord_server_id") setServerId(r.value ?? "");
      if (r.key === "discord_invite_url") setInvite(r.value ?? "");
      if (r.key === NOTICE_KEY) setNoticeOn(r.value !== "off");
      if (r.key === GALLERY_PUBLIC_KEY) setGalleryOn(r.value !== "off");
    }
    setOverrides((o.data as Override[]) ?? []);
    setClaims(c);
    // Absent until migration_v23 has been run; the section says so rather than
    // looking like nobody has ever written an update.
    setUpdates((u.data as SiteUpdate[]) ?? []);
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

  // An admin who has switched their powers off is browsing as a member, and this
  // page is one of the things a member does not have. Said plainly rather than
  // shown as "admins only", which would be a lie, and with the switch to hand so
  // the answer is one click and not a hunt.
  if (!adminMode)
    return (
      <main className="pt-7">
        <div className="font-data text-[11px] uppercase tracking-[0.22em] text-chili">Admin</div>
        <h1 className="font-display text-3xl font-bold">Site admin</h1>
        <p className="mt-2 max-w-prose text-[13.5px] leading-relaxed text-muted">
          Your admin powers are switched off, so you are seeing the site the way
          the rest of the FC does — and this page is not part of that. Turn them
          back on to carry on.
        </p>
        <AdminSwitch />
      </main>
    );

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-chili">Admin</div>
      <h1 className="font-display text-3xl font-bold">Site admin</h1>
      {msg && <div className="mt-2 text-[13px] text-jade">{msg}</div>}

      {/* The panel itself follows the real flag rather than the switch: locking
          yourself out of the room the switch lives in would be a poor trick. */}
      <AdminSwitch />

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

      {/* ── Site updates ── */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">
          Site updates (the box on the home page)
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          One entry per day. Write each line in both languages — a reader sees
          the one they are reading the site in, and a line with only one side
          falls back to it rather than showing blank.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {uEditing !== null && (
            <div className="text-[12.5px] text-accent">Editing an existing day</div>
          )}
          <div className="flex flex-wrap gap-2">
            <input type="date" value={uDate} onChange={(e) => setUDate(e.target.value)}
                   className={inputCls} aria-label="Date" />
            <input value={uTitleTh} onChange={(e) => setUTitleTh(e.target.value.slice(0, 120))}
                   placeholder="หัวข้อของวัน (ไม่ใส่ก็ได้)"
                   className={`${inputCls} min-w-[180px] flex-1`} />
            <input value={uTitleEn} onChange={(e) => setUTitleEn(e.target.value.slice(0, 120))}
                   placeholder="Headline for the day (optional)"
                   className={`${inputCls} min-w-[180px] flex-1`} />
          </div>

          {uItems.map((it, i) => (
            <div key={i} className="rounded-lg border border-line bg-card p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {UPDATE_KINDS.map((k) => (
                  <button key={k}
                          onClick={() => setUItems(uItems.map((x, n) =>
                            n === i ? { ...x, kind: k } : x))}
                          aria-pressed={it.kind === k}
                          className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                            it.kind === k ? "border-accent bg-accent/15 text-accent"
                                          : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                    {k}
                  </button>
                ))}
                {uItems.length > 1 && (
                  <button onClick={() => setUItems(uItems.filter((_, n) => n !== i))}
                          className="ml-auto rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                    Remove line
                  </button>
                )}
              </div>
              <textarea value={it.th} rows={2} placeholder="ข้อความภาษาไทย"
                        onChange={(e) => setUItems(uItems.map((x, n) =>
                          n === i ? { ...x, th: e.target.value.slice(0, 600) } : x))}
                        className={`${inputCls} mt-2 w-full`} />
              <textarea value={it.en} rows={2} placeholder="The same line in English"
                        onChange={(e) => setUItems(uItems.map((x, n) =>
                          n === i ? { ...x, en: e.target.value.slice(0, 600) } : x))}
                        className={`${inputCls} mt-1.5 w-full`} />
            </div>
          ))}

          <button onClick={() => setUItems([...uItems, { kind: "new", th: "", en: "" }])}
                  className="self-start rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent">
            + Add another line
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                // A day with nothing under it is not an update. Empty lines are
                // dropped rather than saved as blanks somebody has to find and
                // delete off the front page later.
                const items = uItems
                  .map((i) => ({ ...i, th: i.th.trim(), en: i.en.trim() }))
                  .filter((i) => i.th || i.en);
                if (!items.length) { flash("Write at least one line first"); return; }
                const fields = {
                  on_date: uDate,
                  title_th: uTitleTh.trim() || null,
                  title_en: uTitleEn.trim() || null,
                  items,
                  updated_at: new Date().toISOString(),
                };
                const { error } = uEditing !== null
                  ? await supabase!.from("site_updates").update(fields).eq("id", uEditing)
                  : await supabase!.from("site_updates").insert({
                      ...fields,
                      created_by: (await supabase!.auth.getUser()).data.user?.id,
                    });
                if (error) {
                  flash(error.message.includes("site_updates")
                    ? "Save failed — has migration_v23.sql been run?"
                    : `Save failed: ${error.message}`);
                  return;
                }
                resetUpdate();
                await refresh();
                flash(uEditing !== null ? "Update saved" : "Update posted");
              }}
              className="self-start rounded-lg border border-accent bg-accent/15 px-4 py-2 text-accent hover:bg-accent/25">
              {uEditing !== null ? "Save changes" : "Post update"}
            </button>
            {uEditing !== null && (
              <button onClick={resetUpdate}
                      className="rounded-lg border border-line px-4 py-2 text-muted hover:border-muted hover:text-ink">
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {updates.map((u) => (
            <div key={u.id}
                 className="flex items-start justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-data text-[11.5px] text-muted">{u.on_date}</span>
                  <span className="font-medium">{u.title_th || u.title_en || ""}</span>
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted">
                  {(u.items ?? []).length} line{(u.items ?? []).length === 1 ? "" : "s"}
                  {/* Flagged rather than blocked. Half an announcement is worth
                      posting; a reminder to come back and finish it is worth
                      more than a form that refuses to save. */}
                  {(u.items ?? []).some((i) => !i.th || !i.en) && (
                    <span className="ml-2 text-gold">· missing a translation</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => {
                    setUEditing(u.id); setUDate(u.on_date);
                    setUTitleTh(u.title_th ?? ""); setUTitleEn(u.title_en ?? "");
                    setUItems((u.items ?? []).length
                      ? (u.items ?? []).map((i) => ({
                          kind: i.kind ?? "new", th: i.th ?? "", en: i.en ?? "" }))
                      : [{ kind: "new", th: "", en: "" }]);
                  }}
                  className="rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:border-accent hover:text-accent">
                  Edit
                </button>
                <button
                  onClick={async () => {
                    await supabase!.from("site_updates").delete().eq("id", u.id);
                    if (uEditing === u.id) resetUpdate();
                    await refresh(); flash("Update deleted");
                  }}
                  className="rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {updates.length === 0 && (
            <div className="text-[13px] text-muted">
              Nothing here yet — the home page shows the list that ships with the
              code until the first one is written.
            </div>
          )}
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
                // The thumbnail opens the full picture, because "which
                // screenshot was that" is the other half of "what did it say".
                <a href={a.image_url} target="_blank" rel="noopener noreferrer"
                   className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image_url} alt=""
                       className="size-10 rounded-md border border-line object-cover" />
                </a>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{a.title}</span>
                  {/* The date the notification quoted, so an admin holding one
                      can tell which announcement it was about. */}
                  <span className="font-data text-[11px] text-muted">
                    {new Date(a.created_at).toLocaleString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                {a.body && <Body text={a.body} id={`a:${a.id}`} open={open} toggle={toggle} />}
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
                <a href={p.image_url} target="_blank" rel="noopener noreferrer"
                   className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt=""
                       className="size-10 rounded-md border border-line object-cover" />
                </a>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  <span className="mr-2 font-data text-[11.5px] text-muted">{p.posted_at}</span>
                  {p.title}
                </div>
                {p.body && <Body text={p.body} id={`p:${p.id}`} open={open} toggle={toggle} />}
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                     className="mt-0.5 block truncate text-[11.5px] text-accent hover:underline">
                    {p.url}
                  </a>
                )}
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
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Who is behind each character, and which service they signed in with.
          Releasing a claim frees the character for somebody else to take.
        </p>

        {/* A table because these are four facts about each of many rows, and a
            run-on line makes the eye re-find the boundary between them every
            time. It scrolls inside itself on a narrow screen rather than
            stretching the page. */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
                {([["character", "Character"], ["account", "Account"],
                   ["provider", "Signed in with"], ["claimed", "Claimed"]] as const)
                  .map(([by, label]) => (
                    <th key={by} className="py-1.5 pr-3 font-normal"
                        aria-sort={claimSort.by === by
                          ? (claimSort.dir === 1 ? "ascending" : "descending")
                          : "none"}>
                      <button onClick={() => sortClaims(by)}
                              className={`inline-flex items-center gap-1 uppercase tracking-[0.14em] transition-colors hover:text-ink ${
                                claimSort.by === by ? "text-accent" : ""}`}>
                        {label}
                        {/* The arrow only on the column doing the sorting. One
                            on every header is four claims about the order when
                            only one of them is true. */}
                        <span aria-hidden className={claimSort.by === by ? "" : "opacity-0"}>
                          {claimSort.dir === 1 ? "↑" : "↓"}
                        </span>
                      </button>
                    </th>
                  ))}
                <th className="py-1.5 font-normal" />
              </tr>
            </thead>
            <tbody>
              {[...claims]
                .sort((a, b) => {
                  const an = a.character_name ?? nameOf(a.character_id);
                  const bn = b.character_name ?? nameOf(b.character_id);
                  const av = claimKey(a, claimSort.by, an);
                  const bv = claimKey(b, claimSort.by, bn);
                  // Empty cells sit at the bottom either way round.
                  if (av == null || bv == null) {
                    return av == null && bv == null ? an.localeCompare(bn)
                      : av == null ? 1 : -1;
                  }
                  const d = typeof av === "number" && typeof bv === "number"
                    ? av - bv : String(av).localeCompare(String(bv));
                  // The name breaks every tie, so rows never shuffle about
                  // between renders on a column half of them share.
                  return d !== 0 ? d * claimSort.dir : an.localeCompare(bn);
                })
                .map((c) => {
                  const p = providers(c);
                  return (
                    <tr key={c.id} className="border-b border-line/60 last:border-0">
                      <td className="py-1.5 pr-3">
                        {/* The name is the link. An admin reading this row is
                            usually on their way to that member's page. */}
                        <Link href={`/member/${c.character_id}`}
                              className="font-data text-ink no-underline hover:text-accent">
                          {c.character_name ?? nameOf(c.character_id)}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-3 text-muted">
                        {c.discord_username ?? <span className="opacity-60">no name</span>}
                      </td>
                      <td className="py-1.5 pr-3">
                        {p ? (
                          <span className="flex flex-wrap gap-1">
                            {p.names.map((name) => (
                              <span key={name}
                                    title={p.sure ? undefined
                                      : "Guessed from the avatar's host — run migration_v21.sql to record it properly"}
                                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                      PROVIDER_TONE[name] ?? "border-line text-muted"} ${
                                      p.sure ? "" : "opacity-60"}`}>
                                {name}{p.sure ? "" : "?"}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-muted opacity-60">—</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 font-data text-[11.5px] text-muted">
                        {c.character_verified_at
                          ? new Date(c.character_verified_at).toLocaleDateString("en-GB",
                              { day: "numeric", month: "short", year: "numeric" })
                          : <span className="opacity-60">unverified</span>}
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          onClick={async () => {
                            await supabase!.from("profiles")
                              .update({ character_id: null, character_name: null })
                              .eq("id", c.id);
                            await refresh(); flash("Claim released");
                          }}
                          className="rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                          Release
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {claims.length === 0 && (
            <div className="py-2 text-[13px] text-muted">Nobody has claimed a character yet</div>
          )}
        </div>
      </section>

      {/* Last, because it is the section you come to with a question rather than
          with something to change. */}
      <AdminLog />
    </main>
  );
}

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
            ? "That character is already claimed by someone else — if it is really yours, ask an admin to release it"
            : `Could not save: ${error.message}` }
      : { ok: true, text: "Saved — your profile and the board update immediately" });
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
      ? { ok: false, text: "Action failed (has migration_v2.sql been run?)" }
      : { ok: true, text: next ? "You are now hidden from the board" : "You are visible on the board again" });
  }

  if (phase === "loading") return <Notice>Loading…</Notice>;

  if (phase === "no-config")
    return (
      <Notice>
        Supabase is not connected yet — set <b className="text-amber">NEXT_PUBLIC_SUPABASE_URL</b> and{" "}
        <b className="text-amber">NEXT_PUBLIC_SUPABASE_ANON_KEY</b> as described in the README,
        and this page switches itself on.
      </Notice>
    );

  if (phase === "logged-out")
    return (
      <Notice>
        Sign in with Discord to claim your character and customise your profile
        <div className="mt-4">
          <button
            onClick={() =>
              supabase!.auth.signInWithOAuth({
                provider: "discord",
                options: { redirectTo: `${location.origin}/auth/callback` },
              })}
            className="rounded-lg border border-[#5865F2]/60 bg-[#5865F2]/15 px-5 py-2 text-[#a5b2ff] transition-colors hover:bg-[#5865F2]/25">
            Log in with Discord
          </button>
        </div>
      </Notice>
    );

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-amber">Profile</div>
      <h1 className="font-display text-3xl font-bold">My profile</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        {profile?.discord_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.discord_avatar} alt="" className="size-9 rounded-full" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="font-data text-sm font-semibold">
            {profile?.discord_username ?? "Discord member"}
          </div>
          <div className="text-[12px] text-muted">Linked via Discord</div>
        </div>
        {charId && (
          <Link href={`/member/${charId}`}
                className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted no-underline hover:border-amber hover:text-amber">
            View my page
          </Link>
        )}
        {profile?.is_admin && (
          <Link href="/admin"
                className="rounded-lg border border-chili/50 bg-chili/10 px-3 py-1.5 text-[13px] text-chili no-underline hover:bg-chili/20">
            Admin panel
          </Link>
        )}
        <button
          onClick={async () => { await supabase!.auth.signOut(); location.href = "/"; }}
          className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted hover:border-muted hover:text-ink">
          Sign out
        </button>
      </div>

      {/* Character claim */}
      <section className="mt-5 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">My character</div>
        {charId ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-data text-[15px] font-semibold"
                  style={color ? { color } : undefined}>
              {charName} <span className="text-amber">✦</span>
            </span>
            <button onClick={() => { setCharId(null); setCharName(null); }}
                    className="rounded-lg border border-line px-3 py-1 text-[12.5px] text-muted hover:border-muted hover:text-ink">
              Unlink
            </button>
            <button onClick={toggleHide}
                    className={`rounded-lg border px-3 py-1 text-[12.5px] ${
                      hidden ? "border-jade/50 text-jade hover:bg-jade/10"
                             : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {hidden ? "Show me on the board" : "Hide me from the board"}
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <input value={pick} onChange={(e) => setPick(e.target.value)}
                   placeholder="Type at least 2 characters of your character name…"
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
          One character can only be claimed by one account — once claimed you get a ✦ on the board and can customise your own page
        </p>
      </section>

      {/* Profile customisation */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">Customise profile</div>

        <label className="mt-3 block text-[13px] text-muted">
          Bio / status (200 characters max)
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    rows={2}
                    placeholder="e.g. looking for a savage static / happy to mentor / selling popoto cake"
                    className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted" />
        </label>

        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-4">
          <label className="block text-[13px] text-muted">
            Main job
            <select value={job} onChange={(e) => setJob(e.target.value)}
                    className="mt-1 block rounded-lg border border-line bg-card px-3 py-2 text-ink">
              <option value="">— not set —</option>
              {JOBS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </label>

          <div className="text-[13px] text-muted">
            Accent colour
            <div className="mt-1.5 flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(color === c ? "" : c)}
                        aria-label={`Pick colour ${c}`}
                        className={`size-7 rounded-full border-2 transition-transform ${
                          color === c ? "scale-110 border-ink" : "border-transparent"}`}
                        style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-[13px] text-muted">
          Profile banner
          <div className="mt-1.5 flex flex-wrap gap-2">
            {BANNERS.map((bnr) => (
              <button key={bnr} onClick={() => setBanner(banner === bnr ? "" : bnr)}
                      aria-label="Pick banner"
                      className={`h-10 w-20 rounded-lg border-2 transition-transform ${
                        banner === bnr ? "scale-105 border-amber" : "border-line"}`}
                      style={{ background: bnr }} />
            ))}
          </div>
        </div>

        <div className="mt-4 text-[13px] text-muted">
          &ldquo;Looking for&rdquo; status (shown on the board and usable as a filter)
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
            {saving ? "Saving…" : "Save profile"}
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

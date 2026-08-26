"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LFG_OPTIONS, MONTH_NAMES } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import CharacterClaim from "@/components/CharacterClaim";
import { LANGS, useLang } from "@/lib/i18n";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import PendingTags from "@/components/gallery/PendingTags";
import { EMPTY, isEmpty } from "@/lib/availability";
import SignIn, { PROVIDERS } from "@/components/SignIn";

interface Option { id: number; name: string }

interface ProfileRow {
  id: string;
  discord_username: string | null;
  discord_avatar: string | null;
  character_id: number | null;
  character_name: string | null;
  /** Set by the verify route only — see supabase/migration_v4.sql. */
  character_verified_at: string | null;
  availability: string | null;
  /** What to call somebody who has no character linked. */
  display_name: string | null;
  bio: string | null;
  accent_color: string | null;
  lfg: string[] | null;
  banner: string | null;
  nickname: string | null;
  birth_month: number | null;
  birth_day: number | null;
  is_admin: boolean;
}

const COLORS = ["#6aa9e0","#d14b3a","#e5cc80","#4fb8a8","#c98a5b","#7ea6c9","#e268a8","#a335ee"];
const BANNERS = [
  "linear-gradient(135deg,#151b25,#22304a)",
  "linear-gradient(135deg,#241416,#d14b3a33)",
  "linear-gradient(135deg,#0f1f1c,#4fb8a833)",
  "linear-gradient(135deg,#101827,#7ea6c933)",
  "linear-gradient(135deg,#1d1226,#a335ee33)",
  "linear-gradient(135deg,#20222c,#e5cc8040)",
];

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
      {children}
    </div>
  );
}

export default function ProfileForm({ memberOptions }: { memberOptions: Option[] }) {
  const { t, lang, setLang } = useLang();
  const [supabase] = useState(createClient);
  const [phase, setPhase] = useState<"loading" | "no-config" | "logged-out" | "ready">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [charId, setCharId] = useState<number | null>(null);
  const [charName, setCharName] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [bio, setBio] = useState("");
  const [color, setColor] = useState("");
  const [banner, setBanner] = useState("");
  const [lfg, setLfg] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setPhase("no-config"); return; }
    {
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
        setVerifiedAt(p.character_verified_at ?? null);
        setDisplayName(p.display_name ?? "");
        setNickname(p.nickname ?? "");
        setBirthMonth(p.birth_month ? String(p.birth_month) : "");
        setBirthDay(p.birth_day ? String(p.birth_day) : "");
        setBio(p.bio ?? "");
        setColor(p.accent_color ?? "");
        setBanner(p.banner ?? "");
        setLfg(p.lfg ?? []);
        setAvailability(p.availability ?? null);
      }
      setPhase("ready");
    }
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  const inRoster = charId != null && memberOptions.some((o) => o.id === charId);

  async function save() {
    if (!supabase || !user) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        nickname: nickname.trim() || null,
        // Both or neither: half a date is not a birthday.
        birth_month: birthMonth && birthDay ? Number(birthMonth) : null,
        birth_day: birthMonth && birthDay ? Number(birthDay) : null,
        bio: bio.trim() || null,
        accent_color: color || null,
        banner: banner || null,
        lfg,
        // All-empty means "not filled in" rather than "never free", so it is
        // stored as null and the member page simply leaves the section out.
        availability: isEmpty(availability) ? null : availability,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    setMsg(error
      ? { ok: false, text: `Could not save: ${error.message}` }
      : { ok: true, text: "Saved — your profile and the board update immediately" });
  }

  if (phase === "loading") return <Notice>{t("common.loading")}</Notice>;

  if (phase === "no-config")
    return (
      <Notice>
        Supabase is not connected yet — set <b className="text-accent">NEXT_PUBLIC_SUPABASE_URL</b> and{" "}
        <b className="text-accent">NEXT_PUBLIC_SUPABASE_ANON_KEY</b> as described in the README,
        and this page switches itself on.
      </Notice>
    );

  if (phase === "logged-out")
    return (
      <Notice>
        <div className="mx-auto max-w-sm text-left">
          <p className="mb-4 text-center">{t("profile.signInPrompt")}</p>
          <SignIn supabase={supabase!} />
        </div>
      </Notice>
    );

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">
        {t("nav.profile")}
      </div>
      <h1 className="font-display text-3xl font-bold">{t("profile.title")}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        {profile?.discord_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.discord_avatar} alt="" className="size-9 rounded-full" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate font-data text-sm font-semibold">
            {charName ?? profile?.display_name ?? profile?.discord_username
              ?? user?.email ?? "Signed in"}
          </div>
          <div className="text-[12px] text-muted">
            {charId
              ? `${inRoster ? t("profile.fcMember") : t("profile.guest")} · ${
                  verifiedAt ? t("profile.verified") : t("profile.notVerified")}`
              : t("profile.guestNoChar")}
          </div>
        </div>
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

      {/* Somebody is waiting on an answer, so it goes above the things you
          came here to change. Renders nothing at all when there is nothing. */}
      <PendingTags />

      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-display font-semibold">{t("profile.availability")}</div>
          {!isEmpty(availability) && (
            <button onClick={() => setAvailability(EMPTY)}
                    className="text-[12.5px] text-muted underline hover:text-ink">
              {t("profile.availabilityClear")}
            </button>
          )}
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          {t("profile.availabilityHint")}
        </p>
        <div className="mt-2.5">
          <AvailabilityGrid value={availability} onChange={setAvailability} />
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">{t("profile.language")}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          {t("profile.languageHint")}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <button key={l.key} onClick={() => setLang(l.key)}
                    aria-pressed={lang === l.key}
                    className={`rounded-lg border px-3.5 py-1.5 text-[13px] transition-colors ${
                      lang === l.key
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {l.label}
            </button>
          ))}
        </div>
      </section>

      {/* Ways back in, so losing one account does not lose the profile. */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">{t("profile.waysToSignIn")}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          {t("profile.waysHint")}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {PROVIDERS.map((prov) => {
            const linked = (user?.identities ?? []).some((i) => i.provider === prov.key);
            return (
              <button key={prov.key} disabled={linked || linking === prov.key}
                      title={linked ? `${prov.label} is already linked` : prov.hint}
                      onClick={async () => {
                        setLinkErr(null);
                        setLinking(prov.key);
                        // linkIdentity resolves with an error rather than throwing,
                        // and swallowing it made the button look like it did nothing
                        // at all. The most common cause is manual linking being off
                        // in the Supabase project, which is the default.
                        const { error } = await supabase!.auth.linkIdentity({
                          provider: prov.key,
                          options: { redirectTo: `${location.origin}/auth/callback` },
                        });
                        setLinking(null);
                        if (error) setLinkErr(error.message);
                      }}
                      className={`rounded-lg border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                        linked ? "border-jade/40 bg-jade/5 text-jade"
                               : "border-line text-muted hover:border-accent hover:text-accent"} disabled:opacity-50`}>
                {linked ? `${prov.label} ✓`
                  : linking === prov.key ? t("common.loading")
                  : t("profile.link", { name: prov.label })}
              </button>
            );
          })}
        </div>
        {linkErr && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-chili">
            {linkErr}
            {/^manual linking/i.test(linkErr) && (
              <>
                {" "}— an admin has to switch this on in Supabase under
                Authentication, then it works for everyone.
              </>
            )}
          </p>
        )}
      </section>

      {/* Character claim */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">{t("profile.myCharacter")}</div>
        <CharacterClaim
          memberOptions={memberOptions}
          characterId={charId}
          characterName={charName}
          verifiedAt={verifiedAt}
          inRoster={inRoster}
          onChange={() => { void load(); }}
        />
      </section>

      {/* Guests are named by hand, since there is no character to name them. */}
      {!charId && (
        <section className="mt-3 rounded-xl border border-line bg-surface p-4">
          <div className="font-display font-semibold">{t("profile.guestName")}</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            {t("profile.guestNameHint")}
          </p>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                 placeholder="A name people will recognise"
                 maxLength={40}
                 className="mt-2.5 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted" />
        </section>
      )}

      {/* Profile customisation */}
      <section className="mt-3 rounded-xl border border-line bg-surface p-4">
        <div className="font-display font-semibold">{t("profile.customise")}</div>

        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-4">
          <label className="block text-[13px] text-muted">
            Nickname
            <input value={nickname}
                   onChange={(e) => setNickname(e.target.value.slice(0, 24))}
                   placeholder="What people call you"
                   className="mt-1 block w-52 rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted" />
          </label>

          {/* Day and month only. The site just needs to know when to say happy
              birthday, so there is no year field to fill in. */}
          <div className="text-[13px] text-muted">
            Birthday <span className="text-muted/70">(day and month only)</span>
            <div className="mt-1 flex gap-2">
              <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)}
                      aria-label="Birthday day"
                      className="rounded-lg border border-line bg-card px-3 py-2 text-ink">
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}
                      aria-label="Birthday month"
                      className="rounded-lg border border-line bg-card px-3 py-2 text-ink">
                <option value="">Month</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
              {(birthDay || birthMonth) && (
                <button type="button"
                        onClick={() => { setBirthDay(""); setBirthMonth(""); }}
                        className="text-[12.5px] text-muted underline hover:text-ink">
                  clear
                </button>
              )}
            </div>
          </div>
        </div>

        <label className="mt-3 block text-[13px] text-muted">
          Bio / status (200 characters max)
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    rows={2}
                    placeholder="e.g. looking for a savage static / happy to mentor / selling popoto cake"
                    className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted" />
        </label>

        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-4">

          <div className="text-[13px] text-muted">
            {t("profile.accent")}
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
          {t("profile.banner")}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {BANNERS.map((bnr) => (
              <button key={bnr} onClick={() => setBanner(banner === bnr ? "" : bnr)}
                      aria-label="Pick banner"
                      className={`h-10 w-20 rounded-lg border-2 transition-transform ${
                        banner === bnr ? "scale-105 border-accent" : "border-line"}`}
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
                          on ? "border-accent bg-accent/12 text-accent"
                             : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} disabled={saving}
                  className="rounded-lg border border-accent bg-accent/15 px-5 py-2 text-accent transition-colors hover:bg-accent/25 disabled:opacity-50">
            {saving ? t("profile.saving") : t("profile.save")}
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

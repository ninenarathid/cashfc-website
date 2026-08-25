"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Every way into the site, in one place so the header and the profile page cannot
 * offer different ones.
 *
 * Discord leads because the FC lives there, and signing in with it is weak evidence
 * that somebody belongs — but it must not be the only door. Losing a Discord
 * account should not mean losing a profile, and guests who join events may not be
 * in the server at all. Which identity somebody arrives with no longer decides
 * anything on its own: owning a character is proved separately, against The
 * Lodestone.
 *
 * A provider that is not enabled in the Supabase dashboard fails at the redirect
 * rather than here, so `enabled` keeps the unavailable ones out of sight.
 */
export const PROVIDERS = [
  {
    key: "discord" as const,
    label: "Discord",
    hint: "How the FC talks — start here if you have it",
    className: "border-[#5865F2]/60 bg-[#5865F2]/15 text-[#a5b2ff] hover:bg-[#5865F2]/25",
  },
  {
    key: "google" as const,
    label: "Google",
    hint: "Easiest to get back into if you lose the other one",
    className: "border-[#c9d1d9]/30 bg-[#c9d1d9]/10 text-[#dfe4ea] hover:bg-[#c9d1d9]/20",
  },
];

/** Providers the Supabase project actually has switched on. */
const ENABLED = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "discord,google")
  .split(",").map((s) => s.trim()).filter(Boolean);

export default function SignIn(
  { supabase, compact = false }:
  { supabase: SupabaseClient; compact?: boolean },
) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const redirectTo = typeof window === "undefined"
    ? undefined : `${location.origin}/auth/callback`;

  const oauth = (provider: "discord" | "google") =>
    supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });

  const magicLink = async () => {
    setBusy(true);
    setErr(null);
    // No password anywhere: nothing to reuse from another site, nothing to leak,
    // and no reset flow to get wrong.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  const buttons = PROVIDERS.filter((p) => ENABLED.includes(p.key));

  return (
    <div className="flex flex-col gap-2.5">
      <div className={compact ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
        {buttons.map((p) => (
          <button key={p.key} onClick={() => oauth(p.key)}
                  title={p.hint}
                  className={`rounded-lg border px-5 py-2 text-[13.5px] transition-colors ${p.className}`}>
            {compact ? p.label : `Continue with ${p.label}`}
          </button>
        ))}
      </div>

      {!compact && ENABLED.includes("email") && (
        sent ? (
          <div className="rounded-lg border border-jade/40 bg-jade/5 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted">
            Check <b className="text-ink">{email}</b> — the link in that mail signs
            you in. It works once and expires shortly, so open it on the device you
            want to be signed in on.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 py-1 text-[11.5px] uppercase tracking-[0.14em] text-muted">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
            <div className="flex flex-wrap gap-2">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     placeholder="you@example.com" aria-label="Email address"
                     className="min-w-[200px] flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13.5px] text-ink placeholder:text-muted" />
              <button onClick={magicLink} disabled={busy || !email.includes("@")}
                      className="rounded-lg border border-line px-4 py-2 text-[13.5px] text-muted transition-colors hover:border-amber hover:text-amber disabled:opacity-40">
                {busy ? "Sending…" : "Email me a link"}
              </button>
            </div>
            <p className="text-[12px] text-muted">
              No password — we mail you a one-time link instead.
            </p>
          </>
        )
      )}

      {err && <p className="text-[12.5px] text-chili">{err}</p>}
    </div>
  );
}

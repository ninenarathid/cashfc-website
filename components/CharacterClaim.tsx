"use client";

import { useState } from "react";
import Link from "next/link";

interface Option { id: number; name: string }

/**
 * Proving a character is yours, in three steps: pick it, paste a code onto its
 * Lodestone profile, let the server read it back.
 *
 * Claiming used to be a dropdown and nothing else — whoever typed a name first
 * owned that member on the board, complete with a ✦ that said "Verified". This is
 * the same check FF Logs, FFXIV Collect and Lalachievements use, so members may
 * have done it before.
 *
 * A character outside the FC roster is allowed on purpose. Friends from other Free
 * Companies join events, and a verified guest brings their jobs and parses with
 * them, which is exactly what you need when building a party. Being in the roster
 * is a separate question, answered by the roster itself rather than stored here.
 */
export default function CharacterClaim(
  { memberOptions, characterId, characterName, verifiedAt, inRoster, onChange }: {
    memberOptions: Option[];
    characterId: number | null;
    characterName: string | null;
    verifiedAt: string | null;
    inRoster: boolean;
    onChange: () => void;
  },
) {
  const [pick, setPick] = useState("");
  const [target, setTarget] = useState<Option | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const suggestions = (() => {
    const q = pick.trim().toLowerCase();
    if (q.length < 2) return [];
    return memberOptions.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8);
  })();

  /** Accepts a bare id or any Lodestone character URL pasted straight from the bar. */
  const idFromInput = (raw: string): number | null => {
    const m = raw.match(/lodestone\/character\/(\d+)/) ?? raw.match(/^\s*(\d{4,})\s*$/);
    const n = m ? Number(m[1]) : NaN;
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const pastedId = idFromInput(pick);

  async function start(option: Option) {
    setErr(null);
    setBusy(true);
    const res = await fetch(`/api/verify-character?characterId=${option.id}`);
    const body = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(body.error ?? "Could not start verification"); return; }
    setTarget(option);
    setToken(body.token);
    setPick("");
  }

  async function check() {
    if (!target) return;
    setErr(null);
    setBusy(true);
    const res = await fetch("/api/verify-character", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: target.id }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(body.error ?? "Verification failed"); return; }
    setTarget(null);
    setToken(null);
    onChange();
  }

  async function unlink() {
    setBusy(true);
    await fetch("/api/verify-character", { method: "DELETE" });
    setBusy(false);
    onChange();
  }

  // ── Step 2: code issued, waiting for the member to paste it ────────────
  // Checked before the linked branch so verifying a character you already hold
  // shows the code rather than bouncing back to its summary.
  if (token && target) {
    return (
      <div className="mt-2">
        <div className="text-[13px] text-muted">
          Verifying <b className="text-ink">{target.name}</b>
        </div>
        <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-[12.5px] leading-relaxed text-muted marker:text-amber/80">
          <li>
            Copy this code:
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="rounded-md border border-amber/40 bg-amber/10 px-2.5 py-1 font-data text-[13px] text-amber">
                {token}
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText(token)}
                className="rounded-md border border-line px-2 py-1 text-[11.5px] text-muted hover:border-muted hover:text-ink">
                Copy
              </button>
            </div>
          </li>
          <li>
            Open{" "}
            <a href={`https://na.finalfantasyxiv.com/lodestone/character/${target.id}/`}
               target="_blank" rel="noopener noreferrer"
               className="text-amber underline decoration-amber/40 underline-offset-2">
              this character on The Lodestone
            </a>
            , log in as its owner and paste the code anywhere in{" "}
            <b className="text-ink">Character Profile</b> (the self-introduction box).
            Save it.
          </li>
          <li>Come back and press the button below. You can delete the code afterwards.</li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={check} disabled={busy}
                  className="rounded-lg border border-amber bg-amber/15 px-4 py-2 text-[13.5px] text-amber hover:bg-amber/25 disabled:opacity-40">
            {busy ? "Checking…" : "I have pasted it — check now"}
          </button>
          <button onClick={() => { setToken(null); setTarget(null); setErr(null); }}
                  className="rounded-lg border border-line px-3.5 py-2 text-[13.5px] text-muted hover:border-muted hover:text-ink">
            Cancel
          </button>
        </div>
        {err && <p className="mt-2 text-[12.5px] leading-relaxed text-chili">{err}</p>}
      </div>
    );
  }

  // ── Already linked ─────────────────────────────────────────────────────
  if (characterId) {
    const mark = !verifiedAt ? null : inRoster
      ? { sym: "✦", text: "Verified FC member", cls: "text-amber" }
      : { sym: "◇", text: "Verified guest — this character is not in the FC roster",
          cls: "text-steel" };
    return (
      <div className="mt-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-data text-[15px] font-semibold text-ink">
            {characterName ?? `#${characterId}`}
            {mark && (
              <span className={`ml-1.5 ${mark.cls}`} title={mark.text}>{mark.sym}</span>
            )}
          </span>
          {inRoster && (
            <Link href={`/member/${characterId}`}
                  className="rounded-lg border border-line px-3 py-1 text-[12.5px] text-muted no-underline hover:border-amber hover:text-amber">
              View my page
            </Link>
          )}
          <button onClick={unlink} disabled={busy}
                  className="rounded-lg border border-line px-3 py-1 text-[12.5px] text-muted hover:border-muted hover:text-ink disabled:opacity-40">
            Unlink
          </button>
        </div>
        {verifiedAt ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{mark?.text}</p>
        ) : (
          <div className="mt-2.5 rounded-lg border border-amber/35 bg-amber/5 px-3 py-2.5">
            <p className="text-[12.5px] leading-relaxed text-muted">
              <b className="text-ink">Not verified yet.</b> This was claimed before
              verification existed, so nothing has proved the character is yours and
              it carries no ✦. Proving it takes a minute, and you keep the claim
              either way.
            </p>
            <button onClick={() => start({ id: characterId, name: characterName ?? `#${characterId}` })}
                    disabled={busy}
                    className="mt-2 rounded-lg border border-amber bg-amber/15 px-3.5 py-1.5 text-[12.5px] text-amber hover:bg-amber/25 disabled:opacity-40">
              {busy ? "Starting…" : "Verify this character"}
            </button>
            {err && <p className="mt-2 text-[12.5px] leading-relaxed text-chili">{err}</p>}
          </div>
        )}
      </div>
    );
  }

  // ── Step 1: pick a character ───────────────────────────────────────────
  return (
    <div className="mt-2">
      <input value={pick} onChange={(e) => setPick(e.target.value)}
             placeholder="Your character name, or a Lodestone profile link…"
             className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted" />
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s.id} onClick={() => start(s)} disabled={busy}
                    className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink transition-colors hover:border-amber hover:text-amber disabled:opacity-40">
              {s.name}
            </button>
          ))}
        </div>
      )}
      {suggestions.length === 0 && pastedId && (
        <button onClick={() => start({ id: pastedId, name: `Character #${pastedId}` })}
                disabled={busy}
                className="mt-2 rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink transition-colors hover:border-amber hover:text-amber disabled:opacity-40">
          Verify character #{pastedId}
        </button>
      )}
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        Type a name to find yourself in the FC roster. Not in this FC? Paste the
        Lodestone link to your character instead — guests can verify too, which is
        what brings your jobs and parses along when you sign up for something.
      </p>
      {err && <p className="mt-2 text-[12.5px] leading-relaxed text-chili">{err}</p>}
    </div>
  );
}

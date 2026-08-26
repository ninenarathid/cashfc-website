"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { memberTitle } from "@/lib/tags";

interface Slim {
  id: number; name: string; avatar: string | null; rank: string | null;
  title: string | null;
  level: number | null; parse: number | null; tags: string[];
  mounts: number | null; minions: number | null; rare_achv: number | null;
  ult_clears: number;
}

function Picker({ label, options, value, onPick }: {
  label: string; options: Slim[]; value: Slim | null;
  onPick: (s: Slim | null) => void;
}) {
  const [q, setQ] = useState("");
  const sug = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return options.filter((o) => o.name.toLowerCase().includes(t)).slice(0, 6);
  }, [q, options]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-accent/50 bg-surface px-4 py-3">
        {value.avatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.avatar} alt="" className="size-10 rounded-full border border-line" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-data font-semibold">{value.name}</div>
          {memberTitle(value) && (
            <div className="text-[12px] text-muted">{memberTitle(value)}</div>
          )}
        </div>
        <button onClick={() => onPick(null)}
                className="rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:text-ink">
          Change
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-3">
      <div className="mb-1.5 text-[12.5px] text-muted">{label}</div>
      <input value={q} onChange={(e) => setQ(e.target.value)}
             placeholder="Type at least 2 characters…"
             className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted" />
      {sug.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {sug.map((s) => (
            <button key={s.id} onClick={() => { onPick(s); setQ(""); }}
                    className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] hover:border-accent hover:text-accent">
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompareClient({ options }: { options: Slim[] }) {
  const [a, setA] = useState<Slim | null>(null);
  const [b, setB] = useState<Slim | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const fa = options.find((o) => String(o.id) === p.get("a"));
    const fb = options.find((o) => String(o.id) === p.get("b"));
    if (fa) setA(fa);
    if (fb) setB(fb);
  }, [options]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (a) p.set("a", String(a.id));
    if (b) p.set("b", String(b.id));
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [a, b]);

  const rows: { label: string; get: (s: Slim) => number | null }[] = [
    { label: "Best parse", get: (s) => s.parse },
    { label: "Ultimate clears", get: (s) => s.ult_clears },
    { label: "Level", get: (s) => s.level },
    { label: "Mounts", get: (s) => s.mounts },
    { label: "Minions", get: (s) => s.minions },
    { label: "Rare achievements", get: (s) => s.rare_achv },
  ];

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">Compare</div>
      <h1 className="font-display text-3xl font-bold">Compare two members</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        Put two members side by side — who collects more, who parses higher.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Picker label="Member 1" options={options} value={a} onPick={setA} />
        <Picker label="Member 2" options={options} value={b} onPick={setB} />
      </div>

      {a && b && (
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          {rows.map((r, i) => {
            const va = r.get(a), vb = r.get(b);
            const winA = va != null && (vb == null || va > vb);
            const winB = vb != null && (va == null || vb > va);
            return (
              <div key={r.label}
                   className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2.5 ${
                     i % 2 ? "bg-surface" : "bg-card/50"}`}>
                <div className={`font-data text-lg font-semibold ${
                  winA ? "text-accent" : "text-ink/80"}`}>
                  {va ?? "—"}{winA && " 🏆"}
                </div>
                <div className="text-center text-[12px] text-muted">{r.label}</div>
                <div className={`text-right font-data text-lg font-semibold ${
                  winB ? "text-accent" : "text-ink/80"}`}>
                  {winB && "🏆 "}{vb ?? "—"}
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-2 border-t border-line">
            {[a, b].map((s) => (
              <Link key={s!.id} href={`/member/${s!.id}`}
                    className="py-2.5 text-center text-[12.5px] text-muted no-underline hover:text-accent">
                View {s!.name}&rsquo;s profile →
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

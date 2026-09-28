"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdmin } from "@/lib/admin";
import { useLang } from "@/lib/i18n";
import { loadAqua, summarize, type AquaRaw } from "@/lib/aqua";
import AdminSwitch from "@/components/AdminSwitch";
import AquaView from "@/components/AquaView";

/**
 * Aqua's page: who may see it, and reading what it shows.
 *
 * Every admin, the same as the prize tab it was split out of. The tables
 * underneath already answer an admin and nobody else (v87, v91), and every
 * change made from the page goes through the same checked writes the prize
 * tab uses, so this only decides whether the page is worth drawing.
 */

const SPANS = [7, 14, 30] as const;

export default function AquaDesk() {
  const { t } = useLang();
  const { realAdmin, isAdmin, ready } = useAdmin();
  const [supabase] = useState(createClient);
  const [span, setSpan] = useState<number>(14);
  const [raw, setRaw] = useState<AquaRaw | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  /** Who is reading, for the prize threads: each side of one is told apart by it. */
  const [me, setMe] = useState<string | null>(null);
  /**
   * What each span read, kept while the page is open.
   *
   * Flipping between a week and a fortnight is the same rows asked for twice.
   * The old answer stays on screen while a new one is read, so the page never
   * blanks to a placeholder just because somebody pressed a button.
   */
  const cache = useRef(new Map<number, { raw: AquaRaw; at: Date }>());

  const load = useCallback(async (want: number, fresh = false) => {
    if (!supabase) return;
    const had = cache.current.get(want);
    if (!fresh && had) { setRaw(had.raw); setLoadedAt(had.at); return; }
    setBusy(true); setFailed(null);
    try {
      const got = await loadAqua(supabase, want);
      const at = new Date();
      cache.current.set(want, { raw: got, at });
      setRaw(got); setLoadedAt(at);
    } catch (e) {
      setFailed(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [supabase]);

  useEffect(() => { if (isAdmin) void load(span); }, [isAdmin, load, span]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, [supabase]);

  /**
   * After anything on the page changes something: every span read so far is
   * out of date, not only the one on screen, so they all go.
   */
  const reload = useCallback(async () => {
    cache.current.clear();
    await load(span, true);
  }, [load, span]);

  const summary = useMemo(() => (raw ? summarize(raw) : null), [raw]);

  if (!ready) return null;

  if (!realAdmin) {
    return (
      <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
        {t("adm.denied")}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="pt-7">
        <p className="max-w-prose text-read leading-relaxed text-muted">{t("adm.poweredOff")}</p>
        <AdminSwitch />
      </main>
    );
  }

  if (!summary || !raw || !supabase) {
    return (
      <main className="pt-7">
        {failed ? (
          <div className="rounded-lg border border-chili/40 bg-chili/10 p-3 text-ui text-chili">
            {t("adm.pcFailed", { why: failed })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-ui text-muted">
            {t("adm.pcLoading")}
          </div>
        )}
      </main>
    );
  }

  return (
    <AquaView s={summary} raw={raw} supabase={supabase} me={me} onReload={reload}
              span={span} spans={SPANS} onSpan={setSpan}
              onRefresh={() => void load(span, true)}
              busy={busy} failed={failed} loadedAt={loadedAt} />
  );
}

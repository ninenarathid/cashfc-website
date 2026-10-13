"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { rememberTown, setTownActive } from "@/lib/town/active";

/** Mounted once for the site. Supabase session_id is shared by tabs in one
 * browser, but a fresh sign-in on another device replaces it on the server. */
export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  const th = lang === "th";
  const [state, setState] = useState<"checking" | "ready" | "error" | "replaced">("checking");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const site = createClient();
    if (!site) { setState("ready"); return; }
    let stopped = false, busy = false, again = false, replaced = false, generation = 0;
    let userId: string | null = null;
    let scheduled: ReturnType<typeof setTimeout> | undefined;
    const closeTown = () => {
      // Avoid downloading the game on every page just to close an existing stay.
      (globalThis as typeof globalThis & { __cashTownSession?: { close(): void } }).__cashTownSession?.close();
      rememberTown(null);
      setTownActive(null);
    };
    const check = async () => {
      if (stopped || replaced) return;
      if (busy) { again = true; return; }
      busy = true;
      const mine = generation;
      try {
        const { data, error } = await site.auth.getSession();
        if (stopped || mine !== generation) return;
        if (error) throw error;
        if (!data.session) { setState("ready"); return; }
        const result = await site.rpc("site_session").abortSignal(AbortSignal.timeout(8_000));
        if (stopped || mine !== generation) return;
        if (result.error) throw result.error;
        if (result.data !== true) {
          replaced = true;
          closeTown();
          setState("replaced");
          // Local only: never sign the newer device out with the old device.
          await site.auth.signOut({ scope: "local" }).catch(() => { /* keep the replaced-session screen */ });
        } else setState("ready");
      } catch {
        if (!stopped && mine === generation) { closeTown(); setState("error"); }
      } finally {
        busy = false;
        if (again || mine !== generation) { again = false; schedule(); }
      }
    };
    const schedule = () => {
      clearTimeout(scheduled);
      scheduled = setTimeout(() => { void check(); }, 0);
    };
    const { data: listener } = site.auth.onAuthStateChange((event, session) => {
      // Auth callbacks must return before another auth operation is awaited.
      generation++;
      if (event === "SIGNED_OUT") closeTown();
      // SIGNED_IN can also fire when the same browser regains focus. Keep
      // that player's page mounted; clear cached identity on account changes.
      if (!replaced && (event === "SIGNED_OUT" || (userId !== null && session?.user.id !== userId))) setState("checking");
      userId = session?.user.id ?? null;
      if (!replaced) schedule();
    });
    const wake = () => { if (document.visibilityState === "visible") schedule(); };
    const timer = setInterval(() => { if (document.visibilityState === "visible") schedule(); }, 10_000);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    schedule();
    return () => {
      stopped = true;
      clearInterval(timer);
      clearTimeout(scheduled);
      listener.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [retry]);

  if (state === "ready") return children;
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center px-5">
      <div role={state === "checking" ? "status" : "alert"} className="w-full rounded-2xl border border-line bg-surface p-6 text-center text-ink">
        <p className="text-read">{state === "checking"
          ? (th ? "กำลังตรวจสอบการเข้าสู่ระบบ…" : "Checking your session…")
          : state === "replaced"
            ? (th ? "บัญชีนี้เข้าสู่ระบบจากอุปกรณ์อื่นแล้ว เครื่องนี้จึงออกจากระบบ" : "This account was signed in on another device. This device has been signed out.")
            : (th ? "ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง" : "Could not check your session. Please try again.")}</p>
        {state === "replaced" && <a href="/profile" className="mt-4 inline-block rounded-lg bg-jade px-4 py-2 text-bg no-underline">{th ? "เข้าสู่ระบบอีกครั้ง" : "Sign in again"}</a>}
        {state === "error" && <button className="mt-4 rounded-lg bg-jade px-4 py-2 text-bg" onClick={() => { setState("checking"); setRetry(n => n + 1); }}>{th ? "ลองอีกครั้ง" : "Try again"}</button>}
      </div>
    </main>
  );
}

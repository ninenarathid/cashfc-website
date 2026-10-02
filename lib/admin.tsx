"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Whether to be an admin at the moment.
 *
 * Being an admin here is permanent and being shown admin controls is not. An
 * admin browsing the gallery sees hide buttons on other people's pictures, a
 * "post for a member" box on the upload form and a page that is open to them
 * while it may be closed to everybody else — which makes them the one person who
 * cannot check what the site actually looks like to the FC.
 *
 * So the powers have a switch. Off, the site behaves as it does for an ordinary
 * verified member; on, the extra controls come back. Nothing about the database
 * changes: the row still says is_admin, every policy still trusts it, and an
 * admin with the switch off could still write whatever they liked through the
 * API. This is a view, not a permission, and it would be a poor lock — it is
 * meant for seeing, not for guarding.
 *
 * The preference is per browser rather than on the profile, because it is about
 * what somebody is doing right now and not about who they are. Defaults to on,
 * so nobody who never touches it notices it exists.
 */
interface AdminState {
  /** What the database says, whatever the switch is set to. */
  realAdmin: boolean;
  /** The switch. False means: show me what everybody else sees. */
  on: boolean;
  setOn: (v: boolean) => void;
  /** The one to ask before drawing an admin control. */
  isAdmin: boolean;
  /**
   * Whether Cash Town's door is open to this member: a proved character, or an admin (v102). Read from the same
   * row as the rest, so the dock on every page (components/town/TownDock) costs no query of its own. A view
   * like the rest of this: the town's room checks for itself.
   */
  canEnterTown: boolean;
  ready: boolean;
}

const KEY = "cashfc_admin_mode";
const AdminCtx = createContext<AdminState>({
  realAdmin: false, on: true, setOn: () => {}, isAdmin: false, canEnterTown: false, ready: false,
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [realAdmin, setRealAdmin] = useState(false);
  const [verified, setVerified] = useState(false);
  const [on, setOnState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Only an explicit "off" turns it off, so a browser that refuses storage
      // behaves exactly like one that has never been told anything.
      setOnState(window.localStorage.getItem(KEY) !== "off");
    } catch { /* private window; the default stands */ }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setReady(true); return; }
    const resolve = async (userId: string | undefined) => {
      if (!userId) { setRealAdmin(false); setVerified(false); setReady(true); return; }
      const { data } = await supabase.from("profiles")
        .select("is_admin, character_id, character_verified_at").eq("id", userId).maybeSingle();
      const p = data as { is_admin?: boolean; character_id?: number | null; character_verified_at?: string | null } | null;
      setRealAdmin(!!p?.is_admin);
      setVerified(!!p?.character_id && !!p?.character_verified_at);
      setReady(true);
    };
    void supabase.auth.getUser().then(({ data }) => resolve(data.user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e, session) => { void resolve(session?.user?.id); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setOn = useCallback((v: boolean) => {
    setOnState(v);
    try { window.localStorage.setItem(KEY, v ? "on" : "off"); } catch { /* ignore */ }
  }, []);

  return (
    <AdminCtx.Provider
      value={{ realAdmin, on, setOn, isAdmin: realAdmin && on, canEnterTown: realAdmin || verified, ready }}>
      {children}
    </AdminCtx.Provider>
  );
}

export function useAdmin(): AdminState {
  return useContext(AdminCtx);
}

"use client";

import { useLang } from "@/lib/i18n";
import { useAdmin } from "@/lib/admin";

/**
 * The switch that turns admin powers off for a while.
 *
 * An admin is the one person who cannot see the site the FC sees: hide buttons on
 * everybody's pictures, a "post for a member" box on the upload form, a gallery
 * that is open to them while it may be closed to everyone else. Turning the
 * powers off is the only honest way to check what a page actually looks like.
 *
 * It renders nothing at all for anybody who is not an admin, which is why it can
 * sit unconditionally wherever it is useful.
 */
export default function AdminSwitch({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();
  const { realAdmin, on, setOn, ready } = useAdmin();
  if (!ready || !realAdmin) return null;

  return (
    <div className={compact
      ? "flex flex-wrap items-center gap-2.5"
      : "mt-3 rounded-xl border border-chili/30 bg-chili/5 p-4"}>
      {!compact && (
        <>
          <div className="font-display font-semibold">{t("admin.modeTitle")}</div>
        </>
      )}
      <button onClick={() => setOn(!on)}
              role="switch" aria-checked={on}
              className={`${compact ? "" : "mt-2.5 "}inline-flex items-center gap-2.5 rounded-lg border px-3.5 py-1.5 text-[13px] transition-colors ${
                on ? "border-chili/60 bg-chili/10 text-chili hover:bg-chili/20"
                   : "border-line text-muted hover:border-muted hover:text-ink"}`}>
        <span aria-hidden
              className={`flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors ${
                on ? "border-chili/60 bg-chili/25" : "border-line bg-card"}`}>
          <span className={`size-2.5 rounded-full transition-transform ${
            on ? "translate-x-3.5 bg-chili" : "translate-x-0.5 bg-muted"}`} />
        </span>
        {on ? t("admin.modeOn") : t("admin.modeOff")}
      </button>
    </div>
  );
}

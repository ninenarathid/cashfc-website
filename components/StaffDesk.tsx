"use client";

import AquaContacts, { type ContactPerson } from "@/components/aqua/AquaContacts";
import { useAdmin } from "@/lib/admin";
import { useLang } from "@/lib/i18n";

/**
 * The staff page: every member's Discord and Facebook, to read (v279) and
 * to type in (v280), the same list the admins keep on Aqua's page.
 *
 * Staff are ordinary members everywhere else on the site; this is the one
 * thing more they have. The admins see the page too.
 *
 * Who may read and write the contacts is the database's to say: an account
 * that is neither staff nor admin is handed no rows and refused every save.
 * `canSeeStaff` below only decides whether to draw the list or the notice.
 */
export default function StaffDesk({ people }: { people: ContactPerson[] }) {
  const { t } = useLang();
  const { canSeeStaff, ready } = useAdmin();

  if (!ready) return null;

  if (!canSeeStaff) {
    return (
      <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
        {t("staff.denied")}
      </div>
    );
  }

  return (
    <main className="pt-7">
      <div className="font-data text-meta uppercase tracking-[0.22em] text-accent">{t("staff.eyebrow")}</div>
      <h1 className="mt-1 font-display text-lead font-semibold text-ink">{t("staff.title")}</h1>
      <p className="mt-2 max-w-prose text-read leading-relaxed text-muted">{t("staff.lead")}</p>
      <AquaContacts people={people} bare className="mt-5 rounded-xl border border-line bg-card p-3 sm:p-4" />
    </main>
  );
}

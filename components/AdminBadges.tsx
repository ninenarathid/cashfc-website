"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import AwardBadge from "@/components/ui/AwardBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import ImagePicker from "@/components/ImagePicker";
import { BADGE_COLORS, DEFAULT_BADGE_COLOR, badgeShades } from "@/lib/badge-colors";

const inputCls =
  "rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted";

interface Badge {
  id: number;
  label: string;
  label_en: string | null;
  description: string | null;
  description_en: string | null;
  icon_url: string | null;
  color: string;
}

const BADGE_COLUMNS =
  "id, label, label_en, description, description_en, icon_url, color";
interface Award {
  badge_id: number;
  character_id: number;
  note: string | null;
}

/**
 * Making badges, and handing them out.
 *
 * Two halves, in the order the job happens: a badge is a thing that exists once
 * — a name, a colour, what it is for — and giving it to somebody is a separate
 * act that can carry its own reason. Both live on one screen because the first
 * time anybody uses this they will be doing both, and a badge created on one
 * tab and awarded on another is two screens for one thought.
 */
export default function AdminBadges(
  { memberOptions, nameOf }: {
    memberOptions: { id: number; name: string }[];
    nameOf: (id: number) => string;
  },
) {
  const { t } = useLang();
  const supabase = useMemo(() => createClient(), []);

  const [badges, setBadges] = useState<Badge[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState<
    { text: string; label: string; run: () => void } | null>(null);

  // The new-badge form. Thai and English side by side rather than one behind a
  // language switch: whoever is writing the badge is writing both, and hiding
  // half of it is how the English column stays empty forever.
  const [label, setLabel] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [desc, setDesc] = useState("");
  const [descEn, setDescEn] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState(DEFAULT_BADGE_COLOR);

  // The form is one form. Editing a badge fills it in and changes what the
  // button does, rather than opening a second copy of every field somewhere
  // else on the page — two forms for one badge is two places to fix a typo.
  const [editing, setEditing] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Handing one out.
  const [openId, setOpenId] = useState<number | null>(null);
  const [pick, setPick] = useState("");
  const [note, setNote] = useState("");

  // The reason on one award, while it is being rewritten.
  const [noteEdit, setNoteEdit] =
    useState<{ badge: number; member: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const flash = (s: string) => { setMsg(s); setTimeout(() => setMsg(""), 2500); };

  const clearForm = () => {
    setEditing(null);
    setLabel(""); setLabelEn(""); setDesc(""); setDescEn("");
    setIcon(null); setColor(DEFAULT_BADGE_COLOR);
  };

  const loadForEdit = (b: Badge) => {
    setEditing(b.id);
    setLabel(b.label); setLabelEn(b.label_en ?? "");
    setDesc(b.description ?? ""); setDescEn(b.description_en ?? "");
    setIcon(b.icon_url); setColor(b.color);
    // The form is above the list, and the badge being edited can be well down
    // it — without this the button appears to do nothing.
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const refresh = async () => {
    if (!supabase) return;
    const [b, a] = await Promise.all([
      supabase.from("badges").select(BADGE_COLUMNS)
        .order("created_at", { ascending: false }),
      supabase.from("member_badges").select("badge_id, character_id, note"),
    ]);
    setBadges((b.data ?? []) as Badge[]);
    setAwards((a.data ?? []) as Award[]);
  };

  useEffect(() => { void refresh(); }, [supabase]);   // eslint-disable-line react-hooks/exhaustive-deps

  const holdersOf = (id: number) => awards.filter((a) => a.badge_id === id);

  // Whoever matches what has been typed, minus whoever already has this badge:
  // offering somebody the badge they are already wearing is an offer that can
  // only fail, and the primary key would reject it anyway.
  const suggestions = useMemo(() => {
    const q = pick.trim().toLowerCase();
    if (q.length < 2 || openId === null) return [];
    const has = new Set(awards.filter((a) => a.badge_id === openId)
      .map((a) => a.character_id));
    return memberOptions
      .filter((o) => !has.has(o.id) && o.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [pick, openId, memberOptions, awards]);

  if (!supabase) return null;

  return (
    <div className="mt-1">
      <p className="text-[12.5px] leading-relaxed text-muted">
        {t("adm.badgesHint")}
      </p>

      {/* ── Making one, or changing one ── */}
      <div ref={formRef}
           className={`mt-3 rounded-xl border bg-card p-3.5 transition-colors ${
             editing !== null ? "border-accent/60" : "border-line"}`}>
        <div className="mb-2.5 text-[12.5px] font-semibold text-accent">
          {editing !== null
            ? t("adm.badgeEditing", {
                label: badges.find((x) => x.id === editing)?.label ?? "" })
            : t("adm.badgeNew")}
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value.slice(0, 32))}
                 placeholder={t("adm.badgeLabel")}
                 className={`${inputCls} min-w-[150px] flex-1`} />
          <input value={labelEn} onChange={(e) => setLabelEn(e.target.value.slice(0, 32))}
                 placeholder={t("adm.badgeLabelEn")}
                 className={`${inputCls} min-w-[150px] flex-1`} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 160))}
                 placeholder={t("adm.badgeDesc")}
                 className={`${inputCls} min-w-[180px] flex-1`} />
          <input value={descEn} onChange={(e) => setDescEn(e.target.value.slice(0, 160))}
                 placeholder={t("adm.badgeDescEn")}
                 className={`${inputCls} min-w-[180px] flex-1`} />
        </div>

        {/* The four metals, struck rather than named. A dropdown reading
            "Bronze" asks somebody to imagine the plate; this is the plate. */}
        <div className="mt-3 flex flex-wrap gap-2">
          {BADGE_COLORS.map((c) => {
            const on = c.key === color;
            const sh = badgeShades(c.key);
            return (
              <button key={c.key} type="button"
                      onClick={() => setColor(c.key)}
                      aria-pressed={on}
                      style={{ background: sh.background, color: sh.ink,
                               borderColor: on ? "var(--color-ink)" : sh.border }}
                      className={`rounded-lg border-2 px-3 py-1.5 font-display text-[12.5px] font-bold transition-transform ${
                        on ? "scale-105" : "opacity-80 hover:scale-105 hover:opacity-100"}`}>
                {c.label}
              </button>
            );
          })}
        </div>

        {/* The picture, straight into the same bucket the posts use, under the
            same admin-only storage policy — a second bucket would be a second
            policy to keep in step for no gain. */}
        <div className="mt-3">
          <div className="mb-1.5 text-[12px] uppercase tracking-wider text-muted">
            {t("adm.badgeIcon")}
          </div>
          <ImagePicker supabase={supabase} value={icon} onChange={setIcon} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-[12px] uppercase tracking-wider text-muted">
            {t("adm.badgePreview")}
          </span>
          {/* Drawn from the form as it stands, in whichever language the admin
              is reading the site in — so the preview is the badge, not a
              rehearsal of it. */}
          <AwardBadge badge={{
            label: label.trim() || t("adm.badgeLabel"),
            label_en: labelEn.trim() || null,
            description: desc.trim() || null,
            description_en: descEn.trim() || null,
            icon_url: icon, color,
          }} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {editing !== null && (
              <button onClick={clearForm}
                      className="rounded-lg border border-line px-3 py-2 text-[13px] text-muted hover:border-muted hover:text-ink">
                {t("adm.cancel")}
              </button>
            )}
            <button
              disabled={!label.trim()}
              onClick={async () => {
                // Written the same way whichever it is: the row is the same
                // shape, and the only difference is whether it already exists.
                const row = {
                  label: label.trim(),
                  label_en: labelEn.trim() || null,
                  description: desc.trim() || null,
                  description_en: descEn.trim() || null,
                  icon_url: icon,
                  color,
                };
                const { error } = editing !== null
                  ? await supabase.from("badges").update(row).eq("id", editing)
                  : await supabase.from("badges").insert(row);
                if (error) { flash(error.message); return; }
                const wasEditing = editing !== null;
                clearForm();
                await refresh();
                flash(t(wasEditing ? "adm.badgeSaved" : "adm.badgeCreated"));
              }}
              className="rounded-lg border border-accent bg-accent/15 px-3.5 py-2 text-[13px] text-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40">
              {editing !== null ? t("adm.save") : t("adm.badgeCreate")}
            </button>
          </div>
        </div>
      </div>

      {/* ── The badges that exist, and who has them ── */}
      {badges.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted">{t("adm.badgeNone")}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {badges.map((b) => {
            const holders = holdersOf(b.id);
            const open = openId === b.id;
            return (
              <div key={b.id} className="rounded-xl border border-line bg-card p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <AwardBadge badge={b} />
                  <span className="text-[12.5px] text-muted">
                    {t("adm.badgeHolderCount", { n: holders.length })}
                  </span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button
                      onClick={() => loadForEdit(b)}
                      className={`rounded-md border px-2.5 py-1 text-[12px] ${
                        editing === b.id
                          ? "border-accent text-accent"
                          : "border-line text-muted hover:border-accent hover:text-accent"}`}>
                      {t("adm.edit")}
                    </button>
                    <button
                      onClick={() => { setOpenId(open ? null : b.id); setPick(""); setNote(""); }}
                      className="rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:border-accent hover:text-accent">
                      {open ? t("adm.badgeDone") : t("adm.badgeGive")}
                    </button>
                    <button
                      onClick={() => setConfirm({
                        text: t("adm.badgeConfirmDelete", { label: b.label, n: holders.length }),
                        label: t("adm.badgeDelete"),
                        run: async () => {
                          // The awards go with it: the foreign key cascades, so
                          // nobody is left wearing a badge that no longer exists.
                          await supabase.from("badges").delete().eq("id", b.id);
                          // Otherwise the form goes on offering to save a badge
                          // that is no longer there.
                          if (editing === b.id) clearForm();
                          setConfirm(null);
                          await refresh(); flash(t("adm.badgeDeleted"));
                        },
                      })}
                      className="rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:border-chili hover:text-chili">
                      {t("adm.badgeDelete")}
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="mt-3 border-t border-line pt-3">
                    <div className="flex flex-wrap gap-2">
                      <input value={pick} onChange={(e) => setPick(e.target.value)}
                             placeholder={t("adm.searchMember")}
                             className={`${inputCls} min-w-[160px] flex-1 py-1.5 text-[13px]`} />
                      <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 120))}
                             placeholder={t("adm.badgeNote")}
                             className={`${inputCls} min-w-[180px] flex-[2] py-1.5 text-[13px]`} />
                    </div>
                    {suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                          <button key={s.id}
                                  onClick={async () => {
                                    const { error } = await supabase.from("member_badges")
                                      .insert({ badge_id: b.id, character_id: s.id,
                                                note: note.trim() || null });
                                    if (error) { flash(error.message); return; }
                                    setPick(""); setNote("");
                                    await refresh();
                                    flash(t("adm.badgeGiven", { name: s.name }));
                                  }}
                                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] hover:border-accent hover:text-accent">
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {holders.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {holders.map((h) => (
                      <span key={h.character_id}
                            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-3 pr-1 text-[12.5px]">
                        <span className="font-data">{nameOf(h.character_id)}</span>
                        {/* The reason belongs to this award rather than to the
                            badge, so it is edited here rather than in the form
                            above — that one is about the badge itself. */}
                        {noteEdit?.badge === b.id
                         && noteEdit.member === h.character_id ? (
                          <>
                            <input autoFocus value={noteDraft}
                                   onChange={(e) => setNoteDraft(e.target.value.slice(0, 120))}
                                   onKeyDown={(e) => {
                                     if (e.key === "Escape") setNoteEdit(null);
                                   }}
                                   placeholder={t("adm.badgeNote")}
                                   className="w-48 rounded-md border border-line bg-card px-2 py-0.5 text-[12.5px] text-ink placeholder:text-muted" />
                            <button
                              onClick={async () => {
                                const { error } = await supabase.from("member_badges")
                                  .update({ note: noteDraft.trim() || null })
                                  .eq("badge_id", b.id)
                                  .eq("character_id", h.character_id);
                                if (error) { flash(error.message); return; }
                                setNoteEdit(null);
                                await refresh(); flash(t("adm.badgeNoteSaved"));
                              }}
                              className="rounded-md border border-accent/60 px-2 py-0.5 text-[11.5px] text-accent hover:bg-accent/15">
                              {t("adm.save")}
                            </button>
                            <button onClick={() => setNoteEdit(null)}
                                    className="px-1 text-[11.5px] text-muted hover:text-ink">
                              {t("adm.cancel")}
                            </button>
                          </>
                        ) : (
                          <>
                            {h.note && <span className="text-muted">— {h.note}</span>}
                            <button
                              aria-label={t("adm.badgeNoteEdit")}
                              title={t("adm.badgeNoteEdit")}
                              onClick={() => {
                                setNoteEdit({ badge: b.id, member: h.character_id });
                                setNoteDraft(h.note ?? "");
                              }}
                              className="px-1 text-muted hover:text-accent">
                              ✎
                            </button>
                          </>
                        )}
                        <button
                          aria-label={t("adm.badgeTake")}
                          title={t("adm.badgeTake")}
                          onClick={() => setConfirm({
                            text: t("adm.badgeConfirmTake", {
                              name: nameOf(h.character_id), label: b.label }),
                            label: t("adm.badgeTake"),
                            run: async () => {
                              await supabase.from("member_badges").delete()
                                .eq("badge_id", b.id).eq("character_id", h.character_id);
                              setConfirm(null);
                              await refresh(); flash(t("adm.badgeTaken"));
                            },
                          })}
                          className="rounded-full px-1.5 text-muted hover:text-chili">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {msg && <div className="mt-3 text-[13px] text-jade">{msg}</div>}

      {confirm && (
        <ConfirmDialog message={confirm.text} confirmLabel={confirm.label}
                       danger onConfirm={confirm.run} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

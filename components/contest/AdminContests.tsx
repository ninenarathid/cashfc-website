"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAdmin } from "@/lib/admin";
import { useLang, type Key } from "@/lib/i18n";
import { fmtDateTime } from "@/lib/dates";
import { syncRoster } from "@/lib/prizes";
import type { PersonOption } from "@/lib/people";
import fcIds from "@/data/fc-ids.json";
import {
  CONTEST_BUCKET, STAGE_TONE, contestPath, datesProblem, defaultDates, fromLocalInput, inPlay as lookInPlay,
  isPending, listContests, loadBoard, phaseOf, placeEntries, thumbUrl, toLocalInput,
  withdrawLook, type Board, type Contest, type Stage,
} from "@/lib/contest";
import AdminSwitch from "@/components/AdminSwitch";
import ConfirmDialog from "@/components/ConfirmDialog";
import ImagePicker from "@/components/ImagePicker";

/**
 * Where a glamour contest is set up, run and announced. Mostly Aqua's.
 *
 * Every admin, the same as the prize tab: the tables answer an admin and
 * nobody else (v98), so this only decides whether the page is worth drawing.
 *
 * Three jobs, top to bottom in the order a contest needs them: the form that
 * makes one (theme, four dates, and the switches Aqua asked to choose per
 * contest), the list of them, and for the one picked from the list, the looks
 * in it — who entered, how many popoto each has, who gave them — with the
 * special awards and the button that announces the result.
 *
 * Announcing is a button and never the clock, because the special awards are
 * Aqua's to name and nothing counts them.
 */

interface Form {
  title: string;
  title_en: string;
  body: string;
  body_en: string;
  poster_url: string | null;
  submit_opens: string;
  submit_closes: string;
  vote_opens: string;
  vote_closes: string;
  limited: boolean;
  limit: number;
  show_votes: boolean;
  fc_only: boolean;
  needs_approval: boolean;
  hide_names: boolean;
  allow_mods: boolean;
  allow_shaders: boolean;
}

function blankForm(): Form {
  const d = defaultDates();
  return {
    title: "", title_en: "", body: "", body_en: "", poster_url: null,
    submit_opens: toLocalInput(d.submit_opens_at),
    submit_closes: toLocalInput(d.submit_closes_at),
    vote_opens: toLocalInput(d.vote_opens_at),
    vote_closes: toLocalInput(d.vote_closes_at),
    limited: false, limit: 3,
    show_votes: false, fc_only: true, needs_approval: false, hide_names: false,
    allow_mods: false, allow_shaders: true,
  };
}

function formOf(c: Contest): Form {
  return {
    title: c.title, title_en: c.title_en ?? "", body: c.body ?? "", body_en: c.body_en ?? "",
    poster_url: c.poster_url,
    submit_opens: toLocalInput(c.submit_opens_at),
    submit_closes: toLocalInput(c.submit_closes_at),
    vote_opens: toLocalInput(c.vote_opens_at),
    vote_closes: toLocalInput(c.vote_closes_at),
    limited: c.vote_limit != null, limit: c.vote_limit ?? 3,
    show_votes: c.show_votes, fc_only: c.fc_only,
    needs_approval: c.needs_approval, hide_names: c.hide_names,
    allow_mods: c.allow_mods, allow_shaders: c.allow_shaders,
  };
}

const inputCls = "rounded-lg border border-line bg-card px-3 py-2 text-read text-ink placeholder:text-muted";

function Toggle({ on, onChange, label, hint }: {
  on: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)}
             className="mt-1 size-4 accent-[var(--color-accent)]" />
      <span>
        <span className="block text-read text-ink">{label}</span>
        {hint && <span className="block text-ui leading-relaxed text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export default function AdminContests({ memberOptions = [] }: { memberOptions?: PersonOption[] }) {
  const { t } = useLang();
  const { realAdmin, isAdmin, ready } = useAdmin();
  const [supabase] = useState(createClient);
  const [me, setMe] = useState<string | null>(null);
  const [list, setList] = useState<Contest[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [voters, setVoters] = useState<Map<number, string[]>>(new Map());
  const [openVoters, setOpenVoters] = useState<number | null>(null);
  const [awardEntry, setAwardEntry] = useState<number | "">("");
  const [awardLabel, setAwardLabel] = useState("");
  const [roster, setRoster] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [ask, setAsk] = useState<{ message: string; label: string; danger?: boolean; run: () => void } | null>(null);

  const names = useMemo(() => new Map(memberOptions.map((o) => [o.id, o])), [memberOptions]);
  const flash = (text: string, bad = false) => {
    setMsg({ text, bad });
    setTimeout(() => setMsg((m) => (m?.text === text ? null : m)), 4000);
  };

  const refreshList = useCallback(async () => {
    if (!supabase) return;
    setList(await listContests(supabase));
  }, [supabase]);

  const refreshBoard = useCallback(async (id: number) => {
    if (!supabase) return;
    const [b, v] = await Promise.all([
      loadBoard(supabase, id, me),
      supabase.from("contest_votes")
        .select("entry_id, profiles!contest_votes_voter_id_fkey(character_name)")
        .eq("contest_id", id),
    ]);
    setBoard(b);
    type Row = { entry_id: number; profiles?: { character_name?: string | null } | { character_name?: string | null }[] | null };
    const m = new Map<number, string[]>();
    for (const r of (v.data ?? []) as unknown as Row[]) {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const who = p?.character_name ?? "—";
      const list = m.get(r.entry_id);
      if (list) list.push(who); else m.set(r.entry_id, [who]);
    }
    setVoters(m);
  }, [supabase, me]);

  useEffect(() => {
    if (!supabase || !isAdmin) return;
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    void refreshList();
    // An FC-only contest asks the roster in the database, and nothing else
    // fills it but the admin panel. Only a write when it differs.
    void syncRoster(supabase, (fcIds as { ids: number[] }).ids).then(setRoster);
    // /admin/contest?c=12 opens that contest's looks, which is where the
    // contest page's "manage" link sends an admin.
    const c = Number(new URLSearchParams(window.location.search).get("c"));
    if (c) setSel(c);
  }, [supabase, isAdmin, refreshList]);

  useEffect(() => {
    if (sel != null && isAdmin) void refreshBoard(sel);
    else setBoard(null);
  }, [sel, isAdmin, refreshBoard]);

  if (!ready) return null;
  if (!realAdmin) {
    return (
      <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
        {t("adm.denied")}
      </div>
    );
  }
  if (!isAdmin || !supabase) {
    return (
      <main className="pt-7">
        <p className="max-w-prose text-read leading-relaxed text-muted">{t("adm.poweredOff")}</p>
        <AdminSwitch />
      </main>
    );
  }

  const selected = list.find((c) => c.id === sel) ?? null;

  async function save() {
    if (!supabase || !form) return;
    if (!form.title.trim()) { flash(t("contest.adm.errTitle"), true); return; }
    const dates = {
      submit_opens_at: fromLocalInput(form.submit_opens) ?? undefined,
      submit_closes_at: fromLocalInput(form.submit_closes) ?? undefined,
      vote_opens_at: fromLocalInput(form.vote_opens) ?? undefined,
      vote_closes_at: fromLocalInput(form.vote_closes) ?? undefined,
    };
    const bad = datesProblem(dates);
    if (bad) { flash(t(bad), true); return; }
    const row = {
      title: form.title.trim().slice(0, 120),
      title_en: form.title_en.trim().slice(0, 120) || null,
      body: form.body.trim().slice(0, 4000) || null,
      body_en: form.body_en.trim().slice(0, 4000) || null,
      poster_url: form.poster_url,
      ...dates,
      vote_limit: form.limited ? Math.min(99, Math.max(1, Math.round(form.limit) || 1)) : null,
      show_votes: form.show_votes,
      fc_only: form.fc_only,
      needs_approval: form.needs_approval,
      hide_names: form.hide_names,
      allow_mods: form.allow_mods,
      allow_shaders: form.allow_shaders,
    };
    setBusy(true);
    const res = editing != null
      ? await supabase.from("contests").update(row).eq("id", editing).select("id").single()
      : await supabase.from("contests").insert(row).select("id").single();
    setBusy(false);
    if (res.error || !res.data) {
      flash(t("contest.adm.errSave", { why: res.error?.message ?? "?" }), true);
      return;
    }
    const id = (res.data as { id: number }).id;
    if (form.fc_only && !roster) {
      setRoster(await syncRoster(supabase, (fcIds as { ids: number[] }).ids));
    }
    setForm(null); setEditing(null);
    await refreshList();
    setSel(id);
    flash(t("contest.adm.saved"));
  }

  async function update(id: number, patch: Partial<Contest>) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from("contests").update(patch).eq("id", id);
    setBusy(false);
    if (error) { flash(t("contest.adm.errSave", { why: error.message }), true); return; }
    await refreshList();
    if (sel === id) await refreshBoard(id);
  }

  /**
   * Deleting a contest takes its files too. The rows go by cascade; the
   * pictures are in the bucket under the contest's folder, one folder per
   * member below that, and a contest's worth of screenshots left behind with
   * nothing pointing at them is storage paid for every month for nothing.
   */
  async function remove(c: Contest) {
    if (!supabase) return;
    setBusy(true);
    const bucket = supabase.storage.from(CONTEST_BUCKET);
    const paths: string[] = [];
    const { data: top } = await bucket.list(String(c.id), { limit: 1000 });
    for (const f of top ?? []) {
      // A folder is listed with no id; a file sitting directly in it has one.
      if (f.id) { paths.push(`${c.id}/${f.name}`); continue; }
      const { data: files } = await bucket.list(`${c.id}/${f.name}`, { limit: 1000 });
      for (const x of files ?? []) paths.push(`${c.id}/${f.name}/${x.name}`);
    }
    const { error } = await supabase.from("contests").delete().eq("id", c.id);
    for (let i = 0; !error && i < paths.length; i += 100) {
      await bucket.remove(paths.slice(i, i + 100));
    }
    setBusy(false);
    if (error) { flash(t("contest.adm.errSave", { why: error.message }), true); return; }
    if (sel === c.id) setSel(null);
    if (editing === c.id) { setForm(null); setEditing(null); }
    await refreshList();
  }

  // Places among the looks in the running. One waiting for approval comes
  // first, because it is the one asking for something; one taken down comes
  // last. Neither has a place, so neither moves anybody else's.
  const placed = board && selected ? [
    ...board.entries.filter((e) => !e.hidden && isPending(e, selected))
      .map((entry) => ({ entry, votes: 0, place: 0 })),
    ...placeEntries(board.entries.filter((e) => lookInPlay(e, selected)), board.votes),
    ...board.entries.filter((e) => e.hidden)
      .map((entry) => ({ entry, votes: board.votes.get(entry.id) ?? 0, place: 0 })),
  ] : [];
  const waiting = board && selected
    ? board.entries.filter((e) => !e.hidden && isPending(e, selected)).length : 0;
  const whoName = (characterId: number | null, fallback?: string | null) =>
    (characterId != null ? names.get(characterId)?.name : null) ?? fallback ?? "—";
  const anyFcOnly = list.some((c) => c.fc_only && !c.announced_at);

  return (
    <main className="pt-7">
      <div className="font-data text-meta uppercase tracking-[0.22em] text-chili">Admin</div>
      <h1 className="font-display text-3xl font-bold">{t("contest.adm.title")}</h1>
      {msg && (
        <div className={`mt-2 text-read ${msg.bad ? "text-chili" : "text-jade"}`}>{msg.text}</div>
      )}

      {anyFcOnly && roster === 0 && (
        <div className="mt-3 rounded-lg border border-gold/40 bg-gold/5 px-3 py-2 text-ui leading-relaxed text-gold">
          {t("contest.adm.rosterMissing")}
        </div>
      )}

      {!form && (
        <button onClick={() => { setForm(blankForm()); setEditing(null); }}
                className="mt-4 rounded-lg border border-accent bg-accent/15 px-4 py-2 text-read text-accent hover:bg-accent/25">
          + {t("contest.adm.new")}
        </button>
      )}

      {/* ── The form ── */}
      {form && (
        <section className="mt-4 rounded-xl border border-line bg-surface p-4">
          <div className="font-display text-lead font-semibold">
            {editing != null
              ? t("contest.adm.editing", { title: list.find((c) => c.id === editing)?.title ?? "" })
              : t("contest.adm.creating")}
          </div>

          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <span className="text-ui text-muted">{t("contest.adm.titleTh")}</span>
              <input value={form.title} maxLength={120}
                     onChange={(e) => setForm({ ...form, title: e.target.value })}
                     className={inputCls} />
            </label>
            <label className="grid gap-1">
              <span className="text-ui text-muted">{t("contest.adm.titleEn")}</span>
              <input value={form.title_en} maxLength={120}
                     onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                     className={inputCls} />
            </label>
            <label className="grid gap-1">
              <span className="text-ui text-muted">{t("contest.adm.bodyTh")}</span>
              <textarea value={form.body} rows={6} maxLength={4000}
                        onChange={(e) => setForm({ ...form, body: e.target.value })}
                        className={inputCls} />
            </label>
            <label className="grid gap-1">
              <span className="text-ui text-muted">{t("contest.adm.bodyEn")}</span>
              <textarea value={form.body_en} rows={3} maxLength={4000}
                        onChange={(e) => setForm({ ...form, body_en: e.target.value })}
                        className={inputCls} />
            </label>

            <div className="grid gap-1">
              <span className="text-ui text-muted">{t("contest.adm.poster")}</span>
              <ImagePicker supabase={supabase} value={form.poster_url}
                           onChange={(url) => setForm({ ...form, poster_url: url })} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ["submit_opens", "contest.adm.submitOpens"],
                ["submit_closes", "contest.adm.submitCloses"],
                ["vote_opens", "contest.adm.voteOpens"],
                ["vote_closes", "contest.adm.voteCloses"],
              ] as const).map(([k, label]) => (
                <label key={k} className="grid gap-1">
                  <span className="text-ui text-muted">{t(label)}</span>
                  <input type="datetime-local" value={form[k]}
                         onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                         className={inputCls} />
                </label>
              ))}
            </div>
            <p className="-mt-1 text-ui leading-relaxed text-muted">{t("contest.adm.datesHint")}</p>

            <fieldset className="grid gap-2 rounded-lg border border-line p-3">
              <legend className="px-1 text-ui text-muted">{t("contest.adm.limit")}</legend>
              <label className="flex items-center gap-2 text-read text-ink">
                <input type="radio" checked={!form.limited}
                       onChange={() => setForm({ ...form, limited: false })} />
                {t("contest.adm.limitNone")}
              </label>
              <label className="flex flex-wrap items-center gap-2 text-read text-ink">
                <input type="radio" checked={form.limited}
                       onChange={() => setForm({ ...form, limited: true })} />
                {t("contest.adm.limitSome")}
                <input type="number" min={1} max={99} value={form.limit}
                       onChange={(e) => setForm({ ...form, limited: true, limit: Number(e.target.value) })}
                       className={`${inputCls} w-20 py-1`} />
                popoto
              </label>
            </fieldset>

            <div className="grid gap-2.5">
              <Toggle on={form.show_votes} onChange={(v) => setForm({ ...form, show_votes: v })}
                      label={t("contest.adm.showVotes")} hint={t("contest.adm.showVotesHint")} />
              <Toggle on={form.fc_only} onChange={(v) => setForm({ ...form, fc_only: v })}
                      label={t("contest.adm.fcOnly")} hint={t("contest.adm.fcOnlyHint")} />
              <Toggle on={form.needs_approval} onChange={(v) => setForm({ ...form, needs_approval: v })}
                      label={t("contest.adm.needsApproval")} hint={t("contest.adm.needsApprovalHint")} />
              <Toggle on={form.hide_names} onChange={(v) => setForm({ ...form, hide_names: v })}
                      label={t("contest.adm.hideNames")} hint={t("contest.adm.hideNamesHint")} />
              <Toggle on={form.allow_mods} onChange={(v) => setForm({ ...form, allow_mods: v })}
                      label={t("contest.adm.allowMods")} />
              <Toggle on={form.allow_shaders} onChange={(v) => setForm({ ...form, allow_shaders: v })}
                      label={t("contest.adm.allowShaders")} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={save} disabled={busy}
                      className="rounded-lg border border-accent bg-accent/15 px-4 py-2 text-read text-accent hover:bg-accent/25 disabled:opacity-50">
                {t("contest.adm.save")}
              </button>
              <button onClick={() => { setForm(null); setEditing(null); }} disabled={busy}
                      className="rounded-lg border border-line px-4 py-2 text-read text-muted hover:border-muted hover:text-ink disabled:opacity-40">
                {t("contest.adm.cancel")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── The contests ── */}
      <section className="mt-5 flex flex-col gap-2">
        {!list.length && (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-read text-muted">
            {t("contest.adm.empty")}
          </div>
        )}
        {list.map((c) => {
          const p = phaseOf(c);
          return (
            <div key={c.id}
                 className={`rounded-xl border bg-surface p-3 ${sel === c.id ? "border-accent" : "border-line"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setSel(sel === c.id ? null : c.id)}
                        className="text-left font-display text-lead font-semibold text-ink hover:text-accent">
                  {c.title}
                </button>
                <span className={`rounded-full border px-2 py-0.5 text-meta ${STAGE_TONE[p.stage]}`}>
                  {t(`contest.stage.${p.stage}` as Key)}
                </span>
                <span className="ml-auto font-data text-meta text-muted">
                  {fmtDateTime(c.submit_opens_at)} – {fmtDateTime(c.vote_closes_at)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button onClick={() => { setForm(formOf(c)); setEditing(c.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="rounded-md border border-line px-2.5 py-1 text-ui text-muted hover:border-accent hover:text-accent">
                  {t("contest.adm.edit")}
                </button>
                <button disabled={busy}
                        onClick={() => void update(c.id, { published_at: c.published_at ? null : new Date().toISOString() })}
                        className={`rounded-md border px-2.5 py-1 text-ui disabled:opacity-50 ${
                          c.published_at ? "border-line text-muted hover:border-chili hover:text-chili"
                                         : "border-jade/60 text-jade hover:bg-jade/10"}`}>
                  {c.published_at ? t("contest.adm.unpublish") : t("contest.adm.publish")}
                </button>
                <Link href={contestPath(c.id)}
                      className="rounded-md border border-line px-2.5 py-1 text-ui text-muted no-underline hover:border-accent hover:text-accent">
                  {t("contest.adm.view")}
                </Link>
                <button disabled={busy}
                        onClick={() => setAsk({
                          message: t("contest.adm.confirmDelete"), label: t("contest.adm.delete"),
                          danger: true, run: () => void remove(c),
                        })}
                        className="ml-auto rounded-md border border-chili/50 px-2.5 py-1 text-ui text-chili hover:bg-chili/10 disabled:opacity-50">
                  {t("contest.adm.delete")}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── One contest's looks, awards and result ── */}
      {selected && board && (
        <section className="mt-5 rounded-xl border border-accent/40 bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-display text-lead font-semibold">
              {t("contest.adm.entries", { n: board.entries.length })}
            </div>
            {waiting > 0 && (
              <span className="rounded-full border border-gold/60 bg-gold/10 px-2 py-0.5 text-meta text-gold">
                {t("contest.adm.pendingCount", { n: waiting })}
              </span>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              {selected.announced_at ? (
                <button disabled={busy}
                        onClick={() => void update(selected.id, { announced_at: null })}
                        className="rounded-lg border border-line px-3 py-1.5 text-ui text-muted hover:border-chili hover:text-chili disabled:opacity-50">
                  {t("contest.adm.unannounce")}
                </button>
              ) : (
                <button disabled={busy || !selected.published_at}
                        onClick={() => setAsk({
                          message: [
                            t("contest.adm.confirmAnnounce"),
                            phaseOf(selected).canVote ? t("contest.adm.announceEarly") : "",
                          ].filter(Boolean).join(" "),
                          label: t("contest.adm.announce"),
                          run: () => void update(selected.id, { announced_at: new Date().toISOString() }),
                        })}
                        className="rounded-lg border border-gold/60 bg-gold/10 px-3 py-1.5 text-ui text-gold hover:bg-gold/20 disabled:opacity-50">
                  {t("contest.adm.announce")}
                </button>
              )}
            </div>
          </div>

          {!board.entries.length ? (
            <p className="mt-3 text-read text-muted">{t("contest.adm.noEntries")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1.5">
              {placed.map(({ entry: e, votes, place }) => {
                const cover = board.images.get(e.id)?.[0];
                const who = voters.get(e.id) ?? [];
                const waits = !e.hidden && isPending(e, selected);
                return (
                  <li key={e.id} className={`rounded-lg border bg-card p-2 ${waits ? "border-gold/50" : "border-line"}`}>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="w-7 text-center font-data text-ui text-muted">{place || "—"}</span>
                      <span className="block size-12 shrink-0 overflow-hidden rounded-md bg-bg">
                        {cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbUrl(cover)} alt="" loading="lazy" className="size-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-data text-read text-ink">
                          {/* The number too, since that is what members call a
                              look while names are hidden. */}
                          <span className="mr-1.5 text-muted">#{e.number}</span>
                          {whoName(e.character_id, e.author_name)}
                        </span>
                        {e.caption && <span className="block truncate text-ui text-muted">{e.caption}</span>}
                      </span>
                      <span className="font-data text-read tabular-nums text-ink">{votes}</span>
                      {e.hidden && (
                        <span className="rounded-md border border-chili/60 px-1.5 py-0.5 text-meta text-chili">
                          {t("contest.hiddenByAdmin")}
                        </span>
                      )}
                      {waits && (
                        <span className="rounded-md border border-gold/60 px-1.5 py-0.5 text-meta text-gold">
                          {t("contest.pending")}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-9">
                      {waits && (
                        <button disabled={busy}
                                onClick={async () => {
                                  setBusy(true);
                                  await supabase.from("contest_entries")
                                    .update({ approved_at: new Date().toISOString() }).eq("id", e.id);
                                  setBusy(false);
                                  await refreshBoard(selected.id);
                                }}
                                className="rounded-md border border-jade/60 bg-jade/10 px-2 py-0.5 text-meta text-jade hover:bg-jade/20 disabled:opacity-50">
                          {t("contest.adm.approve")}
                        </button>
                      )}
                      <Link href={`${contestPath(selected.id)}?look=${e.id}`}
                            className="rounded-md border border-line px-2 py-0.5 text-meta text-muted no-underline hover:border-accent hover:text-accent">
                        {t("contest.adm.view")}
                      </Link>
                      <button onClick={() => setOpenVoters(openVoters === e.id ? null : e.id)}
                              className="rounded-md border border-line px-2 py-0.5 text-meta text-muted hover:border-accent hover:text-accent">
                        {t("contest.adm.voters")} ({who.length})
                      </button>
                      <button disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                await supabase.from("contest_entries").update({ hidden: !e.hidden }).eq("id", e.id);
                                setBusy(false);
                                await refreshBoard(selected.id);
                              }}
                              className="rounded-md border border-line px-2 py-0.5 text-meta text-muted hover:border-chili hover:text-chili disabled:opacity-50">
                        {e.hidden ? t("contest.adm.unhide") : t("contest.adm.hide")}
                      </button>
                      <button disabled={busy}
                              onClick={() => setAsk({
                                message: t("contest.adm.confirmRemove"), label: t("contest.adm.remove"),
                                danger: true,
                                run: async () => {
                                  setBusy(true);
                                  const bad = await withdrawLook(supabase, e.id, board.images.get(e.id) ?? []);
                                  setBusy(false);
                                  if (bad) flash(t(bad), true);
                                  await refreshBoard(selected.id);
                                },
                              })}
                              className="rounded-md border border-chili/50 px-2 py-0.5 text-meta text-chili hover:bg-chili/10 disabled:opacity-50">
                        {t("contest.adm.remove")}
                      </button>
                    </div>
                    {openVoters === e.id && (
                      <p className="mt-2 pl-9 text-ui leading-relaxed text-muted">
                        {who.length ? who.join(", ") : t("contest.adm.noVoters")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* ── Special awards ── */}
          <div className="mt-5 border-t border-line pt-4">
            <div className="font-display text-read font-semibold">{t("contest.adm.awards")}</div>
            <p className="text-ui text-muted">{t("contest.adm.awardsHint")}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {board.awards.map((a) => {
                const e = board.entries.find((x) => x.id === a.entry_id);
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-2 text-read">
                    <span className="font-semibold text-gold">{a.label}</span>
                    <span className="text-muted">→ {e ? whoName(e.character_id, e.author_name) : "—"}</span>
                    <button disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              await supabase.from("contest_awards").delete().eq("id", a.id);
                              setBusy(false);
                              await refreshBoard(selected.id);
                            }}
                            className="ml-auto rounded-md border border-line px-2 py-0.5 text-meta text-muted hover:border-chili hover:text-chili disabled:opacity-50">
                      {t("contest.adm.awardRemove")}
                    </button>
                  </li>
                );
              })}
            </ul>
            {board.entries.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <select value={awardEntry}
                        onChange={(e) => setAwardEntry(e.target.value ? Number(e.target.value) : "")}
                        className={`${inputCls} min-w-[160px] py-1.5`}>
                  <option value="">{t("contest.adm.awardPick")}</option>
                  {board.entries.filter((e) => !e.hidden).map((e) => (
                    <option key={e.id} value={e.id}>{whoName(e.character_id, e.author_name)}</option>
                  ))}
                </select>
                <input value={awardLabel} maxLength={60}
                       onChange={(e) => setAwardLabel(e.target.value)}
                       placeholder={t("contest.adm.awardLabel")}
                       className={`${inputCls} min-w-[200px] flex-1 py-1.5`} />
                <button disabled={busy || awardEntry === "" || !awardLabel.trim()}
                        onClick={async () => {
                          setBusy(true);
                          const { error } = await supabase.from("contest_awards").insert({
                            contest_id: selected.id, entry_id: awardEntry,
                            label: awardLabel.trim(), position: board.awards.length,
                          });
                          setBusy(false);
                          if (error) { flash(t("contest.adm.errSave", { why: error.message }), true); return; }
                          setAwardLabel(""); setAwardEntry("");
                          await refreshBoard(selected.id);
                        }}
                        className="rounded-lg border border-gold/60 bg-gold/10 px-3 py-1.5 text-ui text-gold hover:bg-gold/20 disabled:opacity-50">
                  {t("contest.adm.awardAdd")}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {ask && (
        <ConfirmDialog message={ask.message} confirmLabel={ask.label} danger={ask.danger}
                       onCancel={() => setAsk(null)}
                       onConfirm={() => { const run = ask.run; setAsk(null); run(); }} />
      )}
    </main>
  );
}

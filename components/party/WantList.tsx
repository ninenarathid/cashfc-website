"use client";

import { useMemo, useState } from "react";
import type { ContentDef, ContentKind, SlotRole } from "@/lib/party";
import { KIND_COLOR, KIND_ORDER, ROLE_COLOR, ROLE_LABEL } from "@/lib/party";
import type { Want } from "@/lib/wants";
import { dropWant, extendWant, postWant } from "@/lib/wants";
import type { PersonOption } from "@/lib/people";
import type { createClient } from "@/lib/supabase/client";
import { useAvatarOverrides } from "@/lib/avatars";
import { kindSay } from "@/lib/party-i18n";
import { useLang } from "@/lib/i18n";

/**
 * Who is looking, which is the half of the board that was never on it.
 *
 * Every row above this is somebody with a party offering seats. This is the
 * other side of the same market: somebody with an evening free and nothing to
 * do with it. Without it a lead building a party guesses who to ask from
 * availability grids and old logs, and the person who would have said yes the
 * moment they were asked is guessed at along with everybody else.
 *
 * Under the board rather than over it, because most visits are somebody
 * looking for a party to join and the parties are what they came for. It is
 * the lead putting one together who scrolls down here, and they are the one
 * this list is for.
 */

/**
 * How long a want has left, in the units somebody thinks in.
 *
 * Days while there are days and hours once there are not, because "0.4 days"
 * is a number nobody acts on and "9h left" is one somebody either extends or
 * lets go.
 */
function leftFor(iso: string): { key: "want.leftDays" | "want.leftHours"; n: number } | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  return hours >= 24
    ? { key: "want.leftDays", n: Math.floor(hours / 24) }
    : { key: "want.leftHours", n: Math.max(1, hours) };
}

export default function WantList(
  { wants, content, me, userId, supabase, refresh }: {
    wants: Want[];
    content: ContentDef[];
    me: PersonOption | null;
    userId: string | null;
    supabase: ReturnType<typeof createClient>;
    refresh: () => Promise<void>;
  },
) {
  const { t } = useLang();
  const overrides = useAvatarOverrides();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [kinds, setKinds] = useState<ContentKind[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [roles, setRoles] = useState<SlotRole[]>([]);
  const [note, setNote] = useState("");

  const byKey = useMemo(
    () => Object.fromEntries(content.map((c) => [c.key, c])), [content]);

  /*
   * The fights inside the one kind they picked, where there are few enough to
   * be a row of buttons. "Savage" and "M12S-1" are different asks and the
   * second is the commoner one — but a hundred and three dungeons is not a
   * choice, it is a scroll, so those stay at the kind they belong to.
   */
  const narrow = useMemo(() => {
    if (kinds.length !== 1) return [];
    const all = content.filter((c) => c.kind === kinds[0]);
    return all.length <= 12 ? all : [];
  }, [kinds, content]);

  const mine = wants.filter((w) => w.owner === userId);
  const canPost = !!me && !!userId && !mine.length;

  /**
   * What they are after, as coloured parts rather than one long line.
   *
   * The kinds carry the same colours as the chips at the top of the board, so
   * a row of them reads as the same vocabulary and not as a sentence. Named
   * fights have no colour of their own and take the accent, because a person
   * who named one has said something more specific than a category.
   */
  const asks = (w: Want): { text: string; tint?: string }[] => {
    if (w.contentKeys.length) {
      return w.contentKeys.map((k) => ({
        text: byKey[k]?.badge ?? byKey[k]?.short ?? byKey[k]?.name ?? k,
      }));
    }
    return w.kinds.length
      ? w.kinds.map((k) => ({ text: kindSay(k, t), tint: KIND_COLOR[k] }))
      : [{ text: t("want.anything") }];
  };

  const run = async (go: () => Promise<{ error?: string }>) => {
    setBusy(true);
    const r = await go();
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setErr(null);
    await refresh();
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-data text-[12.5px] uppercase tracking-[0.14em] text-muted">
          {t("want.heading", { n: wants.length })}
        </h2>
        {!wants.length && (
          <span className="text-[13.5px] text-muted">{t("want.none")}</span>
        )}
        {canPost && (
          <button onClick={() => setOpen((v) => !v)}
                  className="rounded-full border border-accent/60 px-3 py-[3px] text-[14px] text-accent transition-colors hover:bg-accent/10">
            {open ? t("pf.cancel") : t("want.post")}
          </button>
        )}
        {/* Said where the button would be, so somebody who has three does not
            go looking for a button that is deliberately not there. */}
        {!!me && userId && mine.length > 0 && !open && (
          <span className="text-[13.5px] text-muted">{t("want.capped")}</span>
        )}
      </div>

      {err && (
        <p className="rounded-lg border border-chili/50 bg-chili/10 px-3 py-2 text-[14px] text-chili">
          {err}
        </p>
      )}

      {open && canPost && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3">
          <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
            {t("want.what")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {KIND_ORDER.map((k) => {
              const on = kinds.includes(k);
              return (
                <button key={k} type="button"
                        onClick={() => { setKinds((v) => on
                          ? v.filter((x) => x !== k) : [...v, k]); setKeys([]); }}
                        style={on ? { borderColor: KIND_COLOR[k], color: KIND_COLOR[k],
                                      background: `color-mix(in srgb, ${KIND_COLOR[k]} 12%, transparent)` }
                                  : undefined}
                        className={`rounded-full border px-3 py-[3px] text-[14px] transition-colors ${
                          on ? "" : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {kindSay(k, t)}
                </button>
              );
            })}
          </div>

          {narrow.length > 0 && (
            <>
              <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
                {t("want.narrow")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {narrow.map((c) => {
                  const on = keys.includes(c.key);
                  return (
                    <button key={c.key} type="button"
                            onClick={() => setKeys((v) => on
                              ? v.filter((x) => x !== c.key) : [...v, c.key])}
                            className={`rounded-full border px-3 py-[3px] text-[14px] transition-colors ${
                              on ? "border-accent bg-accent/15 text-accent"
                                 : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                      {c.badge ?? c.short ?? c.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
            {t("want.asWhat")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(["tank", "healer", "dps"] as SlotRole[]).map((r) => {
              const on = roles.includes(r);
              return (
                <button key={r} type="button"
                        onClick={() => setRoles((v) => on
                          ? v.filter((x) => x !== r) : [...v, r])}
                        style={on ? { borderColor: ROLE_COLOR[r], color: ROLE_COLOR[r],
                                      background: `color-mix(in srgb, ${ROLE_COLOR[r]} 14%, transparent)` }
                                  : undefined}
                        className={`rounded-full border px-3 py-[3px] text-[14px] transition-colors ${
                          on ? "" : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {ROLE_LABEL[r]}
                </button>
              );
            })}
            {!roles.length && (
              <span className="self-center text-[13.5px] text-muted">
                {t("want.anyRole")}
              </span>
            )}
          </div>

          <input value={note} maxLength={80}
                 onChange={(e) => setNote(e.target.value)}
                 placeholder={t("want.noteHint")}
                 className="rounded-lg border border-line bg-bg/40 px-3 py-2 text-[15px] text-ink placeholder:text-muted" />

          {/* The hours are not asked for, because they have already been
              answered: the grid on their profile is what the matcher reads,
              and asking a second time would give the site two answers to one
              question. Said here so an empty grid is not a silent surprise. */}
          <p className="text-[13px] text-muted">{t("want.whenWhy")}</p>

          <div className="flex items-center gap-2">
            <button type="button" disabled={busy}
                    onClick={() => void run(async () => {
                      const r = await postWant(supabase!, userId!, {
                        characterId: me!.id, name: me!.name,
                        avatar: me!.avatar ?? null,
                      }, { kinds, contentKeys: keys, roles, note });
                      if (!r.error) {
                        setOpen(false);
                        setKinds([]); setKeys([]); setRoles([]); setNote("");
                      }
                      return r;
                    })}
                    className="rounded-lg border border-jade/60 bg-jade/15 px-3 py-1.5 text-[15px] text-jade hover:bg-jade/25 disabled:opacity-50">
              {t("want.postIt")}
            </button>
            <span className="text-[13px] text-muted">{t("want.twoDays")}</span>
          </div>
        </div>
      )}

      {/*
        * Nothing at all when there is nothing, rather than a box saying so.
        *
        * This sits above the parties, which is where it has to be if anybody
        * is to find it — and a six-line empty state in that position is a
        * panel of nothing between the reader and what they came for, every
        * day until somebody uses it. The heading and the button are already
        * the whole message.
        */}
      {wants.length === 0 ? null : (
        /*
         * Cards side by side, at whatever number of them.
         *
         * A want is a small fact — a face, a role, a line of what they are
         * after — and given the width of the page it was being stretched
         * across a metre of nothing to say it. Three to a row reads as a
         * noticeboard, which is what it is, and six of them are one glance
         * instead of six screens.
         *
         * The single card sits in the first column and leaves the rest empty,
         * which is honest: one person is looking, and the board should not
         * dress that up as a full row.
         */
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {wants.map((w) => {
            const face = (w.characterId != null && overrides[w.characterId])
              || w.avatar;
            const left = leftFor(w.expiresAt);
            const want = asks(w);
            // Four and a count, not seven names. Somebody who ticked half the
            // board has said "most things", and the row should take one line
            // saying it rather than four wrapping.
            const show = want.slice(0, 4);
            const rest = want.length - show.length;
            return (
              <div key={w.id}
                   className="flex gap-3 rounded-xl border border-line bg-surface px-3 py-3">
                {face
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={face} alt="" width={52} height={52}
                         className="size-[52px] shrink-0 rounded-full border border-line object-cover" />
                  : <span className="size-[52px] shrink-0 rounded-full border border-dashed border-line" />}

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[16px] text-ink">{w.name}</span>
                    {w.roles.map((r) => (
                      <span key={r}
                            style={{ color: ROLE_COLOR[r],
                                     borderColor: `color-mix(in srgb, ${ROLE_COLOR[r]} 50%, transparent)`,
                                     background: `color-mix(in srgb, ${ROLE_COLOR[r]} 10%, transparent)` }}
                            className="rounded-full border px-2 py-[1px] font-data text-[11.5px] uppercase tracking-[0.1em]">
                        {ROLE_LABEL[r]}
                      </span>
                    ))}
                    {!w.roles.length && (
                      <span className="font-data text-[11.5px] uppercase tracking-[0.1em] text-muted">
                        {t("want.anyRoleShort")}
                      </span>
                    )}
                  </div>

                  {/* What they said, said as speech, and said straight after
                      their name.
                      A note is the one part of a card written by a person to
                      other people, and it was being set in the same grey as
                      the machinery around it. Under the name is where a line
                      somebody said belongs — below the list of content it sat
                      between the facts and the buttons with nothing to attach
                      to, and the tail had nothing above it to point at. */}
                  {w.note && (
                    <p className="relative w-fit max-w-full rounded-xl border border-line bg-bg/60 px-3 py-1.5 text-[14.5px] text-ink/90
                                  before:absolute before:-top-[5px] before:left-4 before:size-2 before:rotate-45
                                  before:border-l before:border-t before:border-line before:bg-bg/60 before:content-['']">
                      {w.note}
                    </p>
                  )}

                  <p title={want.map((x) => x.text).join(" · ")}
                     className="flex flex-wrap items-center gap-x-1.5 text-[14.5px]">
                    {show.map((x, i) => (
                      <span key={x.text} style={x.tint ? { color: x.tint } : undefined}
                            className={x.tint ? "" : "text-accent"}>
                        {i > 0 && <span className="mr-1.5 text-muted opacity-50">·</span>}
                        {x.text}
                      </span>
                    ))}
                    {rest > 0 && (
                      <span className="text-muted">{t("want.andMore", { n: rest })}</span>
                    )}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {left && (
                      <span className="font-data text-[12.5px] text-muted">
                        {t(left.key, { n: left.n })}
                      </span>
                    )}
                    {w.owner === userId && (
                      <>
                        <button disabled={busy}
                                onClick={() => void run(() => extendWant(supabase!, w.id))}
                                className="rounded-lg border border-line px-2.5 py-1 text-[13.5px] text-muted transition-colors hover:border-jade hover:text-jade">
                          {t("want.extend")}
                        </button>
                        <button disabled={busy}
                                onClick={() => void run(() => dropWant(supabase!, w.id))}
                                className="rounded-lg border border-line px-2.5 py-1 text-[13.5px] text-muted transition-colors hover:border-chili hover:text-chili">
                          {t("want.withdraw")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

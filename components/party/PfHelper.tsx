"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentDef, Party } from "@/lib/party";
import type { PfExtras } from "@/lib/pf";
import {
  PF_BYTES, PURPOSE_EN, PURPOSE_JA, byteLen, pfComment, pfDefaults, pfSetup,
  planOf,
} from "@/lib/pf";
import Modal from "@/components/ui/Modal";
import { useLang } from "@/lib/i18n";

/**
 * What to type into the game's own Party Finder, for the party on screen.
 *
 * The FC plays on a Japanese data centre, so recruiting outside the FC means
 * writing Japanese into a 192-byte box — and the board already knows every
 * fact that box is supposed to contain. It was being retyped from memory, in a
 * language most of the FC does not read, every time somebody put a party up.
 *
 * Two halves, because the game's listing is two halves: the dropdowns, which
 * are read off the party and only have to be copied across by eye, and the one
 * free text box, which is what the buttons here are for. See lib/pf.
 *
 * The text stays editable. Everything below it is a starting point assembled
 * from fields somebody filled in on a website — the person about to post it is
 * the one who knows whether tonight is really like that.
 */
/**
 * Two sheets, one behind the other, and a tick once it has been taken.
 *
 * Drawn rather than typed as an emoji: 📋 is a clipboard on one platform, a
 * spiral notepad on another and a memo pad on a third, and this button has to
 * read as "copy" on a phone as well as on the desktop somebody is about to
 * alt-tab out of into the game.
 */
function CopyMark({ done }: { done: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" aria-hidden className="shrink-0">
      {done ? <path d="M20 6 9 17l-5-5" /> : (
        <>
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
        </>
      )}
    </svg>
  );
}

export default function PfHelper(
  { party, def, onClose }: {
    party: Party; def: ContentDef | undefined; onClose: () => void;
  },
) {
  const { t } = useLang();
  const [lang, setLang] = useState<"ja" | "en">("ja");
  const [x, setX] = useState<PfExtras>(() => pfDefaults(party));
  const [text, setText] = useState("");
  /** Null until they change it; after that the box is theirs, not ours. */
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const setup = useMemo(() => pfSetup(party, def), [party, def]);
  const made = useMemo(
    () => pfComment(party, x, lang), [party, x, lang]);

  /*
   * Their edit survives a tick, and dies on a language change.
   *
   * Ticking a box while a hand-written line is in the box would throw the
   * hand-written line away, which is the one thing a text area must never do.
   * Switching language cannot preserve it — the words are the other language —
   * so that one starts again, which is also what somebody switching expects.
   */
  useEffect(() => { setEdited(null); }, [lang]);
  useEffect(() => { setText(edited ?? made); }, [edited, made]);

  const bytes = byteLen(text);
  const over = bytes > PF_BYTES;

  const flip = (k: keyof PfExtras, v?: unknown) =>
    setX((o) => ({ ...o, [k]: v !== undefined ? v : !o[k] }));

  /*
   * What a switch costs, measured rather than listed.
   *
   * Built both ways and subtracted, so the number includes the separator the
   * token drags in with it and is right in whichever language is showing —
   * the first version carried a hard-coded Japanese string per switch, which
   * meant every price vanished the moment somebody pressed English.
   */
  const costOf = (k: keyof PfExtras, v: unknown) =>
    byteLen(pfComment(party, { ...x, [k]: v }, lang))
    - byteLen(pfComment(party, { ...x, [k]: undefined }, lang));

  /** One switch, with what it costs. */
  const Tick = (
    { on, say, cost, onClick }: {
      on: boolean; say: string; cost?: number; onClick: () => void;
    },
  ) => (
    <button type="button" onClick={onClick}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[14.5px] transition-colors ${
              on ? "border-accent/60 bg-accent/10 text-ink"
                 : "border-line text-muted hover:border-muted hover:text-ink"}`}>
      <span className={`grid size-4 shrink-0 place-items-center rounded border text-[11px] ${
        on ? "border-accent bg-accent/20 text-accent" : "border-line"}`}>
        {on ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1">{say}</span>
      {!!cost && cost > 0 && (
        <span className="shrink-0 font-data text-[12px] text-muted">+{cost}</span>
      )}
    </button>
  );

  const ja = lang === "ja";

  /*
   * Copying, and saying so when it cannot.
   *
   * The clipboard is refused on an insecure origin and by a browser that has
   * not been asked — and this button is the entire point of the feature, so a
   * silent failure here is the feature failing silently. The prompt is not a
   * consolation prize: the text is in front of them, selected, and Ctrl+C
   * works. Same fallback the share button has, for the same reason.
   */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt(t("pf.copyComment"), text);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Modal open onOpenChange={(v) => { if (!v) onClose(); }}
           title={t("pf.helperTitle")} subtitle={def?.name} wide>
      <div className="flex flex-col gap-4 pt-1">

        {/*
          * Said once, at the top, before anything it applies to.
          *
          * The text below is assembled from tokens copied off real listings,
          * which makes it right about the party and does not make it fluent:
          * nobody here reads the language it comes out in, and the box it
          * goes into is read by a few hundred strangers on a Japanese data
          * centre. So the honest version of this feature is one that says it
          * is a draft — and keeps saying it until somebody has posted enough
          * of them to know which lines land.
          */}
        <p className="rounded-lg border border-gold/45 bg-gold/10 px-3 py-2 text-[14.5px] text-gold">
          {t("pf.beta")}
        </p>

        {/* ── What to set in the game, which is not typed at all ────────── */}
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-3">
          <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
            {t("pf.inGameSettings")}
          </span>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[15px]">
            <dt className="text-muted">Duty</dt>
            <dd className="text-ink">
              {setup.dutyJa ?? setup.duty}
              {setup.dutyJa && (
                <span className="text-muted"> · {setup.duty}</span>
              )}
            </dd>
            <dt className="text-muted">Purpose</dt>
            <dd className="text-ink">
              {PURPOSE_JA[setup.purpose]}
              <span className="text-muted"> · {PURPOSE_EN[setup.purpose]}</span>
            </dd>
            <dt className="text-muted">Loot rules</dt>
            <dd className="text-ink">
              {setup.loot === "lootmaster" ? "Lootmaster"
                : setup.loot === "greed" ? "Greed Only" : "Normal"}
            </dd>
            {setup.onePerJob && (
              <>
                <dt className="text-muted">Condition</dt>
                <dd className="text-ink">One Player per Job</dd>
              </>
            )}
            {setup.wanted.length > 0 && (
              <>
                <dt className="text-muted">{t("pf.openSlots")}</dt>
                <dd className="text-ink">{setup.wanted.join(" · ")}</dd>
              </>
            )}
          </dl>
        </div>

        {/* ── The one box that is typed ──────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
              {t("pf.pfComment")}
            </span>
            <span className="flex gap-1">
              {(["ja", "en"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)}
                        className={`rounded-full border px-3 py-[2px] text-[14px] transition-colors ${
                          lang === l ? "border-accent bg-accent/15 text-accent"
                            : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {l === "ja" ? "日本語" : "English"}
                </button>
              ))}
            </span>
          </div>

          <textarea value={text} rows={3}
                    onChange={(e) => setEdited(e.target.value)}
                    className={`rounded-lg border bg-surface px-3 py-2 text-[15.5px] leading-relaxed text-ink ${
                      over ? "border-chili" : "border-line"}`} />

          <div className="flex flex-wrap items-center gap-2">
            {/* Bytes, not characters. The game counts the box in bytes and a
                kanji is three of them, so a counter of characters would say
                sixty and let somebody paste a line the game truncates. */}
            <span className={`font-data text-[13px] tabular-nums ${
              over ? "text-chili" : "text-muted"}`}>
              {bytes} / {PF_BYTES} bytes
            </span>
            {over && (
              <span className="text-[14px] text-chili">{t("pf.tooLong")}</span>
            )}
            <button type="button" disabled={!text}
                    onClick={() => void copy()}
                    className="ml-auto flex items-center gap-1.5 rounded-lg border border-jade/60 bg-jade/15 px-3 py-1.5 text-[15px] text-jade hover:bg-jade/25 disabled:opacity-50">
              <CopyMark done={copied} />
              {copied ? t("party.copied") : t("pf.copyComment")}
            </button>
          </div>
        </div>

        {/* ── The switches ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
            {t("pf.extras")}
          </span>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Tick on={!!x.time} say={t("pf.xTime")}
                  cost={costOf("time", true)}
                  onClick={() => flip("time")} />
            <Tick on={!!x.seats} say={t("pf.xSeats")}
                  cost={costOf("seats", true)}
                  onClick={() => flip("seats")} />
            {/*
              * Japanese only, so the switch is Japanese only.
              *
              * It used to show in English wearing a note saying it was not
              * needed — which left a switch that could be pressed and did
              * nothing, and a switch that does nothing is worse than one that
              * is not there. Somebody reading the English listing has already
              * worked out that the party writes English.
              */}
            {ja && (
              <Tick on={!!x.notFluent} say={t("pf.xNotFluent")}
                    cost={costOf("notFluent", true)}
                    onClick={() => flip("notFluent")} />
            )}
            <Tick on={!!x.plan}
                  say={t("pf.xPlan", { what: planOf(party) ?? "—" })}
                  cost={costOf("plan", true)}
                  onClick={() => flip("plan")} />
            <Tick on={x.macro === "yes"} say={t("pf.xMacroYes")}
                  cost={costOf("macro", "yes")}
                  onClick={() => flip("macro", x.macro === "yes" ? undefined : "yes")} />
            <Tick on={x.macro === "no"} say={t("pf.xMacroNo")}
                  cost={costOf("macro", "no")}
                  onClick={() => flip("macro", x.macro === "no" ? undefined : "no")} />
            <Tick on={!!x.runsRc} say={t("pf.xRunsRc")}
                  cost={costOf("runsRc", true)}
                  onClick={() => flip("runsRc")} />
            <Tick on={!!x.readyCheck} say={t("pf.xReadyCheck")}
                  cost={costOf("readyCheck", true)}
                  onClick={() => flip("readyCheck")} />
            <Tick on={!!x.firstTimers} say={t("pf.xFirstTimers")}
                  cost={costOf("firstTimers", true)}
                  onClick={() => flip("firstTimers")} />
            <Tick on={!!x.noHomework} say={t("pf.xNoHomework")}
                  cost={costOf("noHomework", true)}
                  onClick={() => flip("noHomework")} />
            <Tick on={!!x.giveUp} say={t("pf.xGiveUp")}
                  cost={costOf("giveUp", true)}
                  onClick={() => flip("giveUp")} />
            <Tick on={!!x.casual} say={t("pf.xCasual")}
                  cost={costOf("casual", true)}
                  onClick={() => flip("casual")} />
            {/* A number rather than a switch: "disband after some wipes" is
                not a thing anybody says. */}
            <label className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[14.5px] ${
              x.wipes ? "border-accent/60 bg-accent/10 text-ink"
                      : "border-line text-muted"}`}>
              <span className="min-w-0 flex-1">{t("pf.xWipes")}</span>
              <input type="number" min={0} max={20} value={x.wipes ?? ""}
                     onChange={(e) => flip("wipes", Number(e.target.value) || undefined)}
                     className="w-14 rounded border border-line bg-surface px-1.5 py-0.5 text-right text-[14.5px] text-ink" />
            </label>
          </div>
        </div>

        <p className="text-[13.5px] text-muted">{t("pf.helperWhy")}</p>
      </div>
    </Modal>
  );
}

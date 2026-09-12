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

  /** One switch, with what it will add and what that costs. */
  const Tick = (
    { on, say, adds, onClick }: {
      on: boolean; say: string; adds?: string; onClick: () => void;
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
      {adds && (
        <span className="shrink-0 font-data text-[12px] text-muted">
          +{byteLen(adds)}
        </span>
      )}
    </button>
  );

  const ja = lang === "ja";

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
                    onClick={() => {
                      void navigator.clipboard.writeText(text);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1600);
                    }}
                    className="ml-auto rounded-lg border border-jade/60 bg-jade/15 px-3 py-1.5 text-[15px] text-jade hover:bg-jade/25 disabled:opacity-50">
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
            <Tick on={!!x.time} say={t("pf.xTime")} adds={ja ? "20〜22時" : ""}
                  onClick={() => flip("time")} />
            <Tick on={!!x.seats} say={t("pf.xSeats")} adds="@ST D1"
                  onClick={() => flip("seats")} />
            <Tick on={!!x.notFluent} say={t("pf.xNotFluent")}
                  adds={ja ? "日本語が苦手です" : ""}
                  onClick={() => flip("notFluent")} />
            {/* Named after what it will actually add, which is game8 until
                somebody fills the field in. A switch labelled "strat" that
                adds nothing when pressed is a broken switch. */}
            <Tick on={!!x.plan}
                  say={t("pf.xPlan", { what: planOf(party) ?? "—" })}
                  adds={planOf(party) ?? undefined}
                  onClick={() => flip("plan")} />
            <Tick on={x.macro === "yes"} say={t("pf.xMacroYes")}
                  adds={ja ? "マクマカ○" : ""}
                  onClick={() => flip("macro", x.macro === "yes" ? undefined : "yes")} />
            <Tick on={x.macro === "no"} say={t("pf.xMacroNo")}
                  adds={ja ? "マクマカ×" : ""}
                  onClick={() => flip("macro", x.macro === "no" ? undefined : "no")} />
            <Tick on={!!x.runsRc} say={t("pf.xRunsRc")} adds="RC"
                  onClick={() => flip("runsRc")} />
            <Tick on={!!x.readyCheck} say={t("pf.xReadyCheck")}
                  adds={ja ? "開始前RC" : ""}
                  onClick={() => flip("readyCheck")} />
            <Tick on={!!x.firstTimers} say={t("pf.xFirstTimers")}
                  adds={ja ? "初見歓迎" : ""}
                  onClick={() => flip("firstTimers")} />
            <Tick on={!!x.noHomework} say={t("pf.xNoHomework")}
                  adds={ja ? "未予習OK" : ""}
                  onClick={() => flip("noHomework")} />
            <Tick on={!!x.giveUp} say={t("pf.xGiveUp")} adds={ja ? "ギブ解散" : ""}
                  onClick={() => flip("giveUp")} />
            <Tick on={!!x.casual} say={t("pf.xCasual")}
                  adds={ja ? "お気軽にどうぞ" : ""}
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

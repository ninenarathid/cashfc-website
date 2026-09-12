import type { ContentDef, Party } from "@/lib/party";
import { endsAt, openSeats, slotsOf } from "@/lib/party";
import { phasesOf } from "@/lib/phases";
import dutyJa from "@/data/duty-ja.json";

/**
 * What to put in the game's own Party Finder, worked out from the listing.
 *
 * The FC is on Tonberry, which is Elemental, which is a Japanese data centre —
 * so the people who read our in-game recruitment are, mostly, Japanese. That
 * is the whole reason this exists. Everything the board already knows about a
 * party is exactly what a Japanese listing is expected to say, and it was
 * being retyped from memory into a 192-byte box by somebody who does not read
 * the language.
 *
 * Two halves, because the game's listing is two halves:
 *
 *   the settings   duty, purpose, loot rule, which slots to open. Dropdowns.
 *                  The [Practice] and [One Player per Job] tags every listing
 *                  carries are these, rendered by the game — typing them into
 *                  the comment says everything twice.
 *   the comment    one free box, 192 bytes, two lines.
 *
 * Assembled, never translated. Every Japanese string here is a fixed token
 * taken from listings on the board, mapped from a field the party already
 * filled in — so the output is as correct as the party is, and a note written
 * in Thai stays out of it entirely rather than going through a translator
 * nobody can check.
 */

/** The game counts the box in bytes, and a kanji is three of them. */
export const byteLen = (s: string): number =>
  new TextEncoder().encode(s).length;

/** What the box holds. Measured in the game: 192 bytes, two lines. */
export const PF_BYTES = 192;

/* ── the settings half ────────────────────────────────────────────────────── */

export type PfPurpose = "practice" | "completion" | "loot";

export interface PfSetup {
  /** The duty to pick, in both languages, since the client may be either. */
  duty: string;
  dutyJa?: string;
  purpose: PfPurpose;
  /** The game's own loot rule. */
  loot: "normal" | "greed" | "lootmaster";
  /** Whether to tick "One Player per Job". */
  onePerJob: boolean;
  /** The seats still to fill, in party-list order. */
  wanted: string[];
}

export const PURPOSE_JA: Record<PfPurpose, string> = {
  practice: "練習", completion: "クリア目的", loot: "戦利品目当て",
};
export const PURPOSE_EN: Record<PfPurpose, string> = {
  practice: "Practice", completion: "Duty Completion", loot: "Loot",
};

export function pfSetup(p: Party, def: ContentDef | undefined): PfSetup {
  const at = p.progress?.at ?? "fresh";
  return {
    duty: def?.duty ?? def?.name ?? "",
    dutyJa: (dutyJa as Record<string, string>)[p.contentKey],
    // Practice while anything is still being learned, the clear once it is
    // known, and loot once it dies — which is the same ladder the site's own
    // progress track is, said in the game's three words.
    purpose: at === "farm" ? "loot" : at === "a2c" ? "completion" : "practice",
    loot: p.loot?.rule === "merc" || p.loot?.rule === "owner"
      ? "lootmaster" : p.loot?.rule === "book" ? "greed" : "normal",
    onePerJob: !!p.oneOfEachJob,
    wanted: openSeats(p).map((s) => s.label),
  };
}

/* ── the comment half ─────────────────────────────────────────────────────── */

/**
 * The extras, each a line somebody ticks on.
 *
 * Everything here is optional and everything here costs bytes, which is why
 * they are switches rather than a fixed template: 192 bytes is about sixty
 * Japanese characters, and a listing that says eight things says none of them.
 */
export interface PfExtras {
  /** 開始前RC — a ready check before the pull. */
  readyCheck?: boolean;
  /** 1周RC — a ready check between runs, so people can drop out cleanly. */
  runsRc?: boolean;
  /** 日本語が苦手です. */
  notFluent?: boolean;
  /** 初見歓迎. */
  firstTimers?: boolean;
  /** 未予習OK. */
  noHomework?: boolean;
  /** マクマカ○ / マクマカ×, or nothing said. */
  macro?: "yes" | "no";
  /** Whether to print progress.plan — game8 and the like. */
  plan?: boolean;
  /** N滅解散 — how many wipes before the night is called. */
  wipes?: number;
  /** ギブ解散. */
  giveUp?: boolean;
  /** お気軽にどうぞ. */
  casual?: boolean;
  /** The clock, in the game's timezone rather than ours. */
  time?: boolean;
  /** @ST D1 — which seats are being recruited for. */
  seats?: boolean;
}

/** What a party starts with ticked: the things nearly every listing says. */
export function pfDefaults(p: Party): PfExtras {
  return {
    time: true,
    seats: true,
    plan: true,
    notFluent: true,
    runsRc: p.lengthUnit === "runs" && (p.runs ?? 0) > 1,
    firstTimers: p.progress?.at === "fresh",
  };
}

/** The clock the listing is read on, which is the game's, which is Tokyo. */
function jst(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}

/**
 * The hours, twice: once as a Japanese listing writes them and once plainly.
 *
 * 「20〜22時」 drops the minutes when there are none and the leading zero
 * always, which is how every listing on the board writes a time and is four
 * bytes shorter than not doing it. The English keeps the colon and says which
 * clock it is on, because the one thing a Thai FC on a Japanese data centre
 * must never be vague about is whose evening it is.
 */
function span(p: Party): { ja: string; en: string } {
  const at = [jst(p.startsAt), jst(endsAt(p))];
  const loose = at.map((s) => (s.endsWith(":00") ? s.slice(0, 2) : s))
    .map((s) => s.replace(/^0/, ""));
  return { ja: `${loose[0]}〜${loose[1]}時`, en: `${at[0]}-${at[1]} JST` };
}

/**
 * Only where it will be read.
 *
 * A mechanic typed in Thai is the party talking to the FC, and it goes in the
 * note on the website where the FC will read it. The game does not draw Thai
 * at all, so pasting it into the box spends bytes on rectangles — Latin and
 * Japanese both render, and anything else is left out rather than printed
 * broken.
 */
const renderable = (s: string | undefined): string | null => {
  const v = s?.trim();
  return v && /^[ -~　-ヿ㐀-鿿＀-￯]+$/.test(v)
    ? v : null;
};

/** What a listing says about its strategy when nobody has said otherwise. */
export const DEFAULT_PLAN = "game8";

/**
 * Whose strategy, which is game8 unless the party said something else.
 *
 * Nine listings in ten on the Japanese board name game8, and a party that has
 * not filled the field in is likelier to be using it than to be using nothing
 * — so the switch has something to add on a party nobody has edited since the
 * field existed, which is every party on the board today. A switch labelled
 * "strat" that adds nothing when pressed is a broken switch.
 *
 * A name the game cannot draw is left out rather than replaced. "We are on
 * game8" is a claim, and printing it over what somebody actually typed would
 * be the board making that claim on their behalf.
 */
export function planOf(p: Party): string | null {
  const said = p.progress?.plan?.trim();
  return said ? renderable(said) : DEFAULT_PLAN;
}

const LOOT_JA: Record<string, string> = {
  ffa: "フリロ", ltr: "取り抜け", book: "断章", merc: "代行", owner: "主取り",
};
const LOOT_EN: Record<string, string> = {
  ffa: "free lot", ltr: "take and leave", book: "book run",
  merc: "carry", owner: "map owner keeps",
};

/** The phase, as the fight's own list numbers it. */
function phaseBit(p: Party): string | null {
  const n = p.progress?.phase;
  if (!n) return null;
  return /^\d/.test(n) ? `P${n}` : (phasesOf(p.contentKey)
    .find((x) => x.n === n)?.name ?? n);
}

/**
 * The listing, as a row of tags rather than a sentence.
 *
 * Which is how the board reads: nobody writes prose in 192 bytes, and every
 * real listing is "what we are doing, when, on whose macro, what happens to
 * the loot, who we still need". Separated by the full-width space the Japanese
 * board uses, because that is what it uses.
 */
export function pfComment(
  p: Party, x: PfExtras, lang: "ja" | "en",
): string {
  const ja = lang === "ja";
  const at = p.progress?.at ?? "fresh";
  const phase = phaseBit(p);
  const bits: string[] = [];

  // What tonight is for, with the phase in front of it where there is one.
  const doing = at === "fresh" ? (ja ? "最初から" : "from the start")
    : at === "farm" ? (p.lengthUnit === "runs" && p.runs
        ? (ja ? `${p.runs}周` : `${p.runs} runs`) : (ja ? "周回" : "farm"))
    : at === "a2c" ? (ja ? "クリ目" : "clear attempt")
    : (ja ? "練習" : "prog");
  bits.push(phase && at !== "farm"
    ? (ja ? `${phase}${doing}` : `${phase} ${doing}`) : doing);

  // What is being drilled, but only where it is in an alphabet the reader has.
  const mech = renderable(p.progress?.mech);
  if (mech) bits.push(mech);

  if (x.runsRc) bits.push(ja ? "RC" : "ready check between runs");

  if (x.time) bits.push(ja ? span(p).ja : span(p).en);

  if (x.macro) {
    bits.push(ja ? (x.macro === "yes" ? "マクマカ○" : "マクマカ×")
      : (x.macro === "yes" ? "macros+markers" : "no macros"));
  }

  const plan = x.plan ? planOf(p) : null;
  if (plan) bits.push(ja ? plan : `${plan} strat`);

  const rule = p.loot?.rule;
  if (rule) bits.push(ja ? LOOT_JA[rule] : LOOT_EN[rule]);

  /*
   * Which seats, with the @ the board already uses for it.
   *
   * The other convention is 〆 on the seats that are taken, which says the
   * same thing backwards and gets longer as the party fills — five names to
   * say that three chairs are open. This one is shortest exactly when the
   * party is nearly full, which is when somebody is most likely to be reading.
   */
  if (x.seats) {
    const want = openSeats(p).filter((s) => !s.free).map((s) => s.label);
    if (want.length && want.length < slotsOf(p.shape).length) {
      bits.push(ja ? `@${want.join(" ")}` : `need ${want.join("/")}`);
    }
  }

  if (x.firstTimers) bits.push(ja ? "初見歓迎" : "first-timers welcome");
  if (x.noHomework) bits.push(ja ? "未予習OK" : "no homework needed");
  if (x.wipes) bits.push(ja ? `${x.wipes}滅解散` : `disband after ${x.wipes} wipes`);
  if (x.giveUp) bits.push(ja ? "ギブ解散" : "disband on give-up");
  if (x.readyCheck) bits.push(ja ? "開始前RC" : "ready check before start");
  if (x.casual) bits.push(ja ? "お気軽にどうぞ" : "casuals welcome");
  /*
   * Last, because it is about us rather than about the evening — and because
   * it is the line somebody should still see if the rest has been trimmed.
   *
   * Japanese only, and not as a default that can be overridden: somebody
   * reading the English listing has already worked out that the party writes
   * English, so the sentence answers a question they were never going to ask
   * and spends bytes doing it. It is a thing to say to the people it
   * inconveniences, in the language it inconveniences them in.
   */
  if (x.notFluent && ja) bits.push("日本語が苦手です");

  return bits.join(ja ? "　" : ", ");
}

/**
 * The phases of a fight, in order, for the parties that talk in phases.
 *
 * ProgressTrack has carried `phase` since it was written and has never offered
 * it, because a number on its own asks every party to invent its own
 * numbering: two groups on the same fight disagreeing about whether it has four
 * phases or five, on a board whose whole job is to make them understand each
 * other. This is the list that settles it, so the number means the same thing
 * to everybody who reads it.
 *
 * Ultimates only. A savage tier is one boss per fight and a party drilling the
 * third mechanic of M11S says so in words; an ultimate is four to seven
 * encounters stitched together and "P3" is the unit everybody already thinks
 * in — including the Japanese Party Finder, where a listing that does not lead
 * with a phase number is a listing nobody can judge.
 *
 * Hand-written, like the extreme trials in duties.ts, and for the same reason:
 * no API has it. The English names are the boss or section each phase is
 * called after, which is how English-speaking guides index them; the Japanese
 * column exists because the party finder this feeds is on a Japanese data
 * centre, and 「絶アレキ P2」 with the wrong name beside it is worse than no
 * name at all.
 *
 * A fight missing from here still works. The phase control simply offers no
 * suggestions and the party types what it likes, which is what every party did
 * before this file existed.
 */

export interface Phase {
  /** What goes in front: "1", "2", or "Door" for a boss before the count. */
  n: string;
  /** The boss or section, as the guides index it. */
  name: string;
  /** As the Japanese community says it, where it says it differently. */
  ja?: string;
}

/**
 * Keyed by the content key the catalogue builds, so a rename of the duty
 * cannot silently detach the phases from the fight they belong to.
 */
export const PHASES: Record<string, Phase[]> = {
  // Five, and the fourth is the adds reprise rather than a new boss — which is
  // exactly why the list is worth writing down: a party that calls Golden
  // Bahamut "P4" and one that calls it "P5" are not talking about the same
  // night.
  "ult:The Unending Coil of Bahamut": [
    { n: "1", name: "Twintania", ja: "ツインタニア" },
    { n: "2", name: "Nael deus Darnus", ja: "ネール" },
    { n: "3", name: "Bahamut Prime", ja: "バハムート" },
    { n: "4", name: "Twintania and Nael", ja: "ツイン&ネール" },
    { n: "5", name: "Golden Bahamut", ja: "金バハ" },
  ],
  "ult:The Weapon's Refrain": [
    { n: "1", name: "Garuda", ja: "ガルーダ" },
    { n: "2", name: "Ifrit", ja: "イフリート" },
    { n: "3", name: "Titan", ja: "タイタン" },
    { n: "4", name: "Lahabrea", ja: "ラハブレア" },
    { n: "5", name: "Ultima", ja: "アルテマ" },
  ],
  "ult:The Epic of Alexander": [
    { n: "1", name: "Living Liquid", ja: "リビングリキッド" },
    { n: "2", name: "Limit Cut", ja: "リミットカット" },
    { n: "3", name: "Alexander Prime", ja: "アレキプライム" },
    { n: "4", name: "Perfect Alexander", ja: "パーフェクトアレキサンダー" },
  ],
  // The one fight with something before P1. The Vault is a boss you clear on
  // the way in, and a party saying "we are on the door boss" is saying
  // something true that no number covers.
  "ult:Dragonsong's Reprise": [
    { n: "Door", name: "The Vault", ja: "ドア" },
    { n: "1", name: "Thordan I", ja: "トールダン1" },
    { n: "2", name: "Nidhogg", ja: "ニーズヘッグ" },
    { n: "3", name: "Eyes", ja: "双竜" },
    { n: "4", name: "Intermission / Rewind", ja: "履行" },
    { n: "5", name: "Dark Thordan", ja: "闇トールダン" },
    { n: "6", name: "Double Dragons", ja: "双竜戦" },
    { n: "7", name: "Dragon-king Thordan", ja: "竜王トールダン" },
  ],
  "ult:The Omega Protocol": [
    { n: "1", name: "Beetle Omega", ja: "ビートル" },
    { n: "2", name: "Omega-M and Omega-F", ja: "M&F" },
    { n: "3", name: "Omega Reconfigured", ja: "再構築" },
    { n: "4", name: "Blue Screen", ja: "ブルースクリーン" },
    { n: "5", name: "Run: Dynamis", ja: "デルタ/シグマ/オメガ" },
    { n: "6", name: "Alpha Omega", ja: "アルファオメガ" },
  ],
  "ult:Futures Rewritten": [
    { n: "1", name: "Fatebreaker", ja: "フェイトブレイカー" },
    { n: "2", name: "Usurper of Frost", ja: "シヴァ" },
    { n: "3", name: "Oracle of Darkness", ja: "闇の巫女" },
    { n: "4", name: "Enter the Dragon", ja: "竜詩" },
    { n: "5", name: "Pandora", ja: "パンドラ" },
  ],
  "ult:Dancing Mad": [
    { n: "1", name: "Kefka", ja: "ケフカ" },
    { n: "2", name: "Forsaken Kefka", ja: "見放されしケフカ" },
    { n: "3", name: "Exdeath and Chaos", ja: "エクスデス&ケイオス" },
    { n: "4", name: "Kefka Says", ja: "ケフカ・セイ" },
    { n: "5", name: "Ultima Kefka", ja: "アルテマケフカ" },
  ],
};

/** The phases of this fight, or nothing where nobody has written them down. */
export const phasesOf = (key: string | undefined): Phase[] =>
  (key && PHASES[key]) || [];

/** "P3", or "Door" — what goes in front of the mechanic being drilled. */
export function phaseLabel(key: string | undefined, n: string | undefined) {
  if (!n) return null;
  const p = phasesOf(key).find((x) => x.n === n);
  // A number with no table behind it is still a number the party meant.
  return /^\d/.test(n) ? `P${n}` : (p?.name ?? n);
}

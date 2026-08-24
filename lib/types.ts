export interface Nameday { text: string | null; month: number | null; day: number | null }

export interface Member {
  id: number;
  name: string;
  rank: string | null;
  level: number | null;
  avatar: string | null;
  portrait?: string | null;
  tags: string[];
  parse: number | null;
  savage_kills: number;
  ult_clears: number;
  current_clears?: boolean[] | null;
  mounts: number | null;
  minions: number | null;
  rare_achv: number | null;
  craft_achv?: number | null;
  pvp_achv?: number | null;
  ach_public: boolean | null;
  fflogs: string;
  nameday?: Nameday | null;
}

export interface RaidEncounter {
  label: string | null; name: string | null;
  best: number | null; median: number | null;
  kills: number; job: string | null;
}
export interface RaidZone {
  zone: string; zone_id: number; expansion?: string | null;
  encounters: RaidEncounter[]; clears?: boolean[];
}
export interface UltimateEntry {
  zone: string; zone_id: number; expansion?: string | null;
  best: number | null; kills: number; job: string | null; cleared: boolean;
}
export interface MemberRaids {
  current?: RaidZone;
  ultimates?: UltimateEntry[];
  legacy?: RaidZone[];
  _status?: string;
}

export interface BoardData {
  generated_at: string;
  fc: { name: string; id: string; world: string; dc: string;
        total: number; region?: string };
  current_tier?: { labels: string[]; zone?: { name?: string } | null };
  members: Member[];
}

export interface FeedEvent { date: string; type: string; id: number; name: string; text: string }
export interface NewsItem { title: string; url: string; date: string | null }
export interface HistoryRow {
  date: string; total: number; raider: number; ultimate: number;
  collector: number; unknown: number; final_boss: number;
}
export interface Overlay {
  bio: string | null; job: string | null; accent: string | null;
  discord: string | null; lfg?: string[] | null; banner?: string | null;
}

export const LFG_OPTIONS = [
  { key: "static", label: "หา static" },
  { key: "mentor", label: "รับสอน" },
  { key: "craft", label: "รับงาน craft" },
  { key: "friends", label: "หาเพื่อนเล่น" },
] as const;

export const RANK_ORDER = [
  "Dishwasher", "Sous Chef", "Chef de Cuisine", "Chief de popoto",
  "Food Raider", "Chef Toumant", "Taster", "Table Cat", "On vacation",
];

"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type Lang = "th" | "en";
export const LANGS: { key: Lang; label: string; short: string }[] = [
  { key: "th", label: "ภาษาไทย", short: "ไทย" },
  { key: "en", label: "English", short: "EN" },
];

const STORAGE_KEY = "fc_lang";

/**
 * What stays in English, always.
 *
 * Job names, tag labels, grades and the vocabulary of the game itself — parse,
 * log, savage, extreme, achievement, mount, Lodestone, FF Logs. These are what
 * the FC actually says out loud, and a Thai rendering of "Legendary Crafter" or
 * "parse" would be a translation nobody asked for and nobody uses. The dictionary
 * below therefore covers the site's own furniture: headings, buttons, empty
 * states, explanations.
 */
type Entry = { en: string; th: string };

const DICT = {
  // ── Navigation and account ──────────────────────────────────────────
  "nav.home": { en: "Home", th: "หน้าแรก" },
  "nav.members": { en: "Members", th: "สมาชิก" },
  "nav.leaderboards": { en: "Leaderboards", th: "อันดับ" },
  "nav.signIn": { en: "Sign in", th: "เข้าสู่ระบบ" },
  "nav.signOut": { en: "Sign out", th: "ออกจากระบบ" },
  "nav.profile": { en: "My profile", th: "โปรไฟล์ของฉัน" },
  "nav.admin": { en: "Admin panel", th: "หน้าผู้ดูแล" },
  "nav.language": { en: "Language", th: "ภาษา" },

  // ── Home ────────────────────────────────────────────────────────────
  "home.freeCompany": { en: "Free Company", th: "Free Company" },
  "home.browseAll": { en: "Browse all {n} members", th: "ดูสมาชิกทั้งหมด {n} คน" },
  "home.members": { en: "Members", th: "สมาชิก" },
  "home.active": { en: "Active", th: "ยัง Active" },
  "home.activity": { en: "FC activity", th: "ความเคลื่อนไหวใน FC" },
  "home.activityEmpty": {
    en: "Events start showing up after the next update run. The pipeline diffs the roster day over day, so new best parses, first boss clears and fresh mounts land here automatically.",
    th: "รายการจะเริ่มขึ้นหลังระบบดึงข้อมูลรอบถัดไป ระบบจะเทียบข้อมูลของแต่ละวัน แล้วเอา parse ใหม่ การเคลียร์บอสครั้งแรก และ mount ที่เพิ่งได้ มาขึ้นตรงนี้ให้เอง",
  },
  "home.timeline": { en: "Update timeline", th: "ไทม์ไลน์อัปเดต" },
  "home.timelineOfficial": { en: "Official", th: "ข่าวทางการ" },
  "home.timelineFc": { en: "FC", th: "ข่าว FC" },
  "home.postedByFc": { en: "Posted by the FC", th: "โพสต์โดย FC" },
  "home.announcements": { en: "FC announcements", th: "ประกาศจาก FC" },
  "home.birthdays": { en: "Birthdays today", th: "วันเกิดวันนี้" },

  // ── Member board ────────────────────────────────────────────────────
  "board.title": { en: "Members", th: "สมาชิก" },
  "board.verifiedHint": {
    en: "✦ = proved they own the character · click a name for the full profile",
    th: "✦ = ยืนยันแล้วว่าเป็นเจ้าของตัวละคร · กดที่ชื่อเพื่อดูโปรไฟล์เต็ม",
  },
  "board.search": { en: "Search name, nickname or race…", th: "ค้นหาชื่อ ชื่อเล่น หรือเผ่า…" },
  "board.sortName": { en: "Sort by name", th: "เรียงตามชื่อ" },
  "board.sortMounts": { en: "Sort by mounts", th: "เรียงตามจำนวน mount" },
  "board.sortRare": { en: "Sort by rare achv", th: "เรียงตาม achievement หายาก" },
  "board.clearAll": { en: "Clear all {n} filters", th: "ล้าง filter ทั้ง {n} อัน" },
  "board.who": { en: "Who", th: "ใคร" },
  "board.hasAllOf": { en: "Has all of", th: "มีครบทุกอันนี้" },
  "board.roleAny": { en: "Role: any", th: "Role: ทั้งหมด" },
  "board.jobAny": { en: "Job: any", th: "อาชีพ: ทั้งหมด" },
  "board.gradeAny": { en: "Grade: any", th: "ระดับ: ทั้งหมด" },
  "board.raceAny": { en: "Race: any ({n})", th: "เผ่า: ทั้งหมด ({n})" },
  "board.rankAny": { en: "Rank: any", th: "ยศ: ทั้งหมด" },
  "board.lfgAny": { en: "Looking for: any", th: "กำลังหา: ทั้งหมด" },
  "board.anyHealer": { en: "Any healer", th: "Healer ทุกแบบ" },
  "board.anyDps": { en: "Any DPS", th: "DPS ทุกแบบ" },
  "board.anyTank": { en: "Any tank", th: "Tank ทุกแบบ" },
  "board.showing": { en: "Showing {shown} of {total} members", th: "แสดง {shown} จาก {total} คน" },
  "board.showingActive": {
    en: "Showing {shown} active of {total} members",
    th: "แสดง {shown} คนที่ Active จาก {total} คน",
  },
  "board.showingVacation": {
    en: "Showing {shown} on-vacation of {total} members",
    th: "แสดง {shown} คนที่พักอยู่ จาก {total} คน",
  },
  "board.showEveryone": { en: "show everyone", th: "แสดงทุกคน" },
  "board.nobody": { en: "Nobody matches that", th: "ไม่มีใครตรงกับที่ค้นหา" },
  "board.activeAll": { en: "Everyone", th: "ทุกคน" },
  "board.activeActive": { en: "Active", th: "Active" },
  "board.activeVacation": { en: "On vacation", th: "พักอยู่" },
  "board.tagsMean": { en: "What do the tags mean?", th: "แต่ละ tag หมายความว่าอะไร?" },

  // ── Member page ─────────────────────────────────────────────────────
  "member.back": { en: "Back to members", th: "กลับไปหน้าสมาชิก" },
  "member.currentPatch": { en: "Current patch", th: "Patch ปัจจุบัน" },
  "member.extremeTrials": { en: "Extreme trials", th: "Extreme trials" },
  "member.clearedCount": { en: "({done} of {total} cleared)", th: "(เคลียร์แล้ว {done} จาก {total})" },
  "member.cleared": { en: "Cleared", th: "เคลียร์แล้ว" },
  "member.noLogYet": { en: "No log yet", th: "ยังไม่มี log" },
  "member.awaitingData": { en: "Awaiting data", th: "รอข้อมูล" },
  "member.kills": { en: "{n} kills", th: "ฆ่า {n} ครั้ง" },
  "member.collection": { en: "Collection", th: "ของสะสม" },
  "member.mounts": { en: "Mounts", th: "Mounts" },
  "member.minions": { en: "Minions", th: "Minions" },
  "member.rareAchv": { en: "Rare achv", th: "Achievement หายาก" },
  "member.higherThan": { en: "Higher than {n}% of the FC", th: "สูงกว่า {n}% ของ FC" },
  "member.ultimates": { en: "Ultimates", th: "Ultimates" },
  "member.jobs": { en: "Jobs", th: "อาชีพ" },
  "member.notLinked": {
    en: "Not linked to FF Logs yet — raid data appears automatically once the API keys are set and the pipeline runs",
    th: "ยังไม่ได้เชื่อมกับ FF Logs — ข้อมูล raid จะขึ้นเองเมื่อระบบดึงข้อมูลรอบถัดไป",
  },
  "member.rarest": { en: "Rarest achievements", th: "Achievement ที่หายากที่สุด" },
  "member.rarestHint": {
    en: "({n} shown, rarest first · the chip names the playstyle it counts toward)",
    th: "(แสดง {n} อัน เรียงจากหายากที่สุด · ป้ายสีบอกว่านับเข้าสายไหน)",
  },
  "member.showAll": { en: "Show all {n}", th: "แสดงทั้งหมด {n} อัน" },
  "member.showFewer": { en: "Show fewer", th: "แสดงน้อยลง" },

  // ── Profile ─────────────────────────────────────────────────────────
  "profile.title": { en: "My profile", th: "โปรไฟล์ของฉัน" },
  "profile.waysToSignIn": { en: "Ways to sign in", th: "ช่องทางเข้าสู่ระบบ" },
  "profile.waysHint": {
    en: "Link a second one and either will get you back to this same profile. Worth doing before you need it.",
    th: "ผูกช่องทางที่สองไว้ แล้วจะเข้าด้วยทางไหนก็ได้ กลับมาที่โปรไฟล์เดียวกัน ควรทำไว้ก่อนที่จะต้องใช้",
  },
  "profile.link": { en: "Link {name}", th: "ผูก {name}" },
  "profile.myCharacter": { en: "My character", th: "ตัวละครของฉัน" },
  "profile.viewMyPage": { en: "View my page", th: "ดูหน้าของฉัน" },
  "profile.unlink": { en: "Unlink", th: "ยกเลิกการผูก" },
  "profile.customise": { en: "Customise profile", th: "ปรับแต่งโปรไฟล์" },
  "profile.nickname": { en: "Nickname", th: "ชื่อเล่น" },
  "profile.birthday": { en: "Birthday (day and month only)", th: "วันเกิด (เอาแค่วันกับเดือน)" },
  "profile.clear": { en: "clear", th: "ล้าง" },
  "profile.bio": { en: "About me", th: "เกี่ยวกับฉัน" },
  "profile.accent": { en: "Accent colour", th: "สีประจำตัว" },
  "profile.banner": { en: "Profile banner", th: "แบนเนอร์โปรไฟล์" },
  "profile.lookingFor": { en: "Looking for", th: "กำลังมองหา" },
  "profile.availability": { en: "When I usually play", th: "ช่วงที่ปกติว่างเล่น" },
  "profile.availabilityHint": {
    en: "Tap the blocks you are usually around for. Times are Thai time. Tap a day or a block heading to fill the whole row or column at once — nothing here is a promise, it just saves everybody asking.",
    th: "กดเลือกช่วงที่ปกติว่าง เวลาไทย กดที่ชื่อวันหรือชื่อช่วงเพื่อเลือกทั้งแถวหรือทั้งคอลัมน์ทีเดียว ไม่ใช่การนัดหมาย แค่ให้คนอื่นไม่ต้องมาถามทีละคน",
  },
  "profile.availabilityClear": { en: "Clear all", th: "ล้างทั้งหมด" },
  "member.availability": { en: "Usually around", th: "ปกติว่างช่วงนี้" },
  "member.availabilityNote": { en: "Thai time", th: "เวลาไทย" },
  "profile.save": { en: "Save", th: "บันทึก" },
  "profile.saving": { en: "Saving…", th: "กำลังบันทึก…" },
  "profile.saved": {
    en: "Saved — your profile and the board update immediately",
    th: "บันทึกแล้ว — โปรไฟล์กับหน้าสมาชิกอัปเดตทันที",
  },
  "profile.language": { en: "Site language", th: "ภาษาของเว็บไซต์" },
  "profile.languageHint": {
    en: "Which language the site opens in for you. You can still switch it any time from the header, and sections with their own toggle keep working as before.",
    th: "ภาษาที่เว็บจะเปิดให้คุณเป็นค่าเริ่มต้น สลับเองได้ตลอดเวลาจากแถบด้านบน และส่วนที่มีปุ่มสลับภาษาของตัวเองก็ยังใช้ได้เหมือนเดิม",
  },
  "profile.guestName": { en: "What should we call you?", th: "อยากให้เรียกคุณว่าอะไร" },
  "profile.guestNameHint": {
    en: "Shown wherever you sign up for something. You can change it whenever.",
    th: "ใช้แสดงตอนคุณลงชื่อร่วมกิจกรรม เปลี่ยนได้ตลอด",
  },
  "profile.signInPrompt": {
    en: "Sign in to verify your character and customise your profile. Coming to an event without being in the FC works too — you do not need a character at all.",
    th: "เข้าสู่ระบบเพื่อยืนยันตัวละครและปรับแต่งโปรไฟล์ ถ้ามาร่วมกิจกรรมโดยไม่ได้อยู่ใน FC ก็เข้าได้ ไม่จำเป็นต้องมีตัวละคร",
  },
  "profile.fcMember": { en: "FC member", th: "สมาชิก FC" },
  "profile.guest": { en: "Guest", th: "ผู้มาเยือน" },
  "profile.guestNoChar": { en: "Guest — no character linked", th: "ผู้มาเยือน — ยังไม่ได้ผูกตัวละคร" },
  "profile.verified": { en: "verified", th: "ยืนยันแล้ว" },
  "profile.notVerified": { en: "not verified yet", th: "ยังไม่ได้ยืนยัน" },

  // ── Leaderboards ────────────────────────────────────────────────────
  "lb.eyebrow": { en: "Leaderboards", th: "อันดับ" },
  "lb.title": { en: "Who does what best", th: "ใครเก่งด้านไหน" },
  "lb.empty": {
    en: "Nothing to rank yet. Scores appear once the pipeline has read achievements from FFXIV Collect for members who keep them public.",
    th: "ยังไม่มีข้อมูลให้จัดอันดับ คะแนนจะขึ้นเมื่อระบบอ่าน achievement จาก FFXIV Collect ของคนที่เปิดเป็นสาธารณะได้แล้ว",
  },
  "lb.onVacation": { en: "on vacation", th: "พักอยู่" },

  // ── Shared ──────────────────────────────────────────────────────────
  "common.loading": { en: "Loading…", th: "กำลังโหลด…" },
  "common.cancel": { en: "Cancel", th: "ยกเลิก" },
  "common.delete": { en: "Delete", th: "ลบ" },
  "common.edit": { en: "Edit", th: "แก้ไข" },
  "common.noData": { en: "No data", th: "ไม่มีข้อมูล" },
} satisfies Record<string, Entry>;

export type Key = keyof typeof DICT;

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Interpolates {name} placeholders from `vars`. */
  t: (key: Key, vars?: Record<string, string | number>) => string;
}

const LangCtx = createContext<Ctx | null>(null);

/**
 * Thai is the default because the FC is Thai. The English text stays the source
 * of truth in the dictionary — the data behind this site is in English, and a
 * missing translation should read as English rather than as a blank.
 */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");

  // localStorage first so the choice survives a reload without waiting on the
  // network, then whatever the signed-in member saved — that is the one that
  // should win across devices.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "th" || saved === "en") setLangState(saved);
    } catch { /* private mode */ }

    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: row } = await supabase
        .from("profiles").select("language").eq("id", data.user.id).maybeSingle();
      const pref = (row as { language?: string } | null)?.language;
      if (pref === "th" || pref === "en") {
        setLangState(pref);
        try { localStorage.setItem(STORAGE_KEY, pref); } catch { /* private mode */ }
      }
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* private mode */ }
    // Saved to the profile too, so the choice follows the member to any device.
    // Failure is silent on purpose: the language is already applied locally, and
    // an error toast about it would be louder than the setting deserves.
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.from("profiles")
          .update({ language: l }).eq("id", data.user.id);
      }
    })();
  }, []);

  const t = useCallback((key: Key, vars?: Record<string, string | number>) => {
    const entry = DICT[key] as Entry | undefined;
    let out = entry ? entry[lang] || entry.en : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    }
    return out;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangCtx);
  // Server-rendered pieces and tests can call this outside the provider; falling
  // back to English keeps them rendering rather than throwing.
  if (!ctx) {
    return {
      lang: "en",
      setLang: () => {},
      t: (key, vars) => {
        const entry = DICT[key] as Entry | undefined;
        let out = entry ? entry.en : key;
        if (vars) {
          for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
        }
        return out;
      },
    };
  }
  return ctx;
}

/**
 * For a block that carries its own language toggle — the front-page how-to, the
 * tag glossary, the collection help. It starts in whatever the site is set to and
 * can be flipped on its own without changing the rest of the page, which is how
 * those blocks already behaved.
 */
export function useSectionLang(): [Lang, () => void] {
  const { lang } = useLang();
  const [override, setOverride] = useState<Lang | null>(null);
  const effective = override ?? lang;
  return [effective, () => setOverride(effective === "th" ? "en" : "th")];
}

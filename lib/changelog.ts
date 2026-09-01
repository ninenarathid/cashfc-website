/**
 * What changed on this site, and when — the copy that ships with the code.
 *
 * The list an admin edits lives in Supabase (migration_v23). This one is the
 * fallback: it is what the page shows on a database that has not had that
 * migration run, and what the migration seeds the table from. Adding an entry
 * here will not put it on the site of anybody whose database already has the
 * table — write it in the admin panel instead.
 *
 * Kept rather than deleted because a front page that empties itself when a
 * query fails is worse than one showing a fortnight-old note.
 *
 * Newest first. Dates are the day the change went live, in YYYY-MM-DD.
 */

export type Lines = { th: string; en: string };

/**
 * What kind of change it is, for a colour and a word.
 *
 * Three is deliberately few. "New", "better", "fixed" is the whole vocabulary
 * anybody needs to skim a list like this, and a longer one only makes the
 * writer hesitate over which label to use.
 */
export type ChangeKind = "new" | "better" | "fix";

export interface Change {
  kind: ChangeKind;
  what: Lines;
}

export interface Release {
  /** YYYY-MM-DD, the day it went live. */
  date: string;
  /** Optional headline for a day that had a theme to it. */
  title?: Lines;
  changes: Change[];
}

export const CHANGELOG: Release[] = [
  {
    date: "2026-09-02",
    title: {
      th: "รูปในแกลเลอรีโหลดเร็วขึ้น 32 เท่า",
      en: "The gallery got 32x lighter",
    },
    changes: [
      {
        kind: "better",
        what: {
          th: "หน้าแกลเลอรีเคยส่งรูปต้นฉบับเต็มความละเอียดมาให้ทั้งที่แสดงแค่กล่องกว้าง 325px "
            + "ตอนนี้มีรูปย่อแยกต่างหาก หน้าหนึ่งจาก 64 MB เหลือ 2 MB",
          en: "The gallery was sending full-resolution originals to fill a box 325 "
            + "pixels across. It now has proper thumbnails: one page went from 64 MB "
            + "to 2 MB.",
        },
      },
      {
        kind: "better",
        what: {
          th: "ไฟล์ต้นฉบับไม่ถูกแตะเลย ไม่ย่อ ไม่บีบอัดซ้ำ กดเปิดดูรูปยังได้ไฟล์เดิมทุกไบต์",
          en: "Originals are untouched — not resized, not re-encoded. Opening a "
            + "picture still gives you the file exactly as it was uploaded.",
        },
      },
    ],
  },
  {
    date: "2026-09-01",
    changes: [
      {
        kind: "new",
        what: {
          th: "หน้า Admin ดูได้แล้วว่าใครผูกบัญชีด้วย Discord หรือ Google "
            + "และเรียงตารางตามคอลัมน์ไหนก็ได้",
          en: "The admin panel now shows which service each member signed in with, "
            + "Discord or Google, and the table sorts by any column.",
        },
      },
      {
        kind: "fix",
        what: {
          th: "กระดิ่งแจ้งเตือนเคยบอกว่าทุกอย่างเป็น “ประกาศใหม่” รวมถึงข้อความจากหน้า Feedback "
            + "ตอนนี้บอกถูกประเภทแล้ว และกดไปที่เรื่องนั้นได้เลย",
          en: "The notification bell used to call everything a new announcement, "
            + "including replies on Feedback. It now says which kind, and takes you "
            + "there.",
        },
      },
      {
        kind: "fix",
        what: {
          th: "ข้อมูล Achievement จะไม่หายอีกแล้วถ้ามีใครตั้งโปรไฟล์เป็น Private "
            + "ระบบจะเก็บของเดิมไว้และบอกว่าอ่านมาเมื่อไหร่",
          en: "Achievements no longer vanish when somebody sets their Lodestone "
            + "profile to private. The last reading is kept, with the date it was "
            + "taken.",
        },
      },
    ],
  },
  {
    date: "2026-08-31",
    changes: [
      {
        kind: "new",
        what: {
          th: "หน้าแรกบอกวันเกิดสมาชิกที่กำลังจะถึงใน 7 วันข้างหน้า",
          en: "The home page now shows members' birthdays for the week ahead.",
        },
      },
      {
        kind: "new",
        what: {
          th: "ไกด์ M9S ใช้แผนผังสนามจริงจากในเกม พร้อมมาร์คของจริง และไทม์ไลน์แบบเส้นเวลา "
            + "ที่กดดูแต่ละสกิลได้",
          en: "The M9S guide uses the real arena floor and the game's own waymarks, "
            + "with a timeline you can click through skill by skill.",
        },
      },
    ],
  },
];


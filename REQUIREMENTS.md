# REQUIREMENTS — FC Member Board v2 "Cafe And SHabu"

> เอกสารความต้องการฉบับเต็ม — ใช้เป็น source of truth ของโปรเจกต์
> อัปเดตล่าสุด: 2026-08-24

## วิสัยทัศน์

เว็บชุมชนของ FC ที่เป็น "บ้านหลังที่สอง": เข้ามาแล้วเห็นความเคลื่อนไหวใหม่ทุกวัน,
รู้จักเพื่อนสมาชิกทั้ง 502 คน, โชว์ความเก่ง/ของสะสมของตัวเองได้, และเป็นประตูเข้า Discord ของ FC
ระบบทั้งหมดรันฟรี (Vercel + Supabase + GitHub Actions) และอัปเดตข้อมูลอัตโนมัติรายวัน

## โครงหน้า (Site Map)

| หน้า | Path | สถานะ |
|---|---|---|
| 1. Homepage | `/` | ใหม่ (กระดานเดิมย้ายไป `/members`) |
| 2. Member List | `/members` | ย้าย + เพิ่มฟีเจอร์ |
| 3. Single Member | `/member/[id]` | ใหม่ |
| แก้โปรไฟล์ตัวเอง | `/profile` | มีแล้ว (เพิ่มฟิลด์) |
| แอดมิน | `/admin` | มีแล้ว (เพิ่มส่วนจัดการ) |
| กิจกรรม / มินิเกม | `/events`, `/games` | โครงเดิม รอเฟสถัดไป |

---

## หน้า 1 — Homepage `/`

เป้าหมาย: หน้าแรกสวย มีชีวิต และพาคนเข้า Discord ได้ใน 1 คลิก

| # | ฟีเจอร์ | รายละเอียด | แหล่งข้อมูล |
|---|---|---|---|
| 1.1 | Hero | ชื่อ FC + world + ตัวเลขไฮไลต์ (สมาชิก / Raider / Ultimate Legend) + ปุ่ม "ดูสมาชิก" และ "เข้าร่วม Discord" | members.json |
| 1.2 | **Discord embed** | iframe widget ทางการของ Discord (`discord.com/widget?id=...`) แสดงคนออนไลน์ตอนนี้ + ปุ่ม invite ใหญ่ | ต้องเปิด **Server Widget** ใน Discord server settings และเก็บ server id + invite URL ใน `site_settings` |
| 1.3 | ประกาศจาก FC | มีแล้ว — ย้ายมาอยู่ใต้ hero | Supabase `announcements` |
| 1.4 | **ฟีดความเคลื่อนไหว** | เหตุการณ์อัตโนมัติจาก diff รายวัน: parse นิวไฮ, เคลียร์บอสใหม่ (tier ปัจจุบัน/ultimate), mounts/minions เพิ่ม, เลเวลถึง 100, สมาชิกใหม่เข้า FC, rare achievement ใหม่ · แสดง ~30 รายการล่าสุด · เหตุการณ์ "สมาชิกออก" **ปิดเป็นค่าเริ่มต้น** (เปิดได้ใน config) | `data/feed.json` (pipeline สร้าง) |
| 1.5 | **Timeline อัปเดตเกม** | รวม 2 แหล่งเรียงเวลาเดียวกัน แยกสีให้ชัด: (ก) **Official** — หัวข้อข่าว/แพตช์จาก Lodestone (pipeline ดึงรายวัน) (ข) **FC เพิ่มเอง** — แอดมินโพสต์ เช่น "FC house ย้ายบ้านใหม่", "นัดถ่ายรูปหมู่ 7.5" | `data/news.json` + Supabase `timeline_posts` |
| 1.6 | สมาชิกประจำวัน | สุ่ม 1 คน/วัน (seed จากวันที่ → ทุกคนเห็นคนเดียวกัน) โชว์การ์ด: รูป, แท็ก, ปุ่มไปหน้าโปรไฟล์ | members.json |

## หน้า 2 — Member List `/members`

เป้าหมาย: หาคนที่ต้องการเจอใน 10 วินาที + เห็นภาพรวม FC ในหน้าเดียว

| # | ฟีเจอร์ | รายละเอียด |
|---|---|---|
| 2.1 | ของเดิมทั้งหมด | search, tag chips, sort, ✦ โปรไฟล์, ซ่อนตาม override |
| 2.2 | **Filter ขั้นสูง** | แผงกรองเพิ่ม: สถานะ "กำลังหา" (หา static / รับสอน / รับงาน craft / หาเพื่อนเล่น), จ๊อบโปรด, ยศ FC, ระดับ parse (ตามสี), เคลียร์บอส tier ปัจจุบันตัวไหนแล้ว (M9S–M12S), มี ultimate clear ไหม, ช่วงเลเวล · ทุก filter ทำงานร่วมกัน (AND) และเขียนลง URL query เพื่อแชร์ลิงก์ผลกรองได้ |
| 2.3 | **กราฟภาพรวม FC** | section พับ/กางบนหัวหน้า: (ก) donut สัดส่วนแท็ก (ข) bar การกระจาย parse ตาม bracket สี FFLogs (ค) **Prog Board**: M9S→M12S แต่ละบอส progress bar "เคลียร์แล้ว x/502 คน" (ง) line กราฟประวัติ FC (สมาชิก/Raider/คนเคลียร์ M12S ตามเวลา) · ใช้ **Recharts** |
| 2.4 | มุมมองครัว | toggle สลับ list ↔ ผังร้านตามยศ (Chef Toumant → Sous Chef → Chef de Cuisine → Chief de popoto → Food Raider → Taster → Table Cat → …) ลำดับกำหนดใน `RANK_ORDER` config |
| 2.5 | โหมดเทียบ 2 คน | ปุ่ม "เทียบ" เลือก 2 คน → แสดง side-by-side: parse ปัจจุบัน, ultimate, mounts, minions, rare achv (`/compare?a=<id>&b=<id>`) |

## หน้า 3 — Single Member `/member/[id]`

เป้าหมาย: หน้าโชว์ของแต่ละคน สวยพอที่เจ้าตัวอยากแชร์ลง Discord เอง · ทุกคนมีหน้า (ดูได้ไม่ต้อง login) เจ้าของแต่งเพิ่มได้

| # | ฟีเจอร์ | รายละเอียด |
|---|---|---|
| 3.1 | Header | portrait เต็มตัว (จาก FFXIV Collect) บนพื้น **สี/gradient ที่เจ้าของเลือก**, ชื่อ + ✦ + bio + จ๊อบโปรด + สถานะกำลังหา, ยศ FC, ปุ่ม LODE / LOGS / COLL, popoto count 🥔 |
| 3.2 | **Raid Stats — Current Tier** | ดู "สเปกกลาง: Raid Stats" ด้านล่าง |
| 3.3 | **Raid Stats — Legacy** | ดู "สเปกกลาง: Raid Stats" ด้านล่าง |
| 3.4 | Collection | mounts / minions / rare achv พร้อม **percentile เทียบใน FC** ("มากกว่า 78% ของ FC") คำนวณจาก members.json ทั้งชุด |
| 3.5 | **ป้ายตำแหน่งอัตโนมัติ** (ธีมร้านอาหาร) | ระบบแจกเองตามเกณฑ์ (config ปรับได้): ⭐⭐⭐ "มิชลินสามดาว" = parse ≥ 99 tier ปัจจุบัน · "Legend" ต่อ ultimate ที่เคลียร์ · "เชฟใหญ่สายสะสม" = top 10 mounts ใน FC · "ราชา popoto" = top 10 rare achv · "ขาประจำร้าน" = claim โปรไฟล์แล้ว |
| 3.6 | **ส่ง popoto 🥔** | login แล้วกดส่งกำลังใจได้ วันละ 1 ครั้ง/ผู้รับ (กันสแปมด้วย unique constraint ใน DB) ยอดรวมโชว์บนหน้า + บนกระดาน |
| 3.7 | **การ์ดแชร์ Discord** | dynamic OG image (`next/og`): พื้นหลังธีม + ชื่อ + parse + แท็ก + popoto — แปะลิงก์ใน Discord แล้วขึ้นการ์ดสวยอัตโนมัติ |
| 3.8 | โหมดเจ้าของ | ถ้า login และเป็นเจ้าของ → ปุ่ม "แต่งหน้านี้" ไป `/profile` |

### `/profile` — ฟิลด์แต่งได้ (เดิม + ใหม่)

bio, จ๊อบโปรด, สีประจำตัว **(มีแล้ว)** · เพิ่ม: สี/gradient แบนเนอร์หน้าโปรไฟล์, สถานะ "กำลังหา" (เลือกได้หลายอัน), ปุ่ม "ขอซ่อนตัวจากกระดาน" (เขียน override ของตัวเองได้เฉพาะตัวเอง)

---

## สเปกกลาง: Raid Stats (requirement หลัก)

**หลักการ: เก็บมาให้หมด แต่แสดงแยกเป็น 2 ชั้นให้ดูง่าย**

### ก. Current Tier — เด่นสุด บนสุด
- Tier ปัจจุบัน ณ ตอนนี้คือ **M9S–M12S** — pipeline **ตรวจจับ tier ล่าสุดอัตโนมัติ** จาก FFLogs ดังนั้นพอ 7.x ถัดไปออก เว็บจะสลับ tier ใหม่เองโดยไม่ต้องแก้โค้ด
- แสดงเป็นการ์ด 4 ใบ (บอสละใบ): ป้าย **M9S / M10S / M11S / M12S** + ชื่อบอสจริง, best parse (สีมาตรฐาน FFLogs), จำนวน kill, จ๊อบที่ทำ parse นั้น · บอสที่ยังไม่เคลียร์ = การ์ดจาง "ยังไม่มี log"
- ป้าย M-number มาจาก `TIER_LABELS` config (map ชื่อ zone → ["M9S","M10S","M11S","M12S"]) เพราะ FFLogs ให้ชื่อบอส ไม่ได้ให้เลข M

### ข. Legacy — ครบทุกอย่าง แต่พับเก็บเรียบร้อย
- **Ultimates ทั้งหมด** (FRU, TOP, DSR, TEA, UWU, UCOB): แถวละอัน มี parse + kills, เคลียร์แล้วติดป้าย Legend — ส่วนนี้เด่นกว่า savage เก่า
- **Savage tiers เก่าทั้งหมด** (M5S–M8S, M1S–M4S, Anabaseios, Abyssos, Asphodelos, …): จัดกลุ่มเป็น accordion ตาม expansion → tier แต่ละ tier สรุป "เคลียร์ x/4 · best parse y" กดกางเห็นรายบอส
- tier/บอสที่ผู้เล่นไม่มีข้อมูลเลย → **ไม่แสดงแถวว่าง** (ซ่อนไปเลย ให้หน้าสะอาด)

### สถาปัตยกรรมข้อมูล (เหตุผล: โควตา FFLogs + ขนาดไฟล์)
- **รายวัน**: อัปเดตเฉพาะ current tier + ultimates ทุกตัว (เท่าที่ทำอยู่ ~5-6 zones — งบ API พอสบาย)
- **รายสัปดาห์** (อาทิตย์ หรือสั่ง `--full-history`): กวาด savage ทุก tier ย้อนหลังทั้งหมด · วันธรรมดา legacy คงค่าจากรอบล่าสุด (pipeline อ่านไฟล์เก่ามา merge)
- **แยกไฟล์**: `data/members.json` = ข้อมูลเบาสำหรับหน้า list (สรุป current tier + แท็ก) · `data/raids.json` = รายละเอียด raid เต็มทุกคน **โหลดฝั่ง server เฉพาะหน้า `/member/[id]`** — หน้า list ยังโหลดไวเท่าเดิม

### Schema (ต่อสมาชิกใน raids.json)
```json
{
  "24228478": {
    "current": {
      "zone": "AAC Heavyweight (Savage)", "zone_id": 0,
      "encounters": [
        { "label": "M9S", "name": "ชื่อบอส", "best": 99, "median": 92, "kills": 14, "job": "Pictomancer" }
      ]
    },
    "ultimates": [
      { "zone": "Futures Rewritten", "best": 87, "kills": 3, "job": "Sage", "cleared": true }
    ],
    "legacy": [
      { "expansion": "Dawntrail", "zone": "AAC Cruiserweight (Savage)",
        "encounters": [ { "label": "M5S", "name": "...", "best": 76, "kills": 9, "job": "..." } ] }
    ]
  }
}
```
`members.json` เพิ่มต่อคน: `portrait`, `current_clears` (เช่น `[true,true,false,false]` สำหรับ filter M9S–M12S), `popoto` ไม่อยู่ในไฟล์ (มาจาก Supabase สด)

---

## Pipeline v2 — งานที่ต้องเพิ่ม

| งาน | ความถี่ | Output |
|---|---|---|
| Raid ทุก tier (สเปกข้างบน) | current+ult รายวัน / legacy รายสัปดาห์ | `data/raids.json`, สรุปลง `members.json` |
| เก็บ `portrait` จาก FFXIV Collect (มีใน response อยู่แล้ว) | รายวัน | `members.json` |
| **Snapshot + diff** → ฟีดความเคลื่อนไหว | รายวัน | `data/snapshot.json`, `data/feed.json` (เก็บ 200 รายการล่าสุด) |
| **History** ต่อท้ายสถิติรวมรายวัน (สมาชิก, raider, เคลียร์ M12S, avg parse) | รายวัน | `data/history.json` |
| **ข่าว official** จาก Lodestone (topics ล่าสุด ~10 หัวข้อ) | รายวัน | `data/news.json` |
| **Nameday + portrait สำรอง** จากหน้า character (แบ่งวันละ ~80 คน วนครบใน 1 สัปดาห์ — สุภาพกับ Lodestone) | ทยอยรายวัน | `data/extra.json` · แปลง Eorzean calendar → เดือน/วันจริง (1st Astral Moon = ม.ค. … 6th Umbral Moon = ธ.ค.) เพื่อขึ้น "วันนี้ nameday ของ…" |

## Supabase — ตาราง/คอลัมน์ที่ต้องเพิ่ม (migration ไฟล์ใหม่ ไม่แตะของเดิม)

| ตาราง | คอลัมน์หลัก | RLS |
|---|---|---|
| `timeline_posts` | title, body, url?, posted_at, kind='fc' | อ่าน: ทุกคน · เขียน: admin |
| `kudos` (popoto) | sender_id, receiver_character_id, day · **unique(sender, receiver, day)** | อ่าน: ทุกคน · insert: เจ้าของ sender เท่านั้น |
| `site_settings` | key, value (discord_server_id, discord_invite_url, ...) | อ่าน: ทุกคน · เขียน: admin |
| `profiles` (เพิ่มคอลัมน์) | `lfg text[]` (static/mentor/craft/friends), `banner` text | เดิม + grant คอลัมน์ใหม่ให้เจ้าของ |
| `member_overrides` (policy เพิ่ม) | — | เจ้าของที่ claim ตัวละครนั้น ซ่อน/เลิกซ่อน **ตัวเอง** ได้ |

`/admin` เพิ่ม 2 ส่วน: จัดการ timeline_posts, แก้ site_settings (Discord id/invite)

## Non-functional

- ฟรี 100% ภายใต้ Vercel Hobby / Supabase Free / GitHub Actions Free (non-commercial)
- หน้า `/members` ต้องไม่โหลดข้อมูล raid หนัก (แยกไฟล์ตามสเปก) · JS bundle หน้า list < ~250KB
- Privacy: เคารพ FFLogs hidden / achievement private / override เสมอ · สมาชิกขอซ่อนตัวเองได้
- ทุกฟีเจอร์ใหม่ต้อง degrade ได้: ไม่มี Supabase → กระดาน+โปรไฟล์ static ยังทำงาน · ไม่มีไฟล์ feed/news → หน้าแรกยังขึ้น
- Discord widget ต้องมี fallback เป็นปุ่ม invite เฉยๆ ถ้า server ปิด widget

## แผนการสร้าง (เรียงตามคุ้มค่า)

| เฟส | ขอบเขต | แตะส่วนไหน |
|---|---|---|
| **2a — โครง + Raid split** | ย้าย board → `/members` · หน้า `/member/[id]` พร้อม raid current/legacy เต็มสเปก · pipeline v2 (raids.json, portrait, current_clears) · Homepage v1 (hero, Discord embed, ประกาศ, spotlight) | pipeline + frontend + site_settings |
| **2b — มีชีวิต** | snapshot/diff → ฟีด · history + กราฟ FC + Prog Board · news timeline + timeline_posts + admin | pipeline + frontend + Supabase |
| **2c — ชุมชน** | popoto kudos · สถานะกำลังหา + filter ขั้นสูง · ป้ายมิชลิน · เทียบ 2 คน · OG share card | frontend + Supabase |
| **2d — เก็บรายละเอียด** | nameday · มุมมองครัว · ซ่อนตัวเอง · banner โปรไฟล์ | pipeline + frontend |
| **3** | กิจกรรม + มินิเกม (`events`, `signups`, `raffle_entries`, `scores` + Realtime) | ตามแผนเดิม |

## สิ่งที่เจ้าของโปรเจกต์ต้องเตรียม (เพิ่มจากที่มี)

1. **Discord**: เปิด Server Widget (Server Settings → Widget → Enable) + สร้าง invite link แบบไม่หมดอายุ → เอา Server ID + ลิงก์มาใส่ใน `/admin` (site_settings)
2. ตัดสินใจ 2 ค่า default (ปรับทีหลังได้): เปิดเหตุการณ์ "สมาชิกออกจาก FC" ในฟีดไหม (ค่าเริ่มต้น: ปิด) · เกณฑ์ป้ายมิชลิน (ค่าเริ่มต้นตามข้อ 3.5)

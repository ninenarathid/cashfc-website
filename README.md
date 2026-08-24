# FC Member Board — Cafe And SHabu (Next.js + Vercel + Supabase)

เว็บชุมชน Free Company ครบวงจร:
- **กระดานสมาชิก** อัปเดตอัตโนมัติทุกวัน (Lodestone + FF Logs + FFXIV Collect)
- **สมาชิก login ด้วย Discord** → claim ตัวละครของตัวเอง → แต่งโปรไฟล์ (bio, จ๊อบโปรด, สีประจำตัว) โชว์บนกระดาน
- **แอดมิน** โพสต์ประกาศหน้าแรก, ซ่อนสมาชิกจากกระดาน, ปลด claim ที่ผิด
- โครงหน้า **กิจกรรม** และ **มินิเกม** เตรียมไว้สำหรับเฟสถัดไป

## Stack

| ส่วน | เทคโนโลยี | หน้าที่ |
|---|---|---|
| หน้าเว็บ | **Next.js 15 + TypeScript + Tailwind v4** | UI ทั้งหมด |
| Hosting | **Vercel** (ฟรี) | deploy อัตโนมัติทุกครั้งที่ push |
| Auth + Database | **Supabase** (ฟรี) | Discord login, โปรไฟล์, ประกาศ, สิทธิ์แอดมิน |
| Data pipeline | **Python บน GitHub Actions** | cron ทุกวัน 03:30 น. ไทย |

ความปลอดภัยคุมที่ฐานข้อมูลด้วย **Row Level Security**: สมาชิกแก้ได้เฉพาะโปรไฟล์ตัวเอง, ตั้ง `is_admin` เองไม่ได้ (คอลัมน์ถูกล็อกระดับ Postgres), งานแอดมินทำได้เฉพาะบัญชีที่มีสิทธิ์ — ต่อให้แกะโค้ดหน้าเว็บก็ข้ามไม่ได้

> เว็บออกแบบให้**ทำงานได้ตั้งแต่ยังไม่เชื่อม Supabase** (กระดานขึ้นปกติ) — ตั้งค่าเสร็จเมื่อไหร่ ปุ่ม login และฟีเจอร์โปรไฟล์/แอดมินจะเปิดเอง

---

## สิ่งที่คุณต้องเตรียม

| # | สิ่งที่ต้องมี | ใช้ทำอะไร | ค่าใช้จ่าย |
|---|---|---|---|
| 1 | บัญชี GitHub | เก็บโค้ด + รัน pipeline | ฟรี |
| 2 | บัญชี Vercel (Continue with GitHub) | โฮสต์เว็บ | ฟรี |
| 3 | FFLogs API Client | ข้อมูล raid | ฟรี |
| 4 | บัญชี Supabase (Continue with GitHub) | login + ฐานข้อมูล | ฟรี |
| 5 | Discord Application (Developer Portal) | ปุ่ม Login Discord | ฟรี |
| 6 | เวลา ~30 นาที | ติดตั้งครั้งแรกครั้งเดียว | - |

---

## ขั้นตอนติดตั้ง

### ส่วนที่ 1 — เว็บ + ข้อมูลรายวัน (เหมือนเดิม)

1. **Push โค้ดขึ้น GitHub**
   ```bash
   git init && git add . && git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. **ใส่ Secret ของ pipeline**: repo → Settings → Secrets and variables → Actions →
   เพิ่ม `FFLOGS_CLIENT_ID` และ `FFLOGS_CLIENT_SECRET` (สมัครที่ https://www.fflogs.com/api/clients)
3. **เชื่อม Vercel**: vercel.com → Add New → Project → Import repo นี้ → Deploy
   (Vercel ตรวจเจอ Next.js เอง) → ได้ URL `https://<โปรเจกต์>.vercel.app`
4. **รัน pipeline ครั้งแรก**: แท็บ Actions → Update FC data → Run workflow
   หลังจากนี้รันเองทุกวัน แล้ว Vercel deploy ใหม่อัตโนมัติทุกครั้งที่ข้อมูลเปลี่ยน

### ส่วนที่ 2 — Supabase + Discord login

5. **สร้างโปรเจกต์ Supabase**: supabase.com → New project → เลือก region **Singapore** (ใกล้ไทยสุด)
6. **สร้างตาราง**: เมนู **SQL Editor** → New query → วางเนื้อหาไฟล์ `supabase/schema.sql` ทั้งไฟล์ → Run
7. **สร้าง Discord Application**: https://discord.com/developers/applications → **New Application**
   → เมนู **OAuth2** → จด **Client ID** และกด Reset Secret เพื่อได้ **Client Secret**
   → ช่อง **Redirects** กด Add แล้วใส่:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   (ดู `<project-ref>` ได้จาก URL โปรเจกต์ Supabase หรือหน้า Auth Provider ในข้อถัดไป ซึ่งแสดง Callback URL ให้ copy เลย)
8. **เปิด Discord provider ใน Supabase**: Authentication → Sign In / Providers → **Discord**
   → Enable → วาง Client ID + Client Secret จากข้อ 7 → Save
9. **ตั้ง URL ของเว็บ**: Authentication → **URL Configuration**
   → Site URL: `https://<โปรเจกต์>.vercel.app`
   → Redirect URLs เพิ่ม: `http://localhost:3000/**` (ไว้เทสบนเครื่อง)
10. **ใส่ env ให้เว็บ**: Supabase → Project Settings → **API** → copy 2 ค่า
    - Vercel → Project → Settings → **Environment Variables** เพิ่ม:

      | Name | Value |
      |---|---|
      | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
      | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

    - กด **Redeploy** หนึ่งครั้ง (Deployments → ⋯ → Redeploy)
    - บนเครื่องตัวเอง: copy `.env.local.example` เป็น `.env.local` แล้วใส่ค่าเดียวกัน
11. **ตั้งตัวเองเป็นแอดมิน**: เปิดเว็บ → กด **Login Discord** หนึ่งครั้ง → กลับไปที่ Supabase SQL Editor รัน:
    ```sql
    select id, discord_username from public.profiles;  -- ดูชื่อตัวเอง
    update public.profiles set is_admin = true where discord_username = 'ชื่อของคุณ';
    ```
    รีเฟรชเว็บ → หน้า "โปรไฟล์ของฉัน" จะมีปุ่ม **หน้าแอดมิน** โผล่มา

---

## ใครทำอะไรได้บ้าง

| | ผู้เยี่ยมชม | สมาชิก (login Discord) | แอดมิน |
|---|---|---|---|
| ดูกระดาน/ค้นหา/กรอง | ✔ | ✔ | ✔ |
| claim ตัวละคร + แต่ง bio/จ๊อบ/สี | | ✔ | ✔ |
| โพสต์/ลบประกาศหน้าแรก | | | ✔ |
| ซ่อนสมาชิกจากกระดาน + โน้ตภายใน | | | ✔ |
| ปลด claim ที่ผิดคน | | | ✔ |

## รันบนเครื่อง

```bash
npm install
npm run dev            # http://localhost:3000
```

## ปรับแต่ง

- เกณฑ์แท็ก: `CONFIG` ใน `pipeline/update_members.py` · Ultimate ใหม่: เพิ่มใน `ULTIMATE_PATTERNS`
- ธีม/สี/ฟอนต์: บล็อก `@theme` ใน `app/globals.css`
- เวลารันรายวัน: `cron` ใน `.github/workflows/update-data.yml` (UTC, ไทย = UTC+7)

## เฟสถัดไป — กิจกรรม & มินิเกม

ฐานพร้อมแล้ว (login + สิทธิ์ + ฐานข้อมูล) เหลือเพิ่มตาราง `events`, `signups`, `raffle_entries`, `scores`
แล้วเขียนหน้า `/events` กับ `/games` ต่อได้เลย — จับรางวัลสดใช้ Supabase Realtime ให้ทุกคนเห็นผลพร้อมกัน

## ข้อจำกัดที่ควรรู้

- FF Logs มีข้อมูลเฉพาะคนที่มีการอัปโหลด log — "ไม่เจอ log" ≠ ไม่ได้เรด
- Achievement ดูได้เฉพาะคนเปิด public บน Lodestone
- FFXIV Collect API และ Vercel Hobby ใช้ได้เฉพาะงาน non-commercial — เว็บชุมชน FC ตรงเงื่อนไข ห้ามนำไปหารายได้
- การ scrape Lodestone เป็น gray area ของ ToS — สคริปต์ใส่ delay สุภาพ รันวันละครั้ง ใช้ภายใน FC

---

## อัปเดต v2 (ครบทุกฟีเจอร์ตาม REQUIREMENTS.md)

**หน้าใหม่:** `/` homepage (hero + ฟีด + timeline + Discord widget + สมาชิกประจำวัน + nameday วันนี้) ·
`/members` กระดาน + ตัวกรองขั้นสูง + กราฟภาพรวม FC + มุมมองครัว ·
`/member/[id]` โปรไฟล์รายคน (raid แยก tier ปัจจุบัน/เก่า, ป้ายตำแหน่ง, popoto, การ์ดแชร์ Discord) ·
`/compare` เทียบ 2 คน

**ขั้นตอนเพิ่มจากเดิม 2 อย่าง:**
1. รัน `supabase/migration_v2.sql` ใน SQL Editor (ต่อจาก schema.sql เดิม)
2. เปิด Discord **Server Widget** (Server Settings → Widget → Enable) + สร้าง invite ไม่หมดอายุ
   แล้วเอา Server ID + ลิงก์มาใส่ในหน้า `/admin` → ส่วน "Discord ของ FC"

**พฤติกรรม pipeline:** รายวันอัปเดต tier ปัจจุบัน + ultimates · ทุกวันอาทิตย์ (หรือกด Run พร้อมติ๊ก full_history)
กวาด savage ทุก tier ย้อนหลัง · ข่าว official กรองเฉพาะแพตช์/อีเวนต์ (แก้คีย์เวิร์ดได้ที่ `news_keywords`
ใน `pipeline/update_members.py`) · nameday เก็บวันละ ~80 คนวนจนครบ

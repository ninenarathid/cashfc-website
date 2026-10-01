# Skills ของโปรเจกต์นี้ (Claude Code)

skill อยู่ใน `.claude/skills/` — Claude จะหยิบไปใช้เองเมื่องานเข้าเรื่อง หรือจะเรียกตรงๆ ด้วย `/ชื่อ skill` ก็ได้
ทุกตัวอ้างอิงโค้ดจริงของเว็บ (สำรวจเมื่อ 2026-10-01) ไม่ใช่คำแนะนำลอยๆ

| คำสั่ง | ใช้ตอนไหน | ของที่มีให้ |
|---|---|---|
| `/fc-ideas` | คิดฟีเจอร์หรืออีเวนต์ที่ทำให้คนใน FC สนุก | ความสุข 7 แบบ, เกณฑ์ให้คะแนน, การ์ดไอเดีย, คลังไอเดียตั้งต้น, ปฏิทิน FFXIV + ไทย |
| `/fc-ui` | สร้าง ขัดเกลา หรือตรวจหน้าจอ | design system ของเว็บ, หลัก motion, ของใหม่ปี 2026 ที่ใช้ได้จริง, checklist, `scripts/shoot.mjs` (ถ่ายจอหลายขนาดและจับ error), `scripts/contrast.mjs` |
| `/fc-security` | ทุกครั้งที่แตะ auth, RLS, upload, API, bot หรือข้อมูลส่วนตัว และตอน audit | threat model, checklist ตามชนิดงาน, `db-audit.sql` (อ่าน catalog อย่างเดียว), วิธี probe ที่ไม่แตะข้อมูลจริง, ชุด header/CSP, `scripts/scan.mjs` |
| `/fc-perf` | เว็บช้า บิลแพง หรือก่อน-หลังเพิ่มของหนัก | งบประมาณ, วิธีวัด, playbook เรียงตามความคุ้ม, สรุป caching ของ Next 16.3, `db-perf.sql`, `scripts/payload.mjs` |
| `/fc-migration` | ทุกการแก้ฐานข้อมูล (ตาราง, คอลัมน์, policy, RPC, bucket) | template SQL ตามสไตล์ repo, PGlite harness ที่ทดสอบ RLS ในเครื่องได้ |
| `/fc-game-design` | ออกแบบให้เว็บเป็นเกม ทุกคนคือผู้เล่น: ลูป รางวัล อัตราดรอป เศรษฐกิจ popoto/gil และจิตวิทยาผู้เล่นแบบไม่ใช้ dark pattern | frameworks, psychology, economy, site-as-game, วิธีวัดผล, `scripts/odds.mjs` (คำนวณว่าอัตราดรอปรู้สึกยังไงจริง) |
| `/fc-cash-town` | วางแผนและสร้าง Cash Town เมือง isometric แบบ Zheza คุยด้วยไมค์เมื่อเดินใกล้แบบ Gather มีฟาร์ม popoto บ้าน สัตว์เลี้ยง | วิสัยทัศน์จาก feedback #12, สถานะเบต้าที่ `/town`, สถาปัตยกรรม, เสียง, มินิเกม, ราคาที่เช็กแล้ว, `scripts/town-cost.mjs` (คำนวณค่าใช้จ่ายรายเดือน), สคริปต์ทดสอบเมืองด้วย Chrome จริง (`town-e2e`, `town-live`, `town-isolation`, `town-who`) |

สคริปต์ทุกตัวใช้แค่ Node 24 กับ Chrome ที่มีอยู่แล้ว ไม่ต้อง `npm install` อะไรเพิ่มในโปรเจกต์
(ยกเว้น PGlite ซึ่งติดตั้งใน scratchpad ตามขั้นตอนใน fc-migration)

**repo นี้เป็น public:** skill ทุกตัวเขียนให้เปิดเผยได้ ไม่มีความลับ และไม่มีรายการช่องโหว่ที่ยังไม่แก้
ผลตรวจความปลอดภัยเก็บไว้ในหน่วยความจำส่วนตัวของ Claude เท่านั้น

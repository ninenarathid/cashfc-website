# ชุด deploy 2026-10-12

เตรียมบน production commit `a3140b72` ใน worktree แยก ไม่ stage/reset งานใน workspace เดิม รวม runtime รางวัล/คู่มือบนแพตช์ Casino, toast, profession panel และข้อมูลสมาชิกฉบับล่าสุด

ตรวจในชุดที่จะปล่อย: **211 files / 2,265 tests ผ่าน**, TypeScript และ production build ผ่าน ตรวจ 138 client chunks ไม่พบชื่อ คำอธิบาย หรือชุดอุปกรณ์จากสูตรคอมโบ 108 รูปแบบ ปรับ CI เป็นสอง worker ตาม command ที่ตรวจผ่าน โดยไม่ลดชุดเทสต์หรือเพิ่ม token permissions

## SQL หลังเว็บ deploy สำเร็จ

อ่านฐานจริงวันที่ 2026-10-12 แล้ว: warehouse v215 มีอยู่ และ forge มี water saving 0.35/earth saving 0.5 ตาม v216; gift catalog ยังมีเพียง 45 gifts เดิมและไม่มี rewards foundation

รัน [install-after-deploy.sql](install-after-deploy.sql) **หนึ่งครั้ง** ซึ่งรวม **v207–v214 แล้ว v217–v251 จำนวน 43 ไฟล์** ตามลำดับ ไม่รัน v215/v216 ซ้ำ แต่ละ migration เก็บ transaction/definition guards เดิมไว้ ทดสอบทั้งชุดแยก (พร้อม immediate rerun ทุกไฟล์) และไฟล์รวมบนฐานจำลองที่มี v215/v216 อยู่ก่อนแล้ว ผ่านทั้งหมด

ท้ายไฟล์ตรวจ `tier10_release_verified`: `reward_count` ต้องเป็น 90 และ boolean ทุกตัวเป็น true เมื่อพบ definition changed/moved ให้หยุดและส่ง error พร้อมหมายเลข migration ไม่ลบ guard หรือย้อนรันทั้งไฟล์รวมบนฐานที่อยู่ v251 แล้ว

session deploy นี้ **ไม่ได้ติดตั้ง SQL live** รายงานผล Vercel/commit และ smoke checks หลังปล่อยเก็บใน `.codex/tier10/deployment.json` ที่ workspace ของผู้ใช้ หลังรัน SQL จึง refresh เกมเพื่ออ่าน capability catalog ใหม่ และทดสอบ authenticated gameplay ตาม release.md

# เตรียมปล่อยรางวัลถึงระดับสิบ

อัปเดตสำหรับ deploy 2026-10-12: ตรวจฐานจริงแล้ว v215/v216 มีอยู่ ใช้ [ไฟล์ SQL รวม 43 migrations](install-after-deploy.sql) หลัง deploy สำเร็จ ดู [release รอบนี้](deployment-2026-10-12.md) ข้อกำหนดด้านล่างเป็นขั้นตอนทั่วไป; ไม่ติดตั้ง v216 ซ้ำในรอบนี้

สถานะ 2026-10-11: implementation และตรวจในเครื่องครบ ตาม [handoff ฉบับจบ](sessions/final-2026-10-11.md) เอกสารนี้เตรียมขั้นตอนให้ review ได้; session นี้ไม่ได้รัน SQL live หรือ deploy

1. ตรวจ baseline ที่ติดตั้งจริง โดยเฉพาะ v198/v202/v203/v205 และ world reader v195/v200 ใช้ definition ปัจจุบัน ห้ามถือว่าติดตั้งจากไฟล์หรือแท็บ IDE
2. ตรวจว่า warehouse v215 ที่ session อื่นติดตั้งยังอยู่ในระบบ ลำดับ local replay รับ v215 จาก git ก่อน commit `b574ac39` เพราะไฟล์นี้ถูกนำออกจากรายการ pending แล้ว ไม่สร้างไฟล์นั้นคืนเพื่อให้รันซ้ำ
3. Build/deploy site ที่ตรงกับชุดนี้ก่อนเปิดความสามารถใหม่; capability gates ของ server เดิมจะกันการรับ/ใช้รางวัลที่ยังไม่พร้อม ไม่มี public patch notes แจกสูตรคอมโบ
4. เลือกเฉพาะ migration ที่ยังไม่ติดตั้งจาก `release-manifest.json`: v207–v214 แล้ว v216–v251 ตามเลขขึ้น โดยมีฐาน v215 ที่ขั้นตอน 2 ยืนยันไว้ ไฟล์ v204/v206 เป็น casino คนละงาน ไม่รวมใน package นี้
5. แต่ละไฟล์มี transaction และ definition guards เมื่อพบ `Definition moved/changed` ให้หยุดไฟล์นั้น ตรวจ installed function และ rebuild บน definition ปัจจุบัน ห้ามลบ guard หรือยก dump เก่าทับ
6. รัน `release-probes.sql` ซึ่งอ่านข้อมูลอย่างเดียว: coverage 90 rewards/9 lines/10 ranks, registry 18, helper private, RPC member-only และ shared readers ต้องผ่าน
7. Smoke test บัญชีจริงสองคน: รับ/สวม/ถอด อ่านคู่มือ ใช้รางวัล rank สูงหนึ่งชิ้นต่อสาย, ทดสอบรับความช่วยเหลือโดยผู้รับ, reconnect pending command และ discovered-only combo book ทั้งมือถือ/เดสก์ท็อป แล้วจึงบันทึก released/live verified

**Rerun ที่ตรวจแล้วคือแต่ละไฟล์รันซ้ำทันทีหลังตัวเอง** ไม่ได้หมายถึงให้ย้อนรันตั้งแต่ v207 บนฐานที่อยู่ v251 เพราะไฟล์หลังเปลี่ยน definition ต่อกัน SHA256 ใน manifest ใช้ยืนยันไฟล์ชุดที่ตรวจ; หากแก้ migration ต้องสร้าง manifest และ replay ชุดที่กระทบใหม่

สร้าง manifest และตรวจ client bundle ในเครื่องด้วย `node .claude/skills/fc-cash-town/scripts/db/tier10-release.mjs` หลัง production build ผลใน `.codex/tier10/bundle-audit.json` ไม่ควรมี private recipe name/description หรือ full registry ใน client chunks

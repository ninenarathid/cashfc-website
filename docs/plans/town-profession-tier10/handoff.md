# จุดส่งต่องานแผนรางวัลสายอาชีพถึงระดับ 10

อัปเดต 2026-10-10 เพิ่มแผนคอมโบลับตามคำขอใหม่

## คำขอและผลลัพธ์ปัจจุบัน

ผู้ใช้ต้องการเตรียม implement รางวัลทุกสายถึงระดับ 10 โดยใช้หลาย session และหลายรอบ compact จึงสร้างเอกสารกลางใน repo ประกอบด้วย README, rewards, secret-combos, work-board และ handoff นี้ ผู้ใช้เพิ่ม feature คอมโบลับของเครื่องราง/สัตว์ที่สวมพร้อมกัน ให้ผลพิเศษและใช้เอฟเฟกต์เป็นเบาะแส รวมชุดข้ามสาย รอบวางแผนเดิมไม่ได้แก้ runtime; ต่อมาผู้ใช้อนุมัติ implement และ gen ภาพ จึงทำคอมโบชุดนำร่อง 5 ชุด ดู combo-implementation.md ซึ่งเป็น handoff ของ code ล่าสุด

ทิศทางที่ผู้ใช้กำหนดคือความสนุกสูงสุด แต่ละสายมีของ OP ในบางระดับและเก่งต่างด้าน ไม่ต้องเท่ากัน กวางเดินเร็วของสายป่าคือตัวอย่างที่ต้องรักษา แบบรางวัลต้องอิง gameplay ที่อีก session กำลังเพิ่มความลึก

## สิ่งที่เตรียมครบแล้ว

- แบบใหม่ 42 ชิ้น: ครัว/น้ำ/ผู้ช่วย/ปลา/ป่า/แมลง/สวน สายละ 4 ชิ้นระดับ 7–10 และไม้/เหมืองสายละ 7 ชิ้นระดับ 4–10
- แยกคะแนน OP เป้าหมายออกจากผลวัด ระบุ resource/quota/kind และ combo สำคัญ
- ปรับข้อเสนอสวนให้ตรงฐานใหม่: เลือกคู่แทนเพิ่มโอกาสสุ่ม และเก็บเกสรแทนคืนเมล็ดซ้ำกับ seedTray
- ปรับรางวัลไม้ไม่ให้ยกคุณภาพฟรีข้ามการอ่านลายไม้ แยกเกมสกัดส่วนเล็กกับรางวัล mastery
- จัด baseline gates, prototype ครบ 9 สาย, filler, finale, balance และ release พร้อม acceptance
- มีกติกา shared files/migration และ template ส่งต่องานราย task ใน work-board
- เพิ่มลิงก์แผนกลางใน adventure-expansion เพื่อให้ session gameplay พบแผนรางวัลได้ โดยคงขอบเขตและสถานะเดิมของ gameplay
- เพิ่มแบบคอมโบ 18 ชุดใน secret-combos.md: 15 ชุดใช้อุปกรณ์เดิมรวมเครื่องรางคู่และ trio และ 3 ชุดผูกกับรางวัลที่ออกแบบใหม่ มีข้ามสายครอบคลุมทั้ง 9 สาย
- กำหนด cue ตอนสวม, effect ตอนใช้งานจริง, discovery/notebook ส่วนตัว, server-private rules และการตรวจ bundle/API ไม่เฉลยชุดที่ยังไม่พบ
- เพิ่ม COMBO-CORE/FX/PILOT/CROSS/TIER10/REVIEW และ COMBO-PLAN ในกระดานงาน คอมโบไม่นับเพิ่มใน 90 รางวัล

## ขอบเขตหลักฐานและงานของอีก session

แผนอ่าน [adventure-expansion.md](../../../.claude/skills/fc-cash-town/references/adventure-expansion.md) และ source ล่าสุดใน working tree; ไม่ได้อ่านประวัติแชทของอีก session โดยตรง เอกสาร expansion บอกว่าเพิ่ม 25 usable items ต่อสายรวม 225 และทำ 6 phase รางวัล 42 ชิ้นในแผนนี้ไม่ถูกนับรวมแทนโควตานั้น

พบ source สำหรับ workshop/river fishing, wood grain, geology และ multi-tile gardening มี v180–v182 และ v184–v186 ใน repo สถานะ test/deploy/install ของงานเหล่านั้นต้องรับ handoff ใหม่ก่อน implement ตาม gate ยังไม่ได้รัน test หรือ live query ของ gameplay ในรอบวางแผน

ก่อนแก้ code ตรวจ `git status --short`: อีก session กำลังแก้ components และ lib/town หลายไฟล์ รวมทั้ง registry, keeper, world, crafting, gardening และ migration builders ห้าม reset/clean/checkout ทับหรือ commit งานเหล่านี้ปะปนโดยถือว่าเป็นของตัวเอง

## ขั้นต่อไปของ session implement แรก

1. รับ SETUP-01 อ่าน source/expansion ล่าสุด ระบุผู้รวมงานและ snapshot ของฐานที่จะใช้ แล้วเปิด gate ที่มีหลักฐานจริง
2. ทำ contract รางวัลแรกกับ FOUNDATION-01 ให้พร้อมรับ/เปิดใช้/quota/state ทั้ง trial และ server ตรวจ pattern ที่มีอยู่ก่อนเพิ่ม abstraction ใหม่
3. เลือก PILOT-WOOD, PILOT-MINE หรือ PILOT-GARDEN ตาม baseline ที่พร้อม ทำหนึ่งชิ้นครบ UI/rules/tests แล้ว playtest ก่อนขยายงาน

ถ้ารับงาน feature คอมโบก่อน ให้เริ่ม COMBO-CORE แล้ว COMBO-FX และ pilot SC01/SC02/SC03 ทีละชุดตาม gate ที่พร้อม ใช้ของเดิมได้โดยไม่ต้องรอของระดับ 10 ห้ามถือว่ามี code จากการเห็น spec นี้

อย่าเริ่มจากเติม declaration ทั้ง 42 ชิ้นใน gifts.ts หรือจอง SQL v187 ทันที เพราะ registry ของบางรางวัลยังไม่ปิด และอีก session อาจใช้หมายเลขนั้นก่อน

## ข้อเสนอที่ยังต้องปิดใน contract

ชื่อและ runtime IDs ของรางวัลยังไม่จอง Quota bank สูงสุด 3 วันเป็นการทดลองเฉพาะกิจกรรมส่วนตัว ไม่ใช่ requirement ของ foundation ที่ต้องแก้ USES ของเดิมทั้งหมด การกลับ checkpoint, revive tombstone, pollen expiry และ instance payout ต้องกำหนดให้สอดคล้อง state ที่ฐานใหม่มีจริง

ถ้า gameplay ใหม่ให้ effect เดียวกับแบบรางวัล ให้ปรับรางวัลตามจุดเด่นของสายและบันทึก decision การเปลี่ยนแบบตั้งต้นเป็นส่วนหนึ่งของงานเตรียม implement ไม่ต้องตั้ง approval ขั้นใหม่ทุกไอเทม แต่ขอบเขต deploy/SQL production ต้องอิงคำสั่งผู้ใช้และ workflow ปัจจุบัน

## สถานะส่งต่อ

| เรื่อง | สถานะ |
|---|---|
| แผนและกระดานงาน | เตรียมแล้ว; ดูหลักฐานตรวจเอกสารด้านล่าง |
| รางวัลใหม่ implement | ยังไม่เริ่ม |
| Balance ของเดิม applied | ยังไม่เริ่ม |
| คอมโบลับ implement และ VFX/discovery | ชุดนำร่อง 5 ชุด implement/tested locally; ดู [combo-implementation.md](combo-implementation.md) |
| Gameplay tests/build ของรางวัลชุดนี้ | รางวัลระดับใหม่ยังไม่รัน; คอมโบผ่าน tests/build แยกตาม combo-implementation.md |
| Deploy/SQL installation ของรางวัลชุดนี้ | ยังไม่มี |
| ผู้รับ code task / ผู้รวมงาน | combo implementation 2026-10-10 รับเฉพาะ pilot คอมโบ; ผู้รวม reward rollout ยังไม่มี |

## หลักฐานตรวจเอกสาร

ตรวจด้วย Python จาก source และ Markdown: design keys ใหม่ครบ 42 ชิ้นไม่ซ้ำ ตรงกับ missing tiers ของ 9 สาย; source รางวัลเดิม 45 ชิ้นพร้อมรางวัล well 3 ชิ้น รวมเป้าหมาย 90 ทุก key อยู่ใน backlog และ local links เปิดถึงไฟล์จริงได้ ตรวจ fenced blocks ครบคู่และไฟล์เป็น UTF-8 ผลเป็น PASS ไม่มี game tests/build ในรอบเอกสารนี้

ตรวจแบบคอมโบเพิ่มด้วย Python: SC01–SC18 ไม่ซ้ำ อ้างอิง IDs เดิมหรือ design keys ที่มีจริง ทุกชุดถูกกฎ 2 charms/1 familiar รองรับ C+C, C+F และ C+C+F; 15 ชุดใช้ของเดิม 3 ชุดใช้ของในแบบ มี 14 ชุดข้ามสายและครอบคลุม 9 สาย ทุก SC key อยู่ใน task, backlog รวม 41 tasks ไม่ซ้ำ และ local links 22 จุดเปิดได้ ผลเป็น PASS การตรวจนี้ยืนยันแบบเอกสาร ไม่ใช่ผลทดสอบ runtime

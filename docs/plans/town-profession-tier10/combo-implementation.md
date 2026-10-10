# Handoff: คอมโบชุดนำร่อง 2026-10-10

ผู้ใช้อนุมัติ implement พร้อม gen ภาพ ชุดนี้ทำ SC01/SC02/SC03/SC11/SC13 จำนวน 5 คอมโบจากของเดิม เป็นงานเพิ่มข้าง gameplay อีก session; รางวัล tier 7–10 และ 13 คอมโบที่เหลือยังเป็น backlog

Implemented: local | Tested: local | Deployed: no | SQL installed: no | Live verified: no

## พฤติกรรมที่ส่งต่อ

| Key | ผลที่ทำจริง | การใช้สิทธิ์ |
|---|---|---|
| SC01 | ทุ่น–นาก: retry เริ่มใกล้ฝั่งขึ้น 20% | ใช้ ordinary otter rescue + pool rescue วันละ 3 |
| SC13 | ทุ่น–สายไหม–นาก: retry เริ่มใกล้ฝั่งขึ้น 35%; แทน SC01 | ใช้ pool เดียวกัน ไม่จ่ายสองผล |
| SC02 | ขวานสะท้อน–นก: ชี้รอยบากที่อ่านผิดหนึ่งจุดก่อนฟัน ไม่เลือกให้ | หนึ่งครั้งต่อ go ของต้นหลัก ไม่มี daily cap |
| SC03 | ตะเกียงเหมือง–ค้างคาว: ผังหินแข็งบนกระดานก่อนเลือกแนวขุด | หนึ่งครั้งต่อ pending vein ไม่มี daily cap |
| SC11 | ตะเกียงเหมือง–นก: ดาวชี้แนว echo ก่อนเลือก ore/crystal | หนึ่งครั้งต่อ pending vein ไม่มี daily cap |

ผลเชิงข้อมูลเคารพ tool/buff ที่เฉลยอยู่แล้ว ส่วน ordinary gifts, forging, inventory, stamina และการจ่ายรางวัลยังใช้กฎเดิม นากยังต้องมีสิทธิ์เดิมและผู้เล่นยังเล่น retry ให้จบ

Decision จาก spec เดิม: ใช้ warm start คงที่ 20/35% แทนการเก็บ progress ที่ client อ้าง เพราะ town_land ปัจจุบันไม่ได้ replay เต็ม fight; เก็บค่า boost บน line และปรับ fastest-fight validation จากค่านั้นเท่านั้น SC03 ให้ข้อมูล pending vein แทนการ scan ชั้น; SC02/03/11 ไม่มี daily quota เพราะเป็นการอ่านสถานการณ์ ไม่ควรทำให้ผู้เล่นกลัวเสียสิทธิ์รายวัน

## Interfaces และความลับ

- `Keeper.comboPrepare?('wear'|'wood'|'cavity'|'echo', input?)` เป็น optional; DbKeeper ใช้ member RPC `town_combo`; ฐานเก่าที่ไม่มี RPC เล่นเดิมได้
- Wear ตอบเพียง family cue ไม่บันทึก discovery. Wood รับเฉพาะ notches; server หา tree/hints/time จาก held go. Mining หา seed/mods จาก pending vein ใน purse. Client เลือก key หรือ quota ไม่ได้
- Snapshot ชุด active ตอนเริ่ม go/cast/vein; ตอนเกิดผลต้องยังใส่ชุดเดิม ลำดับ charm ไม่เปลี่ยนผล ไม่มีการใช้สัตว์สองตัว
- Helper และ registry อยู่ใน schema town พร้อม revoke public/anon/authenticated; ไม่เติม catalog entry สูตรคอมโบ production browser import เฉพาะ combo-types และ UI; private TypeScript rules ใช้เฉพาะ trial/tests/generator
- Purse.combos เก็บ found, used, last และ action receipts สูงสุด 64 ต่อคน อายุไม่เกินหนึ่งวัน กฎมี version 1; เปลี่ยน version ไม่ reset quota โดยอัตโนมัติ
- สมุดแสดงเฉพาะ found พร้อมองค์ประกอบและข้อจำกัด ไม่มีจำนวนชุดที่เหลือหรือ unknown placeholders ภาพของ 3 families เป็น generic motif ไม่เฉลยสูตร
- Pilot แสดงเอฟเฟกต์ในอุปกรณ์และมินิเกมของผู้เล่นเอง ยังไม่มี broadcast การค้นพบ/สูตรให้คนใกล้เคียง
- Trial snapshots ของต้น/vein อยู่ใน keeper ของแท็บ; reload กลาง action อาจไม่ให้ hint คอมโบใน trial ส่วน production snapshots อยู่ในฐานข้อมูล

## ไฟล์หลักและ ownership

ใหม่: lib/town/combo-types.ts, lib/town/private/combos.ts, private/combos.test.ts, combo-keeper.test.ts; TownComboFx.tsx, TownComboBook.tsx; public/town/combos/{water,wood,echo}-v1.png; v194 SQL และ scripts/db/{combo-db,build-v194,v194.test}.mjs; scripts/check-combo-public.mjs

Shared files แก้เฉพาะ integration: trade.ts, keeper.ts, keeper-trial.ts, TownMe.tsx, TownFish.tsx, TownWoodGrain.tsx, TownFelling.tsx, TownTrees.tsx, TownMine.tsx, TownVein.tsx อย่าเขียนทับไฟล์จาก baseline v179 เพราะมี gameplay ใหม่ของอีก session

Compatibility fixes ระหว่าง build: foraging-parts.test.ts ใช้ chamomile ที่มีจริงแทน daisy; stream-work.ts ใช้ refusal helper ที่มี type แคบตรง route รวม spent; trial.streamDo ตอบ had ตรง ๆ แทน trade.no ซึ่ง type ไม่รองรับ had ไม่เปลี่ยนความหมาย gameplay ของอีก session

ภาพมาจาก built-in imagegen สาม call, พื้นหลังโปร่งใส ตรวจ alpha แล้ว สำเนาต้นฉบับอยู่ใน repo ดู [combo-assets.md](combo-assets.md) สำหรับ paths และ prompt briefs ภาพแสดงผ่าน CSS pixelated; animation เคารพ town motion switch และ prefers-reduced-motion ไม่เพิ่มเสียง

## Migration และการทดสอบ

[v194_secret_equipment_bonds.sql](../../../supabase/v194_secret_equipment_bonds.sql) ต้องมี v180–v182/v184–v185 ก่อน; v183 เป็น hook แยกตามฐานเกมเดิม Generator โหลด snapshot v178 → v179 จาก history → pending chain ที่มีจริงถึง v193 เพื่อไม่ยก definition เก่าทับ phase ใหม่ Hash guards ยอมรับเฉพาะ definition ที่ทดสอบหรือผล v194 แล้ว; ถ้า phase ใหม่แก้ function เดียวกันให้ rebuild และทดสอบใหม่ก่อนรัน

คำสั่ง (PowerShell ใช้ npm.cmd/npx.cmd):

```text
node .claude/skills/fc-cash-town/scripts/db/build-v194.mjs
node .claude/skills/fc-cash-town/scripts/db/v194.test.mjs
npx.cmd vitest run lib/town/private/combos.test.ts lib/town/combo-keeper.test.ts lib/town/fishing.test.ts lib/town/wood-grain.test.ts lib/town/woodcutting.test.ts lib/town/geology.test.ts lib/town/felling.test.ts lib/town/keeper.test.ts lib/town/foraging-parts.test.ts
npm.cmd run build
node .claude/skills/fc-cash-town/scripts/check-combo-public.mjs
```

DB bench ใช้ PGlite 0.5.8 ที่มีอยู่ใน E:/NinenineProject/fcnext-codex-bench; ย้ายเครื่องให้ตั้ง FC_DB_BENCH ไปโฟลเดอร์ที่มี package.json/node_modules และ pglite-harness.mjs. ใช้ local snapshot ไม่เชื่อม live DB

หลักฐานล่าสุด: 52 database checks ผ่าน ครอบคลุม rerun, catalog/purse ไม่เปลี่ยนตอนติดตั้ง, privileges, normalization, C+C/trio/two-pet exclusion, pool/day reset, replay, snapshot change, real member mining/wood RPC และ real town_land rescue + forged-progress rejection. Regression suite ตามคำสั่งด้านบนผ่าน 183 tests ใน 9 files วันที่ 2026-10-10 14:59 น. Build ผ่านและ private registry ไม่พบใน 100 production browser chunks

Browser QA ใช้ agent-browser session combo-pilot บน dev port 3014: สวม EchoAxe/Woodpecker ผ่าน Test, เปิดต้น 48, เลือกรอยผิดและรับ hint SC02 จริง ภาพโหลดและแสดง discovery; สมุดบันทึกเฉพาะ SC02 ไม่มี unknown placeholders ตรวจสมุดทั้ง 1440×1000 และ 390×844. Screenshots local ใน .codex/combo-wood-discovery.png, .codex/combo-book.png และ .codex/combo-mobile.png. ไม่ได้ถือว่าเป็น live SQL/UI test

## ขั้นถัดไป

1. ผู้รวม gameplay ตรวจ chain ล่าสุดแล้วรัน generator/tests อีกครั้งถ้า definition เปลี่ยน จากนั้น deploy site และให้ owner ติดตั้ง v194 ตาม workflow SQL เดิม
2. ลอง mining/fishing ใน staging ที่ติดตั้ง SQL แล้ว ตรวจ retry/resume, รอบ twin/legend, latency และความชัดเจนของ discovery บนจอมือถือก่อน release
3. รับ SC04–SC10/SC12/SC17–SC18 ทีละ 1–3 ชุดเมื่อฐานแต่ละสายพร้อม อย่าเพิ่มสูตรใน public catalog และอย่าเติมคอมโบที่ไม่ถูกช่องสวม

Released ยังเป็น no จนมีหลักฐาน deploy, SQL installed และ live verified จริง งานรับคืน shared files ใน pilot นี้แล้ว

Hashes ของ source/SQL ที่จับหลังตรวจในเครื่องและผลตรวจรวมอยู่ใน [combo-validation.json](combo-validation.json) working tree ยังมีอีก session แก้อยู่ จึงต้องตรวจความต่างและรันใหม่เมื่อรวม phase ถัดไป

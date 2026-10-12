# กระดานงาน implement รางวัลสายอาชีพ

อัปเดต 2026-10-11: **42/42 รางวัลใหม่, 90 รางวัลรวม, 18/18 คอมโบ และคู่มือ 90 ชิ้น local-done** ดู [handoff ฉบับจบ](sessions/final-2026-10-11.md) และ [release package](release.md) ทุก runtime contract ใน backlog นี้ปิดแล้วในเครื่อง; released/live verified ยังต้องติดตั้งและลองจริง

## สถานะและวิธีรับงาน

`planned` = รอรับ, `claimed` = มีผู้รับ, `active` = กำลังทำ, `waiting-base` = รอฐานหรือ action contract เฉพาะชิ้น, `review` = พร้อมรวม/ตรวจ, `local-done` = ผ่าน acceptance ในเครื่อง, `released` = deploy และติดตั้งส่วนที่ต้องใช้พร้อมหลักฐานแล้ว

สถานะ `waiting-base` ใช้บอก dependency ในกระดานงาน ไม่ใช่คำสั่งหยุดทุกสาย ผู้รับสามารถทำ contract และงานที่ไม่ขึ้นกับฐานนั้นได้ คอลัมน์ owner ใช้ชื่อ session ที่ระบุตัวตนได้ ห้ามเปลี่ยนงานของคนอื่นกลับเป็น planned เพราะแชทเงียบ

ผู้รวมแผนและการรับฐาน: **tier10 baseline review 2026-10-10** (session นี้). Runtime tasks เสร็จในเครื่องแล้ว; ไม่มีการอนุมัติหรือลงมือ deploy จากรอบนี้. ไม่ถือว่า session gameplay เดิมรับงานรางวัลต่ออัตโนมัติ

## Baseline gates — ประวัติ ณ เริ่มงาน (runtime contracts ปิดแล้ว)

| Gate | Source/ระบบที่ต้องรับ | สถานะ ณ เริ่มแผน | หลักฐานที่ใช้เปิด gate |
|---|---|---|---|
| B-COMMON | gifts, keeper capability, workshop, inventory/atomic rules | source-ready; รับ handoff แล้ว | gameplay handoff; รอบนี้ replay SQL 51 checks; snapshot ใน baseline-review-validation.json |
| B-FISH | river fishing, rods/lines, habitat/current, v198 | source-ready; owner-confirmed installed | gameplay handoff; รอบนี้ regional/registry tests; ยังต้อง live playtest |
| B-WOOD | grain, chosen part, tool buffs, v184 | source-ready; owner-confirmed installed | handoff และ replay; extraction/chain receipt ของรางวัลยังต้องสร้าง |
| B-MINE | echo, ore/crystal, geological yield, v185 | source-ready; owner-confirmed installed | handoff และ replay; อ่าน cave ล่าสุดร่วมกับ v200; compass knowledge/anchors ยังต้องสร้าง |
| B-GARDEN | footprint, root/satellite, crossing/tools, v186 | source-ready; owner-confirmed installed | handoff; yield/pollen contract ของรางวัลยังต้องปิด |
| B-INSECTS | routes/lures, catches, garden release, v187 | source-ready; owner-confirmed installed | handoff; timed personal habitat/swarm ยังไม่มี; รักษา v200 reader |
| B-FOREST | trace, plant parts, ecology, v188 | source-ready; owner-confirmed installed | handoff; private trail และ second-part budget ยังต้องสร้าง |
| B-WATER | shared channels, transfer/filter/mix/properties, v196 | source-ready; owner-confirmed installed | handoff; reward destination/container/root routing ยังต้องปิด |
| B-KITCHEN | preparation/seasoning/provisions, v197 | source-ready; owner-confirmed installed | handoff; retry checkpoint และ cook/meal provenance ยังไม่มี |
| B-HELP | camps/field support, v197 | source-ready เฉพาะ camps; owner-confirmed installed | handoff; checkpoint/consent/revive สำหรับรางวัลยังไม่มี |

ไม่เปิด gate จากแค่เห็นไฟล์ใหม่ใน repo ระบุใน handoff ว่าฐาน commit ใด หรือถ้ายัง dirty ให้มีรายการไฟล์และ hash ของไฟล์สำคัญที่ทดสอบแล้ว การมี SQL ในโฟลเดอร์ไม่ได้ยืนยัน installation

หลักฐานรับฐานและเงื่อนไขเฉพาะทั้ง 9 สายอยู่ใน [baseline-review-2026-10-10.md](baseline-review-2026-10-10.md). source-ready ไม่ใช่ live verified และไม่รับรอง contract ที่ยังไม่ implement ของรางวัล

## Backlog และ acceptance

| Task | งาน/รางวัล | Dependency | ผลที่ใช้รับงาน | Status | Owner |
|---|---|---|---|---|---|
| PLAN-01 | เอกสารกลาง แบบ 42 ชิ้น กระดานและ handoff | — | ครบ 9 สาย ครบ missing tiers มี link และขั้นต่อไป | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| COMBO-PLAN | แบบคอมโบลับ 18 ชุดและ discovery/VFX contract | PLAN-01 | ครอบคลุม 9 สาย ช่องสวมถูกกฎ แยกของเดิม/ของในแผน และมีงานต่อ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| SETUP-01 | รับ snapshot จาก gameplay และจัดเจ้าของไฟล์ | PLAN-01 | เปิด baseline gates ที่มีหลักฐาน; บันทึก unresolved interfaces และผู้รวมงาน | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FOUNDATION-01 | รับรางวัล/availability, quota และ action lifecycle | SETUP-01, B-COMMON | server เก่าปิดของที่ไม่มี capability; rank claim ไม่ซ้ำ; retry/resume ไม่จ่ายซ้ำ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| COMBO-CORE | Private matcher, action effects, shared pools และ discovery | SETUP-01, B-COMMON, COMBO-PLAN | C+C/C+F/C+C+F, priority/subset, unequip/resume, once-only และ private client projection | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| COMBO-FX | Equip cue, action burst และ discovered-only notebook | COMBO-CORE | ผลจริงมี VFX เฉพาะ; unknown ไม่มีสูตร; ปิดเสียง/reduced motion และ nearby FX ไม่เปิดข้อมูลส่วนตัว | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| COMBO-PILOT | SC01–SC03 และ SC11/SC13 จากของเดิม | COMBO-CORE, COMBO-FX, B-FISH, B-WOOD, B-MINE | use path/UI/RPC พร้อม quota ของสัตว์เดิม, ไม่มี auto-win และ tests/server parity | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| COMBO-CROSS | SC04–SC10, SC12 และ SC17–SC18 ข้ามสาย เครื่องรางคู่ และชุดสามชิ้น | COMBO-PILOT, action contracts ของแต่ละชุด | ฐาน gameplay รับแล้ว; แบ่ง 1–3 ชุด/แชท ปิด checkpoint/provenance/guard/extraction contracts ก่อน; SC01/SC13 pool เดียว | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| COMBO-TIER10 | SC14–SC16 จากรางวัลใหม่ | COMBO-CORE, COMBO-FX, PILOT-WOOD, FILL-MINE, FILL-FISH | ใช้ runtime IDs จริง โดมิโน/แปลงสี/รอกไม่ duplicate ผลเดิม และเปิดเฉพาะ capability ที่พร้อม | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| COMBO-REVIEW | OP loadout, secrecy และ discovery playtest | combo tasks ใน release scope local-done | ทุกชุดถูก slots, ไม่มี loop; bundle/catalog/API ไม่ส่ง secret rules และผู้เล่นสังเกตผลได้ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| BAL-01 | integration ของเดิม: rod wording, pouches, root count, UI limits | gate ของสายที่แตะ | ไม่เปลี่ยน slots/เศรษฐกิจโดยไม่ตั้งใจ; แก้ inventory path ครบ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FIRST-MINE | mining04 เข็มทิศสายแร่ (ส่วนแรกของ FILL-MINE) | FOUNDATION-01, BAL-01, B-MINE | known mineral, coarse direction/distance, server-only hidden fate, 5 scans/วัน, retry ไม่หักซ้ำ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FIRST-WOOD | felling04 สกัดส่วนเล็ก (ส่วนแรกของ FILL-WOOD) | FOUNDATION-01, BAL-01, B-WOOD | extraction receipt หลังตัดจริง, เล่น/จ่ายแรงเพิ่ม, 5 ต้น/วัน, รวมไม่เกิน 2 parts และไม่ซ้ำ echo/forge | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| PILOT-WOOD | felling05 โดมิโน | FOUNDATION-01, B-WOOD | 1–3 eligible targets จ่ายแรงจริง, echo ไม่คูณ 6, failed/full/retry ตรง | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| PILOT-MINE | mining07 ลิฟต์ | FOUNDATION-01, B-MINE | anchor เฉพาะ visited, 6 single legs, disconnect ไม่ติดชั้น/refresh หิน | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| PILOT-GARDEN | farming07 ผักยักษ์ | FOUNDATION-01, B-GARDEN | 2×2 placement, root payout, single-harvest prototype และ combo table | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| PILOT-FISH | fishing08 เรือ | FOUNDATION-01, B-FISH | จุดขึ้นลง/current, passenger consent, exit ปลอดภัย, ไม่มี gate bypass | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| PILOT-FOREST | forest07 วงแหวน trail | FOUNDATION-01, B-FOREST | 3 จุดส่วนตัว resume และ single payout; ใช้ trail contract ที่ต่อยอดได้ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| PILOT-INSECTS | insects08 โคม | FOUNDATION-01, B-INSECTS | habitat/known species, 20 นาที, manual catch, cloak ไม่มี follower loop | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| PILOT-KITCHEN | kitchen07 ปิกนิก | FOUNDATION-01, B-KITCHEN | solo/4 คน servings และ meal quotas จ่ายจริง; ออกจากวงแล้วไม่กินระยะไกล | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| PILOT-WATER | well08 แตร | FOUNDATION-01, B-WATER, B-GARDEN | routing ผิดบางต้นไม่ได้รับน้ำ, cost ต่อ root, 90 นาที cooldown | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| PILOT-HELP | helpers08 ธงค่าย | FOUNDATION-01, B-HELP | 5 ผู้รับ, benefit ครั้งเดียวรวมหลายค่าย, same-effect ใช้ strongest | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FILL-KITCHEN | kitchen08–09 | PILOT-KITCHEN | ไฟเกมยากเป็นตัวเลือก; recipe effects max 2 และ refund/meal ไม่มี loop | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FILL-WATER | well07, well09 | PILOT-WATER | transfer conserve volume; spring 12 bucketfuls shared แท้ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FILL-HELP | helpers07, helpers09 | PILOT-HELP, B-GARDEN | root recovery ไม่จ่ายซ้ำ; revive มี tombstone provenance และ consent | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FILL-FISH | fishing07, fishing09 | PILOT-FISH | weighted eligible pool, charge ต่อ line, star exclusion และ bait/wariness parity | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FILL-FOREST | forest08–09 | PILOT-FOREST, B-KITCHEN | honey/wax มีสูตรใช้จริง; trail ปลายทางไม่จ่ายซ้ำ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FILL-INSECTS | insects07, insects09 | PILOT-INSECTS, B-GARDEN | arena ไม่มีพนัน/ปั่น XP; pollen เลือกหนึ่งผลและ consume ตัวจริง | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FILL-GARDEN | farming08–09 | PILOT-GARDEN | selectable known pair และ pollen storage/expiry/once-per-root ครบ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FILL-WOOD | felling06, felling07, felling08, felling09 (felling04 แยก FIRST-WOOD) | FIRST-WOOD, PILOT-WOOD, B-COMMON | แบ่งเป็น 2–3 แชท: portable craft, bridge, mastery/covenant | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FILL-MINE | mining05, mining06, mining08, mining09 (mining04 แยก FIRST-MINE) | FIRST-MINE, PILOT-MINE, B-COMMON | แบ่งเป็น 2–3 แชท: repair, portable process, branch/conversion | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| BAL-02 | buff ของเดิมที่อ่อน และความยากตาม rank | prototypes ของสายที่แตะ | เปรียบเทียบกับ tools/buffs ใหม่; บันทึกเหตุผลปรับทีละตัว ไม่ blanket buff | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FINALE-KITCHEN | kitchen10 | FILL-KITCHEN, shared lifecycle พร้อม | feast 3 ขั้น solo/coop, resume, meal budget และ single payout | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FINALE-WATER | well10 | FILL-WATER, B-GARDEN | local rain 3 consent beds, catalyst จริง, ไม่กระตุ้น global weather | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FINALE-HELP | helpers10 | FILL-HELP, shared checkpoints พร้อม | restore checkpoint ของงานที่ whitelist; ไม่ย้อน transactions ที่สำเร็จ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FINALE-FISH | fishing10 | FILL-FISH, trail lifecycle พร้อม | legend ตามความรู้/progression, 3 clues, ไม่จ่ายปลาจากแค่เปิด run | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FINALE-FOREST | forest10 | FILL-FOREST | 2 parts/capped targets, familiar slot และ resource cooldown ถูกต้อง | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FINALE-INSECTS | insects10 | FILL-INSECTS, trail lifecycle พร้อม | capped private swarm, distinct catches, cloak และ quota ไม่วน | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FINALE-GARDEN | farming10 | FILL-GARDEN, trail lifecycle พร้อม | grow แล้วเปิด garden, 3 points/run, ไม่เพิ่ม upkeep บังคับ | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FINALE-WOOD | felling10 | FILL-WOOD, trail lifecycle พร้อม | 3 known trees, instance budget, forged powers ไม่เพิ่ม respawn | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| FINALE-MINE | mining10 | FILL-MINE, trail lifecycle พร้อม | 3 rooms branch/resume, หนึ่ง budget ต่อ run, gem conversion ไม่ duplicate | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| INTEGRATE-01 | รวม catalog/UI/API/icons และ OP review | task ที่อยู่ใน release scope local-done, COMBO-REVIEW ถ้า release มีคอมโบ | rank matrix ไม่มีช่องขาดใน scope; every ID wired; legal combos และ economy ผ่าน | local-done | tier10 implementation 2026-10-11; sessions/final-2026-10-11.md |
| RELEASE-01 | package migrations/site และ live checks | INTEGRATE-01 | dependency/rerun/privilege probes; site deploy + SQL install แยกบันทึก | review | package พร้อม; live install/deploy/smoke ยังไม่ทำ |

จะ release เป็นชุดย่อยได้ ไม่ต้องรอครบทุกสาย ผู้รวมงานต้องระบุ release scope แล้วใช้ capability gate ไม่เผยคำประกาศของงานที่ยังใช้ไม่ได้ การปิด objective ทั้งโครงการต้องครบ 90 rewards และ acceptance ของทุกสาย

ลำดับรอบใหม่: FOUNDATION-01 + BAL-01 → mining04 + felling04 (ส่วนย่อยของ FILL-MINE/FILL-WOOD ไม่ต้องรอลิฟต์/โดมิโน) → playtest → รางวัลเด่น/คอมโบทีละชุด → เติม tier กลาง → 9 finales. รายการ waiting-base เดิมหมายถึง contract เฉพาะ reward ไม่ใช่รอ session gameplay ทั้งโครงการอีกแล้ว; dependency ของส่วนย่อยชัดใน baseline review

คอมโบเป็น feature เพิ่มแยกจากจำนวนรางวัล 90 ชิ้น แบบเต็มอยู่ใน [secret-combos.md](secret-combos.md) การปิด scope ที่รวม feature นี้ต้องมีชุดที่รับไว้ใน release ทำงานครบพร้อม VFX/discovery ไม่ปิดงานจาก matcher เพียงอย่างเดียว COMBO-PILOT แบ่งเริ่มทีละชุดตาม baseline ที่พร้อมได้ ไม่ต้องรอทั้งสาม gate แล้วค่อยทำทั้งหมด

## กลุ่มไฟล์ที่ต้องต่อคิว

| พื้นที่ | ไฟล์หรือระบบ | Owner ณ เริ่มแผน | วิธีส่งรวม |
|---|---|---|---|
| Reward registry | gifts.ts, lines.ts, well.ts, catalog.ts | — | ID/rank/kind/constants และ additions ทีละชุด; ไม่เพิ่ม reward ก่อน use path พร้อม |
| Inventory/state | trade.ts, items.ts, pouches.ts, uses.ts | — | field contract, normalization/backward compatibility และ atomic inventory cases |
| API/capability | keeper.ts, keeper-trial.ts และ DB keeper ที่เกี่ยวข้อง | — | signatures, result/refusal types, capability key และ trial/server parity |
| Secret combos | private rule source, combo state, discovered-only projection และ action VFX events | — | ให้ผู้รวมงานยืนยัน import/API boundary; ห้ามใช้ public gift catalog แจกสูตรคอมโบทั้งหมด |
| World/instances | world.ts, movement, shared trail/checkpoint state | — | bounds/ownership/TTL/exit behavior กับ coordinate allocation |
| Art/UI shared | icon-atlas.json, atlas generation, gift/profile UI | — | artwork source/IDs หลัง runtime ID นิ่ง; atlas ผู้รวมงานสร้างทีละชุด |
| SQL | supabase และ scripts/db generators/tests | — | จองหมายเลขและ chain หลังตรวจ source ล่าสุด ไม่ยกของเก่าทับจาก baseline v179 |

## Migration registry

| ชุด | Number/file | สถานะ | Owner/หลักฐาน |
|---|---|---|---|
| gameplay foundation | v180–v182 | deployed; owner-confirmed installed | adventure-expansion-handoff.md; live gameplay ยังต้องตรวจ |
| removable hook | v183 | ติดตั้งตามหลักฐานเดิม; แยกจากลำดับ foundation | adventure handoff; ไม่เสนอ rerun |
| wood/geology/garden/insects/forest | v184–v188 | deployed; owner-confirmed installed | adventure-expansion-handoff.md; รับ source gates แล้ว |
| world read cache | v195 | production applied; เก็บ SQL ใน .codex/ram-audit/applied-v195.sql | fix-verification.json; ไม่สร้างคืนเป็น pending migration |
| water/kitchen/camps/regional fish | v196–v198 | deployed; owner-confirmed installed | adventure-expansion-handoff.md; 294 usable additions แยกจาก rewards |
| mountain/cave bag drops | v199 | source มี; installation ยังไม่ยืนยันในหลักฐานที่ตรวจ | อิสระจาก reward chain |
| faster bugs/cave readers | v200 | มี applied copy, live-definition replay และ live probe 19 checks จาก session เดิม | baseline review ระบุหลักฐานใหม่กว่า validation.json; รักษา cache/invalidation |
| flame 5 seconds | v201 | source SQL/frontend; installation/deploy รุ่นนี้ยังไม่ยืนยัน | งาน dirty ของอีก session; ไม่แก้ในแผนรางวัล |
| tier10 foundation/rewards | v207–v251 (v215 รับฐานติดตั้งเดิม) | local-done; 44 pending files prepared | release-manifest.json / sessions/final-2026-10-11.md |
| tier10 first reward actions | v207 | local-done | after v203/v205; casino independent; sessions/final-2026-10-11.md |
| secret combo pilot | [v194_secret_equipment_bonds.sql](../../../supabase/v194_secret_equipment_bonds.sql) | deployed; owner-confirmed installed; live effects ยังต้อง smoke | อยู่ใน 12 ไฟล์ที่ owner แจ้งติดตั้ง; ไม่ rerun โดยถือเป็นงานค้าง |

ไม่มีการอนุมัติรัน SQL production ในรอบวางแผนนี้ กระบวนการเดิมใน adventure-expansion ให้ผู้ใช้รัน SQL เอง; session implement ทำไฟล์และหลักฐานให้ review ได้ก่อน

## รูปแบบ handoff ของ task

```markdown
# ส่งต่องาน TASK และ SESSION

อัปเดต YYYY-MM-DD HH:mm Asia/Bangkok
Task: ... | Owner: ... | Status: ...

## ผลและขอบเขต
ผู้เล่นทำอะไรได้แล้ว / ยังทำอะไรไม่ได้
Design keys และ runtime IDs / rank / kind
Combo keys / effect group / shared quota pool / priority / rule version ถ้างานมีคอมโบ
Baseline commit หรือรายการไฟล์และ hash สำคัญที่ทดสอบ
ไฟล์ที่แก้โดย session นี้ และไฟล์ dirty ของคนอื่นที่ห้ามทับ

## Contract และ decision
Activation, costs, targets/ownership, quota charge point
Failure/full bag/retry/resume, stacking และ cap
Discovery trigger, cue/event และ private projection ถ้างานมีคอมโบ
Dependency/interface ที่เปลี่ยน และเหตุผลที่ต่างจาก rewards.md

## หลักฐาน
คำสั่งทดสอบ + ผล + วันเวลา
Implemented: ... | Tested: ... | Deployed: ... | SQL installed: ... | Live verified: ...
Migration number/chain และสิ่งที่ต้องรันก่อน

## ขั้นต่อไป
งานถัดไป 1–3 ข้อที่ลงมือได้
จุดค้าง/ข้อผิดพลาดจริงพร้อม file/function
Shared file lock ที่ส่งคืน หรือยังถืออยู่
```

การส่งต่องานควรเปิด source ต่อได้โดยไม่อ่านประวัติแชททั้งหมด ถ้าคำสั่งทดสอบไม่ได้รันให้เขียนตรง ๆ ถ้ารันบนฐานที่เปลี่ยนภายหลังให้ระบุว่าต้องทดสอบใหม่

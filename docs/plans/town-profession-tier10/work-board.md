# กระดานงาน implement รางวัลสายอาชีพ

อัปเดตเริ่มต้น 2026-10-10 14:06 น. Asia/Bangkok เอกสารแผนพร้อมใช้ งานรางวัลใหม่ยังไม่ได้ implement ; คอมโบชุดนำร่องรับและทำแล้ววันที่ 2026-10-10 ดู combo-implementation.md สำหรับสถานะล่าสุด งาน gameplay ที่มีอยู่เป็นของอีก session ไม่ถือเป็นงานเสร็จของ reward backlog

## สถานะและวิธีรับงาน

`planned` = รอรับ, `claimed` = มีผู้รับ, `active` = กำลังทำ, `waiting-base` = ต้องรับฐาน gameplay, `review` = พร้อมรวม/ตรวจ, `local-done` = ผ่าน acceptance ในเครื่อง, `released` = deploy และติดตั้งส่วนที่ต้องใช้พร้อมหลักฐานแล้ว

สถานะ `waiting-base` ใช้บอก dependency ในกระดานงาน ไม่ใช่คำสั่งหยุดทุกสาย ผู้รับสามารถทำ contract และงานที่ไม่ขึ้นกับฐานนั้นได้ คอลัมน์ owner ใช้ชื่อ session ที่ระบุตัวตนได้ ห้ามเปลี่ยนงานของคนอื่นกลับเป็น planned เพราะแชทเงียบ

ผู้รวมงาน: **ยังไม่มีผู้รับ**. ผู้เริ่ม implement session แรกให้เลือกผู้ดูแลการรวมโดยบันทึกชื่อไว้ ไม่ถือว่า session gameplay เดิมตกลงรับหน้าที่นี้อัตโนมัติ

## Baseline gates

| Gate | Source/ระบบที่ต้องรับ | สถานะ ณ เริ่มแผน | หลักฐานที่ใช้เปิด gate |
|---|---|---|---|
| B-COMMON | gifts, keeper capability, workshop, inventory/atomic rules | มี source; รอ snapshot | test commands/results และ integration handoff ล่าสุด |
| B-FISH | river fishing, rods/lines, habitat/current | มี source; รอรับมาทดสอบ | UI + RPC + tests จากฐานเดียวกัน พร้อมสถานะ v180–v182 |
| B-WOOD | grain, chosen part, tool buffs, v184 | มี source; รอรับมาทดสอบ | เกมอ่านจริง, yield และ SQL parity; ไม่มี reward จาก power ลัดโดยผิดเงื่อนไข |
| B-MINE | echo, ore/crystal, geological yield, v185 | มี source; รอรับมาทดสอบ | ของได้จากการขุดสำเร็จ, depth gates, inventory และ SQL parity |
| B-GARDEN | footprint, root/satellite, crossing/tools, v186 | มี source; รอรับมาทดสอบ | harvest หนึ่งครั้งต่อ root, deterministic cross และ row/hand parity |
| B-INSECTS | routes/lures, catch versus pollination/pests | ตามแผนขยาย gameplay; รอ handoff | การใช้แมลงจริงกับสวน ผลและ quota/ownership ชัด |
| B-FOREST | trace, chosen plant parts, ecology | ตามแผนขยาย gameplay; รอ handoff | shared spawn, trace knowledge และ resource cooldown ชัด |
| B-WATER | branched water, transfer/filter/mix/properties | ตามแผนขยาย gameplay; รอ handoff | accounting น้ำจริง ภาชนะและคุณสมบัติ UI/RPC ตรงกัน |
| B-KITCHEN | prep/heat/sensory, seasoning, provisions | ตามแผนขยาย gameplay; รอ handoff | recipe discovery, meal quota, refund และ buffs ตรงกัน |
| B-HELP | camps/field support/checkpoints | ตามแผนขยาย gameplay; รอ handoff | consent, recipients, checkpoint identity และ camp buffs ชัด |

ไม่เปิด gate จากแค่เห็นไฟล์ใหม่ใน repo ระบุใน handoff ว่าฐาน commit ใด หรือถ้ายัง dirty ให้มีรายการไฟล์และ hash ของไฟล์สำคัญที่ทดสอบแล้ว การมี SQL ในโฟลเดอร์ไม่ได้ยืนยัน installation

## Backlog และ acceptance

| Task | งาน/รางวัล | Dependency | ผลที่ใช้รับงาน | Status | Owner |
|---|---|---|---|---|---|
| PLAN-01 | เอกสารกลาง แบบ 42 ชิ้น กระดานและ handoff | — | ครบ 9 สาย ครบ missing tiers มี link และขั้นต่อไป | local-done | planning session 2026-10-10 |
| COMBO-PLAN | แบบคอมโบลับ 18 ชุดและ discovery/VFX contract | PLAN-01 | ครอบคลุม 9 สาย ช่องสวมถูกกฎ แยกของเดิม/ของในแผน และมีงานต่อ | local-done | planning session 2026-10-10 |
| SETUP-01 | รับ snapshot จาก gameplay และจัดเจ้าของไฟล์ | PLAN-01 | เปิด baseline gates ที่มีหลักฐาน; บันทึก unresolved interfaces และผู้รวมงาน | planned | — |
| FOUNDATION-01 | รับรางวัล/availability, quota และ action lifecycle | SETUP-01, B-COMMON | server เก่าปิดของที่ไม่มี capability; rank claim ไม่ซ้ำ; retry/resume ไม่จ่ายซ้ำ | planned | — |
| COMBO-CORE | Private matcher, action effects, shared pools และ discovery | SETUP-01, B-COMMON, COMBO-PLAN | C+C/C+F/C+C+F, priority/subset, unequip/resume, once-only และ private client projection | local-done | combo implementation 2026-10-10 |
| COMBO-FX | Equip cue, action burst และ discovered-only notebook | COMBO-CORE | ผลจริงมี VFX เฉพาะ; unknown ไม่มีสูตร; ปิดเสียง/reduced motion และ nearby FX ไม่เปิดข้อมูลส่วนตัว | local-done | combo implementation 2026-10-10 |
| COMBO-PILOT | SC01–SC03 และ SC11/SC13 จากของเดิม | COMBO-CORE, COMBO-FX, B-FISH, B-WOOD, B-MINE | use path/UI/RPC พร้อม quota ของสัตว์เดิม, ไม่มี auto-win และ tests/server parity | local-done | combo implementation 2026-10-10 |
| COMBO-CROSS | SC04–SC10, SC12 และ SC17–SC18 ข้ามสาย เครื่องรางคู่ และชุดสามชิ้น | COMBO-PILOT, gates ของสายที่เกี่ยวข้อง | แบ่ง 1–3 ชุด/แชท; predicate/caps/VFX/knowledge ทำงานจริง; SC01/SC13 pool เดียว | waiting-base | — |
| COMBO-TIER10 | SC14–SC16 จากรางวัลใหม่ | COMBO-CORE, COMBO-FX, PILOT-WOOD, FILL-MINE, FILL-FISH | ใช้ runtime IDs จริง โดมิโน/แปลงสี/รอกไม่ duplicate ผลเดิม และเปิดเฉพาะ capability ที่พร้อม | planned | — |
| COMBO-REVIEW | OP loadout, secrecy และ discovery playtest | combo tasks ใน release scope local-done | ทุกชุดถูก slots, ไม่มี loop; bundle/catalog/API ไม่ส่ง secret rules และผู้เล่นสังเกตผลได้ | planned | — |
| BAL-01 | integration ของเดิม: rod wording, pouches, root count, UI limits | gate ของสายที่แตะ | ไม่เปลี่ยน slots/เศรษฐกิจโดยไม่ตั้งใจ; แก้ inventory path ครบ | planned | — |
| PILOT-WOOD | felling05 โดมิโน | FOUNDATION-01, B-WOOD | 1–3 eligible targets จ่ายแรงจริง, echo ไม่คูณ 6, failed/full/retry ตรง | planned | — |
| PILOT-MINE | mining07 ลิฟต์ | FOUNDATION-01, B-MINE | anchor เฉพาะ visited, 6 single legs, disconnect ไม่ติดชั้น/refresh หิน | planned | — |
| PILOT-GARDEN | farming07 ผักยักษ์ | FOUNDATION-01, B-GARDEN | 2×2 placement, root payout, single-harvest prototype และ combo table | planned | — |
| PILOT-FISH | fishing08 เรือ | FOUNDATION-01, B-FISH | จุดขึ้นลง/current, passenger consent, exit ปลอดภัย, ไม่มี gate bypass | planned | — |
| PILOT-FOREST | forest07 วงแหวน trail | FOUNDATION-01, B-FOREST | 3 จุดส่วนตัว resume และ single payout; ใช้ trail contract ที่ต่อยอดได้ | waiting-base | — |
| PILOT-INSECTS | insects08 โคม | FOUNDATION-01, B-INSECTS | habitat/known species, 20 นาที, manual catch, cloak ไม่มี follower loop | waiting-base | — |
| PILOT-KITCHEN | kitchen07 ปิกนิก | FOUNDATION-01, B-KITCHEN | solo/4 คน servings และ meal quotas จ่ายจริง; ออกจากวงแล้วไม่กินระยะไกล | waiting-base | — |
| PILOT-WATER | well08 แตร | FOUNDATION-01, B-WATER, B-GARDEN | routing ผิดบางต้นไม่ได้รับน้ำ, cost ต่อ root, 90 นาที cooldown | waiting-base | — |
| PILOT-HELP | helpers08 ธงค่าย | FOUNDATION-01, B-HELP | 5 ผู้รับ, benefit ครั้งเดียวรวมหลายค่าย, same-effect ใช้ strongest | waiting-base | — |
| FILL-KITCHEN | kitchen08–09 | PILOT-KITCHEN | ไฟเกมยากเป็นตัวเลือก; recipe effects max 2 และ refund/meal ไม่มี loop | waiting-base | — |
| FILL-WATER | well07, well09 | PILOT-WATER | transfer conserve volume; spring 12 bucketfuls shared แท้ | waiting-base | — |
| FILL-HELP | helpers07, helpers09 | PILOT-HELP, B-GARDEN | root recovery ไม่จ่ายซ้ำ; revive มี tombstone provenance และ consent | waiting-base | — |
| FILL-FISH | fishing07, fishing09 | PILOT-FISH | weighted eligible pool, charge ต่อ line, star exclusion และ bait/wariness parity | planned | — |
| FILL-FOREST | forest08–09 | PILOT-FOREST, B-KITCHEN | honey/wax มีสูตรใช้จริง; trail ปลายทางไม่จ่ายซ้ำ | waiting-base | — |
| FILL-INSECTS | insects07, insects09 | PILOT-INSECTS, B-GARDEN | arena ไม่มีพนัน/ปั่น XP; pollen เลือกหนึ่งผลและ consume ตัวจริง | waiting-base | — |
| FILL-GARDEN | farming08–09 | PILOT-GARDEN | selectable known pair และ pollen storage/expiry/once-per-root ครบ | planned | — |
| FILL-WOOD | felling04, felling06, felling07, felling08, felling09 | PILOT-WOOD, B-COMMON | แบ่งเป็น 2–3 แชท: extraction/portable craft, bridge, mastery/covenant | planned | — |
| FILL-MINE | mining04, mining05, mining06, mining08, mining09 | PILOT-MINE, B-COMMON | แบ่งเป็น 2–3 แชท: scan/repair, portable process, branch/conversion | planned | — |
| BAL-02 | buff ของเดิมที่อ่อน และความยากตาม rank | prototypes ของสายที่แตะ | เปรียบเทียบกับ tools/buffs ใหม่; บันทึกเหตุผลปรับทีละตัว ไม่ blanket buff | waiting-base | — |
| FINALE-KITCHEN | kitchen10 | FILL-KITCHEN, shared lifecycle พร้อม | feast 3 ขั้น solo/coop, resume, meal budget และ single payout | planned | — |
| FINALE-WATER | well10 | FILL-WATER, B-GARDEN | local rain 3 consent beds, catalyst จริง, ไม่กระตุ้น global weather | planned | — |
| FINALE-HELP | helpers10 | FILL-HELP, shared checkpoints พร้อม | restore checkpoint ของงานที่ whitelist; ไม่ย้อน transactions ที่สำเร็จ | planned | — |
| FINALE-FISH | fishing10 | FILL-FISH, trail lifecycle พร้อม | legend ตามความรู้/progression, 3 clues, ไม่จ่ายปลาจากแค่เปิด run | planned | — |
| FINALE-FOREST | forest10 | FILL-FOREST | 2 parts/capped targets, familiar slot และ resource cooldown ถูกต้อง | planned | — |
| FINALE-INSECTS | insects10 | FILL-INSECTS, trail lifecycle พร้อม | capped private swarm, distinct catches, cloak และ quota ไม่วน | planned | — |
| FINALE-GARDEN | farming10 | FILL-GARDEN, trail lifecycle พร้อม | grow แล้วเปิด garden, 3 points/run, ไม่เพิ่ม upkeep บังคับ | planned | — |
| FINALE-WOOD | felling10 | FILL-WOOD, trail lifecycle พร้อม | 3 known trees, instance budget, forged powers ไม่เพิ่ม respawn | planned | — |
| FINALE-MINE | mining10 | FILL-MINE, trail lifecycle พร้อม | 3 rooms branch/resume, หนึ่ง budget ต่อ run, gem conversion ไม่ duplicate | planned | — |
| INTEGRATE-01 | รวม catalog/UI/API/icons และ OP review | task ที่อยู่ใน release scope local-done, COMBO-REVIEW ถ้า release มีคอมโบ | rank matrix ไม่มีช่องขาดใน scope; every ID wired; legal combos และ economy ผ่าน | planned | — |
| RELEASE-01 | package migrations/site และ live checks | INTEGRATE-01 | dependency/rerun/privilege probes; site deploy + SQL install แยกบันทึก | planned | — |

จะ release เป็นชุดย่อยได้ ไม่ต้องรอครบทุกสาย ผู้รวมงานต้องระบุ release scope แล้วใช้ capability gate ไม่เผยคำประกาศของงานที่ยังใช้ไม่ได้ การปิด objective ทั้งโครงการต้องครบ 90 rewards และ acceptance ของทุกสาย

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
| gameplay foundation | v180–v182 | source มี; adventure handoff ระบุ tested/pending installation | อีก session; ต้องรับหลักฐานล่าสุด |
| removable hook | v183 | adventure handoff ระบุ live verified; แยกจากลำดับ foundation | อีก session; ตรวจ dependency ไม่สมมติว่า 180–182 installed |
| wood/geology/garden | v184–v186 | source มี; งานอีก session กำลังทำ | อีก session; รอ handoff ไม่แย่งแก้ |
| tier10 foundation/rewards | ยังไม่จอง | planned | ผู้รวมงานจองเลขที่ว่างจริงก่อนเขียน |
| secret combo pilot | [v194_secret_equipment_bonds.sql](../../../supabase/v194_secret_equipment_bonds.sql) | generated/tested pending manual installation; no deploy | combo implementation 2026-10-10; requires v180–v182/v184–v185; guarded definitions |

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

"use client";

import { useState } from "react";
import { TAG_CLASS, TAG_HELP, TAG_HELP_TH, TAG_LABELS } from "@/components/MemberTags";
import TagIcon from "@/components/TagIcon";

const RAID_TAGS = ["tier-clear", "prog", "extreme", "ultimate", "veteran"];
const PLAY_TAGS = ["crafter", "gatherer", "relic", "explorer", "treasure",
                   "goldsaucer", "seasonal", "pvp", "oldtimer"];
const OTHER_TAGS = ["casual", "unknown"];

const GROUP_TITLE: Record<string, { en: string; th: string }> = {
  raid: { en: "Raiding — from FF Logs", th: "สายเรด — จาก FF Logs" },
  play: { en: "Playstyle — from rare achievements",
          th: "แนวการเล่น — จาก achievement หายาก" },
  other: { en: "Everything else", th: "อื่นๆ" },
  grades: { en: "Grades", th: "ระดับฉายา" },
};

function Chip({ t }: { t: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium ${
      TAG_CLASS[t] ?? "border-line text-muted"}`}>
      <TagIcon tag={t} size={13} />
      {TAG_LABELS[t] ?? t}
    </span>
  );
}

function Group({ title, tags, th }:
  { title: { en: string; th: string }; tags: string[]; th: boolean }) {
  if (!tags.length) return null;
  return (
    <div>
      <div className="mb-1.5 font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
        {th ? title.th : title.en}
      </div>
      <dl className="flex flex-col gap-1.5">
        {tags.map((t) => (
          <div key={t} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <dt><Chip t={t} /></dt>
            <dd className="text-[12.5px] leading-relaxed text-muted">
              {(th ? TAG_HELP_TH[t] : TAG_HELP[t]) ?? TAG_HELP[t]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Tags are guesses drawn from public data, and half of them come from achievement
 * rarity rather than anything a member wrote down. Without this, "Legendary gatherer"
 * looks like a title someone chose for themselves.
 *
 * Bilingual, Thai first: the people these badges are attached to are Thai, and the
 * English is here because the underlying data is in English, not because the readers
 * are.
 */
export default function TagLegend({ present }: { present?: Set<string> }) {
  const [lang, setLang] = useState<"th" | "en">("th");
  const th = lang === "th";

  // Only explain tags somebody in the FC actually has. A glossary listing badges
  // nobody holds reads like the page is broken, or like they are missing.
  const keep = (tags: string[]) =>
    present ? tags.filter((t) => present.has(t)) : tags;

  return (
    <details className="mt-3 rounded-xl border border-line bg-surface">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-[13.5px] font-medium text-muted marker:text-amber">
        {th ? "แต่ละ tag หมายความว่าอะไร?" : "What do the tags mean?"}
      </summary>
      <div className="border-t border-line px-4 py-4">
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => setLang(th ? "en" : "th")}
            className="rounded-md border border-line px-2 py-0.5 font-data text-[11px] text-muted hover:border-muted hover:text-ink">
            {th ? "English" : "ภาษาไทย"}
          </button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Group title={GROUP_TITLE.raid} tags={keep(RAID_TAGS)} th={th} />
          <Group title={GROUP_TITLE.play} tags={keep(PLAY_TAGS)} th={th} />
          <Group title={GROUP_TITLE.other} tags={keep(OTHER_TAGS)} th={th} />
          <div className="sm:col-span-2">
            <div className="mb-1.5 font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
              {th ? GROUP_TITLE.grades.th : GROUP_TITLE.grades.en}
            </div>

            {th ? (
              <>
                <p className="text-[12.5px] leading-[1.85] text-muted">
                  achievement แต่ละอันมีค่าเท่ากับความหายากของมันตรงๆ คือ{" "}
                  <b className="text-ink">10 ÷ % ของผู้เล่นที่มีอันนั้น</b> — ของที่คน 10%
                  มีกัน ได้ 1 คะแนน ถ้า 1% ได้ 10 คะแนน ถ้า 0.2% ได้ 50 คะแนน
                  มีเยอะก็บวกกันไปเรื่อยๆ แต่ของยากจริงอันเดียว มีค่ามากกว่าของง่ายกองใหญ่
                </p>
                <p className="mt-2 text-[12.5px] leading-[1.85] text-muted">
                  ฉายาคิดจากคะแนนของคุณ เทียบกับ{" "}
                  <b className="text-ink">achievement ของสายนั้นที่คนเล่นจริงจังพอจะเก็บได้ครบ</b>{" "}
                  ไม่ได้เทียบกับทุกอันที่มีในเกม เพราะบางสายมีของที่แทบไม่มีใครทำได้อยู่เป็นสิบๆ อัน
                  (สายตกปลาอย่างเดียวมี 61 อันที่คนมีไม่ถึง 0.5%) ถ้าเอามาหารด้วย
                  ต่อให้เก่งแค่ไหนก็ได้ไม่ถึง 1% ของสายนั้น ส่วนของโหดๆ พวกนั้นยังนับคะแนนเต็มอยู่
                  แค่ไม่ได้ถูกคาดหวังว่าต้องมี — มีแล้วดันคะแนนขึ้น
                </p>
                <p className="mt-2 text-[12.5px] leading-[1.85] text-muted">
                  ฉายานี้ไม่ใช่การแข่งกัน ใครถึงเกณฑ์ก็ได้หมด ไม่มีการโดนถอดเพราะมีคนใหม่เก่งกว่าเข้ามา
                  และการวัดเป็น % ทำให้เทียบกันได้ข้ามสาย เพราะแต่ละสายมีของหายากไม่เท่ากันเลย
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-[12.5px] text-muted">
                  <li><b className="text-ink">Legendary</b> — ได้ตั้งแต่ 25% ของสายนั้นขึ้นไป</li>
                  <li><b className="text-ink">Master</b> — ตั้งแต่ 12% ขึ้นไป</li>
                  <li><b className="text-ink">Expert</b> — ตั้งแต่ 5% ขึ้นไป</li>
                  <li>ทุกระดับต้องมี achievement อย่างน้อย 3 อันหนุน ฟลุกได้ของหายากอันเดียวยังไม่นับ</li>
                  <li><b className="text-ink">ไม่มีคำนำหน้า</b> — ได้ tag แล้ว แต่ยังไม่ถึง 5%</li>
                </ul>
                <p className="mt-3 text-[12.5px] leading-[1.85] text-muted">
                  ระดับพวกนี้ขึ้นกับ <b className="text-ink">อาชีพ</b> ได้ด้วย
                  โดยคิดจากข้อมูล FF Logs เพื่อตอบคำถามว่า &ldquo;ถ้าอยากหาคนสอนอาชีพนี้
                  ควรถามใคร&rdquo; เลยขึ้นตั้งแต่ Expert ขึ้นไปเท่านั้น วิธีคิดคือถ่วงน้ำหนัก parse
                  ตามจำนวนครั้งที่ฆ่าจริง เพราะเลขจากการลง 2 รอบไม่ได้บอกอะไร
                  และถ่วงตามความยากของ content ด้วย —{" "}
                  <b className="text-ink">Ultimate มากกว่า Savage และ Savage มากกว่า Extreme</b>{" "}
                  เพราะ parse วัดกับคนที่เล่น content เดียวกันเท่านั้น
                  จากนั้นเอาความช่ำชองในอาชีพนั้นมาคูณอีกที ฟลุกครั้งเดียวเลยไม่ผ่าน
                </p>
                <p className="mt-2 text-[12.5px] leading-[1.85] text-muted">
                  ทั้งหมดนี้อ่านจากข้อมูลสาธารณะของ Lodestone, FF Logs และ FFXIV Collect
                  คนที่ปิด achievement หรือ log ไว้จะขึ้นเป็น <b className="text-ink">No data</b>{" "}
                  ซึ่งแปลว่าเขาตั้งค่าความเป็นส่วนตัวไว้ ไม่ได้แปลว่าเล่นไม่เก่ง
                </p>
              </>
            ) : (
              <>
                <p className="text-[12.5px] leading-relaxed text-muted">
                  Each rare achievement is worth as much as it is rare:{" "}
                  <b className="text-ink">10 ÷ % of players who own it</b> — so something
                  10% of players have scores 1 point, 1% scores 10, and 0.2% scores 50.
                  Holding more of them adds up, but one genuinely hard achievement
                  outweighs a pile of easy ones.
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  The grade is your score as a share of{" "}
                  <b className="text-ink">what somebody serious about that playstyle
                  could realistically hold</b> — not of everything that exists. Some
                  playstyles have a long tail almost nobody finishes (fishing alone has
                  61 achievements under 0.5% ownership), and dividing by that puts even
                  the best collection near zero. Those still score in full; they are
                  simply not expected of you, so holding one pushes you up.
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  It is not a race: however many people reach a bar, all of them earn
                  it, and nobody is demoted because someone keener joins. Sharing one
                  measure also keeps it fair between playstyles, which hold wildly
                  different amounts of rare content.
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-[12.5px] text-muted">
                  <li><b className="text-ink">Legendary</b> — 25% or more of that playstyle</li>
                  <li><b className="text-ink">Master</b> — 12% or more</li>
                  <li><b className="text-ink">Expert</b> — 5% or more</li>
                  <li>Any grade needs at least three achievements behind it, so a single
                      lucky find is not a title.</li>
                  <li><b className="text-ink">No prefix</b> — earned the tag, under 5%</li>
                </ul>
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                  A grade can also appear against a <b className="text-ink">job</b>, from
                  FF Logs, answering &ldquo;who could show a newcomer this job?&rdquo; — so
                  it only shows from Expert up. It weighs each parse by how many kills back
                  it, because a number from two pulls describes nothing, and by how hard the
                  fight was: <b className="text-ink">Ultimate counts for more than Savage,
                  and Savage for more than Extreme</b>, since a parse is only ever measured
                  against the people doing that same content. How much someone has played
                  the job then scales the whole thing, so a single lucky pull cannot qualify.
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  Everything here is read from public Lodestone, FF Logs and FFXIV Collect
                  data. Members who keep achievements or logs private show as{" "}
                  <b className="text-ink">No data</b> — that is a privacy setting, not a
                  judgement about how they play.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}

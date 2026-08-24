"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** site_settings key an admin flips to retire this notice once it has done its job. */
export const NOTICE_KEY = "notice_showdata";

/**
 * The board can only show what the game's public APIs expose, and both sources are
 * opt-in: Lodestone hides achievements by default, and FFXIV Collect only knows
 * characters somebody has looked up on their site. That is why most of the roster
 * has no tags — not because those members do nothing.
 *
 * Bilingual because the FC is Thai and the site is in English. Thai leads, since
 * these are instructions for members rather than for visitors.
 */
export default function ShowYourData(
  { known, total, publicAchv }: { known: number; total: number; publicAchv: number },
) {
  const [lang, setLang] = useState<"th" | "en">("th");
  const th = lang === "th";

  // Shown unless an admin has turned it off. Defaults to on so the notice works
  // before anyone touches the setting, and so a Supabase outage cannot hide it.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.from("site_settings").select("value").eq("key", NOTICE_KEY).maybeSingle()
      .then(({ data }) => setHidden(data?.value === "off"));
  }, []);
  if (hidden) return null;

  const Step = ({ n, title, body }:
    { n: number; title: string; body: React.ReactNode }) => (
    <li className="flex gap-3">
      <span className="mt-[2px] flex size-5 shrink-0 items-center justify-center rounded-full border border-amber/50 font-data text-[11px] text-amber">
        {n}
      </span>
      <span className="min-w-0">
        <b className="text-ink">{title}</b>
        <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{body}</div>
      </span>
    </li>
  );

  return (
    <section className="mt-5 rounded-xl border border-amber/35 bg-amber/5 px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display font-semibold text-amber">
          {th ? "📣 อยากให้ข้อมูลของคุณขึ้นบนกระดาน?"
              : "📣 Want your data on the board?"}
        </div>
        <button
          onClick={() => setLang(th ? "en" : "th")}
          className="rounded-md border border-line px-2 py-0.5 font-data text-[11px] text-muted hover:border-muted hover:text-ink">
          {th ? "English" : "ภาษาไทย"}
        </button>
      </div>

      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        {th ? (
          <>
            ตอนนี้มีสมาชิกแค่ <b className="text-ink">{known} จาก {total} คน</b>{" "}
            ที่เว็บดึงของสะสมได้ และเปิด achievement เป็นสาธารณะแค่{" "}
            <b className="text-ink">{publicAchv} คน</b> — คนที่เหลือขึ้นเป็น
            &ldquo;No data&rdquo; ไม่ใช่เพราะไม่ได้เล่น แต่เพราะเกมซ่อนข้อมูลไว้เป็นค่าเริ่มต้น
            ทำ 2 ขั้นนี้ครั้งเดียวจบ แล้วเดี๋ยวระบบเก็บให้เองทุกวัน
          </>
        ) : (
          <>
            Only <b className="text-ink">{known} of {total}</b> members have
            collections the site can read, and just{" "}
            <b className="text-ink">{publicAchv}</b> have public achievements. Everyone
            else shows as &ldquo;No data&rdquo; — not because they do nothing, but
            because the game hides this by default. Two one-time steps and the board
            keeps itself updated from then on.
          </>
        )}
      </p>

      <ol className="mt-3 flex flex-col gap-2.5 text-[13px]">
        <Step
          n={1}
          title={th ? "เปิด achievement เป็นสาธารณะบน Lodestone"
                    : "Make your achievements public on The Lodestone"}
          body={th ? (
            <>
              achievement ถูกตั้งเป็นส่วนตัวไว้ตั้งแต่แรก ต้องเปิดเอง — ล็อกอิน{" "}
              <a href="https://na.finalfantasyxiv.com/lodestone/" target="_blank"
                 rel="noopener noreferrer" className="text-amber no-underline">
                The Lodestone
              </a>{" "}
              ด้วยบัญชี Square Enix แล้วเปิดหน้า Achievements ของตัวละครตัวเอง
              ตั้งค่าการแสดงผลเป็นสาธารณะ
            </>
          ) : (
            <>
              They are private by default, so this is a switch you have to flip. Log in
              to{" "}
              <a href="https://na.finalfantasyxiv.com/lodestone/" target="_blank"
                 rel="noopener noreferrer" className="text-amber no-underline">
                The Lodestone
              </a>{" "}
              with your Square Enix account, open your own character&rsquo;s
              Achievements page and set it to public.
            </>
          )}
        />
        <Step
          n={2}
          title={th ? "ลงทะเบียนตัวละครกับ FFXIV Collect"
                    : "Register your character on FFXIV Collect"}
          body={th ? (
            <>
              เว็บนี้ดึงของสะสมได้เฉพาะตัวละครที่เคยมีคนค้นหาบนเว็บเขา — เปิด{" "}
              <a href="https://ffxivcollect.com/characters/search" target="_blank"
                 rel="noopener noreferrer" className="text-amber no-underline">
                ffxivcollect.com
              </a>{" "}
              เลือก Data Center <b className="text-ink">Elemental</b> · World{" "}
              <b className="text-ink">Tonberry</b> แล้วค้นชื่อตัวละครตัวเอง กดเข้าไปหนึ่งครั้ง
              เท่านี้ระบบก็เห็นคุณแล้ว
            </>
          ) : (
            <>
              It can only read characters somebody has looked up there. Open{" "}
              <a href="https://ffxivcollect.com/characters/search" target="_blank"
                 rel="noopener noreferrer" className="text-amber no-underline">
                ffxivcollect.com
              </a>
              , pick Data Center <b className="text-ink">Elemental</b> and world{" "}
              <b className="text-ink">Tonberry</b>, search your character and open it
              once. That is all it takes.
            </>
          )}
        />
      </ol>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
        {th ? (
          <>
            หลังทำเสร็จรอสัก 1 วัน — Lodestone ใช้เวลาอัปเดตสักพัก แล้วกระดานนี้ดึงข้อมูลใหม่ทุก 4 ชั่วโมง
            <br />
            ส่วน <b className="text-ink">parse กับข้อมูลเรด</b> มาจาก FF Logs ซึ่งเป็นคนละเรื่อง —
            จะมีข้อมูลก็ต่อเมื่อมีคนในปาร์ตี้อัปโหลด log ไว้ ไม่ต้องตั้งค่าอะไรเพิ่ม
          </>
        ) : (
          <>
            Then give it a day: The Lodestone takes a while to apply the change, and
            this board refreshes every four hours.
            <br />
            <b className="text-ink">Parses and raid data</b> come from FF Logs instead,
            which is separate — they appear when somebody in your party uploaded the
            log, and there is nothing to set up.
          </>
        )}
      </p>
    </section>
  );
}

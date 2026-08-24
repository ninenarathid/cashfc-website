"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** site_settings key an admin flips to retire this notice once it has done its job. */
export const NOTICE_KEY = "notice_showdata";

const LODESTONE = "https://na.finalfantasyxiv.com/lodestone/";
const LODESTONE_SETTINGS = "https://na.finalfantasyxiv.com/lodestone/my/setting/profile/";
const COLLECT_SEARCH = "https://ffxivcollect.com/characters/search";

/**
 * The board can only show what the game's public APIs expose, and both sources are
 * opt-in: The Lodestone hides achievements by default, and FFXIV Collect only knows
 * characters somebody has looked up there. That is why most of the roster has no
 * tags — not because those members do nothing.
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

  const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="text-amber underline decoration-amber/40 underline-offset-2">
      {children}
    </a>
  );

  const Step = ({ n, title, children }:
    { n: number; title: string; children: React.ReactNode }) => (
    <li className="flex gap-3">
      <span className="mt-[3px] flex size-5 shrink-0 items-center justify-center rounded-full border border-amber/50 font-data text-[11px] text-amber">
        {n}
      </span>
      <div className="min-w-0">
        <b className="text-ink">{title}</b>
        <div className="mt-1 text-[12.5px] leading-[1.75] text-muted">{children}</div>
      </div>
    </li>
  );

  return (
    <section className="mt-5 rounded-xl border border-amber/35 bg-amber/5 px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display text-[17px] font-semibold text-amber">
          {th ? "📣 อยากให้ข้อมูลของตัวเองขึ้นบนเว็บนี้ไหม"
              : "📣 Want your data on the board?"}
        </div>
        <button
          onClick={() => setLang(th ? "en" : "th")}
          className="rounded-md border border-line px-2 py-0.5 font-data text-[11px] text-muted hover:border-muted hover:text-ink">
          {th ? "English" : "ภาษาไทย"}
        </button>
      </div>

      <p className="mt-1.5 text-[13px] leading-[1.8] text-muted">
        {th ? (
          <>
            ตอนนี้เว็บอ่านของสะสมของสมาชิกได้ <b className="text-ink">{known} จาก {total} คน</b>{" "}
            และเห็น achievement แค่ <b className="text-ink">{publicAchv} คน</b> —
            คนที่เหลือขึ้นว่า &ldquo;No data&rdquo; ไม่ใช่เพราะไม่ได้เล่น
            แต่เพราะเกมตั้งค่าซ่อนไว้ให้ตั้งแต่แรก ทำ 2 ขั้นข้างล่างครั้งเดียว
            จากนั้นเว็บจะตามเก็บข้อมูลให้เองตลอด
          </>
        ) : (
          <>
            The board can read collections for <b className="text-ink">{known} of {total}</b>{" "}
            members, and can see achievements for only{" "}
            <b className="text-ink">{publicAchv}</b>. Everyone else shows as
            &ldquo;No data&rdquo; — not because they do nothing, but because the game
            hides it by default. Do the two steps below once and the board keeps
            itself updated from then on.
          </>
        )}
      </p>

      <ol className="mt-3.5 flex flex-col gap-3.5 text-[13px]">
        <Step
          n={1}
          title={th ? "เปิด achievement ให้เป็น Public บน Lodestone"
                    : "Set your achievements to Public on The Lodestone"}
        >
          {th ? (
            <>
              ค่าเริ่มต้นของเกมคือซ่อน achievement ไว้ ต้องไปเปิดเอง ทำครั้งเดียวพอ
              <ol className="mt-1.5 ml-4 list-decimal space-y-1 marker:text-amber/70">
                <li>
                  เข้า <A href={LODESTONE}>The Lodestone</A> กด <b className="text-ink">Log In</b>{" "}
                  มุมขวาบน แล้วล็อกอินด้วย Square Enix account ตัวเดียวกับที่ใช้เข้าเกม
                </li>
                <li>
                  ถ้ามีหลายตัวละคร กด <b className="text-ink">Select Character</b>{" "}
                  แล้วเลือกตัวที่อยู่ใน FC นี้ก่อน — ค่านี้แยกกันของใครของมัน
                </li>
                <li>
                  เปิดหน้า <A href={LODESTONE_SETTINGS}>Character Settings</A>{" "}
                  (หรือกดรูปตัวละครมุมขวาบน แล้วเลือกเมนูตั้งค่าตัวละคร)
                </li>
                <li>
                  ในหน้านั้นจะมีรายการว่าจะให้คนอื่นเห็นอะไรบ้าง หาหัวข้อ{" "}
                  <b className="text-ink">Achievements</b> เปลี่ยนจาก Private เป็น{" "}
                  <b className="text-ink">Public</b> แล้วกดปุ่มบันทึกท้ายหน้า
                </li>
              </ol>
              <div className="mt-2 rounded-lg border border-line/70 bg-card/50 px-2.5 py-2">
                <b className="text-ink">เช็กว่าสำเร็จหรือยัง:</b> เปิดหน้าตัวละครตัวเองบน Lodestone
                ในโหมดไม่ระบุตัวตน (Incognito) แล้วกดแท็บ Achievements — ถ้าขึ้นรายการ
                achievement แปลว่าเรียบร้อย ถ้าขึ้นว่า &ldquo;You do not have permission to
                view this page&rdquo; แปลว่ายังไม่ได้เปิด
              </div>
            </>
          ) : (
            <>
              The game hides achievements by default, so this is a switch you have to
              flip yourself. Once is enough.
              <ol className="mt-1.5 ml-4 list-decimal space-y-1 marker:text-amber/70">
                <li>
                  Open <A href={LODESTONE}>The Lodestone</A>, hit{" "}
                  <b className="text-ink">Log In</b> at the top right and sign in with
                  the same Square Enix account you play on.
                </li>
                <li>
                  If you have several characters, use{" "}
                  <b className="text-ink">Select Character</b> to switch to the one in
                  this FC first — the setting is per character.
                </li>
                <li>
                  Go to <A href={LODESTONE_SETTINGS}>Character Settings</A> (or click
                  your portrait at the top right and pick the character settings menu).
                </li>
                <li>
                  That page lists what other people are allowed to see. Find{" "}
                  <b className="text-ink">Achievements</b>, switch it from Private to{" "}
                  <b className="text-ink">Public</b>, and save at the bottom.
                </li>
              </ol>
              <div className="mt-2 rounded-lg border border-line/70 bg-card/50 px-2.5 py-2">
                <b className="text-ink">To check it worked:</b> open your own character
                page on The Lodestone in a private window and click the Achievements
                tab. A list means you are done; &ldquo;You do not have permission to
                view this page&rdquo; means it is still private.
              </div>
            </>
          )}
        </Step>

        <Step
          n={2}
          title={th ? "ลงทะเบียนตัวละครไว้ที่ FFXIV Collect"
                    : "Register your character on FFXIV Collect"}
        >
          {th ? (
            <>
              เว็บนี้ดึงของสะสมผ่าน FFXIV Collect ซึ่งเก็บข้อมูลเฉพาะตัวละคร
              ที่เคยมีคนค้นหาไว้ในเว็บนั้น ถ้าไม่เคยมีใครค้นชื่อคุณเลย ระบบก็จะไม่รู้จัก
              <ol className="mt-1.5 ml-4 list-decimal space-y-1 marker:text-amber/70">
                <li>เปิด <A href={COLLECT_SEARCH}>ffxivcollect.com</A></li>
                <li>
                  เลือก Data Center <b className="text-ink">Elemental</b> · World{" "}
                  <b className="text-ink">Tonberry</b>
                </li>
                <li>พิมพ์ชื่อตัวละคร ค้นหา แล้วกดเข้าไปที่หน้าตัวเอง 1 ครั้ง</li>
                <li>
                  ถ้าเคยลงทะเบียนไว้ก่อนเพิ่งมาเปิด Public ให้กดปุ่ม{" "}
                  <b className="text-ink">Refresh</b> ในหน้าตัวละคร เพื่อให้ดึงข้อมูลใหม่
                </li>
              </ol>
            </>
          ) : (
            <>
              The board reads collections through FFXIV Collect, which only keeps data
              for characters somebody has looked up there. If nobody has ever searched
              your name, it has never heard of you.
              <ol className="mt-1.5 ml-4 list-decimal space-y-1 marker:text-amber/70">
                <li>Open <A href={COLLECT_SEARCH}>ffxivcollect.com</A></li>
                <li>
                  Pick Data Center <b className="text-ink">Elemental</b> and world{" "}
                  <b className="text-ink">Tonberry</b>
                </li>
                <li>Search your character name and open your page once</li>
                <li>
                  Already registered before you made things public? Hit{" "}
                  <b className="text-ink">Refresh</b> on your character page so it
                  re-reads The Lodestone.
                </li>
              </ol>
            </>
          )}
        </Step>
      </ol>

      <p className="mt-3.5 border-t border-amber/20 pt-3 text-[12.5px] leading-[1.8] text-muted">
        {th ? (
          <>
            เสร็จแล้วรอสัก 1 วัน — Lodestone ใช้เวลาอัปเดตพอสมควร ส่วนเว็บนี้ดึงข้อมูลใหม่ทุก 4 ชั่วโมง
            <br />
            ส่วน <b className="text-ink">parse กับสถิติ Raid</b> มาจาก FF Logs คนละทางกัน
            ไม่ต้องตั้งค่าอะไรเพิ่ม จะมีข้อมูลเองเมื่อมีใครในปาร์ตี้อัปโหลด log
          </>
        ) : (
          <>
            Then give it a day — The Lodestone takes a while to apply the change, and
            this board refreshes every four hours.
            <br />
            <b className="text-ink">Parses and raid stats</b> come from FF Logs, which
            is a separate thing with nothing to set up: they appear whenever somebody
            in your party uploads the log.
          </>
        )}
      </p>
    </section>
  );
}

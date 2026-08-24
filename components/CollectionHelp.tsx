"use client";

import { useState } from "react";

const LODESTONE = "https://na.finalfantasyxiv.com/lodestone/";
const LODESTONE_SETTINGS = "https://na.finalfantasyxiv.com/lodestone/my/setting/profile/";
const COLLECT_SEARCH = "https://ffxivcollect.com/characters/search";

/**
 * Why a member's collection tiles are empty, and what that member has to do about it.
 *
 * Two states, two different fixes, and neither is anybody's fault: FFXIV Collect only
 * keeps data for characters somebody has looked up there, and The Lodestone hides
 * achievements by default. Bilingual because the people who need to act on this are
 * the Thai members, while the rest of the site is in English.
 */
export default function CollectionHelp(
  { state, characterId }: { state: "private" | "unknown"; characterId: number },
) {
  const [lang, setLang] = useState<"th" | "en">("th");
  const th = lang === "th";
  const unknown = state === "unknown";

  const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="text-amber underline decoration-amber/40 underline-offset-2">
      {children}
    </a>
  );

  const Step = ({ title, children }:
    { title: React.ReactNode; children: React.ReactNode }) => (
    <li className="ml-1 pl-1.5">
      <b className="text-ink">{title}</b>
      <div className="mt-0.5">{children}</div>
    </li>
  );

  const achievementSteps = (
    <>
      <Step title={th ? "ล็อกอินเว็บ Lodestone" : "Log in to The Lodestone"}>
        {th ? (
          <>
            เข้า <A href={LODESTONE}>The Lodestone</A> กดปุ่ม{" "}
            <b className="text-ink">Log In</b> มุมขวาบน ใช้ Square Enix account
            ตัวเดียวกับที่ใช้เข้าเกม ถ้ามีหลายตัวละคร กด{" "}
            <b className="text-ink">Select Character</b> เลือกตัวนี้ก่อน
            เพราะค่านี้ตั้งแยกกันของแต่ละตัวละคร
          </>
        ) : (
          <>
            Open <A href={LODESTONE}>The Lodestone</A> and hit{" "}
            <b className="text-ink">Log In</b> at the top right, using the same Square
            Enix account you play on. With several characters, use{" "}
            <b className="text-ink">Select Character</b> to switch to this one first —
            the setting is per character, not per account.
          </>
        )}
      </Step>

      <Step title={th ? "เปิด Achievements ให้เป็น Public"
                      : "Set Achievements to Public"}>
        {th ? (
          <>
            เปิดหน้า <A href={LODESTONE_SETTINGS}>Character Settings</A>{" "}
            (หรือกดรูปตัวละครมุมขวาบนแล้วเข้าเมนูตั้งค่า) ในหน้านั้นจะมีรายการว่า
            จะให้คนอื่นเห็นอะไรบ้าง หาหัวข้อ <b className="text-ink">Achievements</b>{" "}
            เปลี่ยนจาก Private เป็น <b className="text-ink">Public</b>{" "}
            แล้วกดปุ่มบันทึกท้ายหน้า
            <div className="mt-1 text-muted/85">
              ปล. ค่านี้อยู่บนเว็บ ไม่ได้อยู่ในเกม หาในเกมยังไงก็ไม่เจอครับ
            </div>
          </>
        ) : (
          <>
            Go to <A href={LODESTONE_SETTINGS}>Character Settings</A> (or click your
            portrait at the top right and open the settings menu). That page lists
            what other people are allowed to see — find{" "}
            <b className="text-ink">Achievements</b>, switch it from Private to{" "}
            <b className="text-ink">Public</b>, and save at the bottom.
            <div className="mt-1 text-muted/85">
              Note: this lives on the website, not in the game client. There is no
              such switch in game.
            </div>
          </>
        )}
      </Step>

      <Step title={th ? "เช็กว่าเปิดสำเร็จแล้วจริง" : "Check that it actually took"}>
        {th ? (
          <>
            เปิด{" "}
            <A href={`${LODESTONE}character/${characterId}/achievement/`}>
              หน้า achievement ของตัวละครนี้
            </A>{" "}
            ในหน้าต่างแบบไม่ระบุตัวตน (Incognito) — ถ้าเห็นรายการ achievement
            คือเรียบร้อย ถ้าขึ้นว่า{" "}
            <span className="text-chili">
              &ldquo;You do not have permission to view this page&rdquo;
            </span>{" "}
            คือยังปิดอยู่ ให้กลับไปดูข้อ 2 อีกที
          </>
        ) : (
          <>
            Open{" "}
            <A href={`${LODESTONE}character/${characterId}/achievement/`}>
              this character&rsquo;s achievements page
            </A>{" "}
            in a private window. A list of achievements means it worked;{" "}
            <span className="text-chili">
              &ldquo;You do not have permission to view this page&rdquo;
            </span>{" "}
            means it is still hidden, so go back to step 2.
          </>
        )}
      </Step>

      <Step title={th ? "รอประมาณ 1 วัน" : "Give it about a day"}>
        {th ? (
          <>
            Lodestone ใช้เวลาอัปเดตข้อมูลของตัวเองสักพัก ส่วนเว็บนี้ดึงข้อมูลใหม่ทุก 4 ชั่วโมง
            ไม่ต้องมาแจ้งใคร เดี๋ยวขึ้นเอง
          </>
        ) : (
          <>
            The Lodestone takes a while to publish the change on its side, and this
            board re-reads everything every four hours. Nothing to tell anyone —
            it will just appear.
          </>
        )}
      </Step>
    </>
  );

  return (
    <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-3.5 text-[12.5px] leading-[1.8] text-muted">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <b className="text-[13.5px] text-ink">
          {unknown
            ? (th ? "ยังไม่มีข้อมูลของสะสมของตัวละครนี้"
                  : "No collection data for this character yet")
            : (th ? "ตัวละครนี้ปิด achievement ไว้อยู่"
                  : "This character keeps achievements hidden")}
        </b>
        <button
          onClick={() => setLang(th ? "en" : "th")}
          className="rounded-md border border-line px-2 py-0.5 font-data text-[11px] text-muted hover:border-muted hover:text-ink">
          {th ? "English" : "ภาษาไทย"}
        </button>
      </div>

      <p className="mt-1.5">
        {unknown ? (
          th ? (
            <>
              เว็บนี้ไม่ได้ดึงข้อมูลจากเกมโดยตรง แต่ไปอ่านต่อจากเว็บ{" "}
              <A href={COLLECT_SEARCH}>FFXIV Collect</A> อีกที
              ซึ่งเขาเก็บข้อมูลเฉพาะตัวละครที่เคยมีคนเข้าไปค้นชื่อไว้บนเว็บของเขา
              ถ้ายังไม่เคยมีใครค้นชื่อตัวละครนี้ ระบบก็ไม่รู้ด้วยซ้ำว่ามีตัวละครนี้อยู่ —
              เลยว่างทั้ง 3 ช่อง ไม่ได้แปลว่าเล่นน้อยหรือไม่มีของสะสมนะครับ
            </>
          ) : (
            <>
              The board does not read the game directly. It reads{" "}
              <A href={COLLECT_SEARCH}>FFXIV Collect</A>, which only keeps data for
              characters somebody has looked up on their site. Nobody has looked this
              one up, so it has never heard of them — which is why all three tiles are
              empty. It says nothing about how much this person plays or owns.
            </>
          )
        ) : (
          th ? (
            <>
              Mounts กับ Minions ขึ้นครบแล้ว แปลว่าระบบเจอตัวละครนี้เรียบร้อย
              เหลือแค่ achievement ที่ยังปิดอยู่ ซึ่งเป็นค่าเริ่มต้นของเกมตั้งแต่แรก
              ไม่ได้ตั้งใจปิดกันหรอกครับ ส่วนใหญ่ไม่รู้ว่ามีปุ่มนี้ด้วยซ้ำ
              <br />
              ผลที่ตามมาคือช่อง <b className="text-ink">Rare achv</b> ว่าง
              ไม่มี tag บอกแนวการเล่น และไม่ขึ้นใน Leaderboards
              ทั้งที่จริงอาจจะมีของหายากเต็มไปหมด
            </>
          ) : (
            <>
              Mounts and minions came through, so the character is found — only the
              achievements are still private, which is the game&rsquo;s default rather
              than a decision anyone made. Most people do not know the switch exists.
              <br />
              The cost is that <b className="text-ink">Rare achv</b> stays empty, there
              are no playstyle tags, and this character cannot appear on the
              leaderboards — however much rare stuff they actually own.
            </>
          )
        )}
      </p>

      <div className="mt-2.5">
        {th ? "ถ้านี่คือตัวละครของคุณ ทำตามนี้ครั้งเดียวจบ:"
            : "If this is your character, do this once and it is done:"}
      </div>
      <ol className="mt-1.5 flex list-decimal flex-col gap-2 pl-4 marker:font-data marker:text-amber/80">
        {unknown && (
          <Step title={th ? "ลงทะเบียนตัวละครกับ FFXIV Collect"
                          : "Register the character on FFXIV Collect"}>
            {th ? (
              <>
                เปิด <A href={COLLECT_SEARCH}>ffxivcollect.com</A> เลือก Data Center{" "}
                <b className="text-ink">Elemental</b> · World{" "}
                <b className="text-ink">Tonberry</b> พิมพ์ชื่อตัวละคร ค้นหา
                แล้วกดเข้าไปที่หน้าตัวเอง 1 ครั้ง แค่นี้ระบบก็เก็บชื่อไว้แล้ว
                ไม่ต้องสมัครสมาชิก ไม่ต้องล็อกอิน
              </>
            ) : (
              <>
                Open <A href={COLLECT_SEARCH}>ffxivcollect.com</A>, pick Data Center{" "}
                <b className="text-ink">Elemental</b> and world{" "}
                <b className="text-ink">Tonberry</b>, search the character name and
                open the page once. That alone registers it — no account, no login.
              </>
            )}
          </Step>
        )}
        {achievementSteps}
      </ol>
    </div>
  );
}

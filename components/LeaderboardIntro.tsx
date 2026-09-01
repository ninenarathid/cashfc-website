"use client";

import { useLang } from "@/lib/i18n";

/**
 * The leaderboards page is a server component so it can read the roster at build
 * time; its heading and the paragraph explaining the scoring are the only parts
 * that need the reader's language, so they live here.
 */
export default function LeaderboardIntro() {
  const { t, lang } = useLang();
  const th = lang === "th";
  return (
    <>
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">
        {t("lb.eyebrow")}
      </div>
      <h1 className="font-display text-3xl font-bold">{t("lb.title")}</h1>

      {/* Folded away. It explains where the numbers come from, which is worth
          having written down and is not what anybody opened this page to read —
          they came to see who is at the top, and the answer was below a
          paragraph about arithmetic. */}
      <details className="mt-3 max-w-2xl rounded-xl border border-line bg-surface">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-[13.5px] font-medium text-muted marker:text-accent">
          {t("lb.howScored")}
        </summary>
        <p className="px-4 pb-3 text-[13.5px] leading-relaxed text-muted">
        {th ? (
          <>
            จัดอันดับจาก achievement หายาก โดยแต่ละอันมีค่าเท่ากับความหายากของมันตรงๆ คือ{" "}
            <b className="text-ink">10 ÷ % ของผู้เล่นที่มีอันนั้น</b> — ของที่คน 10% มีกัน
            ได้ 1 คะแนน ถ้า 1% ได้ 10 คะแนน ถ้า 0.2% ได้ 50 คะแนน มีเยอะก็บวกกันไปเรื่อยๆ
            แต่ของยากจริงอันเดียวมีค่ามากกว่าของง่ายกองใหญ่ ส่วนตัวเลข % คือสัดส่วนของสายนั้น
            ที่คนนั้นถือไว้ ซึ่งเป็นตัวตัดสินฉายา Legendary, Master และ Expert
            ขึ้นเฉพาะคนที่เปิด achievement เป็นสาธารณะเท่านั้น
          </>
        ) : (
          <>
            Ranked by rare achievements, where each one is worth as much as it is
            rare: <b className="text-ink">10 ÷ % of players who own it</b>. Something
            10% of players have scores 1 point, 1% scores 10, and 0.2% scores 50 —
            holding more of them still adds up, but one genuinely hard achievement
            outweighs a pile of easy ones. The percentage is how much of everything
            rare in that playstyle somebody holds, and it is what earns the
            Legendary, Master and Expert titles. Only members with public
            achievements can appear here.
          </>
        )}
        </p>

        {/* The one board the game had no hand in, and the one whose number a
            reader can check against something else on the site — so it says
            which number that is, and which one it deliberately leaves out. */}
        <p className="border-t border-line px-4 py-3 text-[13.5px] leading-relaxed text-muted">
          {th ? (
            <>
              <b className="text-gold">🥔 โปโปโต้</b> ไม่ได้มาจากในเกม แต่มาจากสมาชิกใน FC
              กดให้กัน นับจาก <b className="text-ink">ปุ่ม Send popoto ในหน้าโปรไฟล์</b>{" "}
              อย่างเดียว กดได้วันละครั้งต่อคน ตัวเลขตรงนี้จึงตรงกับที่ขึ้นในหน้าโปรไฟล์ของคนนั้นเป๊ะๆ
              <br />
              โปโปโต้ที่กดให้รูปในแกลเลอรี <b className="text-ink">ไม่ถูกนับรวม</b> —
              มันพูดถึงรูปนั้น ไม่ได้พูดถึงตัวคน และเก็บอยู่คนละที่กัน
            </>
          ) : (
            <>
              <b className="text-gold">🥔 Popoto</b> is the one board the game had no
              hand in — it is members saying something about each other. It counts{" "}
              <b className="text-ink">Send popoto on a profile</b> and nothing else,
              once per person per day, so the total here matches the number on that
              member&rsquo;s own page exactly.
              <br />
              Potatoes left on pictures in the gallery are{" "}
              <b className="text-ink">not counted</b>: those are about the picture
              rather than the person, and they are kept somewhere else entirely.
            </>
          )}
        </p>
      </details>
    </>
  );
}

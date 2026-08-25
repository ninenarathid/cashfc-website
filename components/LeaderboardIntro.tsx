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
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-amber">
        {t("lb.eyebrow")}
      </div>
      <h1 className="font-display text-3xl font-bold">{t("lb.title")}</h1>
      <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">
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
    </>
  );
}

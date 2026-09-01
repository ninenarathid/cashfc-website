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

        {/* Two boards, two counters, and the fact that they never mix is the
            surprising half — which is the half worth writing down. */}
        <p className="border-t border-line px-4 py-3 text-[13.5px] leading-relaxed text-muted">
          {th ? (
            <>
              <b className="text-gold">🥔 โปโปโต้</b> กับ{" "}
              <b style={{ color: "#4fb8a8" }}>🥔 โปโปโต้จากรูป</b>{" "}
              เป็นสองอันที่ไม่ได้มาจากในเกม แต่มาจากสมาชิกใน FC กดให้กัน{" "}
              <b className="text-ink">และนับแยกกันคนละที่</b>
              <br />
              อันแรกนับจากปุ่ม Send popoto ในหน้าโปรไฟล์ กดได้วันละครั้งต่อคน
              ตัวเลขจึงตรงกับที่ขึ้นในหน้าโปรไฟล์ของคนนั้นเป๊ะๆ ส่วนอันที่สองรวม
              โปโปโต้จากทุกรูปที่เขาโพสต์ในแกลเลอรี และนับให้ตัวละครที่รูปนั้นสังกัด
              ไม่ใช่คนที่กดอัปโหลด
            </>
          ) : (
            <>
              <b className="text-gold">🥔 Popoto</b> and{" "}
              <b style={{ color: "#4fb8a8" }}>🥔 Gallery popoto</b> are the two boards
              the game had no hand in — they are members saying something to each
              other — and they are{" "}
              <b className="text-ink">counted entirely separately</b>.
              <br />
              The first is Send popoto on somebody&rsquo;s profile, once per person per
              day, so its total matches the number on that member&rsquo;s own page
              exactly. The second adds up the potatoes on every picture they have
              posted, credited to the character a picture belongs to rather than
              whoever uploaded it.
            </>
          )}
        </p>
      </details>
    </>
  );
}

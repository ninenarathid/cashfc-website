"use client";

import { useLang } from "@/lib/i18n";
import { ACHV_TIER_STYLE } from "@/lib/tags";
import { ACHV_TIER_LABEL } from "@/lib/types";

/**
 * The leaderboards page is a server component so it can read the roster at build
 * time; its heading and the paragraph explaining the scoring are the only parts
 * that need the reader's language, so they live here.
 */
export default function LeaderboardIntro(
  { boards = [] }: {
    /** Every board, with the points each title starts at on it. */
    boards?: { key: string; label: string;
               tiers: { tier: string; points: number }[] }[];
  },
) {
  const { t, lang } = useLang();
  const th = lang === "th";
  return (
    <>
      <h1 className="font-display text-3xl font-bold">{t("lb.title")}</h1>

      {/* Folded away. It explains where the numbers come from, which is worth
          having written down and is not what anybody opened this page to read —
          they came to see who is at the top, and the answer was below a
          paragraph about arithmetic. */}
      <details className="mt-3 max-w-2xl rounded-xl border border-line bg-surface">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-[13.5px] font-medium text-muted marker:text-accent">
          {t("lb.howScored")}
        </summary>
        <div className="flex flex-col gap-2.5 px-4 pb-3.5 text-[13.5px] leading-relaxed text-muted">
          <p>
            {th ? (
              <>
                จัดอันดับจาก achievement หายาก แต่ละอันยากไม่เท่ากัน
                ของที่หายากกว่าจึงได้คะแนนมากกว่า โดยระบบคิดให้อัตโนมัติจาก{" "}
                <b className="text-ink">10 ÷ % ของผู้เล่นทั้งเกมที่ได้อันนั้น</b>
              </>
            ) : (
              <>
                Ranked by rare achievements. They are not equally hard, so a rarer
                one is worth more: every one you hold scores{" "}
                <b className="text-ink">10 ÷ the % of players who have it</b>.
              </>
            )}
          </p>
          <ul className="flex flex-col gap-0.5 font-data text-[12.5px] text-ink/90">
            <li>{th ? "1 คะแนน — achievement ที่ผู้เล่นในเกมได้ 10%"
                    : "1 point — an achievement 10% of players have"}</li>
            <li>{th ? "10 คะแนน — ที่ผู้เล่นได้ 1%"
                    : "10 points — one 1% have"}</li>
            <li>{th ? "50 คะแนน — ที่ผู้เล่นได้ 0.2%"
                    : "50 points — one 0.2% have"}</li>
          </ul>
          <p>
            {th
              ? "มีเยอะก็บวกกันไปเรื่อยๆ แต่ของยากจริงอันเดียวมีค่ามากกว่าของง่ายกองใหญ่"
              : "Holding more still adds up, but one genuinely hard achievement outweighs a pile of easy ones."}
          </p>
          <p>
            {th ? (
              <>
                เปอร์เซ็นต์มาจาก <b className="text-ink">FFXIV Collect</b>{" "}
                ซึ่งอ่าน Lodestone ของทุกคนที่เปิดโปรไฟล์เป็นสาธารณะเท่านั้น
                คนที่ปิด achievement ไว้จึงไม่ขึ้นในหน้านี้
              </>
            ) : (
              <>
                The percentages come from <b className="text-ink">FFXIV Collect</b>,
                which reads the Lodestone of everyone who has made their profile
                public. Members with achievements hidden do not appear here.
              </>
            )}
          </p>

          {/* The thresholds, per board, in points — because points are what the
              column shows. They are stored as shares of what a playstyle asks,
              since the same share means the same thing whether a playstyle is
              worth 979 points or 128, and a share is not what anybody is
              looking at. */}
          {boards.length > 0 && (
            <div className="mt-1 border-t border-line pt-2.5">
              <div className="mb-1.5 text-ink">
                {th ? "คะแนนที่ต้องได้เพื่อรับฉายา ในแต่ละหมวด"
                    : "Points each title starts at, by board"}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full font-data text-[12.5px]">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="pb-1 pr-3 font-normal" />
                      {boards[0].tiers.map(({ tier }) => (
                        <th key={tier} className="pb-1 pr-3 text-right font-normal"
                            style={ACHV_TIER_STYLE[tier]
                              ? { color: ACHV_TIER_STYLE[tier].color,
                                  fontWeight: ACHV_TIER_STYLE[tier].weight }
                              : undefined}>
                          {ACHV_TIER_LABEL[tier] ?? tier}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boards.map((b) => (
                      <tr key={b.key} className="border-t border-line/50">
                        <td className="py-1 pr-3 text-ink/85">{b.label}</td>
                        {b.tiers.map(({ tier, points }) => (
                          <td key={tier} className="py-1 pr-3 text-right text-ink/70">
                            {points}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2">
                {th ? "การจะได้ฉายาต้องมี achievement หายากอย่างน้อย 3 อันด้วย"
                    : "A title also needs at least three rare achievements behind it."}
              </p>
            </div>
          )}
        </div>

        {/* Two boards, two counters, and the fact that they never mix is the
            surprising half — which is the half worth writing down. */}
        <p className="border-t border-line px-4 py-3 text-[13.5px] leading-relaxed text-muted">
          {th ? (
            <>
              <b className="text-gold">🥔 Popoto</b> กับ{" "}
              <b style={{ color: "#4fb8a8" }}>🥔 Popoto จากรูป</b>{" "}
              เป็นสองอันที่ไม่ได้มาจากในเกม แต่มาจากสมาชิกใน FC กดให้กัน{" "}
              <b className="text-ink">และนับแยกกันคนละที่</b>
              <br />
              อันแรกนับจากปุ่ม Send popoto ในหน้าโปรไฟล์ กดได้วันละครั้งต่อคน
              ตัวเลขจึงตรงกับที่ขึ้นในหน้าโปรไฟล์ของคนนั้นเป๊ะๆ ส่วนอันที่สองรวม
              Popoto จากทุกรูปที่เขาโพสต์ในแกลเลอรี และนับให้ตัวละครที่รูปนั้นสังกัด
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

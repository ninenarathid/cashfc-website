"use client";

import { useLang } from "@/lib/i18n";

/**
 * How "Hot right now" decides the order, folded away.
 *
 * Folded because nobody opened a wall of screenshots to read arithmetic, and
 * written down because the question keeps being asked — a picture with a lot of
 * potatoes sitting at the front for a fortnight looks like favouritism until
 * you know the number halves every two days.
 *
 * The formula is the one in the gallery_feed function, spelled out rather than
 * described: somebody checking whether their picture is being treated fairly
 * can work out their own score from this and see for themselves.
 */
export default function HotExplainer() {
  const { t, lang } = useLang();
  const th = lang !== "en";

  return (
    <details className="mt-3 rounded-xl border border-line bg-surface">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-[13px] font-medium text-muted marker:text-accent">
        {t("gallery.hotHow")}
      </summary>

      <div className="flex flex-col gap-2.5 px-4 pb-3.5 text-[13px] leading-relaxed text-muted">
        <p>
          {th
            ? "แท็บ Hot right now เรียงตามคะแนนที่ลดลงตามอายุของรูป คิดจาก"
            : "Hot right now orders by a score that fades as a picture ages:"}
        </p>

        {/* The sum itself, in the site's data face so it reads as arithmetic
            rather than as another sentence. */}
        <div className="overflow-x-auto rounded-lg border border-line bg-card px-3.5 py-2.5 font-data text-[12.5px] text-ink">
          {th
            ? "คะแนน = (popoto × 2 + คอมเมนต์ + 1) × 0.5 ^ (อายุเป็นชั่วโมง ÷ 48)"
            : "score = (popoto × 2 + comments + 1) × 0.5 ^ (hours old ÷ 48)"}
        </div>

        <ul className="flex flex-col gap-1">
          <li>
            {th
              ? "popoto นับสองเท่าของคอมเมนต์ เพราะกดยากกว่าและตั้งใจกว่า"
              : "A potato counts double a comment: it is the more deliberate of the two."}
          </li>
          <li>
            {th
              ? "บวก 1 ไว้กันรูปที่เพิ่งโพสต์และยังไม่มีใครกด ไม่ให้ได้ศูนย์แล้วจมทันที"
              : "The plus one keeps a picture nobody has reacted to yet from scoring zero and sinking on arrival."}
          </li>
          <li>
            {th
              ? "ครึ่งชีวิต 48 ชั่วโมง — ทุกสองวันคะแนนลดครึ่งหนึ่ง"
              : "A half-life of 48 hours: every two days the score halves."}
          </li>
        </ul>

        <p>
          {th ? (
            <>
              เพราะเป็นการลดแบบทวีคูณ <b className="text-ink">popoto ที่เพิ่มเป็นเท่าตัวจึงซื้อเวลาได้แค่สองวัน</b>{" "}
              รูปที่ได้ 10 popoto จะถูกรูปใหม่เอี่ยมแซงในราว 8 วัน ส่วนรูปที่ได้ 100
              popoto ก็อยู่ได้นานกว่านั้นแค่ราวหกวัน ไม่ใช่สิบเท่า
            </>
          ) : (
            <>
              Because the fade is exponential,{" "}
              <b className="text-ink">doubling the potatoes buys only two more days</b>.
              A picture with ten is overtaken by a brand new one after about eight
              days; one with a hundred lasts about six days longer than that, not
              ten times as long.
            </>
          )}
        </p>

        <p className="border-t border-line pt-2.5">
          {th
            ? "อีกสองแท็บไม่ใช้สูตรนี้ — Newest เรียงตามเวลาโพสต์ล้วน ส่วน Most popoto เรียงตามจำนวน popoto ล้วนโดยไม่ลดตามอายุ"
            : "The other two tabs do not use this. Newest is ordered by when a picture was posted, and Most popoto by the count alone, with no fading."}
        </p>
      </div>
    </details>
  );
}

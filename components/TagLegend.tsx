"use client";

import { TAG_CLASS, TAG_HELP, TAG_LABELS } from "@/components/MemberTags";

const RAID_TAGS = ["tier-clear", "prog", "raider", "ultimate", "veteran", "extreme"];
const PLAY_TAGS = ["crafter", "gatherer", "relic", "explorer", "treasure",
                   "goldsaucer", "seasonal", "pvp", "oldtimer"];
const OTHER_TAGS = ["achiever", "casual", "unknown"];

function Chip({ t }: { t: string }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium ${
      TAG_CLASS[t] ?? "border-line text-muted"}`}>
      {TAG_LABELS[t] ?? t}
    </span>
  );
}

function Group({ title, tags }: { title: string; tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div>
      <div className="mb-1.5 font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
        {title}
      </div>
      <dl className="flex flex-col gap-1.5">
        {tags.map((t) => (
          <div key={t} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <dt><Chip t={t} /></dt>
            <dd className="text-[12.5px] leading-relaxed text-muted">{TAG_HELP[t]}</dd>
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
 */
export default function TagLegend({ present }: { present?: Set<string> }) {
  // Only explain tags somebody in the FC actually has. A glossary listing badges
  // nobody holds reads like the page is broken, or like they are missing.
  const keep = (tags: string[]) =>
    present ? tags.filter((t) => present.has(t)) : tags;

  return (
    <details className="mt-3 rounded-xl border border-line bg-surface">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-[13.5px] font-medium text-muted marker:text-amber">
        What do the tags mean?
      </summary>
      <div className="grid gap-5 border-t border-line px-4 py-4 sm:grid-cols-2">
        <Group title="Raiding — from FF Logs" tags={keep(RAID_TAGS)} />
        <Group title="Playstyle — from rare achievements" tags={keep(PLAY_TAGS)} />
        <Group title="Everything else" tags={keep(OTHER_TAGS)} />
        <div className="sm:col-span-2">
          <div className="mb-1.5 font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
            Grades
          </div>
          <p className="text-[12.5px] leading-relaxed text-muted">
            Each rare achievement is worth{" "}
            <b className="text-ink">1 + log₁₀(10 ÷ % of players who own it)</b> — so
            something 10% of players have scores 1 point, 1% scores 2, and 0.1% scores
            3. Collecting a lot adds up, but rarity counts for much more.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            The grade is your score as a share of{" "}
            <b className="text-ink">every rare achievement that exists in that
            playstyle</b>. It is not a race: however many people reach a bar, all of
            them earn it, and nobody is demoted because someone keener joins. Sharing
            the same measure also keeps it fair between playstyles — Old-timer has
            roughly ten times as much rare content as Gold Saucer, so a flat score
            would be unreachable in one and trivial in the other.
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-[12.5px] text-muted">
            <li><b className="text-ink">Legendary</b> — 25% or more of that playstyle</li>
            <li><b className="text-ink">Master</b> — 12% or more</li>
            <li><b className="text-ink">Expert</b> — 5% or more</li>
            <li>
              <b className="text-ink">No prefix</b> — earned the tag, under 5%
            </li>
          </ul>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            A grade can also appear against a <b className="text-ink">job</b>, from FF
            Logs. It blends the average of someone&rsquo;s best parses with how much
            they have actually played it — kills and how many different fights — so a
            single lucky pull does not qualify. It is there to answer &ldquo;who could
            show a newcomer this job?&rdquo;, and only shows from Expert up.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            Everything here is read from public Lodestone, FF Logs and FFXIV Collect
            data. Members who keep achievements or logs private show as{" "}
            <b className="text-ink">No data</b> — that is a privacy setting, not a
            judgement about how they play.
          </p>
        </div>
      </div>
    </details>
  );
}

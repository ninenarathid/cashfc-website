/**
 * The links people paste, as links.
 *
 * A raid plan is half somebody else's page — a Tuufless guide, a Toolbox
 * strategy, a YouTube timestamp — and pasting one into the write-up got a line
 * of blue-free text that had to be selected by hand and copied out. Reported
 * by the FC the day the finder opened, with a screenshot of exactly that.
 *
 * Plain text in, text and anchors out. No markdown, no bare-domain guessing:
 * `https://` or `http://` and nothing else, because "cafe.and.shabu" in a
 * sentence is a sentence, and a linkifier that decides otherwise turns prose
 * into a minefield of accidental links.
 *
 * Everything else about the paragraph is unchanged — this returns a fragment,
 * so whitespace, wrapping and colour stay with whoever is drawing it.
 */

/*
 * Where a URL stops.
 *
 * Not at a bracket or a quote, because those are how a link gets wrapped in
 * prose, and not at whitespace for the obvious reason. Trailing punctuation is
 * trimmed afterwards rather than excluded here: a full stop is legal in a path
 * and illegal at the end of a sentence, and only the position tells them apart.
 */
const URL_RE = /https?:\/\/[^\s<>"'`)\]}]+/g;
const TRAIL = /[.,;:!?]+$/;

export default function Linkify({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let at = 0;

  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    // The full stop that ended the sentence rather than the path.
    const href = m[0].replace(TRAIL, "");
    if (start > at) out.push(text.slice(at, start));
    out.push(
      <a key={start} href={href} target="_blank" rel="noreferrer noopener"
         onClick={(e) => e.stopPropagation()}
         className="break-all text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
        {href}
      </a>,
    );
    at = start + href.length;
  }

  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

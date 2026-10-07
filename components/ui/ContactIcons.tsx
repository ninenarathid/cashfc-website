/**
 * The marks beside a way to reach somebody.
 *
 * Discord's is its own, filled, because it is a brand and a stroke drawing of
 * one is a different logo. The other two are drawn the way the header's marks
 * are: a 24-unit box, round ends, colour from the text around them.
 */

type Props = { size?: number; className?: string };

export function DiscordGlyph({ size = 15, className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden
         fill="currentColor" className={`shrink-0 ${className}`}>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.028C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.1.246.198.373.292a.077.077 0 0 1-.007.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.04.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.029ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

/** A lower-case f in a rounded square: enough to say which one, without the blue. */
export function FacebookGlyph({ size = 15, className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
         className={`shrink-0 ${className}`}>
      <rect x="3" y="3" width="18" height="18" rx="4.5" />
      <path d="M16 7.5h-1.5a2.5 2.5 0 0 0-2.5 2.5v11M9.5 13.5h6" />
    </svg>
  );
}

export function LockGlyph({ size = 12, className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
         className={`shrink-0 ${className}`}>
      <rect x="5" y="11" width="14" height="9.5" rx="2.5" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  );
}

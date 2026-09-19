"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Drawer } from "vaul";
import AuthButton from "@/components/AuthButton";
import LangToggle from "@/components/LangToggle";
import { useLang, type Key } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { GALLERY_PUBLIC_KEY } from "@/lib/gallery";
import { useAdmin } from "@/lib/admin";
import NotificationBell from "@/components/NotificationBell";
import { NAV_ICON, MoreIcon } from "@/components/ui/NavIcons";

type Tab = {
  href: string;
  label: Key;
  /** What the bottom bar calls it, where the full name will not fit. */
  short?: Key;
  match?: (p: string) => boolean;
};

// Events and Minigames are built but unlinked until that phase is picked up again —
// their routes 404 in the meantime (see app/events, app/games).
// No Home tab: the logo to the left of these is already a link home, and two
// ways to the same page sitting next to each other is one of them spare.
const TABS: Tab[] = [
  // A member's own page belongs to the roster, so the tab stays lit while you read
  // one. The default prefix test misses it: "/member/123" does not start with
  // "/members".
  { href: "/members", label: "nav.members", match: (p) => p.startsWith("/member") },
  { href: "/leaderboards", label: "nav.leaderboards", short: "nav.ranks" },
];

// Shown only to whoever the gallery is open to, so the header never offers a
// tab that answers with a 404.
const GALLERY_TAB: Tab = { href: "/gallery", label: "nav.gallery" };
// Signed in only: a feedback thread needs somebody to reply to, and there is
// nothing on that page for a visitor who has not said who they are.
const FEEDBACK_TAB: Tab = { href: "/feedback", label: "nav.feedback" };
// Marked unfinished on the tab, and only there: the tab is how most people will
// first walk into the guides, and it is the one place worth saying so before
// they do. Admins only while they are being written. A half-finished guide is worse
// than none, because somebody will stand where it says.
const GUIDES_TAB: Tab = { href: "/guides", label: "nav.guidesWip", short: "nav.guides" };
// Open to everybody, and near the front. A board of parties is only worth
// having if the person short of a healer at eight o'clock can find it, and a
// tab an admin can see is a tab nobody is looking at.
const PARTY_TAB: Tab = { href: "/party", label: "nav.party", short: "nav.partyShort" };

/**
 * How many tabs the bottom bar will carry before it starts folding them away.
 *
 * Five slots on a 390px screen is about 78px each, which holds a 21px mark and
 * a 10px word under it without either touching its neighbour.
 */
const BOTTOM_SLOTS = 4;

export default function Nav() {
  const pathname = usePathname();
  const { t } = useLang();

  // Asked rather than assumed: while the gallery is admins only, everybody else
  // would be offered a tab that answers 404. An admin with their powers switched
  // off is, for this purpose, everybody else — which is the point of the switch.
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data: setting } = await supabase
        .from("site_settings").select("value").eq("key", GALLERY_PUBLIC_KEY).maybeSingle();
      setOpen((setting as { value?: string } | null)?.value !== "off");
    })();
  }, []);
  const showGallery = open || isAdmin;

  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e, session) => setSignedIn(!!session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  /*
   * Whether anything has scrolled under the header yet.
   *
   * Only used to decide whether the rule under it is drawn: at the very top
   * there is nothing to separate the header from. Passive, because this listener
   * never calls preventDefault and saying so lets the browser scroll without
   * waiting to find out.
   */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tabs: Tab[] = [
    ...TABS,
    PARTY_TAB,
    ...(showGallery ? [GALLERY_TAB] : []),
    ...(signedIn ? [FEEDBACK_TAB] : []),
    ...(isAdmin ? [GUIDES_TAB] : []),
  ];

  const isActive = (tab: Tab) =>
    tab.match ? tab.match(pathname)
      : tab.href === "/" ? pathname === "/"
      : pathname.startsWith(tab.href);

  /*
   * More is always on the bar, not only when tabs overflow.
   *
   * It used to appear just when there were too many tabs to fit, which was fine
   * while the header still carried search. It does not any more, so the sheet is
   * now the only way to a search box or the language pair on a phone — and a
   * door that appears only for admins is no door.
   */
  const onBar = tabs.slice(0, BOTTOM_SLOTS);
  const inSheet = tabs.slice(BOTTOM_SLOTS);
  const sheetHasActive = inSheet.some(isActive);

  // The header takes its own artwork, since a mark that works at 44px in a nav bar is
  // rarely the same one that works at 450px on the front page. Falls back to the
  // shared logo, then to the text wordmark, so the header is never a broken image
  // whichever files happen to exist.
  const [logoSrc, setLogoSrc] = useState("/logo-header.png");
  const logoBroken = logoSrc === "";

  const [menuOpen, setMenuOpen] = useState(false);

  /*
   * Which way the page should come in.
   *
   * The caret already moves from the tab you left to the tab you picked, and
   * this is the page agreeing with it: a tab further right slides the content in
   * from the right, further left from the left. The tabs are a row with an
   * order, so "forward" has an honest meaning here — it is the direction your
   * eye just travelled.
   *
   * Through Link's own transitionTypes rather than tagging the type in a click
   * handler, which was the first attempt and was wrong: Link runs that handler
   * before it opens the transition, so a type added there belongs to no
   * transition at all. This prop is handed to the router and applied inside it,
   * which is the whole reason it exists.
   *
   * The tag is all this does; the rules that answer it live in globals.css, so a
   * browser without view transitions runs none of it and swaps the page as
   * before.
   */
  const directionTo = (href: string): string[] | undefined => {
    const to = tabs.findIndex((x) => x.href === href);
    const from = tabs.findIndex(isActive);
    if (to < 0 || from < 0 || to === from) return undefined;
    return [to > from ? "nav-forward" : "nav-back"];
  };

  const openPalette = () => {
    setMenuOpen(false);
    window.dispatchEvent(new CustomEvent("palette:open"));
  };

  /*
   * The lit tab is one caret that moves rather than several that switch on and
   * off. A shared layoutId is what makes it one object: React keeps the element
   * across the re-render and motion animates it from where it was to where it
   * now is. The point is not decoration — it is the header answering "you were
   * there, you are here now" in the one place that knows both.
   *
   * Fast and barely bouncy, because this is furniture somebody uses all day.
   * Past about a fifth of a second every page change becomes a wait for the
   * furniture to catch up.
   */
  const reduced = useReducedMotion();
  const slide = reduced
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.18, bounce: 0.15 };

  /**
   * A tab in the header row, or stacked inside the sheet.
   *
   * No border on the ones you are not on. Eight outlined boxes in a row gave
   * every item the same weight and left nothing for the current page to be
   * louder than — the row read as a toolbar rather than as somewhere to go.
   */
  const tabLink = (tab: Tab, sheet: boolean) => {
    const active = isActive(tab);
    const Icon = NAV_ICON[tab.href];
    return (
      <Link
        key={tab.href}
        href={tab.href}
        onClick={() => setMenuOpen(false)}
        transitionTypes={directionTo(tab.href)}
        aria-current={active ? "page" : undefined}
        className={`pressable relative flex items-center gap-1.5 whitespace-nowrap rounded-lg no-underline transition-colors ${
          sheet ? "px-3 py-3 text-title" : "px-2.5 py-1.5 text-read"
        } ${active ? "text-accent" : "text-muted hover:text-ink"}`}
      >
        {Icon && <Icon className="relative shrink-0" size={sheet ? 20 : 16} active={active} />}
        <span className="relative">{t(tab.label)}</span>
        {active && !sheet && (
          <motion.span
            layoutId="nav-caret"
            transition={slide}
            aria-hidden
            className="nav-caret nav-caret-up absolute -bottom-[13px] left-1/2 -translate-x-1/2"
          />
        )}
        {active && sheet && (
          <motion.span
            layoutId="nav-caret-sheet"
            transition={slide}
            aria-hidden
            className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent"
          />
        )}
      </Link>
    );
  };

  /** A tab on the bar along the bottom: mark above, short word under. */
  const barLink = (tab: Tab) => {
    const active = isActive(tab);
    const Icon = NAV_ICON[tab.href];
    return (
      <Link
        key={tab.href}
        href={tab.href}
        transitionTypes={directionTo(tab.href)}
        aria-current={active ? "page" : undefined}
        className={`pressable relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl pb-2 pt-2.5 no-underline transition-colors ${
          active ? "text-accent" : "text-muted"
        }`}
      >
        {active && (
          <motion.span
            layoutId="nav-caret-bar"
            transition={slide}
            aria-hidden
            className="nav-caret nav-caret-down absolute top-0 left-1/2 -translate-x-1/2"
          />
        )}
        {Icon && <Icon className="relative" size={21} active={active} />}
        {/* font-data, not the body face: the body one is looped Thai and at 10px
            the loops fill in and the word turns to a smudge. Bai Jamjuree has no
            loops and was drawn for small sizes. */}
        <span className="relative max-w-full truncate px-0.5 font-data text-label leading-none">
          {t(tab.short ?? tab.label)}
        </span>
      </Link>
    );
  };

  const sheet = (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-[90] bg-bg/80 backdrop-blur-sm" />
      {/* Same shape as the command palette's sheet, which is the other thing on
          this site that comes up from the bottom. vaul carries the drag, the
          velocity and the rubber-banding at the top. */}
      <Drawer.Content className="lit-top fixed inset-x-0 bottom-0 z-[91] mt-24 flex flex-col rounded-t-2xl border border-line bg-surface outline-none">
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-line" />
        <Drawer.Title className="px-4 pb-1 pt-4 font-data text-label uppercase tracking-[0.14em] text-muted">
          {t("nav.menu")}
        </Drawer.Title>

        {/* Search lives here now rather than in the header. A phone has no "/"
            to press, so without this there would be no way to reach the palette
            at all on one. */}
        <div className="px-4 pb-3 pt-1">
          <button
            onClick={openPalette}
            className="flex w-full items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-lead text-muted transition-colors hover:border-accent hover:text-accent">
            <svg viewBox="0 0 24 24" aria-hidden width="16" height="16" fill="none"
                 stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            {t("palette.hint")}
          </button>
        </div>

        <div className="flex flex-col gap-0.5 px-4 pb-4">
          {(inSheet.length ? inSheet : tabs).map((tab) => tabLink(tab, true))}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <span className="font-data text-meta uppercase tracking-[0.14em] text-muted">
            {t("nav.language")}
          </span>
          <LangToggle />
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  );

  return (
    <>
      <nav
        data-scrolled={scrolled}
        className="nav-sticky flex items-center justify-between gap-x-4 py-3">
        <Link href="/" className="flex shrink-0 items-center no-underline">
          {logoBroken ? (
            <span className="font-data text-meta uppercase tracking-[0.22em] text-accent">
              Cafe And SHabu
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="Cafe And SHabu"
                 className="h-10 w-auto sm:h-11"
                 onError={() =>
                   setLogoSrc((s) => (s === "/logo-header.png" ? "/logo.png" : ""))} />
          )}
        </Link>

        {/* The tabs live in the header only where there is room for them. Below
            that they are along the bottom edge instead, which is where a thumb
            already is. */}
        {/* Never wraps: the header publishes a fixed height that the gallery's
            own sticky row starts below, so a second line here would put a tab
            underneath the page rather than in the bar. An admin sees six of
            these and the widest case simply scrolls, which no-bar hides. */}
        <div className="no-bar hidden min-w-0 flex-nowrap items-center gap-0.5 overflow-x-auto sm:flex">
          {tabs.map((tab) => tabLink(tab, false))}
        </div>

        {/* Where you are going, and then things about you. The rule between them
            is the whole distinction: everything left of it is a destination,
            everything right of it is yours. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span aria-hidden className="mr-1 hidden h-5 w-px bg-line sm:block" />

          {/* A setting rather than a destination, so on a narrow screen it goes
              in the sheet with the other things you change. */}
          <div className="hidden sm:block"><LangToggle /></div>

          {/* Beside the face rather than among the tabs: it is about you, not
              about where you are going, and it renders nothing at all when
              signed out. */}
          <NotificationBell />
          <AuthButton />
        </div>
      </nav>

      {/*
        The bar along the bottom of a phone.

        Down here rather than under the logo because this is where the thumb
        already is — the top of a phone is the part of the screen a hand has to
        be rearranged to reach. Fixed, so it survives the page scrolling under
        it, and below the palette and the toasts in the stack: anything that
        comes up to be answered should cover the way out.
      */}
      <Drawer.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <nav
          aria-label={t("nav.menu")}
          className="tabbar fixed inset-x-0 bottom-0 z-[50] bg-bg/70 backdrop-blur-xl sm:hidden">
          <span aria-hidden className="tabbar-scrim" />
          <div className="mx-auto flex max-w-5xl items-stretch gap-0.5 px-1.5 pb-[env(safe-area-inset-bottom)]">
            {onBar.map(barLink)}
            {(
              <Drawer.Trigger asChild>
                <button
                  aria-label={t("nav.more")}
                  aria-expanded={menuOpen}
                  className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl pb-2 pt-2.5 transition-colors ${
                    // Lit when what it is hiding is where you are, so folding a
                    // tab away never makes the bar claim you are nowhere.
                    sheetHasActive || menuOpen ? "text-accent" : "text-muted"
                  }`}>
                  <MoreIcon className="relative" size={21} />
                  <span className="relative font-data text-label leading-none">
                    {t("nav.more")}
                  </span>
                </button>
              </Drawer.Trigger>
            )}
          </div>
        </nav>
        {sheet}
      </Drawer.Root>
    </>
  );
}

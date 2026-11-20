"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { SITE_THEME_STORAGE_KEY, type SiteTheme } from "@/lib/site-theme";

const ThemeContext = createContext<{
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  inTown: boolean;
} | null>(null);

export function SiteThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inTown = pathname === "/town" || pathname.startsWith("/town/");
  const [theme, setThemeState] = useState<SiteTheme>("dark");

  useEffect(() => {
    const apply = (value: string | null | undefined) => {
      const next = value === "light" ? "light" : "dark";
      document.documentElement.dataset.siteTheme = next;
      setThemeState(next);
    };
    apply(document.documentElement.dataset.siteTheme);

    const onStorage = (event: StorageEvent) => {
      if (event.key === SITE_THEME_STORAGE_KEY || event.key === null) apply(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setTheme(next: SiteTheme) {
    document.documentElement.dataset.siteTheme = next;
    setThemeState(next);
    try {
      localStorage.setItem(SITE_THEME_STORAGE_KEY, next);
    } catch { /* The current tab still uses the chosen theme. */ }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, inTown }}>
      {inTown && <span hidden data-town-route />}
      {children}
    </ThemeContext.Provider>
  );
}

export function SiteThemeToggle() {
  const settings = useContext(ThemeContext);
  const { t } = useLang();
  if (!settings || settings.inTown) return null;

  return (
    <div className="inline-flex rounded-lg bg-card/70 p-0.5"
         role="group" aria-label={t("nav.theme")}>
      {(["light", "dark"] as const).map((mode) => {
        const active = settings.theme === mode;
        const label = t(mode === "light" ? "nav.themeLight" : "nav.themeDark");
        return (
          <button key={mode} type="button" aria-pressed={active} title={label}
                  onClick={() => settings.setTheme(mode)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-read transition-colors sm:min-h-8 sm:px-2 ${
                    active ? "bg-accent/15 text-accent" : "text-muted hover:bg-card hover:text-ink"
                  }`}>
            <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none"
                 stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {mode === "light" ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
                </>
              ) : <path d="M20 15.7A8.7 8.7 0 0 1 8.3 4 8.7 8.7 0 1 0 20 15.7Z" />}
            </svg>
            <span className="sm:sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

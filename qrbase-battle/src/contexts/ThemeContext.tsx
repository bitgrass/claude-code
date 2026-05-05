"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppTheme = "dark" | "light";

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (nextTheme: AppTheme) => void;
  toggleTheme: () => void;
  mounted: boolean;
}

const THEME_STORAGE_KEY = "qrbase_theme";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
  mounted: false,
});

function applyThemeToDom(nextTheme: AppTheme) {
  document.documentElement.setAttribute("data-theme", nextTheme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      const restoredTheme: AppTheme = saved === "light" ? "light" : "dark";
      setThemeState(restoredTheme);
      applyThemeToDom(restoredTheme);
    } catch {
      applyThemeToDom("dark");
    } finally {
      setMounted(true);
    }
  }, []);

  const setTheme = (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {}
    applyThemeToDom(nextTheme);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      mounted,
    }),
    [mounted, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

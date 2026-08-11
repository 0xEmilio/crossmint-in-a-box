"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type AppThemeMode = "light" | "dark";

interface AppThemeContextValue {
  mode: AppThemeMode;
  toggle: () => void;
  setMode: (mode: AppThemeMode) => void;
}

const STORAGE_KEY = "xmint-app-theme";

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppThemeMode>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      setModeState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = (next: AppThemeMode) => setModeState(next);
  const toggle = () => setModeState((current) => (current === "dark" ? "light" : "dark"));

  return (
    <AppThemeContext.Provider value={{ mode, toggle, setMode }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}

/** Inline script string to set the `dark` class before hydration, avoiding a flash of the wrong theme. */
export const NO_FLASH_THEME_SCRIPT = `
try {
  var stored = localStorage.getItem('${STORAGE_KEY}');
  if (stored === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
`;

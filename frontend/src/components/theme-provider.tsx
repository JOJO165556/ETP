"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  basculer: () => void;
}

export const THEME_STORAGE_KEY = "etp-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

/* Fournisseur de thème — mode clair par défaut partout, persisté en localStorage.
   Le script inline dans app/layout.tsx applique déjà la classe avant le paint. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stocke = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? "light";
    setThemeState(stocke);
    document.documentElement.classList.toggle("dark", stocke === "dark");
  }, []);

  const setTheme = (suivant: Theme) => {
    setThemeState(suivant);
    localStorage.setItem(THEME_STORAGE_KEY, suivant);
    document.documentElement.classList.toggle("dark", suivant === "dark");
  };

  const basculer = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, basculer }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé dans <ThemeProvider>.");
  return ctx;
}
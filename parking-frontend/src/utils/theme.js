import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "parksmart-theme";
export const THEME_CHANGE_EVENT = "parksmart-theme-change";

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return localStorage.getItem(THEME_STORAGE_KEY) || "system";
}

export function getResolvedTheme(theme) {
  return theme === "system" ? getSystemTheme() : theme;
}

export function applyTheme(theme) {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedTheme = getResolvedTheme(theme);
  const root = document.documentElement;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { theme, resolvedTheme },
    })
  );
}

export function initializeTheme() {
  const savedTheme = getStoredTheme();
  applyTheme(savedTheme);
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => getStoredTheme());
  const resolvedTheme = getResolvedTheme(theme);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const syncTheme = () => {
      setThemeState(getStoredTheme());
    };

    const handleSystemChange = () => {
      if (getStoredTheme() === "system") {
        applyTheme("system");
        syncTheme();
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, []);

  const setTheme = (nextTheme) => {
    applyTheme(nextTheme);
    setThemeState(nextTheme);
  };

  return { theme, resolvedTheme, setTheme };
}

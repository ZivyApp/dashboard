import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const safeStorage = () => {
  try {
    return localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      setMode: (mode) => {
        set({ mode });
        applyTheme(mode);
      },
    }),
    { name: "zivy-theme", storage: createJSONStorage(safeStorage) },
  ),
);

export function applyTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

let mediaListenerAttached = false;

function handleSystemThemeChange() {
  if (useThemeStore.getState().mode === "system") applyTheme("system");
}

export function initTheme() {
  applyTheme(useThemeStore.getState().mode);
  if (typeof window === "undefined" || mediaListenerAttached) return;
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", handleSystemThemeChange);
  mediaListenerAttached = true;
}

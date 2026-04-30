import { describe, expect, it, beforeEach } from "vitest";
import { useThemeStore, applyTheme } from "./theme";

describe("themeStore", () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: "system" });
    document.documentElement.removeAttribute("data-theme");
  });

  it("default mode é system", () => {
    expect(useThemeStore.getState().mode).toBe("system");
  });

  it("setMode atualiza o estado", () => {
    useThemeStore.getState().setMode("dark");
    expect(useThemeStore.getState().mode).toBe("dark");
  });

  it("applyTheme grava data-theme=dark quando mode=dark", () => {
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("applyTheme grava data-theme=light quando mode=light", () => {
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("applyTheme com system grava conforme prefers-color-scheme", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
    });
    applyTheme("system");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

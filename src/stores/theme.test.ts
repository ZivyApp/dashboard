import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { useThemeStore, applyTheme } from "./theme";

describe("themeStore", () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: "system" });
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("default mode é system", () => {
    expect(useThemeStore.getState().mode).toBe("system");
  });

  it("setMode atualiza o estado e aplica data-theme", () => {
    useThemeStore.getState().setMode("dark");
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
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
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList);
    applyTheme("system");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

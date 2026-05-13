import { describe, expect, it, afterEach, vi } from "vitest";
import { getLastSelected, setLastSelected } from "./activeCondo";

describe("activeCondo", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("retorna undefined quando nada está armazenado", () => {
    expect(getLastSelected()).toBeUndefined();
  });

  it("roundtrip: set + get retorna o valor salvo", () => {
    setLastSelected("condo-42");
    expect(getLastSelected()).toBe("condo-42");
  });

  it("setLastSelected não lança quando setItem dispara erro (Safari Private mode)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => setLastSelected("condo-99")).not.toThrow();
  });

  it("getLastSelected retorna undefined quando getItem lança (Safari Private mode)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(getLastSelected()).toBeUndefined();
  });
});

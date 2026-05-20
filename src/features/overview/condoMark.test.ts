import { describe, expect, it } from "vitest";
import { condoMark } from "./condoMark";

describe("condoMark", () => {
  it("duas palavras → inicial da primeira + última", () => {
    expect(condoMark("Solar das Flores")).toBe("SF");
  });
  it("uma palavra → duas primeiras letras", () => {
    expect(condoMark("Vista")).toBe("VI");
  });
  it("string vazia → ?", () => {
    expect(condoMark("   ")).toBe("?");
  });
});

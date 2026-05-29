import { describe, it, expect } from "vitest";
import { formatFullTime } from "./formatFullTime";

describe("formatFullTime", () => {
  it("formata ISO em pt-BR com data e hora", () => {
    const out = formatFullTime("2026-05-20T13:05:00Z");
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
  it("devolve travessão para undefined", () => {
    expect(formatFullTime(undefined)).toBe("—");
  });
  it("devolve travessão para data inválida", () => {
    expect(formatFullTime("não-é-data")).toBe("—");
  });
});

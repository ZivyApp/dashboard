import { describe, expect, it } from "vitest";
import { formatPhone } from "./formatPhone";

describe("formatPhone", () => {
  it("formata número completo com código de país (sem mascarar)", () => {
    expect(formatPhone("+5511999994312")).toBe("+55 11 99999-4312");
  });

  it("formata número sem código de país", () => {
    expect(formatPhone("11999994312")).toBe("11 99999-4312");
  });

  it("retorna '—' para vazio/undefined", () => {
    expect(formatPhone(undefined)).toBe("—");
    expect(formatPhone("")).toBe("—");
  });

  it("retorna o original quando há poucos dígitos para formatar", () => {
    expect(formatPhone("12345")).toBe("12345");
  });
});

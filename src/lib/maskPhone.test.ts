import { describe, expect, it } from "vitest";
import { maskPhone } from "./maskPhone";

describe("maskPhone", () => {
  it("mascara o miolo preservando prefixo e 4 últimos dígitos", () => {
    expect(maskPhone("+5511999994312")).toBe("+55 11 9****-4312");
  });

  it("lida com número sem código de país (10-11 dígitos)", () => {
    expect(maskPhone("11999994312")).toBe("11 9****-4312");
  });

  it("retorna '—' para vazio/undefined", () => {
    expect(maskPhone(undefined)).toBe("—");
    expect(maskPhone("")).toBe("—");
  });

  it("retorna o original quando há poucos dígitos para mascarar", () => {
    expect(maskPhone("12345")).toBe("12345");
  });
});

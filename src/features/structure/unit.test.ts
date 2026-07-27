import { describe, expect, it } from "vitest";
import { formatFloor, toUnit } from "./unit";

describe("toUnit", () => {
  it("mapeia uma unidade completa", () => {
    expect(toUnit({ id: "u1", block_id: "b1", number: "203", floor: 2 })).toEqual({
      id: "u1",
      blockId: "b1",
      number: "203",
      floor: 2,
    });
  });

  it("omite floor ausente e ignora floor não-inteiro", () => {
    const sem = toUnit({ id: "u1", block_id: "b1", number: "203" });
    expect(sem).not.toBeNull();
    expect(sem && "floor" in sem).toBe(false);
    const fracionado = toUnit({ id: "u1", block_id: "b1", number: "203", floor: 2.5 });
    expect(fracionado && "floor" in fracionado).toBe(false);
  });

  it("retorna null sem id, number ou block_id", () => {
    expect(toUnit({ block_id: "b1", number: "203" })).toBeNull();
    expect(toUnit({ id: "u1", number: "203" })).toBeNull();
    expect(toUnit({ id: "u1", block_id: "b1" })).toBeNull();
  });
});

describe("formatFloor", () => {
  it("0 vira Térreo", () => {
    expect(formatFloor(0)).toBe("Térreo");
  });
  it("positivos viram Nº andar", () => {
    expect(formatFloor(2)).toBe("2º andar");
  });
  it("negativos (subsolo) viram Nº andar", () => {
    expect(formatFloor(-1)).toBe("-1º andar");
  });
  it("undefined vira traço", () => {
    expect(formatFloor(undefined)).toBe("—");
  });
});

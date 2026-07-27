import { describe, expect, it } from "vitest";
import { toBlock } from "./block";

describe("toBlock", () => {
  it("mapeia um bloco completo", () => {
    expect(toBlock({ id: "b1", name: "Torre A", description: "Bloco da frente" })).toEqual({
      id: "b1",
      name: "Torre A",
      description: "Bloco da frente",
    });
  });

  it("omite description ausente ou vazia (não vira undefined explícito)", () => {
    const sem = toBlock({ id: "b1", name: "Torre A" });
    expect(sem).not.toBeNull();
    expect(sem && "description" in sem).toBe(false);
    const vazia = toBlock({ id: "b1", name: "Torre A", description: "" });
    expect(vazia && "description" in vazia).toBe(false);
  });

  it("retorna null sem id ou name", () => {
    expect(toBlock({ name: "Torre A" })).toBeNull();
    expect(toBlock({ id: "b1" })).toBeNull();
    expect(toBlock({ id: "b1", name: "" })).toBeNull();
  });
});

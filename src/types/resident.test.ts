import { describe, expect, it } from "vitest";
import { isResident } from "./resident";

describe("isResident", () => {
  it("aceita objeto com id/name/status string", () => {
    expect(isResident({ id: "r1", name: "Ana", status: "APPROVED" })).toBe(true);
  });

  it("aceita unit_id opcional", () => {
    expect(isResident({ id: "r1", name: "Ana", status: "APPROVED", unit_id: "u1" })).toBe(true);
  });

  it("rejeita quando falta name", () => {
    expect(isResident({ id: "r1", status: "APPROVED" })).toBe(false);
  });

  it("rejeita quando status não é string", () => {
    expect(isResident({ id: "r1", name: "Ana", status: 3 })).toBe(false);
  });

  it("rejeita null e não-objeto", () => {
    expect(isResident(null)).toBe(false);
    expect(isResident("x")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { compareRoles, isAtLeast, type Role } from "./roleHierarchy";

const roles: Role[] = ["viewer", "staff", "manager", "super_admin"];
const rank: Record<Role, number> = {
  viewer: 1,
  staff: 2,
  manager: 3,
  super_admin: 4,
};

describe("isAtLeast", () => {
  for (const actual of roles) {
    for (const required of roles) {
      const expected = rank[actual] >= rank[required];
      it(`isAtLeast(${actual}, ${required}) === ${String(expected)}`, () => {
        expect(isAtLeast(actual, required)).toBe(expected);
      });
    }
  }
});

describe("compareRoles", () => {
  it("ordena do mais privilegiado para o menos (super_admin → viewer)", () => {
    const input: Role[] = ["viewer", "manager", "staff", "super_admin"];
    const sorted = [...input].sort(compareRoles);
    expect(sorted).toEqual(["super_admin", "manager", "staff", "viewer"]);
  });

  it("retorna 0 para roles iguais", () => {
    expect(compareRoles("manager", "manager")).toBe(0);
  });

  it("retorna sinal negativo quando a é mais privilegiado (contrato Array.sort)", () => {
    expect(compareRoles("super_admin", "viewer")).toBeLessThan(0);
    expect(compareRoles("manager", "staff")).toBeLessThan(0);
  });

  it("retorna sinal positivo quando b é mais privilegiado", () => {
    expect(compareRoles("viewer", "super_admin")).toBeGreaterThan(0);
    expect(compareRoles("staff", "manager")).toBeGreaterThan(0);
  });
});

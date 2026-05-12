import { describe, expect, it } from "vitest";
import { isAtLeast, type Role } from "./roleHierarchy";

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

import { describe, expect, it } from "vitest";
import { toCondoMembership } from "./condoMembership";

describe("toCondoMembership", () => {
  it("mapeia item válido corretamente", () => {
    const result = toCondoMembership({
      condo_id: "id-1",
      condo_name: "Residencial Alfa",
      condo_slug: "residencial-alfa",
      role: "manager",
    });
    expect(result).toEqual({
      condoId: "id-1",
      condoName: "Residencial Alfa",
      condoSlug: "residencial-alfa",
      role: "manager",
    });
  });

  it("retorna null quando condo_id está ausente", () => {
    expect(toCondoMembership({ condo_name: "Alfa", condo_slug: "alfa", role: "staff" })).toBeNull();
  });

  it("retorna null quando condo_name está ausente", () => {
    expect(toCondoMembership({ condo_id: "id-1", condo_slug: "alfa", role: "staff" })).toBeNull();
  });

  it("retorna null quando condo_slug está ausente", () => {
    expect(toCondoMembership({ condo_id: "id-1", condo_name: "Alfa", role: "staff" })).toBeNull();
  });

  it("retorna null quando role é inválido", () => {
    expect(
      toCondoMembership({
        condo_id: "id-1",
        condo_name: "Alfa",
        condo_slug: "alfa",
        role: "owner",
      }),
    ).toBeNull();
  });

  it("retorna null quando role está ausente", () => {
    expect(
      toCondoMembership({ condo_id: "id-1", condo_name: "Alfa", condo_slug: "alfa" }),
    ).toBeNull();
  });

  it("aceita todos os roles válidos", () => {
    const roles = ["viewer", "staff", "manager", "super_admin"] as const;
    for (const role of roles) {
      const result = toCondoMembership({
        condo_id: "id-1",
        condo_name: "Alfa",
        condo_slug: "alfa",
        role,
      });
      expect(result).not.toBeNull();
      expect(result?.role).toBe(role);
    }
  });

  it("retorna null quando condo_id é string vazia", () => {
    expect(
      toCondoMembership({
        condo_id: "",
        condo_name: "Alfa",
        condo_slug: "alfa",
        role: "staff",
      }),
    ).toBeNull();
  });

  it("retorna null quando condo_name é string vazia", () => {
    expect(
      toCondoMembership({
        condo_id: "id-1",
        condo_name: "",
        condo_slug: "alfa",
        role: "staff",
      }),
    ).toBeNull();
  });

  it("retorna null quando condo_slug é string vazia", () => {
    expect(
      toCondoMembership({
        condo_id: "id-1",
        condo_name: "Alfa",
        condo_slug: "",
        role: "staff",
      }),
    ).toBeNull();
  });
});

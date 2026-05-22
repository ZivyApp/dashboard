import { describe, expect, it } from "vitest";
import { toPendingResident } from "./pendingResident";

const RAW = {
  id: "r1",
  name: "Lucas Ferreira",
  phone: "+5511999994312",
  status: "PENDING",
  condo_id: "c1",
  created_at: "2026-05-12T07:40:00Z",
};

describe("toPendingResident", () => {
  it("mapeia um resident PENDING completo, anotando condoName", () => {
    expect(toPendingResident(RAW, "Residencial Jardins")).toEqual({
      id: "r1",
      name: "Lucas Ferreira",
      phone: "+5511999994312",
      condoId: "c1",
      condoName: "Residencial Jardins",
      createdAt: "2026-05-12T07:40:00Z",
    });
  });

  it("retorna null quando o status não é PENDING", () => {
    expect(toPendingResident({ ...RAW, status: "ACTIVE" }, "X")).toBeNull();
  });

  it("retorna null quando falta id ou name", () => {
    expect(
      toPendingResident(
        {
          id: undefined,
          name: "Lucas Ferreira",
          phone: "+5511999994312",
          status: "PENDING",
          condo_id: "c1",
          created_at: "2026-05-12T07:40:00Z",
        },
        "X",
      ),
    ).toBeNull();
    expect(toPendingResident({ ...RAW, name: "" }, "X")).toBeNull();
  });

  it("usa condo_id do payload quando presente, senão o fallback", () => {
    expect(
      toPendingResident(
        {
          id: "r1",
          name: "Lucas Ferreira",
          phone: "+5511999994312",
          status: "PENDING",
          condo_id: undefined,
          created_at: "2026-05-12T07:40:00Z",
        },
        "X",
        "fallback-c",
      )?.condoId,
    ).toBe("fallback-c");
  });

  it("omite phone/createdAt ausentes (não vira undefined explícito)", () => {
    const r = toPendingResident({ id: "r2", name: "Ana", status: "PENDING", condo_id: "c1" }, "X");
    expect(r).not.toBeNull();
    expect("phone" in r!).toBe(false);
    expect("createdAt" in r!).toBe(false);
  });
});

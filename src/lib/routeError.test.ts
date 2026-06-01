import { describe, expect, it } from "vitest";
import { classifyRouteError } from "./routeError";

describe("classifyRouteError", () => {
  it("TypeError de fetch → connection", () => {
    expect(classifyRouteError(new TypeError("Failed to fetch"))).toBe("connection");
  });

  it("Error embrulhado pela queryFn (com cause) → connection", () => {
    const err = new Error("GET /condos/me failed", { cause: { status: 500 } });
    expect(classifyRouteError(err)).toBe("connection");
  });

  it("outro verbo HTTP embrulhado → connection", () => {
    expect(classifyRouteError(new Error("POST /tickets failed", { cause: {} }))).toBe("connection");
  });

  it("Error de render genérico → unknown", () => {
    expect(classifyRouteError(new Error("Cannot read properties of undefined"))).toBe("unknown");
  });

  it("mensagem de API mas sem cause → unknown", () => {
    expect(classifyRouteError(new Error("GET /x failed"))).toBe("unknown");
  });

  it("valores não-Error → unknown", () => {
    expect(classifyRouteError(undefined)).toBe("unknown");
    expect(classifyRouteError("erro string")).toBe("unknown");
  });
});

import { describe, expect, it } from "vitest";
import { applyAuthHeaders } from "./auth";

const buildRequest = () => new Request("https://api.example.com/test");

describe("applyAuthHeaders", () => {
  it("seta Authorization quando há token", async () => {
    const req = await applyAuthHeaders(buildRequest(), {
      getAccessToken: () => Promise.resolve("token-123"),
      getActiveCondoId: () => undefined,
    });
    expect(req.headers.get("Authorization")).toBe("Bearer token-123");
    expect(req.headers.get("X-Condo-ID")).toBeNull();
  });

  it("não seta Authorization quando token é undefined", async () => {
    const req = await applyAuthHeaders(buildRequest(), {
      getAccessToken: () => Promise.resolve(undefined),
      getActiveCondoId: () => undefined,
    });
    expect(req.headers.get("Authorization")).toBeNull();
  });

  it("seta X-Condo-ID quando há condo ativo", async () => {
    const req = await applyAuthHeaders(buildRequest(), {
      getAccessToken: () => Promise.resolve(undefined),
      getActiveCondoId: () => "condo-42",
    });
    expect(req.headers.get("X-Condo-ID")).toBe("condo-42");
  });

  it("não seta X-Condo-ID quando condo é undefined", async () => {
    const req = await applyAuthHeaders(buildRequest(), {
      getAccessToken: () => Promise.resolve("token"),
      getActiveCondoId: () => undefined,
    });
    expect(req.headers.get("X-Condo-ID")).toBeNull();
  });

  it("seta ambos quando token e condo presentes", async () => {
    const req = await applyAuthHeaders(buildRequest(), {
      getAccessToken: () => Promise.resolve("t"),
      getActiveCondoId: () => "c",
    });
    expect(req.headers.get("Authorization")).toBe("Bearer t");
    expect(req.headers.get("X-Condo-ID")).toBe("c");
  });

  it("não sobrescreve X-Condo-ID já presente na request (fan-out cross-condo)", async () => {
    const req = buildRequest();
    req.headers.set("X-Condo-ID", "explicit-condo");
    const out = await applyAuthHeaders(req, {
      getAccessToken: () => Promise.resolve("tok"),
      getActiveCondoId: () => "active-condo",
    });
    expect(out.headers.get("X-Condo-ID")).toBe("explicit-condo");
  });
});

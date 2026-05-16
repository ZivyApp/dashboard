import { describe, expect, it, vi } from "vitest";
import { useScope } from "./useScope";

vi.mock("@tanstack/react-router", () => ({
  useParams: vi.fn(),
}));

import { useParams } from "@tanstack/react-router";

describe("useScope", () => {
  it("retorna scope condo quando rota tem condoId", () => {
    vi.mocked(useParams).mockReturnValue({ condoId: "c1" });
    expect(useScope()).toEqual({ kind: "condo", condoId: "c1" });
  });

  it("retorna scope all quando rota não tem condoId", () => {
    vi.mocked(useParams).mockReturnValue({});
    expect(useScope()).toEqual({ kind: "all" });
  });

  it("retorna scope all quando condoId não é string", () => {
    vi.mocked(useParams).mockReturnValue({ condoId: undefined });
    expect(useScope()).toEqual({ kind: "all" });
  });
});

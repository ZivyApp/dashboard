import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useCanApprove } from "./useCanApprove";

const { mockMyCondos } = vi.hoisted(() => ({ mockMyCondos: vi.fn() }));
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockMyCondos }));

afterEach(() => {
  mockMyCondos.mockReset();
});

describe("useCanApprove", () => {
  it("scope condo: true quando role no condo é manager", () => {
    mockMyCondos.mockReturnValue({
      data: [
        { condoId: "c1", condoName: "C1", condoSlug: "c1", role: "manager" },
        { condoId: "c2", condoName: "C2", condoSlug: "c2", role: "viewer" },
      ],
    });
    const { result } = renderHook(() => useCanApprove({ kind: "condo", condoId: "c1" }));
    expect(result.current).toBe(true);
  });

  it("scope condo: false quando role no condo é viewer", () => {
    mockMyCondos.mockReturnValue({
      data: [{ condoId: "c1", condoName: "C1", condoSlug: "c1", role: "viewer" }],
    });
    const { result } = renderHook(() => useCanApprove({ kind: "condo", condoId: "c1" }));
    expect(result.current).toBe(false);
  });

  it("scope condo: false quando o condoId não está na lista", () => {
    mockMyCondos.mockReturnValue({
      data: [{ condoId: "c1", condoName: "C1", condoSlug: "c1", role: "manager" }],
    });
    const { result } = renderHook(() => useCanApprove({ kind: "condo", condoId: "outro" }));
    expect(result.current).toBe(false);
  });

  it("scope all: true quando manager em ao menos um condo", () => {
    mockMyCondos.mockReturnValue({
      data: [
        { condoId: "c1", condoName: "C1", condoSlug: "c1", role: "viewer" },
        { condoId: "c2", condoName: "C2", condoSlug: "c2", role: "manager" },
      ],
    });
    const { result } = renderHook(() => useCanApprove({ kind: "all" }));
    expect(result.current).toBe(true);
  });

  it("scope all: false quando nenhum condo tem manager+", () => {
    mockMyCondos.mockReturnValue({
      data: [{ condoId: "c1", condoName: "C1", condoSlug: "c1", role: "viewer" }],
    });
    const { result } = renderHook(() => useCanApprove({ kind: "all" }));
    expect(result.current).toBe(false);
  });

  it("retorna false enquanto data está undefined (loading)", () => {
    mockMyCondos.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useCanApprove({ kind: "all" }));
    expect(result.current).toBe(false);
  });
});

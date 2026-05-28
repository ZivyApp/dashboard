import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { mockUseMyCondos } = vi.hoisted(() => ({ mockUseMyCondos: vi.fn() }));
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockUseMyCondos }));

import { useCanManageTicket } from "./useCanManageTicket";

afterEach(() => vi.restoreAllMocks());

describe("useCanManageTicket", () => {
  it("true quando role no condo é staff+", () => {
    mockUseMyCondos.mockReturnValue({ data: [{ condoId: "c1", role: "manager" }] });
    const { result } = renderHook(() => useCanManageTicket("c1"));
    expect(result.current).toBe(true);
  });
  it("true quando role no condo é staff (limite inferior do gate)", () => {
    mockUseMyCondos.mockReturnValue({ data: [{ condoId: "c1", role: "staff" }] });
    const { result } = renderHook(() => useCanManageTicket("c1"));
    expect(result.current).toBe(true);
  });
  it("false quando role no condo é viewer", () => {
    mockUseMyCondos.mockReturnValue({ data: [{ condoId: "c1", role: "viewer" }] });
    const { result } = renderHook(() => useCanManageTicket("c1"));
    expect(result.current).toBe(false);
  });
  it("false quando o condo não está na membership", () => {
    mockUseMyCondos.mockReturnValue({ data: [{ condoId: "c2", role: "manager" }] });
    const { result } = renderHook(() => useCanManageTicket("c1"));
    expect(result.current).toBe(false);
  });
  it("false enquanto data não chegou", () => {
    mockUseMyCondos.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useCanManageTicket("c1"));
    expect(result.current).toBe(false);
  });
});

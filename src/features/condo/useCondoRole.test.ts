import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Role } from "./roleHierarchy";
import type { CondoMembership } from "./useMyCondos";

const mockUseMyCondos = vi.fn<() => { data: CondoMembership[] | undefined }>();

vi.mock("./useMyCondos", () => ({
  useMyCondos: (): { data: CondoMembership[] | undefined } => mockUseMyCondos(),
}));

const { useCondoRole } = await import("./useCondoRole");

function makeCondos(condoId: string, role: Role): CondoMembership[] {
  return [{ condoId, condoName: "Test Condo", condoSlug: "test", role }];
}

describe("useCondoRole", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("returns undefined while data is loading", () => {
    mockUseMyCondos.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useCondoRole("c1"));
    expect(result.current).toBeUndefined();
  });

  it("returns undefined when condoId is undefined", () => {
    mockUseMyCondos.mockReturnValue({ data: makeCondos("c1", "manager") });
    const { result } = renderHook(() => useCondoRole(undefined));
    expect(result.current).toBeUndefined();
  });

  it("returns undefined when condoId is not in user's condos", () => {
    mockUseMyCondos.mockReturnValue({ data: makeCondos("other", "manager") });
    const { result } = renderHook(() => useCondoRole("c1"));
    expect(result.current).toBeUndefined();
  });

  it("returns the role for the matching condo", () => {
    mockUseMyCondos.mockReturnValue({ data: makeCondos("c1", "staff") });
    const { result } = renderHook(() => useCondoRole("c1"));
    expect(result.current).toBe("staff");
  });

  it("picks the right condo among several", () => {
    mockUseMyCondos.mockReturnValue({
      data: [
        { condoId: "c1", condoName: "A", condoSlug: "a", role: "viewer" },
        { condoId: "c2", condoName: "B", condoSlug: "b", role: "manager" },
      ],
    });
    const { result } = renderHook(() => useCondoRole("c2"));
    expect(result.current).toBe("manager");
  });
});

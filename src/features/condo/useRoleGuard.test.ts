import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Role } from "./roleHierarchy";
import type { CondoMembership } from "./useMyCondos";

type ParamsResult = { condoId?: string | undefined };
const mockUseMyCondos = vi.fn<() => { data: CondoMembership[] | undefined }>();
const mockUseParams = vi.fn<() => ParamsResult>();

vi.mock("@tanstack/react-router", () => ({
   
  useParams: (): ParamsResult => mockUseParams(),
}));

vi.mock("./useMyCondos", () => ({
   
  useMyCondos: (): { data: CondoMembership[] | undefined } => mockUseMyCondos(),
}));

const { useRoleGuard } = await import("./useRoleGuard");

function makeCondos(condoId: string, role: Role): CondoMembership[] {
  return [{ condoId, condoName: "Test Condo", condoSlug: "test", role }];
}

describe("useRoleGuard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns allowed=false when data is undefined (loading)", () => {
    mockUseMyCondos.mockReturnValue({ data: undefined });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });

    const { result } = renderHook(() => useRoleGuard("viewer"));
    expect(result.current.allowed).toBe(false);
  });

  it("returns allowed=false when condoId not in user's condos", () => {
    mockUseMyCondos.mockReturnValue({ data: makeCondos("other-condo", "manager") });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });

    const { result } = renderHook(() => useRoleGuard("viewer"));
    expect(result.current.allowed).toBe(false);
  });

  it("returns allowed=false when condoId is undefined", () => {
    mockUseMyCondos.mockReturnValue({ data: makeCondos("condo-1", "manager") });
    mockUseParams.mockReturnValue({ condoId: undefined });

    const { result } = renderHook(() => useRoleGuard("viewer"));
    expect(result.current.allowed).toBe(false);
  });

  // Role × min matrix
  // viewer (rank 1)
  describe("actual role: viewer", () => {
    beforeEach(() => {
      mockUseMyCondos.mockReturnValue({ data: makeCondos("c1", "viewer") });
      mockUseParams.mockReturnValue({ condoId: "c1" });
    });

    it("min=viewer → allowed=true", () => {
      const { result } = renderHook(() => useRoleGuard("viewer"));
      expect(result.current.allowed).toBe(true);
    });

    it("min=staff → allowed=false", () => {
      const { result } = renderHook(() => useRoleGuard("staff"));
      expect(result.current.allowed).toBe(false);
    });

    it("min=manager → allowed=false", () => {
      const { result } = renderHook(() => useRoleGuard("manager"));
      expect(result.current.allowed).toBe(false);
    });

    it("min=super_admin → allowed=false", () => {
      const { result } = renderHook(() => useRoleGuard("super_admin"));
      expect(result.current.allowed).toBe(false);
    });
  });

  // staff (rank 2)
  describe("actual role: staff", () => {
    beforeEach(() => {
      mockUseMyCondos.mockReturnValue({ data: makeCondos("c1", "staff") });
      mockUseParams.mockReturnValue({ condoId: "c1" });
    });

    it("min=viewer → allowed=true", () => {
      const { result } = renderHook(() => useRoleGuard("viewer"));
      expect(result.current.allowed).toBe(true);
    });

    it("min=staff → allowed=true", () => {
      const { result } = renderHook(() => useRoleGuard("staff"));
      expect(result.current.allowed).toBe(true);
    });

    it("min=manager → allowed=false", () => {
      const { result } = renderHook(() => useRoleGuard("manager"));
      expect(result.current.allowed).toBe(false);
    });

    it("min=super_admin → allowed=false", () => {
      const { result } = renderHook(() => useRoleGuard("super_admin"));
      expect(result.current.allowed).toBe(false);
    });
  });

  // manager (rank 3)
  describe("actual role: manager", () => {
    beforeEach(() => {
      mockUseMyCondos.mockReturnValue({ data: makeCondos("c1", "manager") });
      mockUseParams.mockReturnValue({ condoId: "c1" });
    });

    it("min=viewer → allowed=true", () => {
      const { result } = renderHook(() => useRoleGuard("viewer"));
      expect(result.current.allowed).toBe(true);
    });

    it("min=staff → allowed=true", () => {
      const { result } = renderHook(() => useRoleGuard("staff"));
      expect(result.current.allowed).toBe(true);
    });

    it("min=manager → allowed=true", () => {
      const { result } = renderHook(() => useRoleGuard("manager"));
      expect(result.current.allowed).toBe(true);
    });

    it("min=super_admin → allowed=false", () => {
      const { result } = renderHook(() => useRoleGuard("super_admin"));
      expect(result.current.allowed).toBe(false);
    });
  });

  // super_admin (rank 4)
  describe("actual role: super_admin", () => {
    beforeEach(() => {
      mockUseMyCondos.mockReturnValue({ data: makeCondos("c1", "super_admin") });
      mockUseParams.mockReturnValue({ condoId: "c1" });
    });

    it("min=viewer → allowed=true", () => {
      const { result } = renderHook(() => useRoleGuard("viewer"));
      expect(result.current.allowed).toBe(true);
    });

    it("min=staff → allowed=true", () => {
      const { result } = renderHook(() => useRoleGuard("staff"));
      expect(result.current.allowed).toBe(true);
    });

    it("min=manager → allowed=true", () => {
      const { result } = renderHook(() => useRoleGuard("manager"));
      expect(result.current.allowed).toBe(true);
    });

    it("min=super_admin → allowed=true", () => {
      const { result } = renderHook(() => useRoleGuard("super_admin"));
      expect(result.current.allowed).toBe(true);
    });
  });
});

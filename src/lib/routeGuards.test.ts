import { describe, expect, it, vi, afterEach } from "vitest";
import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import type { CondoMembership } from "@/features/condo/useMyCondos";

vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn((args: unknown): unknown => args),
}));

// Minimal Zustand-like store mock that supports getState, setState, and subscribe
type SessionStatus = "loading" | "authenticated" | "anonymous";
interface MockState {
  status: SessionStatus;
  session: null;
}

let _state: MockState = { status: "loading", session: null };
const _listeners = new Set<(state: MockState) => void>();

const mockStore = {
  getState: () => _state,
  setState: (partial: Partial<MockState>) => {
    _state = { ..._state, ...partial };
    for (const listener of _listeners) {
      listener(_state);
    }
  },
  subscribe: (listener: (state: MockState) => void) => {
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  },
};

vi.mock("@/stores/session", () => ({
  useSessionStore: mockStore,
}));

// Mock for requireRole dependencies
const mockEnsureQueryData = vi.fn();

vi.mock("@/features/condo/useMyCondos", () => ({
  myCondosQueryOptions: vi.fn(() => ({ queryKey: ["condos", "me"] })),
}));

const { requireAuth, requireRole } = await import("./routeGuards");

describe("requireAuth", () => {
  afterEach(() => {
    vi.clearAllMocks();
    _listeners.clear();
  });

  const location = { href: "/dashboard" };

  it("lança redirect para /login com search.redirect quando status é anonymous", async () => {
    mockStore.setState({ status: "anonymous" });

    await expect(requireAuth({ location })).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith({
      to: "/login",
      search: { redirect: location.href },
    });
  });

  it("não lança quando status é authenticated", async () => {
    mockStore.setState({ status: "authenticated" });

    await expect(requireAuth({ location })).resolves.toBeUndefined();
  });

  it("aguarda status sair de loading antes de avaliar (loading → authenticated)", async () => {
    mockStore.setState({ status: "loading" });

    const promise = requireAuth({ location });

    // Simulate session resolution on next tick
    setTimeout(() => {
      mockStore.setState({ status: "authenticated" });
    }, 0);

    await expect(promise).resolves.toBeUndefined();
  });

  it("aguarda status sair de loading antes de avaliar (loading → anonymous)", async () => {
    mockStore.setState({ status: "loading" });

    const promise = requireAuth({ location });

    // Simulate session resolution as anonymous on next tick
    setTimeout(() => {
      mockStore.setState({ status: "anonymous" });
    }, 0);

    await expect(promise).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith({
      to: "/login",
      search: { redirect: location.href },
    });
  });
});

describe("requireRole", () => {
  function makeQueryClient(condos: CondoMembership[]): QueryClient {
    return {
      ensureQueryData: mockEnsureQueryData.mockResolvedValue(condos),
    } as unknown as QueryClient;
  }

  const condoId = "condo-abc";

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes (no throw) when user has exact required role (manager)", async () => {
    const condos: CondoMembership[] = [
      { condoId, condoName: "Test", condoSlug: "test", role: "manager" },
    ];
    const guard = requireRole("manager");
    await expect(
      guard({ params: { condoId }, context: { queryClient: makeQueryClient(condos) } }),
    ).resolves.toBeUndefined();
  });

  it("passes when user has higher role (super_admin ≥ manager)", async () => {
    const condos: CondoMembership[] = [
      { condoId, condoName: "Test", condoSlug: "test", role: "super_admin" },
    ];
    const guard = requireRole("manager");
    await expect(
      guard({ params: { condoId }, context: { queryClient: makeQueryClient(condos) } }),
    ).resolves.toBeUndefined();
  });

  it("throws redirect when user role is below required (viewer → manager)", async () => {
    const condos: CondoMembership[] = [
      { condoId, condoName: "Test", condoSlug: "test", role: "viewer" },
    ];
    const guard = requireRole("manager");

    await expect(
      guard({ params: { condoId }, context: { queryClient: makeQueryClient(condos) } }),
    ).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith({
      to: "/c/$condoId/inbox",
      params: { condoId },
    });
  });

  it("throws redirect when user role is below required (staff → manager)", async () => {
    const condos: CondoMembership[] = [
      { condoId, condoName: "Test", condoSlug: "test", role: "staff" },
    ];
    const guard = requireRole("manager");

    await expect(
      guard({ params: { condoId }, context: { queryClient: makeQueryClient(condos) } }),
    ).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith({
      to: "/c/$condoId/inbox",
      params: { condoId },
    });
  });

  it("throws redirect when condoId not found in user's condos", async () => {
    const condos: CondoMembership[] = [
      { condoId: "other-condo", condoName: "Other", condoSlug: "other", role: "manager" },
    ];
    const guard = requireRole("viewer");

    await expect(
      guard({ params: { condoId }, context: { queryClient: makeQueryClient(condos) } }),
    ).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith({
      to: "/c/$condoId/inbox",
      params: { condoId },
    });
  });

  it("throws redirect when condos list is empty", async () => {
    const guard = requireRole("viewer");

    await expect(
      guard({ params: { condoId }, context: { queryClient: makeQueryClient([]) } }),
    ).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith({
      to: "/c/$condoId/inbox",
      params: { condoId },
    });
  });
});

import { describe, expect, it, vi, afterEach } from "vitest";
import { redirect } from "@tanstack/react-router";

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

const { requireAuth } = await import("./routeGuards");

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

import { describe, expect, it, vi, afterEach } from "vitest";
import { redirect } from "@tanstack/react-router";

vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn((args: unknown): unknown => args),
}));

const mockGetState = vi.fn();

vi.mock("@/stores/session", () => ({
  useSessionStore: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    getState: () => mockGetState(),
  },
}));

const { requireAuth } = await import("./routeGuards");

describe("requireAuth", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const location = { href: "/dashboard" };

  it("lança redirect para /login com search.redirect quando status é anonymous", () => {
    mockGetState.mockReturnValue({ status: "anonymous" });

    expect(() => requireAuth({ location })).toThrow();

    expect(redirect).toHaveBeenCalledWith({
      to: "/login",
      search: { redirect: location.href },
    });
  });

  it("não lança quando status é authenticated", () => {
    mockGetState.mockReturnValue({ status: "authenticated" });

    expect(() => requireAuth({ location })).not.toThrow();
  });

  it("não lança quando status é loading (splash trata o estado)", () => {
    mockGetState.mockReturnValue({ status: "loading" });

    expect(() => requireAuth({ location })).not.toThrow();
  });
});

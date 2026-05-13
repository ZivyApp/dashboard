import { describe, expect, it, vi, afterEach } from "vitest";
import { redirect } from "@tanstack/react-router";

vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn((args: unknown): unknown => args),
}));

const mockGetState = vi.fn();
const mockSetState = vi.fn();

vi.mock("@/stores/session", () => ({
  useSessionStore: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    getState: () => mockGetState(),
    setState: (...args: unknown[]): void => {
      mockSetState(...args);
    },
  },
}));

const mockGetSession = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      getSession: () => mockGetSession(),
    },
  },
}));

const { requireAuth } = await import("./routeGuards");

describe("requireAuth", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const location = { href: "/dashboard" };

  it("lança redirect para /login com search.redirect quando status é anonymous", async () => {
    mockGetState.mockReturnValue({ status: "anonymous" });

    await expect(requireAuth({ location })).rejects.toBeDefined();

    expect(redirect).toHaveBeenCalledWith({
      to: "/login",
      search: { redirect: location.href },
    });
  });

  it("não lança quando status é authenticated", async () => {
    mockGetState.mockReturnValue({ status: "authenticated" });

    await expect(requireAuth({ location })).resolves.toBeUndefined();
  });

  it("resolve getSession e redireciona quando status é loading e não há sessão", async () => {
    mockGetState.mockReturnValue({ status: "loading" });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(requireAuth({ location })).rejects.toBeDefined();

    expect(mockSetState).toHaveBeenCalledWith({ session: null, status: "anonymous" });
    expect(redirect).toHaveBeenCalledWith({
      to: "/login",
      search: { redirect: location.href },
    });
  });

  it("resolve getSession e libera quando status é loading e há sessão", async () => {
    const session = { access_token: "tok" };
    mockGetState.mockReturnValue({ status: "loading" });
    mockGetSession.mockResolvedValue({ data: { session } });

    await expect(requireAuth({ location })).resolves.toBeUndefined();

    expect(mockSetState).toHaveBeenCalledWith({ session, status: "authenticated" });
    expect(redirect).not.toHaveBeenCalled();
  });
});

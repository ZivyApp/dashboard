import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const mockSession: Session = {
  access_token: "token-abc",
  refresh_token: "refresh-xyz",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
  },
};

const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

const { useSessionStore, initSession, getAccessToken, _resetAttached } = await import("./session");

describe("useSessionStore", () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null, status: "loading" });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("signIn", () => {
    it("atualiza session e status para authenticated em caso de sucesso", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      await useSessionStore.getState().signIn("user@example.com", "password123");

      expect(useSessionStore.getState().session).toEqual(mockSession);
      expect(useSessionStore.getState().status).toBe("authenticated");
    });

    it("relança o erro quando signIn falha", async () => {
      const authError = new Error("Invalid credentials");
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: authError,
      });

      await expect(
        useSessionStore.getState().signIn("user@example.com", "wrong-password"),
      ).rejects.toThrow("Invalid credentials");

      // State should remain unchanged on error
      expect(useSessionStore.getState().session).toBeNull();
      expect(useSessionStore.getState().status).toBe("loading");
    });
  });

  describe("signOut", () => {
    it("limpa session e seta status para anonymous", async () => {
      useSessionStore.setState({ session: mockSession, status: "authenticated" });
      mockSignOut.mockResolvedValueOnce({ error: null });

      await useSessionStore.getState().signOut();

      expect(useSessionStore.getState().session).toBeNull();
      expect(useSessionStore.getState().status).toBe("anonymous");
    });
  });

  describe("getAccessToken", () => {
    it("retorna access_token quando há sessão", () => {
      useSessionStore.setState({ session: mockSession, status: "authenticated" });
      expect(getAccessToken()).toBe("token-abc");
    });

    it("retorna undefined quando não há sessão", () => {
      useSessionStore.setState({ session: null, status: "anonymous" });
      expect(getAccessToken()).toBeUndefined();
    });
  });
});

describe("initSession", () => {
  beforeEach(() => {
    _resetAttached();
    useSessionStore.setState({ session: null, status: "loading" });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("resolve getSession e atualiza store para authenticated quando há sessão", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: mockSession }, error: null });

    initSession();

    await vi.waitFor(() => {
      expect(useSessionStore.getState().status).toBe("authenticated");
    });

    expect(useSessionStore.getState().session).toEqual(mockSession);
  });

  it("resolve getSession e atualiza store para anonymous quando não há sessão", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

    initSession();

    await vi.waitFor(() => {
      expect(useSessionStore.getState().status).toBe("anonymous");
    });

    expect(useSessionStore.getState().session).toBeNull();
  });

  it("onAuthStateChange atualiza store quando sessão muda", () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

    let authChangeCallback: ((event: string, session: Session | null) => void) | null = null;
    mockOnAuthStateChange.mockImplementationOnce(
      (cb: (event: string, session: Session | null) => void) => {
        authChangeCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );

    initSession();

    // Simulate auth state change
    authChangeCallback!("SIGNED_IN", mockSession);

    expect(useSessionStore.getState().session).toEqual(mockSession);
    expect(useSessionStore.getState().status).toBe("authenticated");
  });

  it("é idempotente — onAuthStateChange registrado apenas uma vez mesmo com múltiplos initSession", () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    initSession();
    const callsAfterFirst = mockOnAuthStateChange.mock.calls.length;

    initSession(); // should be a no-op since attached=true
    initSession();

    expect(mockOnAuthStateChange.mock.calls.length).toBe(callsAfterFirst);
    expect(callsAfterFirst).toBe(1);
  });
});

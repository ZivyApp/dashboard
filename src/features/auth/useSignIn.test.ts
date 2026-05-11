import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthError } from "@supabase/supabase-js";

const mockSignInStore = vi.fn<() => Promise<void>>();

vi.mock("@/stores/session", () => ({
  useSessionStore: (selector: (s: { signIn: typeof mockSignInStore }) => unknown) =>
    selector({ signIn: mockSignInStore }),
}));

const { useSignIn } = await import("./useSignIn");

function makeAuthError(message: string): AuthError {
  const err = new AuthError(message);
  return err;
}

describe("useSignIn — mapError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("mapeia 'Invalid login credentials' para mensagem em pt-BR", async () => {
    mockSignInStore.mockRejectedValueOnce(makeAuthError("Invalid login credentials"));

    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.signIn("user@example.com", "wrong");
    });

    expect(result.current.error).toBe("Email ou senha inválidos");
  });

  it("mapeia 'Email not confirmed' para mensagem em pt-BR", async () => {
    mockSignInStore.mockRejectedValueOnce(new Error("Email not confirmed"));

    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(result.current.error).toBe("Email não confirmado");
  });

  it("mapeia outros erros de Error para mensagem genérica", async () => {
    mockSignInStore.mockRejectedValueOnce(new Error("Something unexpected"));

    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(result.current.error).toBe("Não foi possível entrar");
  });

  it("mapeia throwables que não são Error para mensagem genérica", async () => {
    mockSignInStore.mockRejectedValueOnce("string error");

    const { result } = renderHook(() => useSignIn());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(result.current.error).toBe("Não foi possível entrar");
  });
});

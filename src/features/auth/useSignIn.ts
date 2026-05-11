import { useState } from "react";
import { useSessionStore } from "@/stores/session";

interface UseSignInResult {
  signIn: (email: string, password: string) => Promise<boolean>;
  isPending: boolean;
  error: string | null;
}

function mapError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("Invalid login credentials")) return "Email ou senha inválidos";
  if (message.includes("Email not confirmed")) return "Email não confirmado";
  return "Não foi possível entrar";
}

export function useSignIn(): UseSignInResult {
  const signInStore = useSessionStore((s) => s.signIn);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(email: string, password: string): Promise<boolean> {
    setIsPending(true);
    setError(null);
    try {
      await signInStore(email, password);
      return true;
    } catch (err) {
      setError(mapError(err));
      return false;
    } finally {
      setIsPending(false);
    }
  }

  return { signIn, isPending, error };
}

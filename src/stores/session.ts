import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "authenticated" | "anonymous";

interface SessionState {
  session: Session | null;
  status: Status;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  status: "loading",
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ session: data.session, status: "authenticated" });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, status: "anonymous" });
  },
}));

let attached = false;

/** @internal Reset idempotency flag — only for use in tests. */
export function _resetAttached(): void {
  attached = false;
}

export function initSession(): void {
  if (typeof window === "undefined" || attached) return;
  attached = true;

  void supabase.auth.getSession().then(({ data }) => {
    useSessionStore.setState({
      session: data.session,
      status: data.session ? "authenticated" : "anonymous",
    });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useSessionStore.setState({
      session,
      status: session ? "authenticated" : "anonymous",
    });
  });
}

export function getAccessToken(): string | undefined {
  return useSessionStore.getState().session?.access_token;
}

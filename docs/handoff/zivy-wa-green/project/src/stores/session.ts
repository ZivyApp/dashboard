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
    if (!data.session) {
      throw new Error("Email not confirmed");
    }
    set({ session: data.session, status: "authenticated" });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, status: "anonymous" });
  },
}));

let attached = false;
let subscription: { unsubscribe: () => void } | null = null;

/** @internal Reset idempotency flag — only for use in tests. */
export function _resetAttached(): void {
  subscription?.unsubscribe();
  subscription = null;
  attached = false;
}

export function initSession(): void {
  if (typeof window === "undefined" || attached) return;
  attached = true;

  supabase.auth
    .getSession()
    .then(({ data }) => {
      useSessionStore.setState({
        session: data.session,
        status: data.session ? "authenticated" : "anonymous",
      });
    })
    .catch(() => {
      useSessionStore.setState({ session: null, status: "anonymous" });
    });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    useSessionStore.setState({
      session,
      status: session ? "authenticated" : "anonymous",
    });
  });
  subscription = data.subscription;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    subscription?.unsubscribe();
    subscription = null;
    attached = false;
  });
}

export function getAccessToken(): string | undefined {
  return useSessionStore.getState().session?.access_token;
}

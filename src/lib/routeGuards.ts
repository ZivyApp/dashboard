import { redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/stores/session";

export async function requireAuth({ location }: { location: { href: string } }) {
  let { status } = useSessionStore.getState();

  if (status === "loading") {
    const { data } = await supabase.auth.getSession();
    status = data.session ? "authenticated" : "anonymous";
    useSessionStore.setState({ session: data.session, status });
  }

  if (status === "anonymous") {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({
      to: "/login",
      search: { redirect: location.href },
    });
  }
}

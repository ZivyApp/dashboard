import { redirect } from "@tanstack/react-router";
import { useSessionStore } from "@/stores/session";

export function requireAuth({ location }: { location: { href: string } }) {
  const { status } = useSessionStore.getState();
  if (status === "anonymous") {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({
      to: "/login",
      search: { redirect: location.href },
    });
  }
}

import { redirect } from "@tanstack/react-router";
import { useSessionStore } from "@/stores/session";

export async function requireAuth({ location }: { location: { href: string } }) {
  if (useSessionStore.getState().status === "loading") {
    await new Promise<void>((resolve) => {
      const unsubscribe = useSessionStore.subscribe((state) => {
        if (state.status !== "loading") {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  if (useSessionStore.getState().status === "anonymous") {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({
      to: "/login",
      search: { redirect: location.href },
    });
  }
}

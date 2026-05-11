import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSessionStore } from "@/stores/session";
import { LoginForm } from "@/features/auth/LoginForm";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    ...(typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}),
  }),
  beforeLoad() {
    if (useSessionStore.getState().status === "authenticated") {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/" });
    }
  },
  component: LoginForm,
});

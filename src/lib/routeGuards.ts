import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useSessionStore } from "@/stores/session";
import { myCondosQueryOptions } from "@/features/condo/useMyCondos";
import { isAtLeast } from "@/features/condo/roleHierarchy";
import type { Role } from "@/features/condo/roleHierarchy";

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

export function requireRole(min: Role) {
  return async ({
    params,
    context,
  }: {
    params: { condoId: string };
    context: { queryClient: QueryClient };
  }) => {
    const condos = await context.queryClient.ensureQueryData(myCondosQueryOptions());
    const role = condos.find((c) => c.condoId === params.condoId)?.role;
    if (!role || !isAtLeast(role, min)) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: "/c/$condoId/inbox",
        params: { condoId: params.condoId },
      });
    }
  };
}

/**
 * Cross-condo role guard: garante que o usuário tem ao menos `min` em pelo
 * menos UM condo. Usado em rotas globais (ex.: `/approvals`).
 */
export function requireRoleAny(min: Role) {
  return async ({ context }: { context: { queryClient: QueryClient } }) => {
    const condos = await context.queryClient.ensureQueryData(myCondosQueryOptions());
    const has = condos.some((c) => isAtLeast(c.role, min));
    if (!has) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/no-access" });
    }
  };
}

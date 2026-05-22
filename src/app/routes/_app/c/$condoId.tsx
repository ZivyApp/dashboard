import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { myCondosQueryOptions } from "@/features/condo/useMyCondos";
import { setLastSelected } from "@/stores/activeCondo";

export const Route = createFileRoute("/_app/c/$condoId")({
  beforeLoad: async ({ params, context }) => {
    const condos = await context.queryClient.ensureQueryData(myCondosQueryOptions());

    // No condos at all → no-access
    if (condos.length === 0) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/no-access" });
    }

    // Validate condoId exists in the user's condos
    const isValid = condos.some((c) => c.condoId === params.condoId);
    if (!isValid) {
      const fallback = condos[0];
      if (!fallback) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw redirect({ to: "/no-access" });
      }
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: "/c/$condoId",
        params: { condoId: fallback.condoId },
      });
    }

    // Sync last-selected
    setLastSelected(params.condoId);
  },
  component: () => <Outlet />,
});

import { createFileRoute, redirect } from "@tanstack/react-router";
import { myCondosQueryOptions } from "@/features/condo/useMyCondos";
import { getLastSelected } from "@/stores/activeCondo";

export const Route = createFileRoute("/_app/")({
  beforeLoad: async ({ context }) => {
    const condos = await context.queryClient.ensureQueryData(myCondosQueryOptions());

    if (condos.length === 0) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/no-access" });
    }

    const lastId = getLastSelected();
    const target = condos.find((c) => c.condoId === lastId) ?? condos[0];

    if (!target) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/no-access" });
    }

    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({
      to: "/c/$condoId/inbox",
      params: { condoId: target.condoId },
    });
  },
});

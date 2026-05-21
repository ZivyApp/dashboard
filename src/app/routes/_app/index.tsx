import { createFileRoute, redirect } from "@tanstack/react-router";
import { myCondosQueryOptions } from "@/features/condo/useMyCondos";
import { OverviewPage } from "@/features/overview/OverviewPage";

export const Route = createFileRoute("/_app/")({
  beforeLoad: async ({ context }) => {
    const condos = await context.queryClient.ensureQueryData(myCondosQueryOptions());
    if (condos.length === 0) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/no-access" });
    }
  },
  component: OverviewPage,
});

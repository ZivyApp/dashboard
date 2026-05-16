import type { Meta, StoryObj } from "@storybook/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

function StoryRouter({ children }: { children: ReactNode }) {
  const rootRoute = createRootRoute({ component: () => <>{children}</> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return <RouterProvider router={router} />;
}

const meta: Meta<typeof Sidebar> = {
  title: "AppShell/Sidebar",
  component: Sidebar,
  decorators: [
    (Story, ctx) => (
      <StoryRouter>
        <Story {...ctx.args} />
      </StoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Sidebar>;

export const AllCondos: Story = {
  args: {
    scope: { kind: "all" },
    scopeTitle: "Todos os condomínios",
    scopeSubtitle: "5 condomínios · 488 unidades",
    inboxUnreadCount: 8,
    approvalsCount: 3,
  },
};

export const SingleCondo: Story = {
  args: {
    scope: { kind: "condo", condoId: "c1" },
    scopeTitle: "Residencial Jardins",
    scopeSubtitle: "120 unidades",
    inboxUnreadCount: 3,
  },
};

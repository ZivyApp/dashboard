import type { Meta, StoryObj } from "@storybook/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Topbar } from "./Topbar";

function StoryRouter({ children }: { children: ReactNode }) {
  const rootRoute = createRootRoute({ component: () => <>{children}</> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return <RouterProvider router={router} />;
}

const meta: Meta<typeof Topbar> = {
  title: "AppShell/Topbar",
  component: Topbar,
  decorators: [
    (Story, ctx) => (
      <StoryRouter>
        <Story {...ctx.args} />
      </StoryRouter>
    ),
  ],
};
export default meta;

export const SuperAdmin: StoryObj<typeof Topbar> = { args: { role: "super_admin" } };
export const Manager: StoryObj<typeof Topbar> = { args: { role: "manager" } };
export const Staff: StoryObj<typeof Topbar> = { args: { role: "staff" } };
export const Viewer: StoryObj<typeof Topbar> = { args: { role: "viewer" } };

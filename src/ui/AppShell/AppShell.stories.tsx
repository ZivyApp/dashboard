import type { Meta, StoryObj } from "@storybook/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { EmptyState } from "./EmptyState";

// Minimal router context — AppShell uses TanStack Router's Link, which needs a RouterProvider.
// We create a simple memory-based router with a single route so Storybook renders without errors.
function StoryRouter({ children }: { children: ReactNode }) {
  const rootRoute = createRootRoute({ component: () => <>{children}</> });

  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return <RouterProvider router={router} />;
}

const meta = {
  title: "UI/AppShell",
  component: AppShell,
  decorators: [
    (Story, ctx) => (
      <StoryRouter>
        <Story {...ctx.args} />
      </StoryRouter>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  args: {
    children: (
      <EmptyState
        title="Página inicial"
        description="Conteúdo principal do dashboard aparece aqui."
      />
    ),
  },
};

export const Mobile: Story = {
  args: {
    children: (
      <EmptyState title="Página inicial" description="Versão mobile com drawer de navegação." />
    ),
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const DarkTheme: Story = {
  args: {
    children: <EmptyState title="Tema escuro" description="AppShell com tema escuro ativado." />,
  },
  parameters: {
    themes: { themeOverride: "dark" },
  },
};

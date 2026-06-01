import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { RouteError } from "./RouteError";

describe("RouteError integração com o router", () => {
  it("captura throw no beforeLoad e o retry re-executa a navegação", async () => {
    let attempts = 0;
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      beforeLoad: () => {
        attempts += 1;
        if (attempts === 1) {
          throw new TypeError("Failed to fetch");
        }
      },
      component: () => <div>Conteúdo carregado</div>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
      defaultErrorComponent: RouteError,
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Erro de conexão" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Conteúdo carregado")).toBeInTheDocument();
  });
});

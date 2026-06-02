import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { RouteError } from "./RouteError";

afterEach(() => {
  vi.restoreAllMocks();
});

// Monta um router sintético cujo beforeLoad lança `error` nas primeiras
// `failTimes` tentativas e depois sucede, com RouteError como defaultErrorComponent.
function makeRouter(error: unknown, failTimes = 1) {
  let attempts = 0;
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: () => {
      attempts += 1;
      if (attempts <= failTimes) {
        throw error;
      }
    },
    component: () => <div>Conteúdo carregado</div>,
  });
  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    defaultErrorComponent: RouteError,
  });
}

describe("RouteError integração com o router", () => {
  it("captura TypeError (conexão) no beforeLoad e o retry re-executa a navegação", async () => {
    const router = makeRouter(new TypeError("Failed to fetch"));

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Sem conexão" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Conteúdo carregado")).toBeInTheDocument();
  });

  it("captura erro HTTP embrulhado (servidor) e o retry re-executa a navegação", async () => {
    const router = makeRouter(new Error("GET /condos/me failed", { cause: { status: 500 } }));

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Erro ao carregar" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Conteúdo carregado")).toBeInTheDocument();
  });

  it("captura erro desconhecido e oferece recarregar", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const router = makeRouter(new Error("boom"));

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recarregar" })).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityFeed } from "./ActivityFeed";
import { RepositoryContext } from "./RepositoryContext";
import { createLocalActivityRepository } from "./repository/local";
import { FIXTURES } from "./repository/fixtures";
import type { Scope } from "@/features/scope/useScope";

const mockNavigate = vi.fn();
const mockSearch: { tab?: string } = {};
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}));

const { mockMyCondos } = vi.hoisted(() => ({ mockMyCondos: vi.fn() }));
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockMyCondos }));

beforeEach(() => {
  mockMyCondos.mockReturnValue({ data: undefined });
});

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockReset();
  mockMyCondos.mockReset();
  for (const k of Object.keys(mockSearch)) delete (mockSearch as Record<string, unknown>)[k];
  localStorage.clear();
});

function setup(scope: Scope = { kind: "all" }) {
  const repo = createLocalActivityRepository({ events: FIXTURES });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    repo,
    ui: (
      <QueryClientProvider client={qc}>
        <RepositoryContext.Provider value={repo}>
          <ActivityFeed scope={scope} />
        </RepositoryContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("ActivityFeed", () => {
  it("renderiza header com contagem de não lidos (plural)", async () => {
    const { ui } = setup();
    render(ui);
    await waitFor(() => expect(screen.getByText(/^\d+ itens? não lidos?$/i)).toBeInTheDocument());
  });

  it("click em item navega para o resource", async () => {
    const { ui } = setup();
    render(ui);
    await waitFor(() => screen.getAllByRole("button"));
    const first = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.includes("Câmera"));
    await userEvent.click(first as HTMLElement);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it("marcar tudo como lido limpa contagem de unread", async () => {
    const { ui } = setup();
    render(ui);
    const btn = await screen.findByRole("button", { name: /Marcar tudo como lido/i });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/tudo em dia/i)).toBeInTheDocument();
    });
  });

  it("exibe 'Ver aprovações pendentes' quando user é manager+ no condo (scope condo)", async () => {
    mockMyCondos.mockReturnValue({
      data: [{ condoId: "c1", condoName: "C1", condoSlug: "c1", role: "manager" }],
    });
    const { ui } = setup({ kind: "condo", condoId: "c1" });
    render(ui);
    expect(
      await screen.findByRole("button", { name: /ver aprovações pendentes/i }),
    ).toBeInTheDocument();
  });

  it("não exibe 'Ver aprovações pendentes' quando user é viewer", async () => {
    mockMyCondos.mockReturnValue({
      data: [{ condoId: "c1", condoName: "C1", condoSlug: "c1", role: "viewer" }],
    });
    const { ui } = setup({ kind: "condo", condoId: "c1" });
    render(ui);
    // Aguarda o feed carregar (botão "Marcar tudo como lido" presente)
    await screen.findByRole("button", { name: /marcar tudo como lido/i });
    expect(
      screen.queryByRole("button", { name: /ver aprovações pendentes/i }),
    ).not.toBeInTheDocument();
  });

  it("navega para /c/$condoId/approvals em scope condo", async () => {
    mockMyCondos.mockReturnValue({
      data: [{ condoId: "c1", condoName: "C1", condoSlug: "c1", role: "manager" }],
    });
    const { ui } = setup({ kind: "condo", condoId: "c1" });
    render(ui);
    await userEvent.click(await screen.findByRole("button", { name: /ver aprovações pendentes/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/c/$condoId/approvals",
        params: { condoId: "c1" },
      }),
    );
  });

  it("navega para /approvals em scope all", async () => {
    mockMyCondos.mockReturnValue({
      data: [{ condoId: "c1", condoName: "C1", condoSlug: "c1", role: "manager" }],
    });
    const { ui } = setup({ kind: "all" });
    render(ui);
    await userEvent.click(await screen.findByRole("button", { name: /ver aprovações pendentes/i }));
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/approvals" }));
  });
});

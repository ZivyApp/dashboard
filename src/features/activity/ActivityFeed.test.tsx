import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityFeed } from "./ActivityFeed";
import { RepositoryContext } from "./RepositoryProvider";
import { createLocalActivityRepository } from "./repository/local";
import { FIXTURES } from "./repository/fixtures";

const mockNavigate = vi.fn();
const mockSearch: { tab?: string } = {};
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockReset();
  for (const k of Object.keys(mockSearch)) delete (mockSearch as Record<string, unknown>)[k];
  localStorage.clear();
});

function setup() {
  const repo = createLocalActivityRepository({ events: FIXTURES });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    repo,
    ui: (
      <QueryClientProvider client={qc}>
        <RepositoryContext.Provider value={repo}>
          <ActivityFeed scope={{ kind: "all" }} />
        </RepositoryContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("ActivityFeed", () => {
  it("renderiza header com contagem de não lidos", async () => {
    const { ui } = setup();
    render(ui);
    await waitFor(() => expect(screen.getByText(/^\d+ não lidos$/i)).toBeInTheDocument());
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
      expect(screen.getByText(/^0 não lidos/i)).toBeInTheDocument();
    });
  });
});

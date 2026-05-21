import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CondoMembership } from "./useMyCondos";

// All mocks must be hoisted before any imports that use them.
const mockNavigate = vi.fn();

type ParamsResult = { condoId?: string | undefined };
const mockUseParams = vi.fn<() => ParamsResult>();
const mockUseMatches = vi.fn<() => Array<{ routeId: string }>>();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,

  useParams: (): ParamsResult => mockUseParams(),
  useMatches: (): Array<{ routeId: string }> => mockUseMatches(),
}));

type MockCondoResult = {
  data: CondoMembership[] | undefined;
  isPending: boolean;
  error: Error | null;
};
const mockUseMyCondos = vi.fn<() => MockCondoResult>();

vi.mock("./useMyCondos", () => ({
  useMyCondos: (): MockCondoResult => mockUseMyCondos(),
}));

const { CondoSwitcher } = await import("./CondoSwitcher");

const CONDOS: CondoMembership[] = [
  { condoId: "condo-1", condoName: "Edifício Aurora", condoSlug: "aurora", role: "manager" },
  { condoId: "condo-2", condoName: "Residencial Bravo", condoSlug: "bravo", role: "viewer" },
];

describe("CondoSwitcher", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("shows loading placeholder while isPending", () => {
    mockUseMyCondos.mockReturnValue({ data: undefined, isPending: true, error: null });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/inbox" }]);

    render(<CondoSwitcher />);

    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("shows error message when error is set", () => {
    mockUseMyCondos.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new Error("API failed"),
    });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/inbox" }]);

    render(<CondoSwitcher />);

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
  });

  it("renders nothing when data is an empty array", () => {
    mockUseMyCondos.mockReturnValue({ data: [], isPending: false, error: null });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/inbox" }]);

    const { container } = render(<CondoSwitcher />);

    expect(container.firstChild).toBeNull();
  });

  it("renders trigger button with active condo name", () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS, isPending: false, error: null });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/inbox" }]);

    render(<CondoSwitcher />);

    expect(screen.getByRole("button", { name: /Edifício Aurora/i })).toBeInTheDocument();
  });

  it("shows 'Selecione condomínio' when no matching condoId in URL", () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS, isPending: false, error: null });
    mockUseParams.mockReturnValue({ condoId: undefined });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/some/other/path" }]);

    render(<CondoSwitcher />);

    expect(screen.getByRole("button", { name: /Selecione condomínio/i })).toBeInTheDocument();
  });

  it("opens dropdown listing all condos", async () => {
    const user = userEvent.setup();
    mockUseMyCondos.mockReturnValue({ data: CONDOS, isPending: false, error: null });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/inbox" }]);

    render(<CondoSwitcher />);

    await user.click(screen.getByRole("button", { name: /Edifício Aurora/i }));

    // After opening, the dropdown items are menuitem roles
    const items = screen.getAllByRole("menuitem");
    // "Todos os condomínios" + 2 condos = 3 items
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Todos os condomínios");
    expect(items[1]).toHaveTextContent("Edifício Aurora");
    expect(items[2]).toHaveTextContent("Residencial Bravo");
  });

  it("active condo item has aria-current='true'", async () => {
    const user = userEvent.setup();
    mockUseMyCondos.mockReturnValue({ data: CONDOS, isPending: false, error: null });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/inbox" }]);

    render(<CondoSwitcher />);

    await user.click(screen.getByRole("button", { name: /Edifício Aurora/i }));

    const items = screen.getAllByRole("menuitem");
    const activeItem = items.find((el) => el.textContent?.includes("Edifício Aurora"));
    expect(activeItem).toHaveAttribute("aria-current", "true");

    const inactiveItem = items.find((el) => el.textContent?.includes("Residencial Bravo"));
    expect(inactiveItem).not.toHaveAttribute("aria-current", "true");
  });

  it("selecionar um condo navega para a visão geral dele (/c/$condoId), independente da página atual", async () => {
    const user = userEvent.setup();
    mockUseMyCondos.mockReturnValue({ data: CONDOS, isPending: false, error: null });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/tickets" }]);

    render(<CondoSwitcher />);

    await user.click(screen.getByRole("button", { name: /Edifício Aurora/i }));
    const bravoItem = screen
      .getAllByRole("menuitem")
      .find((el) => el.textContent?.includes("Residencial Bravo"));
    if (!bravoItem) throw new Error("Residencial Bravo item not found");
    await user.click(bravoItem);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/c/$condoId",
        params: { condoId: "condo-2" },
      });
    });
  });

  it("renderiza item 'Todos os condomínios' no dropdown", async () => {
    const user = userEvent.setup();
    mockUseMyCondos.mockReturnValue({ data: CONDOS, isPending: false, error: null });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/inbox" }]);

    render(<CondoSwitcher />);

    await user.click(screen.getByRole("button", { name: /Edifício Aurora/i }));

    expect(screen.getByText("Todos os condomínios")).toBeInTheDocument();
  });

  it("seleciona 'Todos' navega para a visão geral cross-condo (/)", async () => {
    const user = userEvent.setup();
    mockUseMyCondos.mockReturnValue({ data: CONDOS, isPending: false, error: null });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/tickets" }]);

    render(<CondoSwitcher />);

    await user.click(screen.getByRole("button", { name: /Edifício Aurora/i }));
    await user.click(screen.getByText("Todos os condomínios"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  it("esconde 'Todos os condomínios' quando nenhum condo tem role >= manager", async () => {
    const user = userEvent.setup();
    const VIEWER_ONLY: CondoMembership[] = [
      { condoId: "condo-1", condoName: "Edifício Aurora", condoSlug: "aurora", role: "viewer" },
      { condoId: "condo-2", condoName: "Residencial Bravo", condoSlug: "bravo", role: "staff" },
    ];
    mockUseMyCondos.mockReturnValue({ data: VIEWER_ONLY, isPending: false, error: null });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/inbox" }]);

    render(<CondoSwitcher />);

    await user.click(screen.getByRole("button", { name: /Edifício Aurora/i }));

    expect(screen.queryByText("Todos os condomínios")).not.toBeInTheDocument();
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(2);
  });

  it("mostra 'Todos os condomínios' quando o único condo é super_admin", async () => {
    const user = userEvent.setup();
    const SUPER_ONLY: CondoMembership[] = [
      {
        condoId: "condo-1",
        condoName: "Edifício Aurora",
        condoSlug: "aurora",
        role: "super_admin",
      },
    ];
    mockUseMyCondos.mockReturnValue({ data: SUPER_ONLY, isPending: false, error: null });
    mockUseParams.mockReturnValue({ condoId: "condo-1" });
    mockUseMatches.mockReturnValue([{ routeId: "/_app/c/$condoId/inbox" }]);

    render(<CondoSwitcher />);

    await user.click(screen.getByRole("button", { name: /Edifício Aurora/i }));

    expect(screen.getByText("Todos os condomínios")).toBeInTheDocument();
  });
});

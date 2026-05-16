import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useThemeStore } from "@/stores/theme";
import { useSessionStore } from "@/stores/session";
import type { Role } from "@/features/condo/roleHierarchy";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useMatches: () => [{ routeId: "/_app/inbox" }],
  useRouterState: () => ({ location: { pathname: "/inbox" } }),
}));

type MockCondoResult = {
  data: Array<{ condoId: string; condoName: string; condoSlug: string; role: Role }>;
  isPending: boolean;
  error: null;
};

function defaultCondoResult(): MockCondoResult {
  return {
    data: [{ condoId: "condo-test", condoName: "Test Condo", condoSlug: "test", role: "manager" }],
    isPending: false,
    error: null,
  };
}

const mockUseMyCondos = vi.fn(defaultCondoResult);

vi.mock("@/features/condo/useMyCondos", () => ({
  useMyCondos: () => mockUseMyCondos(),
}));

vi.mock("@/features/activity/useActivityFeed", () => ({
  useActivityFeed: () => ({
    data: { counts: { all: 8, unread: 3, approvals: 2 }, items: [] },
    isPending: false,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

const { AppShell } = await import("./AppShell");
const { ThemeToggle } = await import("./ThemeToggle");
const { UserMenu } = await import("./UserMenu");

type StoreSession = ReturnType<typeof useSessionStore.getState>["session"];

function mockSession(email: string): StoreSession {
  return {
    user: { email },
    access_token: "fake-token",
  } as StoreSession;
}

describe("AppShell", () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: "light" });
    useSessionStore.setState({ session: null, status: "anonymous" });
    document.documentElement.setAttribute("data-theme", "light");
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      media: "",
      onchange: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("renderiza topbar, sidebar e children", () => {
    render(
      <AppShell>
        <h1>Conteúdo</h1>
      </AppShell>,
    );
    expect(screen.getByText("Zivy")).toBeInTheDocument();
    expect(screen.getByText(/Operação/i)).toBeInTheDocument();
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });
});

describe("ThemeToggle", () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: "light" });
    document.documentElement.setAttribute("data-theme", "light");
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      media: "",
      onchange: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("cycles light → dark → system → light on click", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole("button");

    await user.click(button);
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await user.click(button);
    expect(useThemeStore.getState().mode).toBe("system");

    await user.click(button);
    expect(useThemeStore.getState().mode).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("has a dynamic aria-label reflecting current mode", () => {
    useThemeStore.setState({ mode: "dark" });
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Tema atual: escuro. Trocar para sistema.",
    );
  });
});

describe("UserMenu", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("shows user initial when session email is present", () => {
    useSessionStore.setState({
      session: mockSession("user@example.com"),
      status: "authenticated",
    });

    render(<UserMenu />);

    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("calls signOut and navigates to /login when Sair is clicked", async () => {
    const user = userEvent.setup();
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    useSessionStore.setState({
      session: mockSession("user@example.com"),
      status: "authenticated",
      signOut: mockSignOut,
    });

    render(<UserMenu />);

    await user.click(screen.getByRole("button", { name: "Menu do usuário" }));

    const sairItem = await screen.findByText("Sair");
    await user.click(sairItem);

    expect(mockSignOut).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
    });
  });
});

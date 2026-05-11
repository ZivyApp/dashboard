import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useThemeStore } from "@/stores/theme";
import { useSessionStore } from "@/stores/session";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    // Strip activeProps so it doesn't end up as a DOM attribute
    Link: ({
      children,
      to,
      onClick,
      activeProps: _activeProps,
      ...props
    }: {
      children: React.ReactNode;
      to: string;
      onClick?: () => void;
      activeProps?: unknown;
      [key: string]: unknown;
    }) => (
      <a href={to} onClick={onClick} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
    useRouterState: () => ({ location: { pathname: "/inbox" } }),
  };
});

// Mock supabase to prevent env var errors
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

  it("renders header, sidebar nav, and main with children", () => {
    const { container } = render(
      <AppShell>
        <div>Conteúdo principal</div>
      </AppShell>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument(); // <header>
    // The desktop sidebar nav has display:none in jsdom (CSS processed without media query),
    // so we query the DOM directly to confirm it's present in the tree.
    expect(container.querySelector("nav[aria-label='Navegação principal']")).not.toBeNull();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo principal")).toBeInTheDocument();
  });

  it("hamburger button opens the mobile drawer", async () => {
    const user = userEvent.setup();

    render(
      <AppShell>
        <div>children</div>
      </AppShell>,
    );

    // Drawer should not be open initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click hamburger
    const hamburger = screen.getByRole("button", { name: "Abrir menu" });
    expect(hamburger).toHaveAttribute("aria-expanded", "false");
    await user.click(hamburger);

    // Dialog should appear (name comes from Dialog.Title "Navegação")
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(hamburger).toHaveAttribute("aria-expanded", "true");
  });

  it("clicking a sidebar link in the drawer closes it", async () => {
    const user = userEvent.setup();

    render(
      <AppShell>
        <div>children</div>
      </AppShell>,
    );

    // Open drawer
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click a link inside the drawer (desktop nav is hidden, only drawer links are accessible)
    const drawerLink = screen.getByRole("link", { name: /inbox/i });
    await user.click(drawerLink);

    // Dialog should be gone
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

    // light → dark
    await user.click(button);
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    // dark → system (system resolves based on matchMedia; jsdom default is light)
    await user.click(button);
    expect(useThemeStore.getState().mode).toBe("system");

    // system → light
    await user.click(button);
    expect(useThemeStore.getState().mode).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("has a dynamic aria-label reflecting current mode", () => {
    useThemeStore.setState({ mode: "dark" });
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Tema atual: escuro. Clique para alterar.",
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
      session: { user: { email: "user@example.com" } } as ReturnType<
        typeof useSessionStore.getState
      >["session"],
      status: "authenticated",
    });

    render(<UserMenu />);

    // The trigger should show the initial "U"
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("calls signOut and navigates to /login when Sair is clicked", async () => {
    const user = userEvent.setup();
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    useSessionStore.setState({
      session: { user: { email: "user@example.com" } } as ReturnType<
        typeof useSessionStore.getState
      >["session"],
      status: "authenticated",
      signOut: mockSignOut,
    });

    render(<UserMenu />);

    // Open dropdown
    await user.click(screen.getByRole("button", { name: "Menu do usuário" }));

    // Click "Sair"
    const sairItem = await screen.findByText("Sair");
    await user.click(sairItem);

    expect(mockSignOut).toHaveBeenCalledOnce();
    // Navigation is async — wait a tick
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
    });
  });
});

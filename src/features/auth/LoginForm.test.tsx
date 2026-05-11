import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
let mockRedirect = "";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => (mockRedirect ? { redirect: mockRedirect } : {}),
}));

const mockSignIn = vi.fn();
let mockIsPending = false;
let mockError: string | null = null;

vi.mock("./useSignIn", () => ({
  useSignIn: () => ({
    signIn: mockSignIn,
    isPending: mockIsPending,
    error: mockError,
  }),
}));

const { LoginForm } = await import("./LoginForm");

describe("LoginForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockRedirect = "";
    mockIsPending = false;
    mockError = null;
    mockSignIn.mockReset();
  });

  it("renderiza campos de email e senha e botão de submit", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  it("não chama signIn quando campos estão vazios (HTML5 validation)", () => {
    mockSignIn.mockResolvedValue(false);
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const form = emailInput.closest("form")!;

    expect(form.checkValidity()).toBe(false);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("chama signIn com email e senha quando formulário é submetido", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(true);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/senha/i), "senha123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "senha123");
  });

  it("exibe mensagem de erro com role=alert quando hook retorna erro", () => {
    mockError = "Email ou senha inválidos";

    render(<LoginForm />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Email ou senha inválidos");
  });

  it("define aria-invalid no input de senha quando há erro", () => {
    mockError = "Email ou senha inválidos";

    render(<LoginForm />);

    expect(screen.getByLabelText(/senha/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("navega para ?redirect= após sucesso quando param está presente", async () => {
    const user = userEvent.setup();
    mockRedirect = "/dashboard";
    mockSignIn.mockResolvedValue(true);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/senha/i), "senha123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
  });

  it("navega para / após sucesso quando ?redirect= não está presente", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(true);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/senha/i), "senha123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("não navega quando signIn retorna false (erro)", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(false);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/senha/i), "senha123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockInvalidate } = vi.hoisted(() => ({ mockInvalidate: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: mockInvalidate }),
}));

import { RouteError } from "./RouteError";

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("RouteError", () => {
  it("erro de conexão: copy de conexão e retry chama invalidate", async () => {
    render(<RouteError error={new TypeError("Failed to fetch")} reset={() => {}} />);
    expect(screen.getByRole("heading", { name: "Erro de conexão" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it("erro desconhecido: copy genérica, loga e oferece recarregar", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // jsdom não permite vi.spyOn em window.location.reload (non-configurable).
    // vi.stubGlobal substitui window.location por um objeto controlado pelo teste.
    const reloadMock = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadMock });
    render(<RouteError error={new Error("boom")} reset={() => {}} />);
    expect(screen.getByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(new Error("boom"));
    await userEvent.click(screen.getByRole("button", { name: "Recarregar" }));
    expect(reloadMock).toHaveBeenCalled();
  });
});

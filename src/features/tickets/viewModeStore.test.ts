import { describe, expect, it, beforeEach } from "vitest";
import { useTicketsView } from "./viewModeStore";

describe("useTicketsView", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("zivy-tickets-view");
    } catch {
      /* noop */
    }
    useTicketsView.setState({ mode: "table" });
  });

  it("default mode é 'table'", () => {
    expect(useTicketsView.getState().mode).toBe("table");
  });

  it("setMode atualiza o estado", () => {
    useTicketsView.getState().setMode("kanban");
    expect(useTicketsView.getState().mode).toBe("kanban");
  });

  it("setMode persiste em localStorage", () => {
    useTicketsView.getState().setMode("cards");
    const raw = localStorage.getItem("zivy-tickets-view");
    expect(raw).not.toBeNull();
    expect(raw).toContain("cards");
  });
});

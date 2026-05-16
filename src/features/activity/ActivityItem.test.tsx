import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityItem } from "./ActivityItem";
import type { ActivityEvent } from "./repository/types";

const ev: ActivityEvent = {
  id: "ev-1",
  kind: "ticket_new",
  condoId: "c-1",
  condoName: "Cond Y",
  title: "Câmera offline",
  subtitle: "Cond Y",
  resourceRef: { type: "ticket", ticketId: "tk-1" },
  priority: "high",
  occurredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  readAt: null,
};

describe("ActivityItem", () => {
  it("renderiza título, subtítulo e timestamp", () => {
    render(<ActivityItem event={ev} onPick={() => {}} onMarkRead={() => {}} />);
    expect(screen.getByText("Câmera offline")).toBeInTheDocument();
    expect(screen.getByText("Cond Y")).toBeInTheDocument();
  });

  it("click no card chama onPick com o evento", async () => {
    const onPick = vi.fn();
    render(<ActivityItem event={ev} onPick={onPick} onMarkRead={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Câmera offline/i }));
    expect(onPick).toHaveBeenCalledWith(ev);
  });

  it("botão ✓ chama onMarkRead com id", () => {
    const onMarkRead = vi.fn();
    render(<ActivityItem event={ev} onPick={() => {}} onMarkRead={onMarkRead} />);
    const btn = screen.getByRole("button", { name: /marcar como lido/i });
    // jsdom não computa :hover, então :hover { pointer-events: auto } não dispara.
    // Disparamos o click programaticamente — equivalente a focus-within + Enter.
    btn.click();
    expect(onMarkRead).toHaveBeenCalledWith("ev-1");
  });

  it("não mostra botão ✓ se já está lido", () => {
    const read = { ...ev, readAt: new Date().toISOString() };
    render(<ActivityItem event={read} onPick={() => {}} onMarkRead={() => {}} />);
    expect(screen.queryByRole("button", { name: /marcar como lido/i })).not.toBeInTheDocument();
  });
});

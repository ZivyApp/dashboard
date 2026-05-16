import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityFeedTabs } from "./ActivityFeedTabs";

const counts = { all: 8, unread: 3, approvals: 2 };

describe("ActivityFeedTabs", () => {
  it("renderiza três tabs com contadores", () => {
    render(<ActivityFeedTabs value="all" counts={counts} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Todos.*8/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Não lidos.*3/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Aprovações.*2/i })).toBeInTheDocument();
  });

  it("destaca a tab ativa", () => {
    render(<ActivityFeedTabs value="unread" counts={counts} onChange={() => {}} />);
    const btn = screen.getByRole("tab", { name: /Não lidos.*3/i });
    expect(btn.className).toContain("active");
  });

  it("click chama onChange", async () => {
    const onChange = vi.fn();
    render(<ActivityFeedTabs value="all" counts={counts} onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: /Aprovações/i }));
    expect(onChange).toHaveBeenCalledWith("approvals");
  });
});

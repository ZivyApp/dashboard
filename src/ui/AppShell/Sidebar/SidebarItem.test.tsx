import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { SidebarItem } from "./SidebarItem";

describe("SidebarItem", () => {
  it("renderiza label e ícone", () => {
    render(<SidebarItem icon={Inbox} label="Inbox" />);
    expect(screen.getByText("Inbox")).toBeInTheDocument();
  });

  it("renderiza badge quando count > 0", () => {
    render(<SidebarItem icon={Inbox} label="Inbox" badge={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("não renderiza badge quando count = 0", () => {
    render(<SidebarItem icon={Inbox} label="Inbox" badge={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("aplica classe active quando active", () => {
    render(<SidebarItem icon={Inbox} label="Inbox" active />);
    const link = screen.getByText("Inbox").closest("a, button");
    expect(link?.className).toContain("active");
  });

  it("dispara onClick quando clicado", async () => {
    const onClick = vi.fn();
    render(<SidebarItem icon={Inbox} label="Inbox" onClick={onClick} />);
    await userEvent.click(screen.getByText("Inbox"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

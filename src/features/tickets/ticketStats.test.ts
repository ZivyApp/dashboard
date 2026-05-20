import { describe, expect, it } from "vitest";
import type { Ticket } from "@/types/ticket";
import { ticketStats } from "./ticketStats";

function mk(partial: Partial<Ticket>): Ticket {
  return {
    id: "t",
    protocol: "TKT-1",
    title: "x",
    status: "open",
    priority: "low",
    updated_at: "2026-05-20T00:00:00Z",
    ...partial,
  };
}

describe("ticketStats", () => {
  it("conta open/in_progress/resolved", () => {
    const stats = ticketStats([
      mk({ status: "open" }),
      mk({ status: "open" }),
      mk({ status: "in_progress" }),
      mk({ status: "resolved" }),
      mk({ status: "closed" }),
    ]);
    expect(stats).toMatchObject({ open: 2, inProgress: 1, resolved: 1 });
  });

  it("urgent = priority high e status != closed", () => {
    const stats = ticketStats([
      mk({ priority: "high", status: "open" }),
      mk({ priority: "high", status: "closed" }), // não conta
      mk({ priority: "medium", status: "open" }), // não conta
    ]);
    expect(stats.urgent).toBe(1);
  });

  it("lista vazia → zeros", () => {
    expect(ticketStats([])).toEqual({ open: 0, inProgress: 0, resolved: 0, urgent: 0 });
  });
});

import { describe, expect, it } from "vitest";
import { formatRelTime } from "./formatRelTime";

const NOW = new Date("2026-05-14T12:00:00Z").getTime();

describe("formatRelTime", () => {
  it("retorna 'agora' para diferenças < 60s", () => {
    expect(formatRelTime("2026-05-14T11:59:30Z", NOW)).toBe("agora");
  });

  it("formata minutos", () => {
    expect(formatRelTime("2026-05-14T11:55:00Z", NOW)).toBe("há 5 min");
  });

  it("formata horas", () => {
    expect(formatRelTime("2026-05-14T09:00:00Z", NOW)).toBe("há 3 h");
  });

  it("formata dias", () => {
    expect(formatRelTime("2026-05-12T12:00:00Z", NOW)).toBe("há 2 dias");
  });

  it("formata 1 dia no singular", () => {
    expect(formatRelTime("2026-05-13T12:00:00Z", NOW)).toBe("há 1 dia");
  });

  it("retorna '—' para input inválido", () => {
    expect(formatRelTime(undefined, NOW)).toBe("—");
    expect(formatRelTime("not-a-date", NOW)).toBe("—");
  });
});

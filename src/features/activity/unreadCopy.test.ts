import { describe, it, expect } from "vitest";
import { unreadCopy } from "./unreadCopy";

describe("unreadCopy", () => {
  it("0 → 'Tudo em dia — nenhum item não lido'", () => {
    expect(unreadCopy(0)).toBe("Tudo em dia — nenhum item não lido");
  });

  it("1 → singular 'item não lido'", () => {
    expect(unreadCopy(1)).toBe("1 item não lido");
  });

  it("2 → plural 'itens não lidos'", () => {
    expect(unreadCopy(2)).toBe("2 itens não lidos");
  });

  it("10 → plural 'itens não lidos'", () => {
    expect(unreadCopy(10)).toBe("10 itens não lidos");
  });

  it("negativos → 'Tudo em dia' (defensivo)", () => {
    expect(unreadCopy(-3)).toBe("Tudo em dia — nenhum item não lido");
  });

  it("NaN → 'Tudo em dia' (defensivo)", () => {
    expect(unreadCopy(Number.NaN)).toBe("Tudo em dia — nenhum item não lido");
  });
});

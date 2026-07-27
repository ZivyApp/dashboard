import { describe, expect, it } from "vitest";
import { StructureFormError, toStructureError } from "./structureError";

describe("toStructureError", () => {
  it("usa a primeira mensagem do body quando 400 com mapa de strings", () => {
    const err = toStructureError(400, { name: "Nome é obrigatório" }, "Falha");
    expect(err).toBeInstanceOf(StructureFormError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Nome é obrigatório");
  });

  it("cai no fallback com status quando o body não é mapa de strings", () => {
    const err = toStructureError(500, { weird: 1 }, "Falha ao salvar");
    expect(err.message).toBe("Falha ao salvar (HTTP 500)");
  });

  it("cai no fallback quando 400 vem com body vazio", () => {
    const err = toStructureError(400, {}, "Falha");
    expect(err.message).toBe("Falha (HTTP 400)");
  });
});

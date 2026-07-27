/**
 * Erro de mutation de estrutura. `status === 400` indica erro de validação do
 * Core: a mensagem vai para o banner inline do modal (sem toast). Demais
 * status viram toast com retry no hook — a página não precisa tratá-los.
 */
export class StructureFormError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "StructureFormError";
    this.status = status;
  }
}

/** O Core devolve erros como mapa string→string (ex.: `{ name: "obrigatório" }`). */
function isErrorBodyMap(v: unknown): v is Record<string, string> {
  if (typeof v !== "object" || v === null) return false;
  const values = Object.values(v);
  return values.length > 0 && values.every((x) => typeof x === "string");
}

/**
 * Converte `(status, body)` do openapi-fetch em `StructureFormError`.
 * 400 com mapa de strings → primeira mensagem; qualquer outro caso →
 * `fallback (HTTP N)` para não engolir o status.
 */
export function toStructureError(
  status: number,
  body: unknown,
  fallback: string,
): StructureFormError {
  if (status === 400 && isErrorBodyMap(body)) {
    const first = Object.values(body)[0];
    if (first !== undefined) return new StructureFormError(status, first);
  }
  return new StructureFormError(status, `${fallback} (HTTP ${String(status)})`);
}

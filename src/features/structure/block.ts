/** Bloco do condomínio, pronto para a UI. */
export interface Block {
  id: string;
  name: string;
  description?: string;
}

/** Shape cru de BlockResponse (openapi-typescript marca tudo opcional). */
export type RawBlock = {
  id?: string;
  name?: string;
  description?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Mapeia `BlockResponse` cru → `Block`, ou `null` se inválido.
 * Ponto único de verdade — usar com `.map(toBlock).filter(nonNull)`.
 */
export function toBlock(raw: RawBlock): Block | null {
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.name)) return null;
  return {
    id: raw.id,
    name: raw.name,
    ...(isNonEmptyString(raw.description) ? { description: raw.description } : {}),
  };
}

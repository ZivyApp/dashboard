export interface Resident {
  id: string;
  name: string;
  /** ex.: "PENDING" | "APPROVED" | "REJECTED" — mantido como string (enum não modelado). */
  status: string;
  unit_id?: string;
}

/**
 * Type guard para o payload de `GET /residents` (openapi-typescript marca tudo
 * opcional). Valida cada campo obrigatório — usar com `filter(isResident)`.
 */
export function isResident(r: unknown): r is Resident {
  if (typeof r !== "object" || r === null) return false;
  const o = r as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.status === "string";
}

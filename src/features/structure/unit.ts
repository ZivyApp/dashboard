/** Unidade do condomínio (apto, sala...), pronta para a UI. */
export interface Unit {
  id: string;
  blockId: string;
  number: string;
  floor?: number;
}

/** Shape cru de UnitResponse (openapi-typescript marca tudo opcional). */
export type RawUnit = {
  id?: string;
  block_id?: string;
  number?: string;
  floor?: number;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/** Mapeia `UnitResponse` cru → `Unit`, ou `null` se inválido. */
export function toUnit(raw: RawUnit): Unit | null {
  if (
    !isNonEmptyString(raw.id) ||
    !isNonEmptyString(raw.number) ||
    !isNonEmptyString(raw.block_id)
  ) {
    return null;
  }
  return {
    id: raw.id,
    blockId: raw.block_id,
    number: raw.number,
    ...(typeof raw.floor === "number" && Number.isInteger(raw.floor) ? { floor: raw.floor } : {}),
  };
}

/** "Térreo" para 0, "Nº andar" caso contrário, "—" quando ausente. */
export function formatFloor(floor: number | undefined): string {
  if (floor === undefined) return "—";
  if (floor === 0) return "Térreo";
  return `${String(floor)}º andar`;
}

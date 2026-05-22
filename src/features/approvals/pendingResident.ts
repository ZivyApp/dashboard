/** Resident PENDING pronto para a UI — campos derivados do Core + condoName anotado. */
export interface PendingResident {
  id: string;
  name: string;
  condoId: string;
  condoName: string;
  phone?: string;
  createdAt?: string;
}

type RawResident = {
  id?: string | undefined;
  name?: string | undefined;
  phone?: string | undefined;
  status?: string | undefined;
  condo_id?: string | undefined;
  created_at?: string | undefined;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Mapeia `ResidentResponse` cru → `PendingResident`, ou `null` se não for um
 * resident PENDING válido. `condoName` vem da membership; `fallbackCondoId`
 * cobre o caso (raro) de o payload não trazer `condo_id`.
 */
export function toPendingResident(
  raw: RawResident,
  condoName: string,
  fallbackCondoId = "",
): PendingResident | null {
  if (raw.status !== "PENDING") return null;
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.name)) return null;

  const condoId = isNonEmptyString(raw.condo_id) ? raw.condo_id : fallbackCondoId;
  if (!isNonEmptyString(condoId)) return null;

  return {
    id: raw.id,
    name: raw.name,
    condoId,
    condoName,
    ...(isNonEmptyString(raw.phone) ? { phone: raw.phone } : {}),
    ...(isNonEmptyString(raw.created_at) ? { createdAt: raw.created_at } : {}),
  };
}

import type { Role } from "./roleHierarchy";

export interface CondoMembership {
  condoId: string;
  condoName: string;
  condoSlug: string;
  role: Role;
}

const ROLES: readonly Role[] = ["viewer", "staff", "manager", "super_admin"];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

type RawCondo = {
  condo_id?: string;
  condo_name?: string;
  condo_slug?: string;
  role?: string;
};

export function toCondoMembership(c: RawCondo): CondoMembership | null {
  if (
    !isNonEmptyString(c.condo_id) ||
    !isNonEmptyString(c.condo_name) ||
    !isNonEmptyString(c.condo_slug) ||
    !isRole(c.role)
  ) {
    return null;
  }
  return {
    condoId: c.condo_id,
    condoName: c.condo_name,
    condoSlug: c.condo_slug,
    role: c.role,
  };
}

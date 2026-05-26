export type Role = "viewer" | "staff" | "manager" | "super_admin";

const rank: Record<Role, number> = {
  viewer: 1,
  staff: 2,
  manager: 3,
  super_admin: 4,
};

export function isAtLeast(actual: Role, required: Role): boolean {
  return rank[actual] >= rank[required];
}

/** Rótulos pt-BR de cada role, usados em RoleBadge e no controle de atribuição. */
export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Administradora",
  manager: "Síndico",
  staff: "Zelador",
  viewer: "Visualizador",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/**
 * Comparador para `Array.prototype.sort`. Ordena do mais privilegiado
 * (`super_admin`) para o menos (`viewer`). Útil em scope "all" para
 * apresentar o RoleBadge com a role mais alta do usuário.
 */
export function compareRoles(a: Role, b: Role): number {
  return rank[b] - rank[a];
}

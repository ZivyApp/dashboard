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

/**
 * Comparador para `Array.prototype.sort`. Ordena do mais privilegiado
 * (`super_admin`) para o menos (`viewer`). Útil em scope "all" para
 * apresentar o RoleBadge com a role mais alta do usuário.
 */
export function compareRoles(a: Role, b: Role): number {
  return rank[b] - rank[a];
}

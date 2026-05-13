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

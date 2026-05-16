import type { Role } from "@/features/condo/roleHierarchy";
import styles from "./RoleBadge.module.css";

const LABELS: Record<Role, string> = {
  super_admin: "Administradora",
  manager: "Síndico",
  staff: "Zelador",
  viewer: "Visualizador",
};

interface RoleBadgeProps {
  role: Role;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return <span className={styles.badge}>{LABELS[role]}</span>;
}

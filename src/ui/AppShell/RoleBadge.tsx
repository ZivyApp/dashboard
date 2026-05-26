import { roleLabel, type Role } from "@/features/condo/roleHierarchy";
import styles from "./RoleBadge.module.css";

interface RoleBadgeProps {
  role: Role;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return <span className={styles.badge}>{roleLabel(role)}</span>;
}

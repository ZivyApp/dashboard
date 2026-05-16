import type { ReactNode } from "react";
import styles from "./SidebarGroup.module.css";

interface SidebarGroupProps {
  label: string;
  children: ReactNode;
}

export function SidebarGroup({ label, children }: SidebarGroupProps) {
  return (
    <div className={styles.group}>
      <div className={styles.label}>{label}</div>
      <div className={styles.items}>{children}</div>
    </div>
  );
}

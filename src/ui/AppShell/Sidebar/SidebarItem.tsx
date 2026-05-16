import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./SidebarItem.module.css";

interface SidebarItemProps {
  icon: LucideIcon;
  label: ReactNode;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}

export function SidebarItem({ icon: Icon, label, badge, active, onClick, href }: SidebarItemProps) {
  const cls = [styles.item, active ? styles.active : ""].filter(Boolean).join(" ");
  const content = (
    <>
      <Icon className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      {typeof badge === "number" && badge > 0 ? (
        <span className={styles.badge}>{badge}</span>
      ) : null}
    </>
  );
  if (href !== undefined) {
    return (
      <a className={cls} href={href} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {content}
    </button>
  );
}

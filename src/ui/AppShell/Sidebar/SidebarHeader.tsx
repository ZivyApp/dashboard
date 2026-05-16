import styles from "./SidebarHeader.module.css";

interface SidebarHeaderProps {
  title: string;
  subtitle?: string;
}

export function SidebarHeader({ title, subtitle }: SidebarHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.label}>Escopo</div>
      <div className={styles.title}>{title}</div>
      {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
    </div>
  );
}

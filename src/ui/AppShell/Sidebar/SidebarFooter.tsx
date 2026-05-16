import styles from "./SidebarFooter.module.css";

export function SidebarFooter() {
  return (
    <div className={styles.footer}>
      v{__APP_VERSION__} · {__APP_BRANCH__}
    </div>
  );
}

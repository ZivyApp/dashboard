import styles from "./SidebarFooter.module.css";

export function SidebarFooter() {
  // Em produção, esconder versão+branch para não vazar detalhes do fluxo interno.
  // Em dev/preview, manter para ajudar no diagnóstico.
  if (import.meta.env.PROD) return null;
  return (
    <div className={styles.footer}>
      v{__APP_VERSION__} · {__APP_BRANCH__}
    </div>
  );
}

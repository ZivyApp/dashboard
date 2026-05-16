export function SidebarFooter() {
  return (
    <div
      style={{
        padding: "var(--space-3)",
        borderTop: "1px solid var(--border)",
        fontSize: "var(--fs-xs)",
        color: "var(--fg-tertiary)",
        marginTop: "auto",
      }}
    >
      v{__APP_VERSION__} · {__APP_BRANCH__}
    </div>
  );
}

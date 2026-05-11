import { useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Header
        isMobileMenuOpen={isMobileMenuOpen}
        onMenuToggle={() => setMobileMenuOpen((v) => !v)}
      />
      <Sidebar isMobileOpen={isMobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}

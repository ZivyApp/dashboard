import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { Inbox, Ticket, ShieldCheck, Settings } from "lucide-react";
import styles from "./Sidebar.module.css";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: "/inbox", label: "Inbox", icon: <Inbox size={18} aria-hidden="true" /> },
  { to: "/tickets", label: "Tickets", icon: <Ticket size={18} aria-hidden="true" /> },
  { to: "/approvals", label: "Aprovações", icon: <ShieldCheck size={18} aria-hidden="true" /> },
  { to: "/settings", label: "Configurações", icon: <Settings size={18} aria-hidden="true" /> },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

function NavContent({ onLinkClick }: { onLinkClick?: () => void }) {
  return (
    <nav className={styles.nav} aria-label="Navegação principal">
      <ul className={styles.list}>
        {navItems.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className={styles.link}
              activeProps={{ className: `${styles.link} ${styles.active}` }}
              onClick={onLinkClick}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <aside className={styles.sidebar} aria-label="Barra lateral">
        <NavContent />
      </aside>

      {/* Mobile drawer — Radix Dialog */}
      <Dialog.Root open={isMobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={styles.drawer} aria-label="Menu de navegação">
            <Dialog.Title className={styles.srOnly}>Navegação</Dialog.Title>
            <Dialog.Description className={styles.srOnly}>
              Lista de links para as seções do sistema.
            </Dialog.Description>
            <NavContent onLinkClick={onMobileClose} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

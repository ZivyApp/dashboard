import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import styles from "./Sidebar.module.css";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function InboxIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
    </svg>
  );
}

const navItems: NavItem[] = [
  { to: "/inbox", label: "Inbox", icon: <InboxIcon /> },
  { to: "/tickets", label: "Tickets", icon: <TicketIcon /> },
  { to: "/approvals", label: "Aprovações", icon: <CheckIcon /> },
  { to: "/settings", label: "Configurações", icon: <SettingsIcon /> },
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

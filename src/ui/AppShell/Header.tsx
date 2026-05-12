import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import styles from "./Header.module.css";

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

interface HeaderProps {
  isMobileMenuOpen: boolean;
  onMenuToggle: () => void;
}

export function Header({ isMobileMenuOpen, onMenuToggle }: HeaderProps) {
  return (
    <header className={styles.header}>
      {/* Hamburger — mobile only, visibility controlled by CSS */}
      <button
        type="button"
        className={styles.hamburger}
        aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isMobileMenuOpen}
        onClick={onMenuToggle}
      >
        <HamburgerIcon />
      </button>

      <span className={styles.logo}>Zivy</span>

      {/* TODO(Plan 3.3): mount CondoSwitcher here */}
      <div className={styles.condoSlot} />

      <div className={styles.spacer} />

      <div className={styles.actions}>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

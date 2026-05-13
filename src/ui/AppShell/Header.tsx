import { Menu } from "lucide-react";
import { CondoSwitcher } from "@/features/condo/CondoSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import styles from "./Header.module.css";

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
        <Menu size={20} aria-hidden="true" />
      </button>

      <span className={styles.logo}>Zivy</span>

      <div className={styles.condoSlot}>
        <CondoSwitcher />
      </div>

      <div className={styles.spacer} />

      <div className={styles.actions}>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

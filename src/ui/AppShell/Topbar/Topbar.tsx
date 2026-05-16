import type { Role } from "@/features/condo/roleHierarchy";
import { CondoSwitcher } from "@/features/condo/CondoSwitcher";
import { RoleBadge } from "@/ui/AppShell/RoleBadge";
import { ThemeToggle } from "@/ui/AppShell/ThemeToggle";
import { UserMenu } from "@/ui/AppShell/UserMenu";
import { SearchBox } from "./SearchBox";
import styles from "./Topbar.module.css";

interface TopbarProps {
  role: Role;
}

export function Topbar({ role }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.logo}>Zivy</div>
      <CondoSwitcher />
      <SearchBox />
      <div className={styles.right}>
        <RoleBadge role={role} />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

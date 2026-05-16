import type { ReactNode } from "react";
import { useScope } from "@/features/scope/useScope";
import { useMyCondos } from "@/features/condo/useMyCondos";
import type { Role } from "@/features/condo/roleHierarchy";
import { Topbar } from "./Topbar/Topbar";
import { Sidebar } from "./Sidebar/Sidebar";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
}

const ROLE_ORDER: Record<Role, number> = {
  super_admin: 0,
  manager: 1,
  staff: 2,
  viewer: 3,
};

function highestRole(roles: Role[]): Role {
  return roles.reduce<Role>((acc, r) => (ROLE_ORDER[r] < ROLE_ORDER[acc] ? r : acc), "viewer");
}

export function AppShell({ children }: AppShellProps) {
  const scope = useScope();
  const { data: condos } = useMyCondos();

  let scopeTitle = "Todos os condomínios";
  let scopeSubtitle: string | undefined;
  let role: Role = "viewer";

  if (scope.kind === "condo" && condos) {
    const current = condos.find((c) => c.condoId === scope.condoId);
    if (current) {
      scopeTitle = current.condoName;
      role = current.role;
    }
  } else if (condos) {
    scopeSubtitle = `${condos.length} condomínio${condos.length === 1 ? "" : "s"}`;
    role = highestRole(condos.map((c) => c.role));
  }

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <Topbar role={role} />
      </div>
      <div className={styles.sidebar}>
        <Sidebar
          scope={scope}
          scopeTitle={scopeTitle}
          {...(scopeSubtitle ? { scopeSubtitle } : {})}
        />
      </div>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

import type { ReactNode } from "react";
import { useScope } from "@/features/scope/useScope";
import { useMyCondos } from "@/features/condo/useMyCondos";
import { compareRoles, type Role } from "@/features/condo/roleHierarchy";
import { useActivityFeed } from "@/features/activity/useActivityFeed";
import { Topbar } from "./Topbar/Topbar";
import { Sidebar } from "./Sidebar/Sidebar";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
}

function highestRole(roles: Role[]): Role {
  return [...roles].sort(compareRoles)[0] ?? "viewer";
}

export function AppShell({ children }: AppShellProps) {
  const scope = useScope();
  const { data: condos } = useMyCondos();

  let scopeTitle = "Todos os condomínios";
  let scopeSubtitle: string | undefined;
  let role: Role = "viewer";
  let currentRole: Role | undefined;

  if (scope.kind === "condo" && condos) {
    const current = condos.find((c) => c.condoId === scope.condoId);
    if (current) {
      scopeTitle = current.condoName;
      role = current.role;
      currentRole = current.role;
    }
  } else if (condos) {
    scopeSubtitle = `${condos.length} condomínio${condos.length === 1 ? "" : "s"}`;
    role = highestRole(condos.map((c) => c.role));
  }

  const aggregateRoles: Role[] = (condos ?? []).map((c) => c.role);

  const unread = useActivityFeed({ scope, tab: "unread" });
  const inboxUnreadCount = unread.data?.counts.unread;

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
          {...(typeof inboxUnreadCount === "number" ? { inboxUnreadCount } : {})}
          {...(currentRole ? { currentRole } : {})}
          aggregateRoles={aggregateRoles}
        />
      </div>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

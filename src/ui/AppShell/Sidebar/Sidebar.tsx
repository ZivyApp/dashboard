import { Link, useRouterState } from "@tanstack/react-router";
import {
  Inbox,
  Ticket,
  CheckCircle2,
  Settings,
  Building2,
  Home,
  Trees,
  LayoutDashboard,
} from "lucide-react";
import type { Scope } from "@/features/scope/useScope";
import { isAtLeast, type Role } from "@/features/condo/roleHierarchy";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarItem } from "./SidebarItem";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  scope: Scope;
  scopeTitle: string;
  scopeSubtitle?: string;
  inboxUnreadCount?: number;
  approvalsCount?: number;
  /** Role no scope atual; ausente em scope "all" — usar aggregateRoles. */
  currentRole?: Role;
  /** Roles do user em todos os condos; usado em scope "all". */
  aggregateRoles?: Role[];
}

// TODO(plan-6-4): a lógica abaixo é equivalente a `useCanApprove(scope)` em
// `src/features/auth/useCanApprove.ts`. Mantida aqui porque a Sidebar é
// apresentacional pura (recebe roles via props do AppShell). Quando a Slice 6.4
// (Approvals page) entrar, considerar mover a derivação de role para o AppShell
// ou um hook irmão e consumir `useCanApprove` aqui também.
function canApprovals(scope: Scope, currentRole?: Role, aggregate?: Role[]): boolean {
  if (scope.kind === "condo") {
    return currentRole !== undefined && isAtLeast(currentRole, "manager");
  }
  return (aggregate ?? []).some((r) => isAtLeast(r, "manager"));
}

function canStructure(scope: Scope, currentRole?: Role): boolean {
  if (scope.kind !== "condo") return false;
  return currentRole !== undefined && isAtLeast(currentRole, "manager");
}

interface Item {
  to: string;
  params?: Record<string, string>;
  label: string;
  icon: typeof Inbox;
  badge?: number;
  /** Match de rota índice: ativo só no pathname exato, não por prefixo. */
  exact?: boolean;
}

export function Sidebar({
  scope,
  scopeTitle,
  scopeSubtitle,
  inboxUnreadCount,
  approvalsCount,
  currentRole,
  aggregateRoles,
}: SidebarProps) {
  const { location } = useRouterState();
  const showApprovals = canApprovals(scope, currentRole, aggregateRoles);
  const showStructure = canStructure(scope, currentRole);

  // Visão geral: cross-condo (/) em scope "all"; overview do próprio condo
  // (/c/$condoId) em scope "condo". `exact` evita marcar ativo nas sub-rotas.
  const overview: Item =
    scope.kind === "condo"
      ? {
          to: "/c/$condoId",
          params: { condoId: scope.condoId },
          label: "Visão geral",
          icon: LayoutDashboard,
          exact: true,
        }
      : { to: "/", label: "Visão geral", icon: LayoutDashboard, exact: true };

  const operacao: Item[] =
    scope.kind === "condo"
      ? [
          overview,
          {
            to: "/c/$condoId/inbox",
            params: { condoId: scope.condoId },
            label: "Inbox",
            icon: Inbox,
            ...(typeof inboxUnreadCount === "number" ? { badge: inboxUnreadCount } : {}),
          },
          {
            to: "/c/$condoId/tickets",
            params: { condoId: scope.condoId },
            label: "Tickets",
            icon: Ticket,
          },
          ...(showApprovals
            ? [
                {
                  to: "/c/$condoId/approvals",
                  params: { condoId: scope.condoId },
                  label: "Aprovações",
                  icon: CheckCircle2,
                  ...(typeof approvalsCount === "number" ? { badge: approvalsCount } : {}),
                } satisfies Item,
              ]
            : []),
          {
            to: "/c/$condoId/settings",
            params: { condoId: scope.condoId },
            label: "Configurações",
            icon: Settings,
          },
        ]
      : [
          overview,
          {
            to: "/inbox",
            label: "Inbox",
            icon: Inbox,
            ...(typeof inboxUnreadCount === "number" ? { badge: inboxUnreadCount } : {}),
          },
          { to: "/tickets", label: "Tickets", icon: Ticket },
          ...(showApprovals
            ? [
                {
                  to: "/approvals",
                  label: "Aprovações",
                  icon: CheckCircle2,
                  ...(typeof approvalsCount === "number" ? { badge: approvalsCount } : {}),
                } satisfies Item,
              ]
            : []),
        ];

  const estrutura: Item[] =
    showStructure && scope.kind === "condo"
      ? [
          {
            to: "/c/$condoId/structure/blocks",
            params: { condoId: scope.condoId },
            label: "Blocos",
            icon: Building2,
          },
          {
            to: "/c/$condoId/structure/units",
            params: { condoId: scope.condoId },
            label: "Unidades",
            icon: Home,
          },
          {
            to: "/c/$condoId/structure/common-areas",
            params: { condoId: scope.condoId },
            label: "Áreas comuns",
            icon: Trees,
          },
        ]
      : [];

  function renderItem(item: Item) {
    const active = matchesActive(location.pathname, item.to, item.params, item.exact);
    const linkProps = { to: item.to, params: item.params } as unknown as Parameters<typeof Link>[0];
    return (
      <Link
        key={`${item.to}:${item.params?.condoId ?? "_"}`}
        {...linkProps}
        style={{ textDecoration: "none" }}
      >
        <SidebarItem
          icon={item.icon}
          label={item.label}
          active={active}
          {...(typeof item.badge === "number" ? { badge: item.badge } : {})}
        />
      </Link>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <SidebarHeader title={scopeTitle} {...(scopeSubtitle ? { subtitle: scopeSubtitle } : {})} />
      <div className={styles.groups}>
        <SidebarGroup label="Operação">{operacao.map(renderItem)}</SidebarGroup>
        {estrutura.length > 0 ? (
          <SidebarGroup label="Estrutura">{estrutura.map(renderItem)}</SidebarGroup>
        ) : null}
      </div>
      <SidebarFooter />
    </aside>
  );
}

function matchesActive(
  pathname: string,
  to: string,
  params?: Record<string, string>,
  exact?: boolean,
): boolean {
  let expected = to;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      expected = expected.replace(`$${key}`, value);
    }
  }
  if (exact) {
    const norm = (s: string) => (s.length > 1 ? s.replace(/\/$/, "") : s);
    return norm(pathname) === norm(expected);
  }
  return pathname === expected || pathname.startsWith(expected + "/");
}

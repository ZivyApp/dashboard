import { Link, useRouterState } from "@tanstack/react-router";
import { Inbox, Ticket, CheckCircle2, Settings, Building2, Home, Trees } from "lucide-react";
import type { Scope } from "@/features/scope/useScope";
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
}

interface Item {
  to: string;
  params?: Record<string, string>;
  label: string;
  icon: typeof Inbox;
  badge?: number;
}

export function Sidebar({
  scope,
  scopeTitle,
  scopeSubtitle,
  inboxUnreadCount,
  approvalsCount,
}: SidebarProps) {
  const { location } = useRouterState();
  const operacao: Item[] =
    scope.kind === "condo"
      ? [
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
          {
            to: "/c/$condoId/approvals",
            params: { condoId: scope.condoId },
            label: "Aprovações",
            icon: CheckCircle2,
            ...(typeof approvalsCount === "number" ? { badge: approvalsCount } : {}),
          },
          {
            to: "/c/$condoId/settings",
            params: { condoId: scope.condoId },
            label: "Configurações",
            icon: Settings,
          },
        ]
      : [
          {
            to: "/inbox",
            label: "Inbox",
            icon: Inbox,
            ...(typeof inboxUnreadCount === "number" ? { badge: inboxUnreadCount } : {}),
          },
          { to: "/tickets", label: "Tickets", icon: Ticket },
          {
            to: "/approvals",
            label: "Aprovações",
            icon: CheckCircle2,
            ...(typeof approvalsCount === "number" ? { badge: approvalsCount } : {}),
          },
        ];

  const estrutura: Item[] =
    scope.kind === "condo"
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
    const active = matchesActive(location.pathname, item.to, item.params);
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

function matchesActive(pathname: string, to: string, params?: Record<string, string>): boolean {
  let expected = to;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      expected = expected.replace(`$${key}`, value);
    }
  }
  return pathname === expected || pathname.startsWith(expected + "/");
}

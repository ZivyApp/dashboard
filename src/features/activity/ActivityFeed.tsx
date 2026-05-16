import type { ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import type { Scope } from "@/features/scope/useScope";
import { useActivityFeed } from "./useActivityFeed";
import { useMarkRead } from "./useMarkRead";
import { ActivityFeedTabs } from "./ActivityFeedTabs";
import { ActivityItem } from "./ActivityItem";
import type { ActivityEvent, ActivityTab } from "./repository/types";
import styles from "./ActivityFeed.module.css";

interface Props {
  scope: Scope;
}

export function ActivityFeed({ scope }: Props) {
  const navigate = useNavigate();
  const searchRaw: unknown = useSearch({ strict: false });
  const rawTab =
    typeof searchRaw === "object" && searchRaw !== null
      ? (searchRaw as Record<string, unknown>).tab
      : undefined;
  const tab: ActivityTab =
    rawTab === "unread" || rawTab === "approvals" || rawTab === "all" ? rawTab : "all";
  const { data, isPending, isError, refetch } = useActivityFeed({ scope, tab });
  const { markRead, markAllRead } = useMarkRead();

  if (isPending) {
    return (
      <>
        <Header subtitle="Carregando…" />
        <Spinner />
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <Header subtitle="" />
        <div className={styles.empty}>
          <p>Não foi possível carregar a inbox.</p>
          <Button onClick={() => void refetch()}>Tentar novamente</Button>
        </div>
      </>
    );
  }

  function handleTabChange(next: ActivityTab) {
    void navigate({ to: ".", search: { tab: next } } as unknown as Parameters<typeof navigate>[0]);
  }

  function handlePick(event: ActivityEvent) {
    const ref = event.resourceRef;
    if (ref.type === "ticket") {
      const target =
        scope.kind === "condo"
          ? {
              to: "/c/$condoId/inbox/$ticketId",
              params: { condoId: scope.condoId, ticketId: ref.ticketId },
            }
          : {
              to: "/c/$condoId/inbox/$ticketId",
              params: { condoId: event.condoId, ticketId: ref.ticketId },
            };
      void navigate(target as unknown as Parameters<typeof navigate>[0]);
      return;
    }
    if (ref.type === "resident_approval") {
      void navigate({
        to: "/c/$condoId/approvals",
        params: { condoId: event.condoId },
        search: { highlight: ref.residentId },
      } as unknown as Parameters<typeof navigate>[0]);
    }
  }

  return (
    <>
      <Header
        subtitle={`${data.counts.unread} não lidos`}
        actions={
          <Button
            onClick={() => {
              void markAllRead(scope);
            }}
          >
            Marcar tudo como lido
          </Button>
        }
      />
      <ActivityFeedTabs value={tab} counts={data.counts} onChange={handleTabChange} />
      {data.items.length === 0 ? (
        <EmptyState title="Tudo em dia" description="Nenhuma atividade neste recorte." />
      ) : (
        <div className={styles.list}>
          {data.items.map((ev) => (
            <ActivityItem
              key={ev.id}
              event={ev}
              onPick={handlePick}
              onMarkRead={(id) => {
                void markRead(id);
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Header({ subtitle, actions }: { subtitle: string; actions?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>Inbox</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

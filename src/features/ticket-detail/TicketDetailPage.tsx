import { X } from "lucide-react";
import { Spinner } from "@/ui/Spinner/Spinner";
import { Button } from "@/ui/Button/Button";
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import { useTicket } from "@/features/tickets/useTicket";
import { useCanManageTicket } from "@/features/tickets/useCanManageTicket";
import { useSessionStore } from "@/stores/session";
import { formatRelTime } from "@/lib/formatRelTime";
import { formatFullTime } from "@/lib/formatFullTime";
import type { Ticket } from "@/types/ticket";
import { useTicketEvents } from "./useTicketEvents";
import { useUpdateStatus } from "./useUpdateStatus";
import { useClaimTicket } from "./useClaimTicket";
import { useAssignTo } from "./useAssignTo";
import { useCondoManagers } from "./useCondoManagers";
import { useAddComment } from "./useAddComment";
import { TicketStatusControl } from "./TicketStatusControl";
import { TicketAssignControl } from "./TicketAssignControl";
import { TicketTimeline } from "./TicketTimeline";
import { TicketComposer } from "./TicketComposer";
import styles from "./TicketDetailPage.module.css";

interface TicketDetailPageProps {
  condoId: string;
  ticketId: string;
  onClose: () => void;
}

function locationLabel(t: Ticket): string {
  if (t.common_area_name) return t.common_area_name;
  if (t.block_name && t.unit_number) return `${t.block_name} · ${t.unit_number}`;
  if (t.unit_number) return t.unit_number;
  return "—";
}

export function TicketDetailPage({ condoId, ticketId, onClose }: TicketDetailPageProps) {
  const { data, isPending, isFetching, isError, refetch } = useTicket(ticketId);
  const { data: events } = useTicketEvents(ticketId);
  const { data: managers } = useCondoManagers(condoId);
  const canManage = useCanManageTicket(condoId);
  const currentUserId = useSessionStore((s) => s.session?.user?.id);
  const { updateStatus, pendingStatus } = useUpdateStatus(ticketId);
  const { claim, isPending: claiming } = useClaimTicket(ticketId);
  const { assignTo, isPending: assigning } = useAssignTo(ticketId);
  const { addComment, isPending: commenting } = useAddComment(ticketId);

  if (isPending) {
    return (
      <div className={styles.center}>
        <Spinner />
        <p>Carregando chamado…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.center}>
        <h3>Não conseguimos abrir esse chamado</h3>
        <p>Pode ter sido removido ou você não tem acesso a ele.</p>
        <div className={styles.errorActions}>
          <Button variant="secondary" onClick={() => onClose()}>
            Voltar para chamados
          </Button>
          <Button
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
          >
            {isFetching ? "Tentando…" : "Tentar novamente"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headTop}>
          <div>
            <div className={styles.proto}>{data.protocol}</div>
            <h1 className={styles.title}>{data.title}</h1>
          </div>
          <Button variant="ghost" aria-label="Fechar chamado" onClick={() => onClose()}>
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className={styles.chips}>
          <StatusBadge status={data.status} />
          <PriorityChip priority={data.priority} />
          <span className={styles.locChip}>{locationLabel(data)}</span>
        </div>
        <div className={styles.meta}>
          {data.resident_name && (
            <span>
              <span className={styles.metaLabel}>Morador:</span> {data.resident_name}
            </span>
          )}
          <span>
            <span className={styles.metaLabel}>Aberto em:</span> {formatFullTime(data.created_at)}
          </span>
          <span>
            <span className={styles.metaLabel}>Atualizado:</span> {formatRelTime(data.updated_at)}
          </span>
        </div>
      </header>

      <div className={styles.actions}>
        {canManage && (
          <TicketStatusControl
            status={data.status}
            onChange={(s) => updateStatus(s)}
            disabled={pendingStatus !== undefined}
          />
        )}
        <TicketAssignControl
          assignedTo={data.assigned_to}
          managers={managers ?? []}
          currentUserId={currentUserId}
          canManage={canManage}
          isClaiming={claiming}
          isAssigning={assigning}
          onClaim={() => claim()}
          onAssignTo={(userId) => assignTo(userId)}
        />
      </div>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Descrição</div>
        <div className={styles.description}>{data.description ?? "Sem descrição."}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Timeline</div>
        <TicketTimeline events={events ?? []} ticketCreatedAt={data.created_at} />
      </section>

      {canManage && (
        <section className={styles.section}>
          <TicketComposer
            onSubmit={(text, opts) => addComment(text, opts)}
            isPending={commenting}
          />
        </section>
      )}
    </article>
  );
}

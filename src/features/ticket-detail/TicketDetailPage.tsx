import { AlignLeft, Calendar, Clock, History, MapPin, User } from "lucide-react";
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
  const { updateStatus, pendingStatus, isError: statusError } = useUpdateStatus(ticketId);
  const { claim, isPending: claiming, isError: claimError } = useClaimTicket(ticketId);
  const { assignTo, isPending: assigning, isError: assignError } = useAssignTo(ticketId, condoId);
  const { addComment, isPending: commenting, isError: commentError } = useAddComment(ticketId);

  // Erro de qualquer escrita no ticket (status/assumir/atribuir) — o comentário
  // tem feedback próprio na seção do composer.
  const writeError = statusError || claimError || assignError;

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
        <h2>Não conseguimos abrir esse chamado</h2>
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

  const effectiveStatus = pendingStatus ?? data.status;

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headTop}>
          <div>
            <div className={styles.proto}>{data.protocol}</div>
            <h2 className={styles.title}>{data.title}</h2>
          </div>
        </div>
        <div className={styles.chips}>
          <StatusBadge status={effectiveStatus} />
          <PriorityChip priority={data.priority} />
          <span className={styles.locChip}>
            <MapPin size={12} aria-hidden="true" />
            {locationLabel(data)}
          </span>
        </div>
        <div className={styles.meta}>
          {data.resident_name && (
            <span className={styles.metaItem}>
              <User size={13} aria-hidden="true" />
              <span className={styles.metaLabel}>Morador:</span> {data.resident_name}
            </span>
          )}
          <span className={styles.metaItem}>
            <Calendar size={13} aria-hidden="true" />
            <span className={styles.metaLabel}>Aberto em:</span> {formatFullTime(data.created_at)}
          </span>
          <span className={styles.metaItem}>
            <Clock size={13} aria-hidden="true" />
            <span className={styles.metaLabel}>Atualizado:</span> {formatRelTime(data.updated_at)}
          </span>
        </div>
      </header>

      <div className={styles.actions}>
        {canManage && (
          <div className={styles.statusSlot}>
            <TicketStatusControl
              status={effectiveStatus}
              onChange={(s) => updateStatus(s)}
              pendingStatus={pendingStatus}
            />
          </div>
        )}
        <div className={styles.assignSlot}>
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
        {writeError && (
          <p className={styles.writeError} role="alert">
            Não foi possível salvar a alteração. Tente novamente.
          </p>
        )}
      </div>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <AlignLeft size={13} aria-hidden="true" />
          Descrição
        </div>
        <div className={styles.description}>{data.description ?? "Sem descrição."}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <History size={13} aria-hidden="true" />
          Timeline
        </div>
        <TicketTimeline
          events={events ?? []}
          ticketCreatedAt={data.created_at}
          managers={managers ?? []}
        />
      </section>

      {canManage && (
        <section className={styles.section}>
          <TicketComposer
            onSubmit={(text, opts) => addComment(text, opts)}
            isPending={commenting}
          />
          {commentError && (
            <p className={styles.writeError} role="alert">
              Não foi possível publicar o comentário. Tente novamente.
            </p>
          )}
        </section>
      )}
    </article>
  );
}

import { Check, UserPlus } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import type { CondoManager } from "./useCondoManagers";
import styles from "./TicketAssignControl.module.css";

interface TicketAssignControlProps {
  assignedTo: string | undefined;
  managers: CondoManager[];
  currentUserId: string | undefined;
  canManage: boolean;
  isClaiming: boolean;
  isAssigning: boolean;
  onClaim: () => void;
  onAssignTo: (userId: string) => void;
}

export function TicketAssignControl({
  assignedTo,
  managers,
  currentUserId,
  canManage,
  isClaiming,
  isAssigning,
  onClaim,
  onAssignTo,
}: TicketAssignControlProps) {
  const isAssignedToMe = assignedTo !== undefined && assignedTo === currentUserId;

  // Picker: exclui o próprio usuário e o responsável atual.
  const options = managers.filter((m) => m.userId !== currentUserId && m.userId !== assignedTo);

  // Modo leitura (viewer): sem botões — o nome do responsável só aparece aqui.
  if (!canManage) {
    const current = assignedTo ? managers.find((m) => m.userId === assignedTo) : undefined;
    const responsavel = assignedTo ? (current?.label ?? "Atribuído") : "Não atribuído";
    return (
      <div className={styles.control}>
        <div className={styles.label}>Responsável</div>
        <div className={styles.current}>{responsavel}</div>
      </div>
    );
  }

  return (
    <div className={styles.control}>
      <div className={styles.label}>Responsável</div>
      <div className={styles.actions}>
        {/* O próprio botão carrega o estado: "Atribuído a você" quando o ticket
            já é do usuário logado (sem ação); senão, "Assumir ticket". */}
        <Button
          variant="secondary"
          disabled={isClaiming || isAssignedToMe}
          onClick={() => onClaim()}
        >
          {isAssignedToMe ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <UserPlus size={14} aria-hidden="true" />
          )}
          {isClaiming ? "Assumindo…" : isAssignedToMe ? "Atribuído a você" : "Assumir ticket"}
        </Button>
        {options.length > 0 && (
          <select
            className={styles.picker}
            aria-label="Atribuir a outro manager"
            value=""
            disabled={isAssigning}
            onChange={(e) => {
              if (e.target.value) onAssignTo(e.target.value);
            }}
          >
            <option value="" disabled>
              {isAssigning ? "Atribuindo…" : "Atribuir a outro…"}
            </option>
            {options.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

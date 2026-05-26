import { UserPlus } from "lucide-react";
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
  const current = assignedTo ? managers.find((m) => m.userId === assignedTo) : undefined;
  const responsavel = assignedTo ? (current?.label ?? "Atribuído") : "Não atribuído";

  // Picker: exclui o próprio usuário e o responsável atual.
  const options = managers.filter((m) => m.userId !== currentUserId && m.userId !== assignedTo);

  return (
    <div className={styles.control}>
      <div className={styles.label}>Responsável</div>
      <div className={styles.current}>{responsavel}</div>
      {canManage && (
        <div className={styles.actions}>
          <Button variant="secondary" disabled={isClaiming} onClick={() => onClaim()}>
            <UserPlus size={14} aria-hidden="true" />
            {isClaiming ? "Assumindo…" : "Assumir ticket"}
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
      )}
    </div>
  );
}

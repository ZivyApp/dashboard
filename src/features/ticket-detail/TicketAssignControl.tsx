import { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
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
  // `assigned_to` pode vir "" (não atribuído) — truthiness cobre "" e undefined.
  const isAssignedToMe = !!assignedTo && assignedTo === currentUserId;
  const isAssignedToOther = !!assignedTo && assignedTo !== currentUserId;

  // Reassumir tira o chamado de outro gestor — pede confirmação antes de efetivar.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const currentResponsible = assignedTo
    ? (managers.find((m) => m.userId === assignedTo)?.label ?? "outro gestor")
    : "";

  // Picker: exclui o próprio usuário e o responsável atual.
  const options = managers.filter((m) => m.userId !== currentUserId && m.userId !== assignedTo);

  // Clique em "Assumir": órfão → assume direto; de outro gestor → confirma primeiro.
  function handleClaimClick() {
    if (isAssignedToOther) {
      setConfirmOpen(true);
      return;
    }
    onClaim();
  }

  function confirmClaim() {
    setConfirmOpen(false);
    onClaim();
  }

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
          onClick={() => handleClaimClick()}
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

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Assumir chamado">
        <div className={styles.confirm}>
          <p className={styles.confirmText}>
            Este chamado está atribuído a <strong>{currentResponsible}</strong>. Ao assumir, você
            passa a ser o responsável e <strong>{currentResponsible}</strong> deixa de estar
            atribuído.
          </p>
          <div className={styles.confirmActions}>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={isClaiming} onClick={() => confirmClaim()}>
              {isClaiming ? "Assumindo…" : "Assumir mesmo assim"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

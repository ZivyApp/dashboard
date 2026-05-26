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

// Ação pendente de confirmação no diálogo: assumir (self) ou atribuir a outro.
type PendingAction = { type: "claim" } | { type: "assign"; userId: string; label: string };

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

  // Reatribuir (assumir de outro ou escolher no picker) tira/troca o responsável —
  // pede confirmação antes de efetivar.
  const [pending, setPending] = useState<PendingAction | null>(null);
  const currentResponsible = assignedTo
    ? (managers.find((m) => m.userId === assignedTo)?.label ?? "outro gestor")
    : "";

  // Picker: exclui o próprio usuário e o responsável atual.
  const options = managers.filter((m) => m.userId !== currentUserId && m.userId !== assignedTo);

  // Clique em "Assumir": órfão → assume direto; de outro gestor → confirma primeiro.
  function handleClaimClick() {
    if (isAssignedToOther) {
      setPending({ type: "claim" });
      return;
    }
    onClaim();
  }

  // Seleção no picker sempre confirma — é uma reatribuição explícita a outra pessoa.
  function handlePick(userId: string) {
    const label = options.find((m) => m.userId === userId)?.label ?? userId;
    setPending({ type: "assign", userId, label });
  }

  function confirmPending() {
    if (!pending) return;
    if (pending.type === "claim") onClaim();
    else onAssignTo(pending.userId);
    setPending(null);
  }

  const isBusy = isClaiming || isAssigning;

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
              if (e.target.value) handlePick(e.target.value);
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

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending?.type === "assign" ? "Atribuir chamado" : "Assumir chamado"}
      >
        <div className={styles.confirm}>
          <p className={styles.confirmText}>
            {pending?.type === "assign" ? (
              currentResponsible ? (
                <>
                  Este chamado está atribuído a <strong>{currentResponsible}</strong>. Atribuir a{" "}
                  <strong>{pending.label}</strong>?
                </>
              ) : (
                <>
                  Atribuir este chamado a <strong>{pending.label}</strong>?
                </>
              )
            ) : (
              <>
                Este chamado está atribuído a <strong>{currentResponsible}</strong>. Ao assumir,
                você passa a ser o responsável e <strong>{currentResponsible}</strong> deixa de
                estar atribuído.
              </>
            )}
          </p>
          <div className={styles.confirmActions}>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button disabled={isBusy} onClick={() => confirmPending()}>
              {pending?.type === "assign"
                ? isAssigning
                  ? "Atribuindo…"
                  : "Atribuir"
                : isClaiming
                  ? "Assumindo…"
                  : "Assumir mesmo assim"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

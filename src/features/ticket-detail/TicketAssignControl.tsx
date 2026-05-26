import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, UserPlus } from "lucide-react";
import { Avatar } from "@/ui/Avatar/Avatar";
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import { roleLabel } from "@/features/condo/roleHierarchy";
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

// Ação pendente de confirmação: assumir (self) ou atribuir a outro.
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
  const [pending, setPending] = useState<PendingAction | null>(null);

  // `assigned_to` pode vir "" (não atribuído) — truthiness cobre "" e undefined.
  const assignedManager = assignedTo ? managers.find((m) => m.userId === assignedTo) : undefined;
  const currentLabel = assignedTo ? (assignedManager?.label ?? "Atribuído") : "";
  const isBusy = isClaiming || isAssigning;

  // Escolha de alguém na lista. Sem responsável → efetiva direto (nada a tirar).
  // Com responsável → confirma (reatribuição). Escolher o atual é no-op.
  function selectManager(userId: string) {
    if (userId === assignedTo) return;
    const isSelf = userId === currentUserId;
    if (!assignedTo) {
      if (isSelf) onClaim();
      else onAssignTo(userId);
      return;
    }
    if (isSelf) {
      setPending({ type: "claim" });
    } else {
      const label = managers.find((m) => m.userId === userId)?.label ?? userId;
      setPending({ type: "assign", userId, label });
    }
  }

  function confirmPending() {
    if (!pending) return;
    if (pending.type === "claim") onClaim();
    else onAssignTo(pending.userId);
    setPending(null);
  }

  // Modo leitura (viewer): só exibe o responsável, sem dropdown.
  if (!canManage) {
    return (
      <div className={styles.control}>
        <div className={styles.label}>Responsável</div>
        {assignedTo ? (
          <div className={styles.person}>
            <Avatar name={currentLabel} colorKey={assignedTo} />
            <div className={styles.personText}>
              <span className={styles.personName}>{currentLabel}</span>
              {assignedManager && (
                <span className={styles.personRole}>{roleLabel(assignedManager.role)}</span>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.unassigned}>Não atribuído</div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.control}>
      <div className={styles.label}>Responsável</div>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={styles.trigger}
            disabled={isBusy}
            aria-label="Responsável pelo chamado"
          >
            {assignedTo ? (
              <Avatar name={currentLabel} colorKey={assignedTo} />
            ) : (
              <span className={styles.triggerIcon} aria-hidden="true">
                <UserPlus size={16} />
              </span>
            )}
            <span className={styles.triggerName}>
              {isBusy ? "Atribuindo…" : assignedTo ? currentLabel : "Não atribuído"}
            </span>
            <ChevronDown size={16} aria-hidden="true" className={styles.triggerChevron} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={styles.menu} align="start" sideOffset={6}>
            {managers.length === 0 ? (
              <div className={styles.menuEmpty}>Nenhum gestor disponível</div>
            ) : (
              managers.map((m) => {
                const isActive = m.userId === assignedTo;
                return (
                  <DropdownMenu.Item
                    key={m.userId}
                    className={styles.menuItem}
                    aria-current={isActive ? "true" : undefined}
                    onSelect={() => selectManager(m.userId)}
                  >
                    <Avatar name={m.label} colorKey={m.userId} />
                    <div className={styles.menuText}>
                      <span className={styles.menuName}>
                        {m.label}
                        {m.userId === currentUserId ? " (você)" : ""}
                      </span>
                      <span className={styles.menuRole}>{roleLabel(m.role)}</span>
                    </div>
                    {isActive && (
                      <Check size={16} aria-hidden="true" className={styles.menuCheck} />
                    )}
                  </DropdownMenu.Item>
                );
              })
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending?.type === "assign" ? "Atribuir chamado" : "Assumir chamado"}
      >
        <div className={styles.confirm}>
          <p className={styles.confirmText}>
            {pending?.type === "assign" ? (
              <>
                Este chamado está atribuído a <strong>{currentLabel}</strong>. Atribuir a{" "}
                <strong>{pending.label}</strong>?
              </>
            ) : (
              <>
                Este chamado está atribuído a <strong>{currentLabel}</strong>. Ao assumir, você
                passa a ser o responsável e <strong>{currentLabel}</strong> deixa de estar
                atribuído.
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

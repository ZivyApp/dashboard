import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useMyCondos } from "./useMyCondos";
import { isAtLeast } from "./roleHierarchy";
import styles from "./CondoSwitcher.module.css";

export function CondoSwitcher() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const { data, isPending, error } = useMyCondos();

  const activeCondoId = params.condoId;

  // Trocar de escopo sempre cai na Visão geral do destino (cross-condo em `/`,
  // por-condo em `/c/$condoId`), não na sub-página atual.
  function handleSelectAll() {
    void navigate({ to: "/" });
  }

  function handleSelect(newId: string) {
    void navigate({ to: "/c/$condoId", params: { condoId: newId } });
  }

  if (isPending) {
    return (
      <div className={styles.placeholder} aria-busy="true">
        Carregando…
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState} role="alert">
        Não foi possível carregar
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  const activeCondo = data.find((c) => c.condoId === activeCondoId);
  const triggerLabel = activeCondo?.condoName ?? "Selecione condomínio";

  // "Todos os condomínios" só faz sentido para quem opera cross-condo
  // (super_admin global ou manager em qualquer condo). Para staff/viewer
  // restritos a um único condo, escondemos a opção.
  const showAllOption = data.some((c) => isAtLeast(c.role, "manager"));

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={styles.trigger} aria-label={`Condomínio: ${triggerLabel}`}>
          <span className={styles.condoName}>{triggerLabel}</span>
          <ChevronDown size={14} aria-hidden="true" className={styles.chevron} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.content} align="start" sideOffset={8}>
          {showAllOption ? (
            <>
              <DropdownMenu.Item
                className={styles.item}
                aria-current={activeCondoId === undefined ? "true" : undefined}
                onSelect={() => handleSelectAll()}
              >
                <span className={styles.checkSlot}>
                  {activeCondoId === undefined && <Check size={14} aria-hidden="true" />}
                </span>
                <Globe size={16} aria-hidden="true" />
                <span className={styles.itemName}>Todos os condomínios</span>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className={styles.separator} />
            </>
          ) : null}
          {data.map((condo) => {
            const isActive = condo.condoId === activeCondoId;
            return (
              <DropdownMenu.Item
                key={condo.condoId}
                className={styles.item}
                aria-current={isActive ? "true" : undefined}
                onSelect={() => handleSelect(condo.condoId)}
              >
                <span className={styles.checkSlot}>
                  {isActive && <Check size={14} aria-hidden="true" />}
                </span>
                <span className={styles.itemName}>{condo.condoName}</span>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

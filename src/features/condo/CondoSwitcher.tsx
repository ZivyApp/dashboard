import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useMatches, useNavigate, useParams } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";
import { useMyCondos } from "./useMyCondos";
import styles from "./CondoSwitcher.module.css";

export function CondoSwitcher() {
  const navigate = useNavigate();
  const matches = useMatches();
  const params = useParams({ strict: false });
  const { data, isPending, error } = useMyCondos();

  const leafRouteId = matches.at(-1)?.routeId ?? "";
  // Extract the last path segment from routeId.
  // e.g. "/_app/c/$condoId/inbox" → "inbox"
  // Deep nested routes like "/_app/c/$condoId/inbox/thread/$threadId" → "$threadId"
  // which falls through to the default "inbox" — acceptable behavior.
  const subPath = leafRouteId.split("/").pop() ?? "inbox";
  const activeCondoId = params.condoId;

  function handleSelect(newId: string) {
    const p = { condoId: newId };
    switch (subPath) {
      case "inbox":
        void navigate({ to: "/c/$condoId/inbox", params: p });
        break;
      case "tickets":
        void navigate({ to: "/c/$condoId/tickets", params: p });
        break;
      case "approvals":
        void navigate({ to: "/c/$condoId/approvals", params: p });
        break;
      case "settings":
        void navigate({ to: "/c/$condoId/settings", params: p });
        break;
      default:
        void navigate({ to: "/c/$condoId/inbox", params: p });
        break;
    }
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

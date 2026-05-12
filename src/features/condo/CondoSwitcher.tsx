import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";
import { useMyCondos } from "./useMyCondos";
import styles from "./CondoSwitcher.module.css";

const SUB_ROUTES = ["inbox", "tickets", "approvals", "settings"] as const;
type SubRoute = (typeof SUB_ROUTES)[number];

function getCurrentSubRoute(pathname: string): SubRoute {
  const lastSegment = pathname.split("/").filter(Boolean).pop();
  return (SUB_ROUTES as readonly string[]).includes(lastSegment ?? "")
    ? (lastSegment as SubRoute)
    : "inbox";
}

function navigateToCondoSubRoute(
  navigate: ReturnType<typeof useNavigate>,
  condoId: string,
  subRoute: SubRoute,
): void {
  const params = { condoId };
  switch (subRoute) {
    case "inbox":
      void navigate({ to: "/c/$condoId/inbox", params });
      break;
    case "tickets":
      void navigate({ to: "/c/$condoId/tickets", params });
      break;
    case "approvals":
      void navigate({ to: "/c/$condoId/approvals", params });
      break;
    case "settings":
      void navigate({ to: "/c/$condoId/settings", params });
      break;
  }
}

export function CondoSwitcher() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const params = useParams({ strict: false });
  const { data, isPending, error } = useMyCondos();

  const subRoute = getCurrentSubRoute(pathname);
  const activeCondoId = params.condoId;

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

  function handleSelect(newId: string) {
    navigateToCondoSubRoute(navigate, newId, subRoute);
  }

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

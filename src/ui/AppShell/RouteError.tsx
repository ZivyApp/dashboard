import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { Button } from "@/ui/Button/Button";
import { classifyRouteError } from "@/lib/routeError";

// `reset` é intencionalmente omitido: o retry usa router.invalidate(), não o reset do boundary.
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const kind = classifyRouteError(error);

  useEffect(() => {
    if (kind === "unknown") {
      console.error(error);
    }
  }, [kind, error]);

  if (kind === "connection") {
    return (
      <EmptyState
        title="Erro de conexão"
        description="Não foi possível carregar os dados. Verifique sua internet e tente novamente."
        action={
          <Button
            onClick={() => {
              void router.invalidate();
            }}
          >
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      title="Algo deu errado"
      description="Ocorreu um erro inesperado. Recarregue a página."
      action={
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          Recarregar
        </Button>
      }
    />
  );
}

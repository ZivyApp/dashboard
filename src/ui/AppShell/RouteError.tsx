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

  if (kind === "unknown") {
    return (
      <EmptyState
        role="alert"
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

  // connection | server → ambos recuperáveis por retry (router.invalidate());
  // diferem só na copy: connection sugere checar a internet, server é falha de
  // resposta HTTP (4xx/5xx), geralmente transitória.
  const copy =
    kind === "connection"
      ? {
          title: "Sem conexão",
          description:
            "Não foi possível carregar os dados. Verifique sua internet e tente novamente.",
        }
      : {
          title: "Erro ao carregar",
          description: "O servidor não respondeu como esperado. Tente novamente em instantes.",
        };

  return (
    <EmptyState
      role="alert"
      title={copy.title}
      description={copy.description}
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

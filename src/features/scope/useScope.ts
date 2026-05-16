import { useParams } from "@tanstack/react-router";

export type Scope = { kind: "all" } | { kind: "condo"; condoId: string };

export function useScope(): Scope {
  const params = useParams({ strict: false });
  if (typeof params.condoId === "string" && params.condoId.length > 0) {
    return { kind: "condo", condoId: params.condoId };
  }
  return { kind: "all" };
}

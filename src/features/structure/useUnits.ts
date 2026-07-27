import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { toUnit, type Unit } from "./unit";

async function fetchUnits(blockId?: string): Promise<Unit[]> {
  const query: { block_id?: string } = blockId !== undefined ? { block_id: blockId } : {};
  const { data, error } = await api.GET("/units", { params: { query } });
  if (error) {
    throw new Error("StructureService.fetchUnits: falha em GET /units", { cause: error });
  }
  return (data ?? []).map(toUnit).filter((u): u is Unit => u !== null);
}

/**
 * Lista unidades do condo ativo, opcionalmente filtradas por bloco.
 * Key ["units", condoId, blockId | "all"] — invalidar por prefixo ["units", condoId].
 */
export function useUnits(condoId: string, blockId?: string) {
  const query = useQuery({
    queryKey: ["units", condoId, blockId ?? "all"] as const,
    queryFn: () => fetchUnits(blockId),
    staleTime: 5 * 60_000,
  });
  return {
    units: query.data,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}

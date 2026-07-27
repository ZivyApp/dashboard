import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { toBlock, type Block } from "./block";

async function fetchBlocks(): Promise<Block[]> {
  const { data, error } = await api.GET("/blocks");
  if (error) {
    throw new Error("StructureService.fetchBlocks: falha em GET /blocks", { cause: error });
  }
  return (data ?? []).map(toBlock).filter((b): b is Block => b !== null);
}

export function useBlocks(condoId: string) {
  const query = useQuery({
    queryKey: ["blocks", condoId] as const,
    queryFn: fetchBlocks,
    staleTime: 5 * 60_000,
  });
  return {
    blocks: query.data,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Resident } from "@/types/resident";
import { isResident } from "@/types/resident";

async function fetchResidents(): Promise<Resident[]> {
  const { data, error } = await api.GET("/residents");
  if (error) {
    throw new Error("ResidentsService.fetchAll: falha em GET /residents", { cause: error });
  }
  return (data ?? []).filter(isResident);
}

export function useResidents(condoId: string) {
  const query = useQuery({
    queryKey: ["residents", condoId] as const,
    queryFn: fetchResidents,
    staleTime: 5 * 60_000,
  });
  return {
    residents: query.data,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}

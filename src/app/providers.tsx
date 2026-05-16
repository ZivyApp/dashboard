import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { RepositoryProvider } from "@/features/activity/RepositoryProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider>{children}</RepositoryProvider>
    </QueryClientProvider>
  );
}

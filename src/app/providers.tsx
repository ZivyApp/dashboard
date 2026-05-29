import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "./queryClient";
import { RepositoryProvider } from "@/features/activity/RepositoryProvider";
import { useThemeStore } from "@/stores/theme";

export function Providers({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider>{children}</RepositoryProvider>
      <Toaster position="bottom-right" theme={mode} closeButton richColors duration={3000} />
    </QueryClientProvider>
  );
}

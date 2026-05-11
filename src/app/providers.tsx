import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiAuth } from "@/api/client";
import { getAccessToken } from "@/stores/session";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  configureApiAuth({
    getAccessToken: () => Promise.resolve(getAccessToken()),
    getActiveCondoId: () => undefined,
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

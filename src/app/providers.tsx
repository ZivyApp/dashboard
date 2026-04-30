import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initTheme } from "@/stores/theme";
import { configureApiAuth } from "@/api/client";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    initTheme();
    configureApiAuth({
      getAccessToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token;
      },
      getActiveCondoId: () => {
        // Placeholder: será conectado ao store de condo no Plano 3.
        return undefined;
      },
    });
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

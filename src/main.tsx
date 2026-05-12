import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/app/router";
import { Providers } from "@/app/providers";
import { configureApiAuth } from "@/api/client";
import { getAccessToken } from "@/stores/session";
import { initTheme } from "@/stores/theme";
import { initSession } from "@/stores/session";
import "@/styles/global.css";

initTheme();
initSession();

function getActiveCondoIdFromUrl(): string | undefined {
  const match = router.state.matches.find((m) => "condoId" in (m.params ?? {}));
  if (!match) return undefined;
  const params = match.params as { condoId?: string };
  return params.condoId;
}

configureApiAuth({
  getAccessToken: () => Promise.resolve(getAccessToken()),
  getActiveCondoId: getActiveCondoIdFromUrl,
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error('Root element "#root" not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/app/router";
import { Providers } from "@/app/providers";
import { configureApiAuth } from "@/api/auth";
import { getAccessToken } from "@/stores/session";
import { initTheme } from "@/stores/theme";
import { initSession } from "@/stores/session";
import "@/styles/global.css";

initTheme();
initSession();

function hasCondoId(params: Record<string, unknown>): params is { condoId: string } {
  return typeof params["condoId"] === "string";
}

function getActiveCondoIdFromUrl(): string | undefined {
  for (const match of router.state.matches) {
    const params = match.params ?? {};
    if (hasCondoId(params)) return params.condoId;
  }
  return undefined;
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

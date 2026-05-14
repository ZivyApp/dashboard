import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/app/router";
import { Providers } from "@/app/providers";
import { initTheme } from "@/stores/theme";
import { initSession } from "@/stores/session";
import "@/styles/global.css";

initTheme();
initSession();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error('Root element "#root" not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);

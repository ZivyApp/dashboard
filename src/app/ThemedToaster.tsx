import { Toaster } from "sonner";
import { useThemeStore } from "@/stores/theme";

/**
 * Toaster (sonner) que reage ao tema. Isolado num componente próprio para que a
 * assinatura ao theme store não force re-render de toda a árvore sob `Providers`.
 */
export function ThemedToaster() {
  const mode = useThemeStore((s) => s.mode);
  return <Toaster position="bottom-right" theme={mode} closeButton richColors duration={3000} />;
}

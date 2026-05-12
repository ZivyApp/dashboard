import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore } from "@/stores/theme";
import type { ThemeMode } from "@/stores/theme";
import styles from "./ThemeToggle.module.css";

const nextMode: Record<ThemeMode, ThemeMode> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const ariaLabel: Record<ThemeMode, string> = {
  light: "Tema atual: claro. Trocar para escuro.",
  dark: "Tema atual: escuro. Trocar para sistema.",
  system: "Tema atual: sistema. Trocar para claro.",
};

const modeIcon: Record<ThemeMode, React.ReactNode> = {
  light: <Sun size={18} aria-hidden="true" />,
  dark: <Moon size={18} aria-hidden="true" />,
  system: <Monitor size={18} aria-hidden="true" />,
};

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={ariaLabel[mode] ?? "Tema. Clique para alterar."}
      onClick={() => setMode(nextMode[mode] ?? "light")}
    >
      {modeIcon[mode]}
    </button>
  );
}

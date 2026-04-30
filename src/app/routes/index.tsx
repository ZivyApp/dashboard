import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/ui/Button/Button";
import { useThemeStore } from "@/stores/theme";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  const { mode, setMode } = useThemeStore();
  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1>Zivy dashboard scaffold</h1>
      <p>Tema atual: {mode}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={() => setMode("light")} variant="secondary">
          Light
        </Button>
        <Button onClick={() => setMode("dark")} variant="secondary">
          Dark
        </Button>
        <Button onClick={() => setMode("system")} variant="ghost">
          System
        </Button>
      </div>
    </main>
  );
}

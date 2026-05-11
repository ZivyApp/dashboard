import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/ui/Button/Button";
import { useSessionStore } from "@/stores/session";
import { requireAuth } from "@/lib/routeGuards";

export const Route = createFileRoute("/")({
  beforeLoad: requireAuth,
  component: HomePage,
});

function HomePage() {
  const { session, signOut } = useSessionStore();
  const email = session?.user.email ?? "";
  return (
    <main style={{ padding: 24 }}>
      <p>
        Logado como {email} <Button onClick={() => void signOut()}>Sair</Button>
      </p>
    </main>
  );
}

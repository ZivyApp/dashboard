import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return <main style={{ padding: 24 }}>Zivy dashboard scaffold</main>;
}

import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/study/dashboard";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Dashboard />;
}

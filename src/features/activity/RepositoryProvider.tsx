import { useMemo, type ReactNode } from "react";
import { createActivityRepository } from "./repository";
import { RepositoryContext } from "./RepositoryContext";

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => createActivityRepository(), []);
  return <RepositoryContext.Provider value={repo}>{children}</RepositoryContext.Provider>;
}

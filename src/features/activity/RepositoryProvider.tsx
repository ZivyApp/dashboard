import { createContext, useMemo, type ReactNode } from "react";
import { createActivityRepository } from "./repository";
import type { ActivityRepository } from "./repository/types";

export const RepositoryContext = createContext<ActivityRepository | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => createActivityRepository(), []);
  return <RepositoryContext.Provider value={repo}>{children}</RepositoryContext.Provider>;
}

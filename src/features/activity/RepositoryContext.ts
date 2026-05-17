import { createContext } from "react";
import type { ActivityRepository } from "./repository/types";

export const RepositoryContext = createContext<ActivityRepository | null>(null);

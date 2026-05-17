import { useContext } from "react";
import { RepositoryContext } from "./RepositoryContext";

export function useActivityRepository() {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error("useActivityRepository: RepositoryProvider ausente na árvore");
  }
  return ctx;
}

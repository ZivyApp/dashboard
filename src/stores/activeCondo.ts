import { safeStorage } from "@/lib/safeStorage";

const KEY = "zivy:lastCondoId";

export function getLastSelected(): string | undefined {
  return safeStorage.getItem(KEY) ?? undefined;
}

export function setLastSelected(id: string): void {
  safeStorage.setItem(KEY, id);
}

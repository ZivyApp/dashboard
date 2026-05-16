import { FIXTURES } from "./fixtures";
import { createLocalActivityRepository } from "./local";
import type { ActivityRepository } from "./types";

export function createActivityRepository(): ActivityRepository {
  // Slice 5.4 estende com `if (env.ACTIVITY_REPOSITORY === "http")` → HttpActivityRepository.
  // Em prod (default `local` até o Slice 5.4), serve repo vazio — evita expor
  // fixtures fictícias para usuários reais. Em dev/preview, fixtures permanecem.
  if (import.meta.env.PROD) {
    return createLocalActivityRepository({ events: [] });
  }
  return createLocalActivityRepository({ events: FIXTURES });
}

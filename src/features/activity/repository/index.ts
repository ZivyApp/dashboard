import { env } from "@/lib/env";
import { FIXTURES } from "./fixtures";
import { createHttpActivityRepository } from "./http";
import { createLocalActivityRepository } from "./local";
import type { ActivityRepository } from "./types";

export function createActivityRepository(): ActivityRepository {
  if (env.ACTIVITY_REPOSITORY === "http") {
    return createHttpActivityRepository();
  }
  // Default `local`: em prod sem flag http, serve repo vazio — evita expor
  // fixtures fictícias para usuários reais. Em dev/preview, fixtures permanecem.
  if (import.meta.env.PROD) {
    return createLocalActivityRepository({ events: [] });
  }
  return createLocalActivityRepository({ events: FIXTURES });
}

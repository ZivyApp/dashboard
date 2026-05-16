import { FIXTURES } from "./fixtures";
import { createLocalActivityRepository } from "./local";
import type { ActivityRepository } from "./types";

export function createActivityRepository(): ActivityRepository {
  // Slice 5.4 estende com `if (env.ACTIVITY_REPOSITORY === "http")` → HttpActivityRepository.
  return createLocalActivityRepository({ events: FIXTURES });
}

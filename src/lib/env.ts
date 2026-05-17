import { required } from "./assert-env";

export { required };

const ACTIVITY_REPOSITORIES = ["local", "http"] as const;
type ActivityRepositoryKind = (typeof ACTIVITY_REPOSITORIES)[number];

const rawRepo = import.meta.env.VITE_ACTIVITY_REPOSITORY as string | undefined;
function parseActivityRepository(raw: string | undefined): ActivityRepositoryKind {
  if (raw === undefined || raw === "") return "local";
  if ((ACTIVITY_REPOSITORIES as readonly string[]).includes(raw)) {
    return raw as ActivityRepositoryKind;
  }
  console.warn(
    `[env] VITE_ACTIVITY_REPOSITORY="${raw}" inválido; usando "local". ` +
      `Valores aceitos: ${ACTIVITY_REPOSITORIES.join(", ")}.`,
  );
  return "local";
}
const ACTIVITY_REPOSITORY = parseActivityRepository(rawRepo);

export const env = {
  SUPABASE_URL: required("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  SUPABASE_ANON_KEY: required("VITE_SUPABASE_ANON_KEY", import.meta.env.VITE_SUPABASE_ANON_KEY),
  CORE_API_URL: required("VITE_CORE_API_URL", import.meta.env.VITE_CORE_API_URL),
  ACTIVITY_REPOSITORY,
};

import { required } from "./assert-env";

export { required };

const repo = import.meta.env.VITE_ACTIVITY_REPOSITORY as string | undefined;
const ACTIVITY_REPOSITORY: "local" | "http" = repo === "http" ? "http" : "local";

export const env = {
  SUPABASE_URL: required("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  SUPABASE_ANON_KEY: required("VITE_SUPABASE_ANON_KEY", import.meta.env.VITE_SUPABASE_ANON_KEY),
  CORE_API_URL: required("VITE_CORE_API_URL", import.meta.env.VITE_CORE_API_URL),
  ACTIVITY_REPOSITORY,
};

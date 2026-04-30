import { required } from "./assert-env";

export { required };

export const env = {
  SUPABASE_URL: required("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  SUPABASE_ANON_KEY: required("VITE_SUPABASE_ANON_KEY", import.meta.env.VITE_SUPABASE_ANON_KEY),
  CORE_API_URL: required("VITE_CORE_API_URL", import.meta.env.VITE_CORE_API_URL),
};

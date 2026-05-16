import { execSync } from "node:child_process";
import pkg from "../package.json" with { type: "json" };

function safeBranch(): string {
  if (process.env.VERCEL_GIT_COMMIT_REF) return process.env.VERCEL_GIT_COMMIT_REF;
  try {
    return execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

export const buildDefines = {
  __APP_VERSION__: JSON.stringify(pkg.version),
  __APP_BRANCH__: JSON.stringify(safeBranch()),
} as const;

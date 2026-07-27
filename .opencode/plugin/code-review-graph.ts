import type { Plugin } from "@opencode-ai/plugin";

// code-review-graph auto-update — mirrors the Claude Code PostToolUse hook
// (~/.claude/settings.json): after Edit|Write|Bash, incrementally update the
// knowledge graph with `code-review-graph update --skip-flows`.
//
// Fire-and-forget with coalescing: the hook never blocks the agent loop, and
// a burst of edits collapses into one in-flight run plus at most one
// trailing re-run.

const TRIGGER_TOOLS = new Set(["edit", "write", "bash"]);
const TIMEOUT_SECONDS = 30; // same as the Claude Code hook

export const CodeReviewGraphPlugin: Plugin = async ({ $, worktree }) => {
  try {
    await $`which code-review-graph`.quiet();
  } catch {
    console.warn("[code-review-graph] binary not found in PATH — plugin disabled");
    return {};
  }

  let running = false;
  let pending = false;

  const run = async (): Promise<void> => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      await $`timeout ${TIMEOUT_SECONDS} code-review-graph update --skip-flows --repo ${worktree}`
        .cwd(worktree)
        .quiet()
        .nothrow();
    } catch {
      // update failures are non-fatal — never break the agent loop
    }
    running = false;
    if (pending) {
      pending = false;
      await run();
    }
  };

  return {
    "tool.execute.after": async (input) => {
      const tool = String(input?.tool ?? "").toLowerCase();
      if (!TRIGGER_TOOLS.has(tool)) return;
      void run();
    },
  };
};

export default CodeReviewGraphPlugin;

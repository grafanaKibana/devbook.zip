#!/usr/bin/env node
// PostToolUse hook: track edited Vault/Home notes and explain the required
// reviewer receipt. Hook failures never block the edit that already succeeded.

import {
  changedNotePaths,
  readStdin,
  resolveRepoRoot,
  sessionId,
  shellQuote,
  trackNotes,
} from "./note-review-state.mjs";

try {
  const raw = await readStdin();
  const payload = raw ? JSON.parse(raw) : {};
  const repoRoot = resolveRepoRoot(payload.cwd ?? process.cwd());
  const id = sessionId(payload);
  const tracked = trackNotes(
    repoRoot,
    id,
    changedNotePaths(payload, repoRoot),
  );

  if (tracked.length > 0) {
    const receiptCommand = [
      'node "$(git rev-parse --show-toplevel)/.codex/hooks/review-receipt.mjs"',
      "--session",
      shellQuote(id),
      "--verdict CLEAN",
      ...tracked.flatMap((note) => ["--path", shellQuote(note)]),
    ].join(" ");
    const out = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          `Changed note review required: ${tracked.join(", ")}. ` +
          "Dispatch the note-reviewer subagent. Only after it returns CLEAN, " +
          `record the hash-bound receipt with: ${receiptCommand}`,
      },
    };
    process.stdout.write(JSON.stringify(out));
  }
} catch {
  // State is an advisory completion gate; never break the edit path.
}

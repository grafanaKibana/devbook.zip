#!/usr/bin/env node
// Stop hook: keep the task active until current note hashes have CLEAN receipts.

import {
  clearSession,
  pendingReviews,
  readStdin,
  resolveRepoRoot,
  sessionId,
  shellQuote,
} from "./note-review-state.mjs";

try {
  const raw = await readStdin();
  const payload = raw ? JSON.parse(raw) : {};

  // A blocked Stop invokes the hook again. Allow that second invocation so a
  // malformed/stale state file can never create an infinite completion loop.
  if (payload.stop_hook_active === true) {
    process.exit(0);
  }

  const repoRoot = resolveRepoRoot(payload.cwd ?? process.cwd());
  const id = sessionId(payload);
  const pending = pendingReviews(repoRoot, id);
  if (pending.length === 0) {
    clearSession(repoRoot, id);
    process.exit(0);
  }

  const receiptCommand = [
    'node "$(git rev-parse --show-toplevel)/.codex/hooks/review-receipt.mjs"',
    "--session",
    shellQuote(id),
    "--verdict CLEAN",
    ...pending.flatMap((note) => ["--path", shellQuote(note)]),
  ].join(" ");

  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason:
        "Note review gate: dispatch the note-reviewer subagent for " +
        `${pending.join(", ")}. Address its findings and repeat review until it ` +
        `returns CLEAN. Then record the current hashes with: ${receiptCommand}`,
    }),
  );
} catch {
  // A hook failure must not trap the task in an unfinishable Stop loop.
}

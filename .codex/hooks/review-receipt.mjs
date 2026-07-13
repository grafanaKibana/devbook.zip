#!/usr/bin/env node

import {
  recordCleanReceipt,
  resolveRepoRoot,
} from "./note-review-state.mjs";

function parseArguments(args) {
  const parsed = { paths: [] };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--path") {
      parsed.paths.push(args[++index]);
    } else if (argument === "--session") {
      parsed.session = args[++index];
    } else if (argument === "--verdict") {
      parsed.verdict = args[++index];
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return parsed;
}

try {
  const args = parseArguments(process.argv.slice(2));
  if (!args.session || args.paths.length === 0 || args.verdict !== "CLEAN") {
    throw new Error(
      "Usage: review-receipt.mjs --session <id> --verdict CLEAN --path <note> [--path <note>]",
    );
  }

  const repoRoot = resolveRepoRoot();
  const result = recordCleanReceipt(
    repoRoot,
    String(args.session),
    args.paths,
    args.verdict,
  );
  if (result.recorded.length !== args.paths.length) {
    throw new Error(
      `Receipt rejected for untracked or missing notes: ${result.rejected.join(", ")}`,
    );
  }
  process.stdout.write(`Recorded CLEAN: ${result.recorded.join(", ")}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

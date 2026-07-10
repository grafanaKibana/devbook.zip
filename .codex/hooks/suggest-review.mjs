#!/usr/bin/env node
// PostToolUse hook: after a Vault Markdown note is edited, nudge the main agent
// to run the note-reviewer subagent on it. Must never block the edit or error.

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    // If nothing is piped, don't hang.
    process.stdin.on("error", () => resolve(data));
  });
}

try {
  const raw = await readStdin();
  const payload = raw ? JSON.parse(raw) : {};
  const filePath =
    payload?.tool_input?.file_path ?? payload?.tool_response?.filePath ?? "";

  if (typeof filePath === "string" && filePath.length > 0) {
    // Normalize and locate the path relative to the Vault/ directory.
    const normalized = filePath.replace(/\\/g, "/");
    const marker = "/Vault/";
    const idx = normalized.indexOf(marker);
    const isInVault = idx !== -1 || normalized.startsWith("Vault/");
    const isMarkdown = normalized.toLowerCase().endsWith(".md");

    if (isInVault && isMarkdown) {
      let relative;
      if (idx !== -1) {
        relative = normalized.slice(idx + 1); // keep "Vault/..."
      } else {
        relative = normalized; // already "Vault/..."
      }

      const out = {
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `The note ${relative} was just edited. Consider dispatching the note-reviewer subagent on it and relaying the critique to the user.`,
        },
      };
      process.stdout.write(JSON.stringify(out));
    }
  }
} catch {
  // Swallow all errors — a hook must never break the edit flow.
}

process.exit(0);

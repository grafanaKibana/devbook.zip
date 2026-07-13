import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const STATE_VERSION = 1;
const DEFAULT_SESSION = "default";
const VAULT_HOME_PREFIX = "Vault/Home/";

export function resolveRepoRoot(cwd = process.cwd()) {
  if (process.env.DEVBOOK_HOOK_REPO_ROOT) {
    return resolve(process.env.DEVBOOK_HOOK_REPO_ROOT);
  }

  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  }
}

export function stateFile(repoRoot) {
  const stateDir = process.env.DEVBOOK_HOOK_STATE_DIR
    ? resolve(process.env.DEVBOOK_HOOK_STATE_DIR)
    : resolve(repoRoot, ".codex/hooks/state");
  return resolve(stateDir, "note-reviews.json");
}

export function sessionId(payload = {}) {
  return String(
    payload.session_id ??
      payload.conversation_id ??
      payload.thread_id ??
      process.env.CODEX_THREAD_ID ??
      DEFAULT_SESSION,
  );
}

export function normalizeNotePath(candidate, repoRoot) {
  if (typeof candidate !== "string" || candidate.trim() === "") {
    return null;
  }

  const normalizedCandidate = candidate.trim().replaceAll("\\", "/");
  const absolute = isAbsolute(normalizedCandidate)
    ? resolve(normalizedCandidate)
    : resolve(repoRoot, normalizedCandidate);
  const repoRelative = relative(repoRoot, absolute).split(sep).join("/");

  if (
    repoRelative.startsWith("../") ||
    !repoRelative.startsWith(VAULT_HOME_PREFIX) ||
    !repoRelative.toLowerCase().endsWith(".md")
  ) {
    return null;
  }

  return repoRelative;
}

function patchPaths(command) {
  if (typeof command !== "string") {
    return [];
  }

  const paths = [];
  const header = /^\*\*\* (?:Add|Update) File: (.+)$/gm;
  for (const match of command.matchAll(header)) {
    paths.push(match[1].trim());
  }

  const move = /^\*\*\* Move to: (.+)$/gm;
  for (const match of command.matchAll(move)) {
    paths.push(match[1].trim());
  }

  return paths;
}

export function changedNotePaths(payload, repoRoot) {
  const candidates = [
    payload?.tool_input?.file_path,
    payload?.tool_response?.filePath,
    ...patchPaths(payload?.tool_input?.command),
  ];

  return [
    ...new Set(
      candidates
        .map((candidate) => normalizeNotePath(candidate, repoRoot))
        .filter(Boolean),
    ),
  ];
}

export function fileHash(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function emptyState() {
  return { version: STATE_VERSION, sessions: {} };
}

export function readState(repoRoot) {
  const path = stateFile(repoRoot);
  try {
    const state = JSON.parse(readFileSync(path, "utf8"));
    if (state?.version === STATE_VERSION && state.sessions) {
      return state;
    }
  } catch {
    // Missing or malformed state is disposable; start clean.
  }
  return emptyState();
}

function writeState(repoRoot, state) {
  const path = stateFile(repoRoot);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

export function trackNotes(repoRoot, id, paths) {
  if (paths.length === 0) {
    return [];
  }

  const state = readState(repoRoot);
  const session = (state.sessions[id] ??= { notes: {} });
  const tracked = [];

  for (const notePath of paths) {
    const absolute = resolve(repoRoot, notePath);
    if (!existsSync(absolute)) {
      continue;
    }

    const hash = fileHash(absolute);
    const previous = session.notes[notePath];
    session.notes[notePath] = {
      hash,
      cleanHash: previous?.cleanHash === hash ? hash : null,
    };
    tracked.push(notePath);
  }

  if (tracked.length > 0) {
    writeState(repoRoot, state);
  }
  return tracked;
}

export function recordCleanReceipt(repoRoot, id, paths, verdict) {
  if (verdict !== "CLEAN") {
    return { recorded: [], rejected: paths };
  }

  const state = readState(repoRoot);
  const session = state.sessions[id];
  const recorded = [];
  const rejected = [];

  for (const notePath of paths) {
    const normalized = normalizeNotePath(notePath, repoRoot);
    const entry = normalized ? session?.notes?.[normalized] : null;
    const absolute = normalized ? resolve(repoRoot, normalized) : null;
    if (!entry || !absolute || !existsSync(absolute)) {
      rejected.push(notePath);
      continue;
    }

    const hash = fileHash(absolute);
    if (entry.hash !== hash) {
      entry.hash = hash;
    }
    entry.cleanHash = hash;
    recorded.push(normalized);
  }

  if (recorded.length > 0) {
    writeState(repoRoot, state);
  }
  return { recorded, rejected };
}

export function pendingReviews(repoRoot, id) {
  const state = readState(repoRoot);
  const session = state.sessions[id];
  if (!session) {
    return [];
  }

  const pending = [];
  let changed = false;
  for (const [notePath, entry] of Object.entries(session.notes)) {
    const absolute = resolve(repoRoot, notePath);
    if (!existsSync(absolute)) {
      delete session.notes[notePath];
      changed = true;
      continue;
    }

    const hash = fileHash(absolute);
    if (entry.hash !== hash) {
      entry.hash = hash;
      entry.cleanHash = null;
      changed = true;
    }
    if (entry.cleanHash !== hash) {
      pending.push(notePath);
    }
  }

  if (changed) {
    writeState(repoRoot, state);
  }
  return pending.sort();
}

export function clearSession(repoRoot, id) {
  const state = readState(repoRoot);
  if (!state.sessions[id]) {
    return;
  }

  delete state.sessions[id];
  if (Object.keys(state.sessions).length === 0) {
    rmSync(stateFile(repoRoot), { force: true });
    return;
  }
  writeState(repoRoot, state);
}

export async function readStdin(stream = process.stdin) {
  let data = "";
  stream.setEncoding("utf8");
  for await (const chunk of stream) {
    data += chunk;
  }
  return data;
}

export function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

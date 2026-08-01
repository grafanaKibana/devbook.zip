#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(
  repoRoot,
  ".omx/context/dsa-tabsdown-content-manifest-v2.json",
);
const roots = [
  "Vault/Home/Computer Science/Algorithms",
  "Vault/Home/Computer Science/Data Structures",
];
const deletionRationale =
  "Redundant pre-visualization scenario text restates controls or a condition already visible in the interactive StepTrace.";
const explicitDeletions = new Set([
  "Choose From and To in Options; Haversine distance guides a route across 25 regional centers.",
  "A locked fire door blocks the direct corridor, forcing a lower-corridor detour.",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(value) {
  return value.replaceAll("\r\n", "\n");
}

function slug(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

function exactLineText(lines, startIndex, endIndex) {
  return `${lines.slice(startIndex, endIndex + 1).join("\n")}\n`;
}

function extractBlocks(lines, startIndex, endIndex) {
  const blocks = [];
  let blockStart = null;

  for (let index = startIndex; index <= endIndex; index += 1) {
    const line = lines[index];
    const structural = /^~{3,}(?:tabsdown)?\s*$/.test(line);
    if (line.trim() === "" || structural) {
      if (blockStart !== null) {
        blocks.push([blockStart, index - 1]);
        blockStart = null;
      }
    } else if (blockStart === null) {
      blockStart = index;
    }
  }

  if (blockStart !== null) blocks.push([blockStart, endIndex]);
  return blocks;
}

function parseNote(absolutePath) {
  const path = relative(repoRoot, absolutePath);
  const normalized = normalize(readFileSync(absolutePath, "utf8"));
  const lines = normalized.split("\n");
  const outerStarts = lines
    .map((line, index) => (/^(~{5,})tabsdown\s*$/.test(line) ? index : -1))
    .filter((index) => index >= 0);

  if (outerStarts.length === 0) return null;
  if (outerStarts.length !== 1)
    throw new Error(`${path}: expected one outer Tabsdown opener`);

  const outerStart = outerStarts[0];
  const delimiter = lines[outerStart].match(/^(~{5,})tabsdown\s*$/)[1];
  const outerEnd = lines.findIndex(
    (line, index) => index > outerStart && line === delimiter,
  );
  if (outerEnd < 0) throw new Error(`${path}: missing outer Tabsdown closer`);

  const visualizationLabel = lines.findIndex(
    (line, index) =>
      index > outerStart && index < outerEnd && line === "tab: Visualization",
  );
  const complexityLabel = lines.findIndex(
    (line, index) =>
      index > visualizationLabel &&
      index < outerEnd &&
      line === "tab: Complexity",
  );
  if (visualizationLabel < 0 || complexityLabel < 0) {
    throw new Error(`${path}: missing ordered Visualization/Complexity labels`);
  }

  const traceOpeners = lines
    .map((line, index) =>
      index > visualizationLabel &&
      index < complexityLabel &&
      line === "```steptrace"
        ? index
        : -1,
    )
    .filter((index) => index >= 0);
  const steptraces = [];
  const regions = [];
  let previousTraceCloser = visualizationLabel;

  for (const [order, opener] of traceOpeners.entries()) {
    const closer = lines.findIndex(
      (line, index) => index > opener && line === "```",
    );
    if (closer < 0 || closer >= complexityLabel)
      throw new Error(`${path}:${opener + 1}: unclosed StepTrace`);

    const payload = exactLineText(lines, opener + 1, closer - 1);
    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      throw new Error(
        `${path}:${opener + 2}: invalid StepTrace JSON: ${error.message}`,
      );
    }
    const variantId = String(parsed.variant ?? "default");
    steptraces.push({ path, variantId, order, payloadSha256: sha256(payload) });

    let contentBoundary = previousTraceCloser;
    for (let index = opener - 1; index > previousTraceCloser; index -= 1) {
      if (lines[index].startsWith("tab: ")) {
        contentBoundary = index;
        break;
      }
    }

    const blockRanges = extractBlocks(lines, contentBoundary + 1, opener - 1);
    for (const [blockOrder, [startIndex, endIndex]] of blockRanges.entries()) {
      const sourceText = exactLineText(lines, startIndex, endIndex);
      const deletion = explicitDeletions.has(sourceText.slice(0, -1));
      const base = {
        regionId: `${slug(path.slice("Vault/Home/Computer Science/".length, -3))}-${slug(variantId)}-${order + 1}-${blockOrder + 1}`,
        path,
        sourceStartLine: startIndex + 1,
        sourceEndLine: endIndex + 1,
        sourceText,
        sourceSha256: sha256(sourceText),
      };

      regions.push(
        deletion
          ? {
              ...base,
              disposition: "deleted",
              deletion: { rationale: deletionRationale, reviewerReceipt: null },
            }
          : {
              ...base,
              disposition: "moved",
              destination: {
                anchor: `after-steptrace:${order}:${variantId}:region:${blockOrder + 1}`,
                expectedText: sourceText,
                expectedSha256: sha256(sourceText),
              },
            },
      );
    }
    previousTraceCloser = closer;
  }

  return { path, steptraces, regions };
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const notes = roots
  .flatMap((root) => markdownFiles(join(repoRoot, root)))
  .map(parseNote)
  .filter(Boolean)
  .sort((left, right) => left.path.localeCompare(right.path));
const steptraces = notes.flatMap((note) => note.steptraces);
const regions = notes.flatMap((note) => note.regions);

if (notes.length !== 87)
  throw new Error(`expected 87 notes, found ${notes.length}`);
if (steptraces.length !== 105)
  throw new Error(
    `expected 105 StepTrace payloads, found ${steptraces.length}`,
  );
if (new Set(regions.map((region) => region.regionId)).size !== regions.length) {
  const seen = new Set();
  const duplicates = regions
    .map((region) => region.regionId)
    .filter((id) => seen.has(id) || !seen.add(id));
  throw new Error(
    `duplicate regionId generated: ${[...new Set(duplicates)].join(", ")}`,
  );
}
for (const note of notes) {
  if (note.steptraces.some((trace, index) => trace.order !== index)) {
    throw new Error(`${note.path}: non-contiguous StepTrace order`);
  }
}
for (const sentence of explicitDeletions) {
  const matches = regions.filter(
    (region) =>
      region.disposition === "deleted" && region.sourceText === `${sentence}\n`,
  );
  if (matches.length !== 1)
    throw new Error(`expected one explicit deletion for: ${sentence}`);
}

const inventory = regions.map(
  ({
    regionId,
    path,
    sourceStartLine,
    sourceEndLine,
    sourceText,
    sourceSha256,
  }) => ({
    regionId,
    path,
    sourceStartLine,
    sourceEndLine,
    sourceText,
    sourceSha256,
  }),
);

if (process.argv.includes("--check")) {
  const frozen = JSON.parse(readFileSync(outputPath, "utf8"));
  const frozenInventory = frozen.regions.map(
    ({
      regionId,
      path,
      sourceStartLine,
      sourceEndLine,
      sourceText,
      sourceSha256,
    }) => ({
      regionId,
      path,
      sourceStartLine,
      sourceEndLine,
      sourceText,
      sourceSha256,
    }),
  );
  if (JSON.stringify(steptraces) !== JSON.stringify(frozen.steptraces)) {
    throw new Error(
      "live StepTrace identities or payload hashes differ from the frozen manifest",
    );
  }
  if (JSON.stringify(inventory) !== JSON.stringify(frozenInventory)) {
    throw new Error(
      "live extractor-v1 regions differ from the frozen manifest",
    );
  }
  if (
    sha256(JSON.stringify(frozenInventory)) !==
    frozen.snapshot.regionInventorySha256
  ) {
    throw new Error(
      "frozen regionInventorySha256 does not match its canonical inventory",
    );
  }
  for (const region of frozen.regions) {
    if (sha256(region.sourceText) !== region.sourceSha256)
      throw new Error(`${region.regionId}: bad source hash`);
    if (region.sourceEndLine < region.sourceStartLine)
      throw new Error(`${region.regionId}: reversed line bounds`);
    if (
      region.destination &&
      sha256(region.destination.expectedText) !==
        region.destination.expectedSha256
    ) {
      throw new Error(`${region.regionId}: bad destination hash`);
    }
  }
  process.stdout.write(
    `${JSON.stringify({ notes: notes.length, steptraces: steptraces.length, regions: regions.length, deleted: regions.filter((region) => region.disposition === "deleted").length, regionInventorySha256: frozen.snapshot.regionInventorySha256, status: "clean" }, null, 2)}\n`,
  );
  process.exit(0);
}

const capturedAt = argument("--captured-at") ?? new Date().toISOString();
const gitHead =
  argument("--git-head") ??
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
const worktreeStatusSha256 = argument("--worktree-status-sha256");
if (!worktreeStatusSha256) {
  throw new Error(
    "--worktree-status-sha256 is required so the pre-edit raw status snapshot cannot drift",
  );
}

const manifest = {
  schemaVersion: 1,
  snapshot: {
    capturedAt,
    gitHead,
    worktreeStatusSha256,
    regionExtractorVersion: 1,
    regionInventorySha256: sha256(JSON.stringify(inventory)),
  },
  steptraces,
  regions,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(
  `${JSON.stringify({ outputPath: relative(repoRoot, outputPath), notes: notes.length, steptraces: steptraces.length, regions: regions.length, deleted: regions.filter((region) => region.disposition === "deleted").length, regionInventorySha256: manifest.snapshot.regionInventorySha256 }, null, 2)}\n`,
);

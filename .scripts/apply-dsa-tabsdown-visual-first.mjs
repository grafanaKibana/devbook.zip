#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const configManifestPath = join(
  repoRoot,
  ".omx/context/dsa-complexity-config-manifest-v2.json",
);
const contentManifestPath = join(
  repoRoot,
  ".omx/context/dsa-tabsdown-content-manifest-v2.json",
);
const mode = process.argv[2];

assert.ok(
  ["--apply", "--repair-prefixes", "--sync-configs", "--check"].includes(mode),
  "usage: --apply|--repair-prefixes|--sync-configs|--check",
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalize = (value) => value.replaceAll("\r\n", "\n");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const slug = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function parseNote(text, path) {
  const lines = normalize(text).split("\n");
  const outerStarts = lines
    .map((line, index) => (/^(~{5,})tabsdown\s*$/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  assert.equal(
    outerStarts.length,
    1,
    `${path}: expected one outer Tabsdown opener`,
  );

  const outerStart = outerStarts[0];
  const delimiter = lines[outerStart].match(/^(~{5,})tabsdown\s*$/)[1];
  const outerEnd = lines.findIndex(
    (line, index) => index > outerStart && line === delimiter,
  );
  assert.ok(outerEnd > outerStart, `${path}: missing outer Tabsdown closer`);

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
  assert.ok(
    visualizationLabel > outerStart,
    `${path}: missing Visualization label`,
  );
  assert.ok(
    complexityLabel > visualizationLabel,
    `${path}: missing ordered Complexity label`,
  );

  const traces = [];
  for (
    let index = visualizationLabel + 1;
    index < complexityLabel;
    index += 1
  ) {
    if (lines[index] !== "```steptrace") continue;
    const closer = lines.findIndex(
      (line, candidate) => candidate > index && line === "```",
    );
    assert.ok(
      closer > index && closer < complexityLabel,
      `${path}:${index + 1}: unclosed StepTrace`,
    );
    const payload = `${lines.slice(index + 1, closer).join("\n")}\n`;
    const parsed = JSON.parse(payload);
    traces.push({
      opener: index,
      closer,
      payload,
      variantId: String(parsed.variant ?? "default"),
      order: traces.length,
    });
    index = closer;
  }

  return {
    lines,
    outerStart,
    outerEnd,
    delimiter,
    visualizationLabel,
    complexityLabel,
    traces,
  };
}

function verifyTraceBaseline(parsed, frozenTraces, path) {
  assert.equal(
    parsed.traces.length,
    frozenTraces.length,
    `${path}: StepTrace count changed`,
  );
  parsed.traces.forEach((trace, order) => {
    const frozen = frozenTraces[order];
    assert.equal(
      frozen.order,
      order,
      `${path}: frozen StepTrace order is not contiguous`,
    );
    assert.equal(
      trace.variantId,
      frozen.variantId,
      `${path}: StepTrace variant ${order} changed`,
    );
    assert.equal(
      sha256(trace.payload),
      frozen.payloadSha256,
      `${path}: StepTrace payload ${order} changed`,
    );
  });
}

function regionLines(region) {
  assert.ok(
    region.sourceText.endsWith("\n"),
    `${region.regionId}: sourceText lost final newline`,
  );
  return region.sourceText.slice(0, -1).split("\n");
}

function extractBlocks(lines, start, end) {
  const ranges = [];
  let blockStart = null;
  for (let index = start; index <= end; index += 1) {
    if (lines[index] === "") {
      if (blockStart !== null) ranges.push([blockStart, index - 1]);
      blockStart = null;
    } else if (blockStart === null) {
      blockStart = index;
    }
  }
  if (blockStart !== null) ranges.push([blockStart, end]);
  return ranges;
}

function owningTraceOrder(region, parsed) {
  if (region.destination) {
    const match = region.destination.anchor.match(/^after-steptrace:(\d+):/);
    if (match) return Number(match[1]);
  }
  const sourceEnd = region.sourceEndLine - 1;
  const order = parsed.traces.findIndex((trace, index) => {
    const previousCloser =
      index === 0 ? parsed.visualizationLabel : parsed.traces[index - 1].closer;
    return (
      sourceEnd < trace.opener && region.sourceStartLine - 1 > previousCloser
    );
  });
  assert.ok(order >= 0, `${region.regionId}: cannot identify owning StepTrace`);
  return order;
}

function transformVisualization(parsed, regions, path) {
  const lines = [...parsed.lines];
  const byTrace = new Map(parsed.traces.map((trace) => [trace.order, []]));

  for (const region of regions) {
    const start = region.sourceStartLine - 1;
    const end = region.sourceEndLine - 1;
    assert.equal(
      `${parsed.lines.slice(start, end + 1).join("\n")}\n`,
      region.sourceText,
      `${region.regionId}: frozen source no longer matches ${path}`,
    );
    assert.equal(
      sha256(region.sourceText),
      region.sourceSha256,
      `${region.regionId}: source hash mismatch`,
    );
    byTrace.get(owningTraceOrder(region, parsed)).push(region);
  }

  for (const trace of [...parsed.traces].reverse()) {
    const owned = byTrace
      .get(trace.order)
      .sort((left, right) => left.sourceStartLine - right.sourceStartLine);
    const moved = owned.filter((region) => region.disposition === "moved");
    if (moved.length > 0) {
      const insertion = [""];
      moved.forEach((region, index) => {
        if (index > 0) insertion.push("");
        insertion.push(...regionLines(region));
      });
      if (parsed.lines[trace.closer + 1] !== "") insertion.push("");
      lines.splice(trace.closer + 1, 0, ...insertion);
    }
    for (const region of [...owned]
      .filter((item) => item.disposition !== "unchanged")
      .sort((left, right) => right.sourceStartLine - left.sourceStartLine)) {
      lines.splice(
        region.sourceStartLine - 1,
        region.sourceEndLine - region.sourceStartLine + 1,
      );
    }
  }

  return lines.join("\n");
}

function wrapUntabbedMultipleTraces(text, regions, path) {
  const parsed = parseNote(text, path);
  if (parsed.traces.length < 2) return text;
  if (
    parsed.lines
      .slice(parsed.visualizationLabel + 1, parsed.complexityLabel)
      .some((line) => line.startsWith("tab: "))
  ) {
    return text;
  }

  const labels = parsed.traces.map((trace) => {
    const heading = regions.find(
      (region) =>
        region.disposition !== "deleted" &&
        owningTraceOrder(region, parsed) === trace.order &&
        /^#{1,6} /.test(region.sourceText),
    );
    assert.ok(
      heading,
      `${path}: untabbed StepTrace ${trace.order} has no heading for a tab label`,
    );
    return heading.sourceText.trim().replace(/^#{1,6} /, "");
  });
  const lines = [...parsed.lines];
  const innerDelimiter = "~".repeat(parsed.delimiter.length - 1);
  lines.splice(parsed.complexityLabel, 0, innerDelimiter, "");
  for (const trace of [...parsed.traces].reverse()) {
    const label = [`tab: ${labels[trace.order]}`, ""];
    if (trace.order === 0) label.unshift(`${innerDelimiter}tabsdown`);
    lines.splice(trace.opener, 0, ...label);
  }
  return lines.join("\n");
}

function repairMultiVariantPrefix(text, path) {
  const parsed = parseNote(text, path);
  const innerOpener = parsed.lines.findIndex(
    (line, index) =>
      index > parsed.visualizationLabel &&
      index < parsed.complexityLabel &&
      /^~{3,}tabsdown$/.test(line),
  );
  if (innerOpener < 0) return { output: text, regions: [] };

  let prefixStart = parsed.visualizationLabel + 1;
  while (parsed.lines[prefixStart] === "") prefixStart += 1;
  let prefixEnd = innerOpener - 1;
  while (parsed.lines[prefixEnd] === "") prefixEnd -= 1;
  if (prefixStart > prefixEnd) return { output: text, regions: [] };

  const delimiter = parsed.lines[innerOpener].match(/^(~{3,})tabsdown$/)[1];
  const innerCloser = parsed.lines.findIndex(
    (line, index) =>
      index > innerOpener &&
      index < parsed.complexityLabel &&
      line === delimiter,
  );
  assert.ok(
    innerCloser > innerOpener,
    `${path}: missing first inner Tabsdown closer`,
  );
  const owningTrace = parsed.traces
    .filter((trace) => trace.opener > innerOpener && trace.closer < innerCloser)
    .at(-1);
  assert.ok(owningTrace, `${path}: first inner Tabsdown has no StepTrace`);

  const addedRegions = extractBlocks(parsed.lines, prefixStart, prefixEnd).map(
    ([start, end], index) => {
      const sourceText = `${parsed.lines.slice(start, end + 1).join("\n")}\n`;
      const sourceSha256 = sha256(sourceText);
      return {
        regionId: `${slug(path.slice("Vault/Home/Computer Science/".length, -3))}-outer-prefix-${index + 1}`,
        path,
        sourceStartLine: start + 1,
        sourceEndLine: end + 1,
        sourceText,
        sourceSha256,
        disposition: "moved",
        destination: {
          anchor: `after-steptrace:${owningTrace.order}:provisional`,
          expectedText: sourceText,
          expectedSha256: sourceSha256,
        },
      };
    },
  );

  const lines = [...parsed.lines];
  const prefix = parsed.lines.slice(prefixStart, prefixEnd + 1);
  const insertion = ["", ...prefix];
  if (parsed.lines[innerCloser + 1] !== "") insertion.push("");
  lines.splice(innerCloser + 1, 0, ...insertion);
  lines.splice(prefixStart, prefixEnd - prefixStart + 1);
  return { output: lines.join("\n"), regions: addedRegions };
}

function extractFormerComplexity(body, path) {
  const kept = [];
  let inComplexityFence = false;
  for (const line of body) {
    if (!inComplexityFence && line === "```complexity") {
      inComplexityFence = true;
      continue;
    }
    if (inComplexityFence) {
      if (line === "```") inComplexityFence = false;
      continue;
    }
    if (line === "Complexity visualization pending") continue;
    kept.push(line);
  }
  assert.equal(
    inComplexityFence,
    false,
    `${path}: unclosed legacy complexity fence`,
  );
  while (kept[0] === "") kept.shift();
  while (kept.at(-1) === "") kept.pop();
  return kept;
}

function transformComplexity(text, configRecord, path) {
  const parsed = parseNote(text, path);
  const former = extractFormerComplexity(
    parsed.lines.slice(parsed.complexityLabel + 1, parsed.outerEnd),
    path,
  );
  const planned =
    configRecord.resolution.kind === "primary-source-addition"
      ? configRecord.resolution.plannedSection.split("\n")
      : [];
  if (planned.length > 0) {
    assert.ok(
      configRecord.resolution.plannedSection.length > 0,
      `${path}: empty planned complexity section`,
    );
    if (former.length === 0) former.push(...planned);
  }

  const suffix = parsed.lines.slice(parsed.outerEnd + 1);
  while (suffix[0] === "") suffix.shift();
  const output = [
    ...parsed.lines.slice(0, parsed.complexityLabel + 1),
    "",
    "```complexity",
    ...JSON.stringify(configRecord.config, null, 2).split("\n"),
    "```",
    parsed.delimiter,
  ];
  if (former.length > 0) output.push("", ...former);
  if (suffix.length > 0) output.push("", ...suffix);
  while (output.at(-1) === "") output.pop();
  return `${output.join("\n")}\n`;
}

function syncComplexityConfig(text, configRecord, path) {
  const parsed = parseNote(text, path);
  return `${[
    ...parsed.lines.slice(0, parsed.complexityLabel + 1),
    "",
    "```complexity",
    ...JSON.stringify(configRecord.config, null, 2).split("\n"),
    "```",
    ...parsed.lines.slice(parsed.outerEnd),
  ]
    .join("\n")
    .replace(/\n+$/, "")}\n`;
}

function nonstructuralBeforeTrace(parsed, trace) {
  let boundary =
    trace.order === 0
      ? parsed.visualizationLabel
      : parsed.traces[trace.order - 1].closer;
  for (let index = trace.opener - 1; index > boundary; index -= 1) {
    if (parsed.lines[index].startsWith("tab: ")) {
      boundary = index;
      break;
    }
  }
  return parsed.lines
    .slice(boundary + 1, trace.opener)
    .filter((line) => line !== "" && !/^~{3,}(?:tabsdown)?\s*$/.test(line));
}

function verifyFinalNote(text, configRecord, frozenTraces, path) {
  const parsed = parseNote(text, path);
  verifyTraceBaseline(parsed, frozenTraces, path);
  for (const trace of parsed.traces) {
    assert.deepEqual(
      nonstructuralBeforeTrace(parsed, trace),
      [],
      `${path}: text remains before StepTrace ${trace.order}`,
    );
  }
  const firstRendered = parsed.lines
    .slice(parsed.visualizationLabel + 1, parsed.complexityLabel)
    .find((line) => line !== "");
  const hasInnerTabs = parsed.lines
    .slice(parsed.visualizationLabel + 1, parsed.complexityLabel)
    .some((line) => /^~{3,}tabsdown$/.test(line));
  if (hasInnerTabs) {
    assert.match(
      firstRendered,
      /^~{3,}tabsdown$/,
      `${path}: inner Tabsdown is not first`,
    );
  }
  const complexityBody = parsed.lines.slice(
    parsed.complexityLabel + 1,
    parsed.outerEnd,
  );
  while (complexityBody[0] === "") complexityBody.shift();
  while (complexityBody.at(-1) === "") complexityBody.pop();
  assert.equal(
    complexityBody[0],
    "```complexity",
    `${path}: Complexity does not begin with chart`,
  );
  assert.equal(
    complexityBody.at(-1),
    "```",
    `${path}: Complexity does not end with chart`,
  );
  assert.equal(
    `${complexityBody.slice(1, -1).join("\n")}\n`,
    `${JSON.stringify(configRecord.config, null, 2)}\n`,
    `${path}: Complexity config differs from manifest`,
  );
  assert.ok(
    !text.includes("Complexity visualization pending"),
    `${path}: placeholder remains`,
  );
  return parsed;
}

function locateDestinations(text, parsed, regions) {
  for (const region of regions.filter(
    (item) => item.disposition !== "deleted",
  )) {
    const order = owningTraceOrder(region, parsed);
    const trace = parsed.traces[order];
    const expected = regionLines(region);
    const nextTrace = parsed.traces[order + 1];
    const searchEnd = nextTrace ? nextTrace.opener : parsed.complexityLabel;
    let start = -1;
    for (
      let index = trace.closer + 1;
      index + expected.length <= searchEnd;
      index += 1
    ) {
      if (
        expected.every((line, offset) => parsed.lines[index + offset] === line)
      ) {
        start = index;
        break;
      }
    }
    assert.ok(
      start > trace.closer,
      `${region.regionId}: moved text not found after owning StepTrace`,
    );
    const startLine = start + 1;
    const endLine = start + expected.length;
    region.destination = {
      anchor: `after-steptrace:${order}:lines:${startLine}-${endLine}`,
      expectedText: region.sourceText,
      expectedSha256: region.sourceSha256,
    };
  }
}

function preserveAlreadyPostTraceRegions(contentManifest) {
  const regionsByPath = Map.groupBy(
    contentManifest.regions,
    (region) => region.path,
  );
  for (const [path, regions] of regionsByPath) {
    const parsed = parseNote(readFileSync(join(repoRoot, path), "utf8"), path);
    for (const trace of parsed.traces.slice(1)) {
      const previous = parsed.traces[trace.order - 1];
      const between = parsed.lines.slice(previous.closer + 1, trace.opener);
      if (between.some((line) => line.startsWith("tab: "))) continue;

      const owned = regions
        .filter((region) => owningTraceOrder(region, parsed) === trace.order)
        .sort((left, right) => left.sourceStartLine - right.sourceStartLine);
      const headingIndex = owned.findIndex((region) =>
        /^#{1,6} /.test(region.sourceText),
      );
      assert.ok(
        headingIndex >= 0,
        `${path}: ambiguous untabbed text between StepTrace ${trace.order - 1} and ${trace.order}`,
      );
      for (const region of owned.slice(0, headingIndex)) {
        region.disposition = "unchanged";
        region.destination = {
          anchor: `after-steptrace:${trace.order - 1}:provisional`,
          expectedText: region.sourceText,
          expectedSha256: region.sourceSha256,
        };
      }
    }
  }
}

function verifyDestinations(text, parsed, regions) {
  for (const region of regions) {
    if (region.disposition === "deleted") {
      assert.ok(
        !text.includes(region.sourceText.trimEnd()),
        `${region.regionId}: deleted text remains`,
      );
      continue;
    }
    const match = region.destination.anchor.match(
      /^after-steptrace:(\d+):lines:(\d+)-(\d+)$/,
    );
    assert.ok(match, `${region.regionId}: invalid final destination anchor`);
    const [, orderText, startText, endText] = match;
    const order = Number(orderText);
    const start = Number(startText);
    const end = Number(endText);
    assert.ok(
      parsed.traces[order].closer + 1 < start,
      `${region.regionId}: destination precedes trace close`,
    );
    assert.equal(
      `${parsed.lines.slice(start - 1, end).join("\n")}\n`,
      region.destination.expectedText,
      `${region.regionId}: destination text mismatch`,
    );
    assert.equal(
      sha256(region.destination.expectedText),
      region.destination.expectedSha256,
    );
  }
}

const configManifest = readJson(configManifestPath);
const contentManifest = readJson(contentManifestPath);
if (mode === "--apply") preserveAlreadyPostTraceRegions(contentManifest);
const configs = new Map(configManifest.notes.map((note) => [note.path, note]));
const tracesByPath = Map.groupBy(
  contentManifest.steptraces,
  (trace) => trace.path,
);
const regionsByPath = Map.groupBy(
  contentManifest.regions,
  (region) => region.path,
);

assert.equal(configs.size, 87, "config manifest must contain 87 notes");
assert.equal(
  tracesByPath.size,
  87,
  "content manifest must contain 87 note paths",
);

if (mode === "--apply") {
  execFileSync(
    process.execPath,
    [
      join(repoRoot, ".scripts/validate-dsa-tabsdown-manifests.mjs"),
      "--phase",
      "config-final",
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );
  execFileSync(
    process.execPath,
    [
      join(repoRoot, ".scripts/build-dsa-tabsdown-content-manifest.mjs"),
      "--check",
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );

  const outputs = new Map();
  for (const [path, configRecord] of configs) {
    const absolutePath = join(repoRoot, path);
    const original = normalize(readFileSync(absolutePath, "utf8"));
    assert.ok(
      original.endsWith("\n"),
      `${path}: missing final newline before migration`,
    );
    const baseline = parseNote(original, path);
    verifyTraceBaseline(baseline, tracesByPath.get(path), path);
    const movedVisualization = transformVisualization(
      baseline,
      regionsByPath.get(path) ?? [],
      path,
    );
    const visualFirst = wrapUntabbedMultipleTraces(
      movedVisualization,
      regionsByPath.get(path) ?? [],
      path,
    );
    const output = transformComplexity(visualFirst, configRecord, path);
    const finalParsed = verifyFinalNote(
      output,
      configRecord,
      tracesByPath.get(path),
      path,
    );
    locateDestinations(output, finalParsed, regionsByPath.get(path) ?? []);
    verifyDestinations(output, finalParsed, regionsByPath.get(path) ?? []);
    outputs.set(absolutePath, output);
  }

  for (const [path, output] of outputs) writeFileSync(path, output);
  writeFileSync(
    contentManifestPath,
    `${JSON.stringify(contentManifest, null, 2)}\n`,
  );
}

if (mode === "--repair-prefixes") {
  const outputs = new Map();
  const additions = [];
  for (const [path] of configs) {
    const absolutePath = join(repoRoot, path);
    const original = normalize(readFileSync(absolutePath, "utf8"));
    const repaired = repairMultiVariantPrefix(original, path);
    if (repaired.regions.length === 0) continue;
    outputs.set(absolutePath, repaired.output);
    additions.push(...repaired.regions);
  }
  assert.ok(additions.length > 0, "no multi-variant prefixes require repair");
  const existingIds = new Set(
    contentManifest.regions.map((region) => region.regionId),
  );
  for (const region of additions) {
    assert.ok(
      !existingIds.has(region.regionId),
      `duplicate repair region ${region.regionId}`,
    );
    contentManifest.regions.push(region);
    if (!regionsByPath.has(region.path)) regionsByPath.set(region.path, []);
    regionsByPath.get(region.path).push(region);
  }
  for (const [absolutePath, output] of outputs) {
    const path = [...configs.keys()].find(
      (candidate) => join(repoRoot, candidate) === absolutePath,
    );
    const parsed = verifyFinalNote(
      output,
      configs.get(path),
      tracesByPath.get(path),
      path,
    );
    locateDestinations(output, parsed, regionsByPath.get(path) ?? []);
  }
  const inventory = contentManifest.regions.map(
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
  contentManifest.snapshot.regionInventorySha256 = sha256(
    JSON.stringify(inventory),
  );
  for (const [path, output] of outputs) writeFileSync(path, output);
  writeFileSync(
    contentManifestPath,
    `${JSON.stringify(contentManifest, null, 2)}\n`,
  );
}

if (mode === "--sync-configs") {
  const outputs = new Map();
  for (const [path, configRecord] of configs) {
    const absolutePath = join(repoRoot, path);
    const output = syncComplexityConfig(
      normalize(readFileSync(absolutePath, "utf8")),
      configRecord,
      path,
    );
    verifyFinalNote(output, configRecord, tracesByPath.get(path), path);
    outputs.set(absolutePath, output);
  }
  for (const [path, output] of outputs) writeFileSync(path, output);
}

let moved = 0;
let unchanged = 0;
let deleted = 0;
for (const [path, configRecord] of configs) {
  const text = normalize(readFileSync(join(repoRoot, path), "utf8"));
  const parsed = verifyFinalNote(
    text,
    configRecord,
    tracesByPath.get(path),
    path,
  );
  const regions = regionsByPath.get(path) ?? [];
  verifyDestinations(text, parsed, regions);
  moved += regions.filter((region) => region.disposition === "moved").length;
  unchanged += regions.filter(
    (region) => region.disposition === "unchanged",
  ).length;
  deleted += regions.filter(
    (region) => region.disposition === "deleted",
  ).length;
}

process.stdout.write(
  `${JSON.stringify({ mode, notes: configs.size, steptraces: contentManifest.steptraces.length, regions: contentManifest.regions.length, moved, unchanged, deleted, status: "clean" }, null, 2)}\n`,
);

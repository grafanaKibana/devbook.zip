#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const configPath = ".omx/context/dsa-complexity-config-manifest-v2.json";
const contentPath = ".omx/context/dsa-tabsdown-content-manifest-v2.json";
const allowedCurves = new Set([
  "constant",
  "log-n",
  "linear",
  "n-log-n",
  "quadratic",
  "exponential",
  "factorial",
]);
const prototypes = [
  "Vault/Home/Computer Science/Algorithms/Graph Algorithms/A-Star Search.md",
  "Vault/Home/Computer Science/Algorithms/Graph Algorithms/Maximum Flow.md",
  "Vault/Home/Computer Science/Algorithms/Paradigms/Memoization.md",
  "Vault/Home/Computer Science/Algorithms/Search Algorithms/Interpolation Search.md",
  "Vault/Home/Computer Science/Algorithms/Sorting Algorithms/Quick Sort.md",
  "Vault/Home/Computer Science/Algorithms/Sorting Algorithms/Shell Sort.md",
  "Vault/Home/Computer Science/Data Structures/Hash-based Structures/HashMap.md",
];

const phaseIndex = process.argv.indexOf("--phase");
const phase = phaseIndex >= 0 ? process.argv[phaseIndex + 1] : null;
assert.ok(
  ["prototype", "config-final", "final"].includes(phase),
  "usage: --phase prototype|config-final|final",
);

const exactKeys = (object, expected, at) => {
  assert.deepEqual(
    Object.keys(object).sort(),
    [...expected].sort(),
    `${at}: unexpected or missing keys`,
  );
};
const nonempty = (value, at) =>
  assert.equal(
    typeof value === "string" && value.length > 0,
    true,
    `${at}: expected non-empty string`,
  );
const identifier = (value, at) =>
  assert.match(value, /^[A-Za-z][A-Za-z0-9_]*$/, `${at}: invalid identifier`);
const sha256 = (value) =>
  createHash("sha256").update(value.replaceAll("\r\n", "\n")).digest("hex");

async function markdownFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const file = path.join(root, entry.name);
        if (entry.isDirectory()) return markdownFiles(file);
        return entry.isFile() && entry.name.endsWith(".md") ? [file] : [];
      }),
    )
  ).flat();
}

function boundMath(formula) {
  const parts = [];
  for (const match of formula.matchAll(/(?:O|Θ|Ω)\s*\(/g)) {
    let depth = 1;
    let end = match.index + match[0].length;
    while (end < formula.length && depth > 0) {
      if (formula[end] === "(") depth += 1;
      if (formula[end] === ")") depth -= 1;
      end += 1;
    }
    parts.push(formula.slice(match.index, end));
  }
  return parts.length > 0 ? parts.join(" ") : formula;
}

function expectedVariableIds(formula) {
  const math = boundMath(formula);
  return [
    ["outDegree", /outdeg\s*\(/],
    ["alphabetSize", /Σ/],
    ["inverseAckermann", /α\s*\(/],
    ["vertexCount", /\bV\b/],
    ["edgeCount", /\bE\b/],
    ["flowValue", /\bF\b/],
    ["branchingFactor", /\bb\b|log_b/],
    ["parameterD", /\bd\b/],
    ["parameterH", /\bh\b/],
    ["universeSize", /\bU\b/],
    ["capacity", /\bC\b|RC/],
    ["secondarySize", /\bm\b|log_m/],
    ["keyRange", /\bk\b/],
    ["wordSize", /\bw\b/],
    ["lengthL", /\bL\b/],
    ["sizeS", /\bS\b|\|S\|/],
    ["patternSize", /\bP\b|\|P\|/],
    ["targetSize", /\bW\b|WD/],
    ["optionCount", /\bD\b|WD/],
    ["parameterHUpper", /\bH\b/],
    ["valueLength", /\\?\|x\\?\|/],
    ["totalPatternLength", /\bM\b/],
    ["matchCount", /\bz\b/],
    ["alphabetSigma", /σ/],
    ["rowCount", /\bR\b|RC/],
    ["blockSize", /\bB\b/],
    ["fanout", /\bf\b(?!\s*\()|log_f/],
    ["expansionIndex", /\bi\b/],
    ["lowerBound", /\blo\b/],
    ["upperBound", /\bhi\b/],
    ["tolerance", /\beps\b/],
    ["rangeWidth", /\brange\b/],
    ["branchCount", /log_b\s+a|\ba\s*[·*]/],
    ["epsilon", /ε/],
    ["recurrenceWork", /\bf\s*\(\s*n\s*\)/],
    ["storedNodes", /nodes stored/i],
    ["costFactor", /\bc\b/],
    ["configuredCapacity", /\bcapacity\b/],
    ["loadFactor", /α(?!\s*\()/],
    ["inputSize", /\bn\b|√n|n²|n!/],
  ]
    .filter(([, pattern]) => pattern.test(math))
    .map(([id]) => id);
}

function exactCurve(formula) {
  const compact = formula.replaceAll("`", "").replace(/\s+/g, " ");
  if ((compact.match(/(?:O|Θ|Ω)\s*\(/g) ?? []).length !== 1) return null;
  const marker = "(?:O|Θ|Ω)";
  const symbol =
    "(?:n|m|k|V|E|d|h|w|L|S|M|R|C|W|D|B|f|i|z|capacity|\\|x\\||\\|S\\||outdeg\\(u\\))";
  if (new RegExp(`^${marker}\\s*\\(\\s*1\\s*\\)`).test(compact))
    return "constant";
  if (
    new RegExp(
      `^${marker}\\s*\\(\\s*log(?:_[0-9]+)?\\s*${symbol}\\s*\\)`,
      "i",
    ).test(compact)
  )
    return "log-n";
  if (
    new RegExp(
      `^${marker}\\s*\\(\\s*(${symbol})\\s+log(?:_[0-9]+)?\\s*\\1\\s*\\)`,
      "i",
    ).test(compact)
  )
    return "n-log-n";
  if (
    new RegExp(`^${marker}\\s*\\(\\s*${symbol}(?:²|\\^2)\\s*\\)`, "i").test(
      compact,
    )
  )
    return "quadratic";
  if (new RegExp(`^${marker}\\s*\\(\\s*2(?:\\^n|ⁿ)\\s*\\)`, "i").test(compact))
    return "exponential";
  if (new RegExp(`^${marker}\\s*\\(\\s*n!\\s*\\)`, "i").test(compact))
    return "factorial";
  if (new RegExp(`^${marker}\\s*\\(\\s*${symbol}\\s*\\)`, "i").test(compact))
    return "linear";
  return null;
}

function validateBound(bound, at) {
  if (bound.kind === "curve") {
    exactKeys(bound, ["kind", "role", "formula", "curveId"], at);
    assert.ok(
      allowedCurves.has(bound.curveId),
      `${at}: unknown curveId ${bound.curveId}`,
    );
  } else {
    assert.equal(bound.kind, "text", `${at}: invalid bound kind`);
    exactKeys(bound, ["kind", "role", "formula"], at);
  }
  nonempty(bound.role, `${at}.role`);
  nonempty(bound.formula, `${at}.formula`);
}

function validateConfig(config, at) {
  exactKeys(config, ["version", "label", "variables", "resources"], at);
  assert.equal(config.version, 2, `${at}.version`);
  nonempty(config.label, `${at}.label`);
  assert.ok(Object.keys(config.variables).length > 0, `${at}.variables: empty`);
  for (const [id, metadata] of Object.entries(config.variables)) {
    identifier(id, `${at}.variables.${id}`);
    exactKeys(metadata, ["symbol", "description"], `${at}.variables.${id}`);
    nonempty(metadata.symbol, `${at}.variables.${id}.symbol`);
    nonempty(metadata.description, `${at}.variables.${id}.description`);
  }
  exactKeys(config.resources, ["time", "space"], `${at}.resources`);
  for (const resource of ["time", "space"]) {
    const value = config.resources[resource];
    exactKeys(value, ["mode", "entries"], `${at}.resources.${resource}`);
    assert.ok(
      value.entries.length > 0,
      `${at}.resources.${resource}.entries: empty`,
    );
    if (value.mode === "cases") {
      assert.equal(
        value.entries.length,
        3,
        `${at}.resources.${resource}: cases require three entries`,
      );
      assert.deepEqual(
        value.entries.map((entry) => entry.role),
        ["Best", "Average", "Worst"],
        `${at}.resources.${resource}: case order/coverage`,
      );
      value.entries.forEach((entry, entryIndex) => {
        const entryAt = `${at}.resources.${resource}.entries[${entryIndex}]`;
        exactKeys(entry, ["kind", "role", "formula", "curveId"], entryAt);
        assert.equal(entry.kind, "case", `${entryAt}.kind`);
        nonempty(entry.formula, `${entryAt}.formula`);
        assert.ok(allowedCurves.has(entry.curveId), `${entryAt}.curveId`);
      });
      continue;
    }
    assert.equal(value.mode, "operations", `${at}.resources.${resource}.mode`);
    const operations = new Set();
    for (const [entryIndex, entry] of value.entries.entries()) {
      const entryAt = `${at}.resources.${resource}.entries[${entryIndex}]`;
      exactKeys(entry, ["kind", "operation", "bounds"], entryAt);
      assert.equal(entry.kind, "operation", `${entryAt}.kind`);
      nonempty(entry.operation, `${entryAt}.operation`);
      assert.ok(
        !operations.has(entry.operation),
        `${entryAt}: duplicate operation ${entry.operation}`,
      );
      operations.add(entry.operation);
      assert.ok(entry.bounds.length > 0, `${entryAt}.bounds: empty`);
      const roles = new Set();
      entry.bounds.forEach((bound, boundIndex) => {
        validateBound(bound, `${entryAt}.bounds[${boundIndex}]`);
        assert.ok(
          !roles.has(bound.role),
          `${entryAt}: duplicate role ${bound.role}`,
        );
        roles.add(bound.role);
      });
    }
  }
}

function targetKey(target) {
  return [
    target.kind,
    target.operation,
    target.role,
    target.formula,
    target.curveId ?? "",
  ].join("\0");
}

function configTargets(config, resource) {
  const value = config.resources[resource];
  if (value.mode === "cases")
    return new Map(value.entries.map((entry) => [targetKey(entry), 0]));
  return new Map(
    value.entries.flatMap((entry) =>
      entry.bounds.map((bound) => [
        targetKey({ ...bound, operation: entry.operation }),
        0,
      ]),
    ),
  );
}

function validateNote(note, at) {
  exactKeys(
    note,
    ["path", "status", "sourceBounds", "resolution", "config"],
    at,
  );
  assert.match(
    note.path,
    /^Vault\/Home\/Computer Science\/(Algorithms|Data Structures)\/.+\.md$/,
    `${at}.path`,
  );
  assert.equal(note.status, "ready", `${at}.status`);
  assert.ok(note.sourceBounds.length > 0, `${at}.sourceBounds: empty`);
  exactKeys(
    note.resolution,
    ["kind", "evidence", "plannedSection"],
    `${at}.resolution`,
  );
  assert.ok(
    [
      "existing-note",
      "primary-source-addition",
      "reviewed-semantic-only",
    ].includes(note.resolution.kind),
    `${at}.resolution.kind`,
  );
  assert.ok(
    note.resolution.evidence.length > 0,
    `${at}.resolution.evidence: empty`,
  );
  note.resolution.evidence.forEach((evidence, index) =>
    nonempty(evidence, `${at}.resolution.evidence[${index}]`),
  );
  validateConfig(note.config, `${at}.config`);

  const targetCounts = {
    time: configTargets(note.config, "time"),
    space: configTargets(note.config, "space"),
  };
  const rowIds = { time: new Set(), space: new Set() };
  const sourceLocations = new Set();
  for (const [boundIndex, sourceBound] of note.sourceBounds.entries()) {
    const boundAt = `${at}.sourceBounds[${boundIndex}]`;
    exactKeys(
      sourceBound,
      [
        "rowId",
        "resource",
        "source",
        "variableIds",
        "classification",
        "target",
        "assumption",
      ],
      boundAt,
    );
    assert.match(
      sourceBound.rowId,
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `${boundAt}.rowId`,
    );
    assert.ok(
      ["time", "space"].includes(sourceBound.resource),
      `${boundAt}.resource`,
    );
    assert.ok(
      !rowIds[sourceBound.resource].has(sourceBound.rowId),
      `${boundAt}: duplicate rowId ${sourceBound.rowId}`,
    );
    rowIds[sourceBound.resource].add(sourceBound.rowId);
    assert.ok(
      ["canonical", "normalized-representative", "semantic-only"].includes(
        sourceBound.classification,
      ),
      `${boundAt}.classification`,
    );
    assert.notEqual(
      sourceBound.classification,
      "normalized-representative",
      `${boundAt}: normalized projections require visible note-specific justification and are not generated`,
    );
    assert.equal(
      /^(?:Cache|Recursion stack|Auxiliary storage) \d+$/.test(
        sourceBound.target?.operation ?? "",
      ),
      false,
      `${boundAt}: generic numbered operation label`,
    );
    if (sourceBound.assumption !== null) {
      assert.notEqual(
        sourceBound.assumption,
        "The chart preserves the exact formula label and uses the closest audited growth curve only as normalized geometry.",
        `${boundAt}: generic hidden assumption`,
      );
      assert.ok(
        note.resolution.plannedSection?.includes("n distinct subproblems"),
        `${boundAt}: assumption lacks visible planned-section support`,
      );
    }
    assert.notEqual(sourceBound.target, null, `${boundAt}.target`);
    exactKeys(
      sourceBound.source,
      sourceBound.source.kind === "existing-note"
        ? ["kind", "line", "column", "formula"]
        : ["kind", "reference", "locator", "formula"],
      `${boundAt}.source`,
    );
    assert.ok(
      ["existing-note", "primary-source"].includes(sourceBound.source.kind),
      `${boundAt}.source.kind`,
    );
    if (sourceBound.source.kind === "existing-note") {
      assert.ok(
        Number.isInteger(sourceBound.source.line) &&
          sourceBound.source.line > 0,
        `${boundAt}.source.line`,
      );
      nonempty(sourceBound.source.column, `${boundAt}.source.column`);
      const location = `${sourceBound.source.line}\0${sourceBound.source.column}\0${sourceBound.source.formula}`;
      if (sourceBound.source.column !== "prose") {
        assert.ok(
          !sourceLocations.has(location),
          `${boundAt}: source table bound represented more than once`,
        );
        sourceLocations.add(location);
      }
    } else {
      nonempty(sourceBound.source.reference, `${boundAt}.source.reference`);
      nonempty(sourceBound.source.locator, `${boundAt}.source.locator`);
    }
    nonempty(sourceBound.source.formula, `${boundAt}.source.formula`);
    assert.deepEqual(
      sourceBound.variableIds,
      [...new Set(sourceBound.variableIds)],
      `${boundAt}.variableIds: duplicate`,
    );
    assert.deepEqual(
      sourceBound.variableIds,
      expectedVariableIds(sourceBound.source.formula),
      `${boundAt}: incomplete or case-confused variable coverage`,
    );
    sourceBound.variableIds.forEach((id) => {
      identifier(id, `${boundAt}.variableIds`);
      assert.ok(
        Object.hasOwn(note.config.variables, id),
        `${boundAt}: undeclared variableId ${id}`,
      );
    });
    if (sourceBound.classification === "semantic-only")
      assert.equal(
        sourceBound.target.kind,
        "text",
        `${boundAt}: semantic-only requires text target`,
      );
    if (sourceBound.target.kind === "case") {
      exactKeys(
        sourceBound.target,
        ["kind", "role", "formula", "curveId"],
        `${boundAt}.target`,
      );
      assert.ok(
        ["Best", "Average", "Worst"].includes(sourceBound.target.role),
        `${boundAt}.target.role`,
      );
      assert.ok(
        allowedCurves.has(sourceBound.target.curveId),
        `${boundAt}.target.curveId`,
      );
      assert.equal(
        sourceBound.target.curveId,
        exactCurve(sourceBound.target.formula),
        `${boundAt}: plotted case is not an exact supported shape`,
      );
    } else if (sourceBound.target.kind === "curve") {
      exactKeys(
        sourceBound.target,
        ["kind", "operation", "role", "formula", "curveId"],
        `${boundAt}.target`,
      );
      assert.ok(
        allowedCurves.has(sourceBound.target.curveId),
        `${boundAt}.target.curveId`,
      );
      assert.equal(
        sourceBound.target.curveId,
        exactCurve(sourceBound.target.formula),
        `${boundAt}: plotted curve is not an exact supported shape`,
      );
    } else {
      assert.equal(sourceBound.target.kind, "text", `${boundAt}.target.kind`);
      exactKeys(
        sourceBound.target,
        ["kind", "operation", "role", "formula"],
        `${boundAt}.target`,
      );
    }
    assert.equal(
      sourceBound.source.formula,
      sourceBound.target.formula,
      `${boundAt}: exact formula changed`,
    );
    const key = targetKey(sourceBound.target);
    assert.ok(
      targetCounts[sourceBound.resource].has(key),
      `${boundAt}: target missing from config`,
    );
    targetCounts[sourceBound.resource].set(
      key,
      targetCounts[sourceBound.resource].get(key) + 1,
    );
  }
  for (const resource of ["time", "space"]) {
    for (const [key, count] of targetCounts[resource])
      assert.equal(
        count,
        1,
        `${at}: config target has ${count} source mappings: ${key}`,
      );
  }
  if (note.resolution.kind === "primary-source-addition") {
    nonempty(note.resolution.plannedSection, `${at}.resolution.plannedSection`);
    assert.ok(
      note.sourceBounds.every(
        (bound) => bound.source.kind === "primary-source",
      ),
      `${at}: primary-source addition contains unanchored note evidence`,
    );
  }
}

function validateConfigManifest(manifest) {
  exactKeys(manifest, ["schemaVersion", "scope", "notes"], "manifest");
  assert.equal(manifest.schemaVersion, 1, "manifest.schemaVersion");
  assert.deepEqual(
    manifest.scope,
    { root: "Vault/Home/Computer Science", expectedNotes: 87 },
    "manifest.scope",
  );
  assert.equal(manifest.notes.length, 87, "manifest.notes length");
  const paths = new Set();
  manifest.notes.forEach((note, index) => {
    validateNote(note, `manifest.notes[${index}]`);
    assert.ok(
      !paths.has(note.path),
      `manifest.notes[${index}]: duplicate path ${note.path}`,
    );
    paths.add(note.path);
  });
  if (phase === "prototype")
    prototypes.forEach((prototype) =>
      assert.ok(paths.has(prototype), `missing prototype ${prototype}`),
    );
  assert.equal(
    manifest.notes.filter((note) => note.status === "ready").length,
    87,
    "ready count",
  );
  assert.equal(
    manifest.notes
      .flatMap((note) => note.sourceBounds)
      .filter((bound) => bound.classification === "unresolved").length,
    0,
    "unresolved count",
  );
  assert.equal(
    manifest.notes
      .flatMap((note) => note.sourceBounds)
      .filter((bound) => bound.classification === "normalized-representative")
      .length,
    0,
    "normalized-representative count",
  );
  const memo = manifest.notes.find((note) =>
    note.path.endsWith("/Memoization.md"),
  );
  assert.equal(
    memo.resolution.kind,
    "primary-source-addition",
    "Memoization source resolution",
  );
  assert.ok(
    memo.resolution.evidence.some(
      (item) => item.includes("ocw.mit.edu") && /Lecture 19/i.test(item),
    ),
    "Memoization requires anchored MIT OCW evidence",
  );
}

function validateContentManifest(manifest) {
  exactKeys(
    manifest,
    ["schemaVersion", "snapshot", "steptraces", "regions"],
    "contentManifest",
  );
  assert.equal(manifest.schemaVersion, 1, "contentManifest.schemaVersion");
  exactKeys(
    manifest.snapshot,
    [
      "capturedAt",
      "gitHead",
      "worktreeStatusSha256",
      "regionExtractorVersion",
      "regionInventorySha256",
    ],
    "contentManifest.snapshot",
  );
  assert.match(
    manifest.snapshot.gitHead,
    /^[0-9a-f]{40}$/,
    "contentManifest.snapshot.gitHead",
  );
  assert.match(
    manifest.snapshot.worktreeStatusSha256,
    /^[0-9a-f]{64}$/,
    "contentManifest.snapshot.worktreeStatusSha256",
  );
  assert.equal(
    manifest.snapshot.regionExtractorVersion,
    1,
    "contentManifest.snapshot.regionExtractorVersion",
  );
  assert.match(
    manifest.snapshot.regionInventorySha256,
    /^[0-9a-f]{64}$/,
    "contentManifest.snapshot.regionInventorySha256",
  );
  assert.equal(
    manifest.steptraces.length,
    105,
    "contentManifest.steptraces length",
  );
  const steptraceIds = new Set();
  const orders = new Map();
  manifest.steptraces.forEach((trace, index) => {
    const at = `contentManifest.steptraces[${index}]`;
    exactKeys(trace, ["path", "variantId", "order", "payloadSha256"], at);
    nonempty(trace.path, `${at}.path`);
    nonempty(trace.variantId, `${at}.variantId`);
    assert.ok(Number.isInteger(trace.order) && trace.order >= 0, `${at}.order`);
    assert.match(trace.payloadSha256, /^[0-9a-f]{64}$/, `${at}.payloadSha256`);
    const key = `${trace.path}\0${trace.variantId}\0${trace.order}`;
    assert.ok(!steptraceIds.has(key), `duplicate steptrace tuple ${key}`);
    steptraceIds.add(key);
    const noteOrders = orders.get(trace.path) ?? [];
    noteOrders.push(trace.order);
    orders.set(trace.path, noteOrders);
  });
  for (const [path, noteOrders] of orders)
    assert.deepEqual(
      noteOrders.sort((a, b) => a - b),
      noteOrders.map((_, index) => index),
      `${path}: non-contiguous StepTrace order`,
    );
  const regionIds = new Set();
  const destinationAnchors = new Map();
  manifest.regions.forEach((region, index) => {
    const at = `contentManifest.regions[${index}]`;
    nonempty(region.regionId, `${at}.regionId`);
    assert.ok(
      !regionIds.has(region.regionId),
      `${at}: duplicate id ${region.regionId}`,
    );
    regionIds.add(region.regionId);
    assert.ok(
      region.sourceStartLine <= region.sourceEndLine,
      `${at}: reversed source bounds`,
    );
    assert.equal(
      sha256(region.sourceText),
      region.sourceSha256,
      `${at}: source hash mismatch`,
    );
    if (region.disposition === "moved" || region.disposition === "unchanged") {
      exactKeys(
        region,
        [
          "regionId",
          "path",
          "sourceStartLine",
          "sourceEndLine",
          "sourceText",
          "sourceSha256",
          "disposition",
          "destination",
        ],
        at,
      );
      exactKeys(
        region.destination,
        ["anchor", "expectedText", "expectedSha256"],
        `${at}.destination`,
      );
      const key = `${region.path}\0${region.destination.anchor}`;
      assert.ok(
        !destinationAnchors.has(key),
        `${at}: duplicate destination anchor`,
      );
      destinationAnchors.set(key, region.regionId);
      assert.equal(
        sha256(region.destination.expectedText),
        region.destination.expectedSha256,
        `${at}: destination hash mismatch`,
      );
    } else {
      assert.equal(region.disposition, "deleted", `${at}: invalid disposition`);
      exactKeys(
        region,
        [
          "regionId",
          "path",
          "sourceStartLine",
          "sourceEndLine",
          "sourceText",
          "sourceSha256",
          "disposition",
          "deletion",
        ],
        at,
      );
      exactKeys(
        region.deletion,
        ["rationale", "reviewerReceipt"],
        `${at}.deletion`,
      );
      nonempty(region.deletion.rationale, `${at}.deletion.rationale`);
      if (phase === "final")
        nonempty(
          region.deletion.reviewerReceipt,
          `${at}.deletion.reviewerReceipt`,
        );
    }
  });
  const inventory = manifest.regions.map(
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
  assert.equal(
    sha256(JSON.stringify(inventory)),
    manifest.snapshot.regionInventorySha256,
    "contentManifest.snapshot.regionInventorySha256",
  );
  for (const sentence of [
    "Choose From and To in Options; Haversine distance guides a route across 25 regional centers.\n",
    "A locked fire door blocks the direct corridor, forcing a lower-corridor detour.\n",
  ]) {
    assert.equal(
      manifest.regions.filter(
        (region) =>
          region.disposition === "deleted" && region.sourceText === sentence,
      ).length,
      1,
      `named A-Star deletion: ${sentence.trim()}`,
    );
  }
}

async function validateLiveContent(manifest) {
  const liveTraces = [];
  const traceRanges = new Map();
  const noteLines = new Map();
  for (const notePath of [
    ...new Set(manifest.steptraces.map((trace) => trace.path)),
  ].sort((left, right) => left.localeCompare(right))) {
    const lines = (await readFile(notePath, "utf8"))
      .replaceAll("\r\n", "\n")
      .split("\n");
    noteLines.set(notePath, lines);
    const visualization = lines.findIndex(
      (line) => line === "tab: Visualization",
    );
    const complexity = lines.findIndex(
      (line, index) => index > visualization && line === "tab: Complexity",
    );
    assert.ok(
      visualization >= 0 && complexity > visualization,
      `${notePath}: missing ordered tabs`,
    );
    const openers = lines
      .map((line, index) =>
        index > visualization && index < complexity && line === "```steptrace"
          ? index
          : -1,
      )
      .filter((index) => index >= 0);
    for (const [order, opener] of openers.entries()) {
      const closer = lines.findIndex(
        (line, index) => index > opener && line === "```",
      );
      assert.ok(
        closer > opener && closer < complexity,
        `${notePath}:${opener + 1}: unclosed StepTrace`,
      );
      const payload = `${lines.slice(opener + 1, closer).join("\n")}\n`;
      const parsed = JSON.parse(payload);
      const variantId = String(parsed.variant ?? "default");
      liveTraces.push({
        path: notePath,
        variantId,
        order,
        payloadSha256: sha256(payload),
      });
      const nextOpener = openers[order + 1] ?? complexity;
      traceRanges.set(`${notePath}\0${order}`, {
        closer: closer + 1,
        nextOpener: nextOpener + 1,
      });
    }
  }
  assert.deepEqual(
    liveTraces,
    manifest.steptraces,
    "live StepTrace identities or payload hashes differ from frozen manifest",
  );
  for (const region of manifest.regions) {
    if (region.disposition === "deleted") {
      const live = (await readFile(region.path, "utf8")).replaceAll(
        "\r\n",
        "\n",
      );
      assert.equal(
        live.includes(region.sourceText.trimEnd()),
        false,
        `${region.regionId}: deleted source remains in live note`,
      );
      continue;
    }
    const match = /^after-steptrace:(\d+):lines:(\d+)-(\d+)$/.exec(
      region.destination.anchor,
    );
    assert.ok(
      match,
      `${region.regionId}: unsupported destination anchor ${region.destination.anchor}`,
    );
    const order = Number(match[1]);
    const startLine = Number(match[2]);
    const endLine = Number(match[3]);
    const range = traceRanges.get(`${region.path}\0${order}`);
    assert.notEqual(
      range,
      undefined,
      `${region.regionId}: destination StepTrace not found`,
    );
    assert.ok(
      startLine > range.closer && endLine < range.nextOpener,
      `${region.regionId}: destination is outside owning post-StepTrace interval`,
    );
    const actual = `${noteLines
      .get(region.path)
      .slice(startLine - 1, endLine)
      .join("\n")}\n`;
    assert.equal(
      actual,
      region.destination.expectedText,
      `${region.regionId}: destination text mismatch`,
    );
    assert.equal(
      sha256(actual),
      region.destination.expectedSha256,
      `${region.regionId}: destination live hash mismatch`,
    );
  }
}

const configManifest = JSON.parse(await readFile(configPath, "utf8"));
validateConfigManifest(configManifest);
const liveInventory = [];
for (const root of [
  "Vault/Home/Computer Science/Algorithms",
  "Vault/Home/Computer Science/Data Structures",
]) {
  for (const file of await markdownFiles(root))
    if ((await readFile(file, "utf8")).includes("tabsdown"))
      liveInventory.push(file);
}
const expectedLiveInventory = configManifest.notes.map((note) => note.path);
if (phase === "final")
  expectedLiveInventory.push(
    "Vault/Home/Computer Science/Data Structures/Trees/Quadtree.md",
  );
assert.deepEqual(
  expectedLiveInventory.sort(),
  liveInventory.sort(),
  `config manifest plus approved exceptions differ from the ${expectedLiveInventory.length} live Tabsdown notes`,
);
for (const note of configManifest.notes) {
  const live = (await readFile(note.path, "utf8")).replaceAll("\r\n", "\n");
  const fences = [...live.matchAll(/```complexity\n([\s\S]*?)\n```/g)];
  const migrated = fences.length === 1 && fences[0][1].includes('"version": 2');
  if (phase === "final" || migrated) {
    assert.equal(
      fences.length,
      1,
      `${note.path}: expected one complexity fence`,
    );
    assert.equal(
      fences[0][1],
      JSON.stringify(note.config, null, 2),
      `${note.path}: live complexity payload differs from approved config`,
    );
    continue;
  }
  const lines = live.split("\n");
  for (const bound of note.sourceBounds.filter(
    (item) => item.source.kind === "existing-note",
  )) {
    const sourceLine = lines[bound.source.line - 1];
    assert.notEqual(
      sourceLine,
      undefined,
      `${note.path}:${bound.source.line}: source line missing`,
    );
    assert.ok(
      sourceLine.replaceAll("`", "").includes(bound.source.formula),
      `${note.path}:${bound.source.line}: source formula drifted: ${bound.source.formula}`,
    );
    assert.equal(
      /cause|best fit|shape of the search|where the work|what sets|load factor|locality/i.test(
        bound.source.column,
      ),
      false,
      `${note.path}:${bound.source.line}: non-bound source column ${bound.source.column}`,
    );
    if (bound.resource === "time")
      assert.equal(
        /space|memory|storage|stored answers|stack|heap allocation/i.test(
          bound.source.column,
        ),
        false,
        `${note.path}:${bound.source.line}: space column mapped to time`,
      );
    if (
      bound.resource === "space" &&
      /time|nodes generated|page i\/os|node accesses|in-node work|output processing/i.test(
        bound.source.column,
      )
    ) {
      assert.match(
        sourceLine,
        /^\|\s*(?:Space|Auxiliary space|Structure space|Storage|Memory)\s*\|/i,
        `${note.path}:${bound.source.line}: time column mapped to space without a space row override`,
      );
    }
  }
}
if (phase === "final") {
  const contentManifest = JSON.parse(await readFile(contentPath, "utf8"));
  validateContentManifest(contentManifest);
  await validateLiveContent(contentManifest);
}

console.log(
  `${phase}: config manifest valid (${configManifest.notes.length} ready notes, 0 unresolved)`,
);

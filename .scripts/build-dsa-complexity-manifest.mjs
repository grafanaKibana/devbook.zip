#!/usr/bin/env node

import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const roots = [
  "Vault/Home/Computer Science/Algorithms",
  "Vault/Home/Computer Science/Data Structures",
];
const output = ".omx/context/dsa-complexity-config-manifest-v2.json";

const variableDefinitions = {
  inputSize: { symbol: "n", description: "number of input elements or states" },
  secondarySize: {
    symbol: "m",
    description: "secondary input, pattern, bucket, or sequence size",
  },
  vertexCount: { symbol: "V", description: "number of vertices" },
  edgeCount: { symbol: "E", description: "number of edges" },
  branchingFactor: {
    symbol: "b",
    description: "search branching factor or radix base",
  },
  parameterD: {
    symbol: "d",
    description: "algorithm-specific depth, digit count, or dimension",
  },
  parameterH: {
    symbol: "h",
    description: "tree height, hash count, or algorithm-specific height",
  },
  flowValue: { symbol: "F", description: "integral maximum-flow value" },
  alphabetSize: { symbol: "|Σ|", description: "alphabet cardinality" },
  outDegree: {
    symbol: "outdeg(u)",
    description: "outgoing degree of vertex u",
  },
  keyRange: {
    symbol: "k",
    description: "key range, digit count, or requested result count",
  },
  capacity: {
    symbol: "C",
    description: "capacity, configured bound, or output count",
  },
  universeSize: {
    symbol: "U",
    description: "size of the represented universe",
  },
  inverseAckermann: {
    symbol: "α(·)",
    description: "inverse Ackermann factor applied to its displayed argument",
  },
  wordSize: { symbol: "w", description: "machine-word width" },
  lengthL: {
    symbol: "L",
    description: "key, string, path, or sequence length",
  },
  sizeS: { symbol: "S", description: "string, state, or output size" },
  patternSize: { symbol: "P", description: "pattern size" },
  targetSize: {
    symbol: "W",
    description: "target amount or bounded problem size",
  },
  optionCount: {
    symbol: "D",
    description: "number of denominations, choices, or dimensions",
  },
  parameterHUpper: {
    symbol: "H",
    description: "maximum height or remaining suffix length",
  },
  valueLength: { symbol: "|x|", description: "encoded input-value length" },
  totalPatternLength: {
    symbol: "M",
    description: "total length of all patterns",
  },
  matchCount: { symbol: "z", description: "number of reported matches" },
  alphabetSigma: { symbol: "σ", description: "alphabet size" },
  rowCount: { symbol: "R", description: "number of rows" },
  blockSize: { symbol: "B", description: "block or page capacity" },
  fanout: { symbol: "f", description: "tree fanout" },
  expansionIndex: {
    symbol: "i",
    description: "exponential-search bound index",
  },
  lowerBound: { symbol: "lo", description: "inclusive lower search bound" },
  upperBound: { symbol: "hi", description: "inclusive upper search bound" },
  tolerance: { symbol: "eps", description: "continuous-search tolerance" },
  rangeWidth: { symbol: "range", description: "numeric candidate-range width" },
  branchCount: { symbol: "a", description: "number of recursive subproblems" },
  epsilon: {
    symbol: "ε",
    description: "positive asymptotic separation constant",
  },
  recurrenceWork: {
    symbol: "f(n)",
    description: "non-recursive work in the recurrence",
  },
  storedNodes: {
    symbol: "nodes stored",
    description: "number of frontier and explored nodes retained",
  },
  costFactor: {
    symbol: "c",
    description: "per-node work or recurrence regularity constant",
  },
  configuredCapacity: {
    symbol: "capacity",
    description: "configured backing-storage capacity",
  },
  loadFactor: { symbol: "α", description: "hash-table load factor" },
};

const variableDescriptionOverrides = {
  "B-tree": { secondarySize: "node order (maximum child-pointer fan-out)" },
  "Divide and Conquer": {
    branchingFactor: "recurrence subproblem-size divisor",
  },
  "Dynamic Programming": { capacity: "number of grid columns" },
  "Greedy Best-First Search": { secondarySize: "maximum search depth" },
};

function variableDefinition(title, id) {
  const description = variableDescriptionOverrides[title]?.[id];
  return description
    ? { ...variableDefinitions[id], description }
    : variableDefinitions[id];
}

if (process.argv.includes("--self-test")) {
  assert.equal(
    variableDefinition("Greedy Best-First Search", "secondarySize").description,
    "maximum search depth",
  );
  assert.equal(
    variableDefinition("B-tree", "secondarySize").description,
    "node order (maximum child-pointer fan-out)",
  );
  assert.equal(
    variableDefinition("Quick Sort", "inputSize"),
    variableDefinitions.inputSize,
  );
  console.log("PASS note-specific variable descriptions");
  process.exit(0);
}

const stripCode = (value) => value.trim().replaceAll("`", "");
const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "bound";
const hash = (value) =>
  createHash("sha256").update(value.replace(/\r\n/g, "\n")).digest("hex");

async function markdownFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(root, entry.name);
      if (entry.isDirectory()) return markdownFiles(full);
      return entry.isFile() && entry.name.endsWith(".md") ? [full] : [];
    }),
  );
  return nested.flat();
}

function splitRow(line) {
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cell = "";
  let escaped = false;
  for (const char of body) {
    if (char === "|" && !escaped) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
    escaped = char === "\\" && !escaped;
    if (char !== "\\") escaped = false;
  }
  cells.push(cell.trim());
  return cells;
}

function complexityLines(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const tab = lines.findIndex((line) => line.trim() === "tab: Complexity");
  if (tab < 0) throw new Error("missing tab: Complexity");
  let end = lines.length;
  for (let i = tab + 1; i < lines.length; i += 1) {
    if (/^~{4,}\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { lines, start: tab + 1, end, panel: lines.slice(tab + 1, end) };
}

function firstTable(text) {
  const { lines } = complexityLines(text);
  const start =
    lines.findIndex((line) => line.trim() === "tab: Complexity") + 1;
  for (let i = start; i < lines.length - 2; i += 1) {
    if (
      !/^\s*\|/.test(lines[i]) ||
      !/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[i + 1])
    )
      continue;
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) {
      rows.push({ line: j + 1, cells: splitRow(lines[j]) });
      j += 1;
    }
    return { headerLine: i + 1, headers: splitRow(lines[i]), rows };
  }
  return null;
}

function resourceKind(header) {
  const normalized = header.toLowerCase();
  if (
    /space|memory|storage|stored answers|stack|heap allocation/.test(normalized)
  )
    return "space";
  if (
    /time|nodes generated|page i\/os|node accesses|in-node work|output processing|array backing|linked backing|adjacency list|adjacency matrix|edge list|balanced|degenerate/.test(
      normalized,
    )
  )
    return "time";
  if (
    /^(best|average|typical|expected|amortized|worst|worst single op(?:eration)?|cost|bound|result|avg lookup|worst lookup)$/.test(
      normalized,
    )
  )
    return "time";
  return null;
}

function boundMath(formula) {
  const parts = [];
  const marker = /(?:O|Θ|Ω)\s*\(/g;
  for (const match of formula.matchAll(marker)) {
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

function variablesFor(formula) {
  const variables = [];
  const math = boundMath(formula);
  const checks = [
    ["outDegree", /outdeg\s*\(/i],
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
  ];
  for (const [id, pattern] of checks)
    if (pattern.test(math)) variables.push(id);
  return variables;
}

function representative(formula) {
  const compact = formula.replace(/`/g, "").replace(/\s+/g, " ");
  if ((compact.match(/(?:O|Θ|Ω)\s*\(/g) ?? []).length !== 1) return null;
  const marker = "(?:O|Θ|Ω)";
  const symbol =
    "(?:n|m|k|V|E|d|h|w|L|S|M|R|C|W|D|B|f|i|z|capacity|\\|x\\||\\|S\\||outdeg\\(u\\))";
  if (new RegExp(`^${marker}\\s*\\(\\s*1\\s*\\)`).test(compact))
    return { curveId: "constant", classification: "canonical" };
  if (
    new RegExp(
      `^${marker}\\s*\\(\\s*log(?:_[0-9]+)?\\s*${symbol}\\s*\\)`,
      "i",
    ).test(compact)
  )
    return { curveId: "log-n", classification: "canonical" };
  if (
    new RegExp(
      `^${marker}\\s*\\(\\s*(${symbol})\\s+log(?:_[0-9]+)?\\s*\\1\\s*\\)`,
      "i",
    ).test(compact)
  )
    return { curveId: "n-log-n", classification: "canonical" };
  if (
    new RegExp(`^${marker}\\s*\\(\\s*${symbol}(?:²|\\^2)\\s*\\)`, "i").test(
      compact,
    )
  )
    return { curveId: "quadratic", classification: "canonical" };
  if (new RegExp(`^${marker}\\s*\\(\\s*2(?:\\^n|ⁿ)\\s*\\)`, "i").test(compact))
    return { curveId: "exponential", classification: "canonical" };
  if (new RegExp(`^${marker}\\s*\\(\\s*n!\\s*\\)`, "i").test(compact))
    return { curveId: "factorial", classification: "canonical" };
  if (new RegExp(`^${marker}\\s*\\(\\s*${symbol}\\s*\\)`, "i").test(compact))
    return { curveId: "linear", classification: "canonical" };
  return null;
}

function makeBound({
  notePath,
  line,
  column,
  resource,
  operation,
  role,
  rawFormula,
  usedIds,
}) {
  const formula = stripCode(rawFormula);
  const variableIds = variablesFor(formula);
  variableIds.forEach((id) => usedIds.add(id));
  const shape = representative(formula);
  const target = shape
    ? { kind: "curve", operation, role, formula, curveId: shape.curveId }
    : { kind: "text", operation, role, formula };
  return {
    rowId: `${slug(operation)}-${slug(role)}-${resource}`,
    resource,
    source: { kind: "existing-note", line, column, formula },
    variableIds,
    classification: shape?.classification ?? "semantic-only",
    target,
    assumption: null,
  };
}

function addTarget(resources, bound) {
  let entry = resources[bound.resource].find(
    (candidate) => candidate.operation === bound.target.operation,
  );
  if (!entry) {
    entry = {
      kind: "operation",
      operation: bound.target.operation,
      bounds: [],
    };
    resources[bound.resource].push(entry);
  }
  const { operation: ignored, ...targetBound } = bound.target;
  entry.bounds.push(targetBound);
}

function addBound(sourceBounds, resources, bound) {
  sourceBounds.push(bound);
  addTarget(resources, bound);
}

function lineMatching(text, pattern) {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const index = lines.findIndex((line) => pattern.test(line));
  if (index < 0) throw new Error(`missing source prose matching ${pattern}`);
  return { line: index + 1, text: lines[index] };
}

function addStackSpace(notePath, text, usedIds, sourceBounds, resources) {
  const source = lineMatching(text, /^Structure space is /);
  for (const [operation, role, formula] of [
    ["Stored elements", "Persistent structure", "O(n)"],
    ["Ordinary operation", "Auxiliary", "O(1)"],
    ["Array resize", "Temporary spike", "O(n)"],
  ])
    addBound(
      sourceBounds,
      resources,
      makeBound({
        notePath,
        line: source.line,
        column: "prose",
        resource: "space",
        operation,
        role,
        rawFormula: formula,
        usedIds,
      }),
    );
}

function divideAndConquerRecord(notePath, title, text, table) {
  const usedIds = new Set();
  const sourceBounds = [];
  const resources = { time: [], space: [] };
  for (const row of table.rows) {
    const formula = row.cells[2];
    addBound(
      sourceBounds,
      resources,
      makeBound({
        notePath,
        line: row.line,
        column: "Result",
        resource: "time",
        operation: `Master theorem case ${stripCode(row.cells[0])}`,
        role: "Result",
        rawFormula: formula,
        usedIds,
      }),
    );
  }
  const stack = lineMatching(text, /Balanced recursion still uses/);
  for (const [operation, formula] of [
    ["Balanced recursion stack", "O(log n)"],
    ["Unbalanced recursion stack", "O(n)"],
    ["Merge combine buffer", "O(n)"],
  ])
    addBound(
      sourceBounds,
      resources,
      makeBound({
        notePath,
        line: stack.line,
        column: "prose",
        resource: "space",
        operation,
        role: "Bound",
        rawFormula: formula,
        usedIds,
      }),
    );
  return finishRecord(notePath, title, table, usedIds, sourceBounds, resources);
}

function resourceConfig(resource, entries, sourceBounds) {
  const roles = ["Best", "Average", "Worst"];
  const byOperation = new Map(entries.map((entry) => [entry.operation, entry]));
  const caseCompatible =
    entries.length === 3 &&
    roles.every((role) => {
      const entry = byOperation.get(role);
      return entry?.bounds.length === 1 && entry.bounds[0].kind === "curve";
    });
  if (!caseCompatible) return { mode: "operations", entries };

  const caseEntries = roles.map((role) => {
    const bound = byOperation.get(role).bounds[0];
    return {
      kind: "case",
      role,
      formula: bound.formula,
      curveId: bound.curveId,
    };
  });
  for (const sourceBound of sourceBounds.filter(
    (bound) => bound.resource === resource,
  )) {
    const matching = caseEntries.find(
      (entry) =>
        entry.role === sourceBound.target.operation &&
        entry.formula === sourceBound.target.formula,
    );
    if (matching) sourceBound.target = { ...matching };
  }
  return { mode: "cases", entries: caseEntries };
}

function finishRecord(
  notePath,
  title,
  table,
  usedIds,
  sourceBounds,
  resources,
) {
  if (resources.time.length === 0 || resources.space.length === 0)
    throw new Error(
      `${notePath}: missing resource (time=${resources.time.length}, space=${resources.space.length})`,
    );
  if (usedIds.size === 0) usedIds.add("inputSize");
  const variables = Object.fromEntries(
    [...usedIds].sort().map((id) => [id, variableDefinition(title, id)]),
  );
  return {
    path: notePath,
    status: "ready",
    sourceBounds,
    resolution: {
      kind: "existing-note",
      evidence: [
        `Complexity table at lines ${table.headerLine}-${table.rows.at(-1).line}; source hash ${hash(table.rows.map((row) => row.cells.join(" | ")).join("\n"))}`,
      ],
      plannedSection: null,
    },
    config: {
      version: 2,
      label: `${title} complexity`,
      variables,
      resources: {
        time: resourceConfig("time", resources.time, sourceBounds),
        space: resourceConfig("space", resources.space, sourceBounds),
      },
    },
  };
}

function tableRecord(notePath, title, text, table) {
  const usedIds = new Set();
  const sourceBounds = [];
  const resources = { time: [], space: [] };
  const headers = table.headers;
  const explicitKinds = headers.map(resourceKind);
  const hasLabelColumn = explicitKinds[0] === null;

  for (const row of table.rows) {
    const rowLabel = hasLabelColumn
      ? stripCode(row.cells[0])
      : title === "Top-K Elements"
        ? "Bounded min-heap selection"
        : `${title} primary bound`;
    const rowResource =
      /^(?:(?:auxiliary|structure|extra|persistent) )?(?:space|memory|storage)$/i.test(
        rowLabel,
      ) || /^stored answers$/i.test(rowLabel)
        ? "space"
        : /^(?:total )?time$/i.test(rowLabel)
          ? "time"
          : null;
    const columns = [];
    for (
      let columnIndex = hasLabelColumn ? 1 : 0;
      columnIndex < Math.min(headers.length, row.cells.length);
      columnIndex += 1
    ) {
      const rawFormula = row.cells[columnIndex];
      const header = stripCode(headers[columnIndex]);
      if (
        /cause|trade|explanation|why|notes?|requires|precondition|best fit|shape of the search|where the work|what sets|load factor|locality/.test(
          header.toLowerCase(),
        )
      )
        continue;
      let resource = rowResource ?? explicitKinds[columnIndex];
      if (!resource) continue;
      if (!rawFormula.trim() || /^[-—–]+$/.test(rawFormula.trim())) continue;
      columns.push({ columnIndex, header, resource, rawFormula });
    }
    for (const column of columns) {
      const operation =
        rowResource && columns.length > 1 ? column.header : rowLabel;
      let role = rowResource && columns.length > 1 ? rowLabel : column.header;
      if (
        rowLabel === "Storage" ||
        (title === "Circular Buffer" &&
          rowLabel === "Construct" &&
          column.resource === "space")
      )
        role = "Persistent structure";
      addBound(
        sourceBounds,
        resources,
        makeBound({
          notePath,
          line: row.line,
          column: column.header,
          resource: column.resource,
          operation,
          role,
          rawFormula: column.rawFormula,
          usedIds,
        }),
      );
    }
  }

  if (title === "Stack")
    addStackSpace(notePath, text, usedIds, sourceBounds, resources);
  if (title === "Dynamic Programming") {
    const source = lineMatching(text, /one row in `O\(C\)` space/);
    addBound(
      sourceBounds,
      resources,
      makeBound({
        notePath,
        line: source.line,
        column: "prose",
        resource: "space",
        operation: "Grid path row optimization",
        role: "Auxiliary",
        rawFormula: "O(C)",
        usedIds,
      }),
    );
  }
  return finishRecord(notePath, title, table, usedIds, sourceBounds, resources);
}

function memoizationRecord(notePath, title) {
  const reference =
    "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/resources/mit6_006f11_lec19/";
  const locator =
    "Lecture 19, Dynamic Programming I: memoized Fibonacci computes each of n subproblems once and stores their answers";
  const make = (resource, operation, role, formula, curveId) => ({
    rowId: `${slug(operation)}-${resource}`,
    resource,
    source: { kind: "primary-source", reference, locator, formula },
    variableIds: ["inputSize"],
    classification: "canonical",
    target: { kind: "curve", operation, role, formula, curveId },
    assumption:
      "n is the number of distinct Fibonacci subproblems reached by the memoized recurrence.",
  });
  const time = make(
    "time",
    "Distinct subproblems",
    "Upper bound",
    "O(n)",
    "linear",
  );
  const cache = make("space", "Cache", "Persistent", "O(n)", "linear");
  const stack = make(
    "space",
    "Recursion stack",
    "Worst-case auxiliary",
    "O(n)",
    "linear",
  );
  return {
    path: notePath,
    status: "ready",
    sourceBounds: [time, cache, stack],
    resolution: {
      kind: "primary-source-addition",
      evidence: [`${reference} — ${locator}`],
      plannedSection:
        "# Complexity\n\nFor memoized Fibonacci, n distinct subproblems are each computed once and retained in the cache: O(n) time and O(n) cache space. The recursive form also uses O(n) stack space in the chain-shaped worst case.",
    },
    config: {
      version: 2,
      label: `${title} complexity`,
      variables: { inputSize: variableDefinitions.inputSize },
      resources: {
        time: {
          mode: "operations",
          entries: [
            {
              kind: "operation",
              operation: time.target.operation,
              bounds: [
                {
                  kind: "curve",
                  role: time.target.role,
                  formula: time.target.formula,
                  curveId: time.target.curveId,
                },
              ],
            },
          ],
        },
        space: {
          mode: "operations",
          entries: [cache, stack].map((bound) => ({
            kind: "operation",
            operation: bound.target.operation,
            bounds: [
              {
                kind: "curve",
                role: bound.target.role,
                formula: bound.target.formula,
                curveId: bound.target.curveId,
              },
            ],
          })),
        },
      },
    },
  };
}

const files = (await Promise.all(roots.map(markdownFiles))).flat().sort();
const tabsdownFiles = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  if (text.includes("tabsdown")) tabsdownFiles.push({ file, text });
}
if (tabsdownFiles.length !== 87)
  throw new Error(`expected 87 Tabsdown notes, found ${tabsdownFiles.length}`);

const notes = tabsdownFiles.map(({ file, text }) => {
  const title = path.basename(file, ".md");
  if (title === "Memoization") return memoizationRecord(file, title);
  const table = firstTable(text);
  if (!table)
    throw new Error(`${file}: no complexity table after Complexity tab`);
  if (title === "Divide and Conquer")
    return divideAndConquerRecord(file, title, text, table);
  return tableRecord(file, title, text, table);
});

await writeFile(
  output,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      scope: { root: "Vault/Home/Computer Science", expectedNotes: 87 },
      notes,
    },
    null,
    2,
  )}\n`,
);

console.log(`wrote ${notes.length} ready records to ${output}`);

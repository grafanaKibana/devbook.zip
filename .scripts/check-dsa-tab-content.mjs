#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const dsaRoots = [
  join(repoRoot, "Vault/Home/Computer Science/Algorithms"),
  join(repoRoot, "Vault/Home/Computer Science/Data Structures"),
];

const normalize = (text) => text.replaceAll("\r\n", "\n");
const displayPath = (path) => relative(repoRoot, path).replaceAll("\\", "/");
const isHeading = (line) => /^(#{1,6})\s+/.exec(line);
const isFenceOpener = (line) => /^(`{3,}|~{3,})([^`]*)$/.exec(line);
const isAsymptotic = (line) => /(?:O|Θ|Ω)\s*\([^\n)]+\)/u.test(line);
const resourceWord = /\b(?:time|space|runtime|memory)\b/i;
const complexityQualifier =
  /\b(?:constant|logarithmic|linear|quadratic|exponential|factorial|best|average|worst)\b/i;
const storageClaim = /\b(?:in-place|extra storage|auxiliary storage)\b/i;

function firstRenderable(lines, start, end) {
  let inComment = false;
  for (let index = start; index < end; index += 1) {
    const trimmed = lines[index].trim();
    if (inComment) {
      if (trimmed.includes("-->")) inComment = false;
      continue;
    }
    if (!trimmed) continue;
    if (trimmed.startsWith("<!--")) {
      if (!trimmed.includes("-->")) inComment = true;
      continue;
    }
    return index;
  }
  return -1;
}

function fenceRanges(lines, start, end) {
  const ranges = [];
  for (let index = start; index < end; index += 1) {
    const opener = isFenceOpener(lines[index]);
    if (!opener) continue;
    const delimiter = opener[1];
    const closerPattern = new RegExp(`^${delimiter[0]}{${delimiter.length},}$`);
    let closer = index + 1;
    while (closer < end && !closerPattern.test(lines[closer].trim())) closer += 1;
    if (closer >= end) {
      ranges.push({ start: index, end, language: opener[2].trim(), unclosed: true });
      break;
    }
    ranges.push({
      start: index,
      end: closer + 1,
      language: opener[2].trim(),
      unclosed: false,
    });
    index = closer;
  }
  return ranges;
}

function headingsOutsideFences(lines, start, end) {
  const ranges = fenceRanges(lines, start, end);
  return lines
    .map((line, index) => ({ index, match: isHeading(line) }))
    .filter(
      ({ index, match }) =>
        match &&
        index >= start &&
        index < end &&
        !ranges.some((range) => index >= range.start && index < range.end),
    );
}

function tableStarts(lines, start, end) {
  const starts = [];
  for (let index = start; index + 1 < end; index += 1) {
    if (!/^\s*\|.*\|\s*$/.test(lines[index])) continue;
    if (
      /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[index + 1])
    ) {
      starts.push(index);
    }
  }
  return starts;
}

function findOuter(lines) {
  const groups = [];
  for (let start = 0; start < lines.length; start += 1) {
    const opener = /^((?:~{5,}|`{4,}))tabsdown\s*$/.exec(lines[start]);
    if (!opener) continue;
    const delimiter = opener[1];
    const end = lines.findIndex(
      (line, index) => index > start && line.trim() === delimiter,
    );
    if (end < 0) {
      groups.push({ start, end: lines.length, delimiter, unclosed: true });
      continue;
    }
    groups.push({ start, end, delimiter, unclosed: false });
    start = end;
  }
  return groups;
}

function findOuterLabels(lines, outer) {
  const labels = [];
  for (let index = outer.start + 1; index < outer.end; index += 1) {
    const nested = /^((?:~{3,4}|`{4,}))tabsdown\s*$/.exec(lines[index]);
    if (nested) {
      const nestedEnd = lines.findIndex(
        (line, candidate) =>
          candidate > index && line.trim() === nested[1],
      );
      if (nestedEnd < 0 || nestedEnd >= outer.end) break;
      index = nestedEnd;
      continue;
    }
    const label = /^tab:\s+(.+?)\s*$/.exec(lines[index]);
    if (label) labels.push({ index, name: label[1] });
  }
  return labels;
}

function addError(errors, path, line, message) {
  errors.push(`${path}:${line + 1}: ${message}`);
}

function validateUnit(lines, start, end, path, errors, allowStaticImage) {
  const first = firstRenderable(lines, start, end);
  if (first < 0) {
    addError(errors, path, start, "Visualization unit is empty");
    return;
  }
  const firstLine = lines[first].trim();
  const staticImage =
    allowStaticImage &&
    (/^!\[\[[^\]]+\]\]$/.test(firstLine) || /^!\[[^\]]*\]\([^)]+\)$/.test(firstLine));
  if (firstLine !== "```steptrace" && !staticImage) {
    addError(
      errors,
      path,
      first,
      "Visualization unit must begin with a StepTrace fence",
    );
  }

  const headings = headingsOutsideFences(lines, start, end);
  for (const heading of headings) {
    if (heading.match[1].length !== 4) {
      addError(
        errors,
        path,
        heading.index,
        "Visualization headings must use exactly level 4",
      );
    }
  }
  if (headings.length > 1) {
    addError(
      errors,
      path,
      headings[1].index,
      "Visualization unit may contain at most one heading",
    );
  }
}

function parseInner(lines, start, end, path, errors) {
  const first = firstRenderable(lines, start, end);
  if (first < 0) return null;
  const opener = /^((?:~{3,4}|`{4,}))tabsdown\s*$/.exec(lines[first]);
  if (!opener) return null;
  const innerEnd = lines.findIndex(
    (line, index) => index > first && index < end && line.trim() === opener[1],
  );
  if (innerEnd < 0) {
    addError(errors, path, first, "Nested Tabsdown block is not closed");
    return { start: first, end, variants: [], sharedStart: end };
  }
  const labels = [];
  for (let index = first + 1; index < innerEnd; index += 1) {
    const label = /^tab:\s+(.+?)\s*$/.exec(lines[index]);
    if (label) labels.push({ index, name: label[1] });
  }
  if (labels.length === 0) {
    addError(errors, path, first, "Nested Tabsdown block has no variants");
  }
  const variants = labels.map((label, index) => ({
    label,
    start: label.index + 1,
    end: index + 1 < labels.length ? labels[index + 1].index : innerEnd,
  }));
  return { start: first, end: innerEnd, variants, sharedStart: innerEnd + 1 };
}

function scanOutsideComplexity(lines, excludedStart, excludedEnd, path, errors) {
  const included = (index) => index < excludedStart || index >= excludedEnd;
  const ranges = fenceRanges(lines, 0, lines.length);
  const inFence = (index) =>
    ranges.some((range) => index >= range.start && index < range.end);
  let inQuestions = false;

  for (let index = 0; index < lines.length; index += 1) {
    if (inFence(index)) continue;
    if (/^# Questions\s*$/.test(lines[index])) inQuestions = true;
    else if (/^#\s+/.test(lines[index])) inQuestions = false;
    if (!included(index) || inQuestions) continue;
    const heading = isHeading(lines[index]);
    if (heading && /\bcomplexit(?:y|ies)\b/i.test(lines[index])) {
      addError(errors, path, index, "Complexity heading exists outside the Complexity tab");
    }
    if (isAsymptotic(lines[index])) {
      addError(errors, path, index, "Asymptotic complexity claim exists outside the Complexity tab");
    } else if (
      /\bamortized\b/i.test(lines[index]) ||
      storageClaim.test(lines[index]) ||
      (resourceWord.test(lines[index]) && complexityQualifier.test(lines[index]))
    ) {
      addError(errors, path, index, "Textual complexity candidate exists outside the Complexity tab");
    }
  }

  for (const start of tableStarts(lines, 0, lines.length)) {
    if (!included(start)) continue;
    let end = start + 2;
    while (end < lines.length && /^\s*\|.*\|\s*$/.test(lines[end])) end += 1;
    if (lines.slice(start, end).some(isAsymptotic)) {
      addError(errors, path, start, "Complexity table exists outside the Complexity tab");
    }
  }
}

function validateText(text, path, { requireTabs = true } = {}) {
  const lines = normalize(text).split("\n");
  const errors = [];
  const outers = findOuter(lines);
  if (outers.length === 0) {
    if (requireTabs) addError(errors, path, 0, "Expected one outer Tabsdown block");
    scanOutsideComplexity(lines, -1, -1, path, errors);
    return errors;
  }
  if (outers.length !== 1) {
    addError(errors, path, outers[1]?.start ?? outers[0].start, "Expected exactly one outer Tabsdown block");
    return errors;
  }

  const outer = outers[0];
  if (outer.unclosed) addError(errors, path, outer.start, "Outer Tabsdown block is not closed");
  const labels = findOuterLabels(lines, outer);
  const visualizationLabels = labels.filter(({ name }) => name === "Visualization");
  const complexityLabels = labels.filter(({ name }) => name === "Complexity");
  if (
    labels.length !== 2 ||
    visualizationLabels.length !== 1 ||
    complexityLabels.length !== 1 ||
    labels[0]?.name !== "Visualization" ||
    labels[1]?.name !== "Complexity"
  ) {
    addError(errors, path, outer.start, "Outer tabs must be exactly Visualization followed by Complexity");
    return errors;
  }

  const visualization = visualizationLabels[0];
  const complexity = complexityLabels[0];
  const inner = parseInner(
    lines,
    visualization.index + 1,
    complexity.index,
    path,
    errors,
  );
  const allowStaticImage = path.endsWith("/Quadtree.md") || path === "Quadtree.md";
  if (!inner) {
    validateUnit(
      lines,
      visualization.index + 1,
      complexity.index,
      path,
      errors,
      allowStaticImage,
    );
  } else {
    for (const variant of inner.variants) {
      validateUnit(lines, variant.start, variant.end, path, errors, false);
    }
    const innerHeadings = inner.variants.flatMap((variant) =>
      headingsOutsideFences(lines, variant.start, variant.end),
    );
    const sharedHeadings = headingsOutsideFences(
      lines,
      inner.sharedStart,
      complexity.index,
    );
    for (const heading of sharedHeadings) {
      if (heading.match[1].length !== 4) {
        addError(errors, path, heading.index, "Shared Visualization heading must use exactly level 4");
      }
    }
    if (sharedHeadings.length > 1) {
      addError(errors, path, sharedHeadings[1].index, "Shared Visualization content may contain at most one heading");
    }
    if (sharedHeadings.length > 0 && innerHeadings.length > 0) {
      addError(errors, path, sharedHeadings[0].index, "Shared and per-variant Visualization headings may not coexist");
    }
  }

  const complexityStart = complexity.index + 1;
  const firstComplexity = firstRenderable(lines, complexityStart, outer.end);
  const complexityFences = fenceRanges(lines, complexityStart, outer.end);
  if (firstComplexity < 0 || lines[firstComplexity].trim() !== "```complexity") {
    addError(errors, path, firstComplexity < 0 ? complexityStart : firstComplexity, "Complexity tab must begin with a complexity fence");
  }
  if (
    complexityFences.length !== 1 ||
    complexityFences[0]?.language !== "complexity"
  ) {
    addError(errors, path, complexityStart, "Complexity tab must contain exactly one complexity fence and no other fence");
  }
  for (const heading of headingsOutsideFences(lines, complexityStart, outer.end)) {
    addError(errors, path, heading.index, "Complexity tab may not contain headings");
  }
  for (const table of tableStarts(lines, complexityStart, outer.end)) {
    addError(errors, path, table, "Complexity tab may not contain Markdown tables");
  }

  scanOutsideComplexity(lines, complexity.index, outer.end + 1, path, errors);
  return [...new Set(errors)];
}

function markdownFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

function isFolderNote(text) {
  const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(normalize(text))?.[1] ?? "";
  return /(?:^|\n)tags:\s*(?:\[[^\]]*\bFolderNote\b[^\]]*\]|\n(?:\s+-.*\n)*\s+-\s*FolderNote\s*(?:\n|$))/m.test(frontmatter);
}

function fullInventory() {
  const all = dsaRoots.flatMap(markdownFiles).sort();
  const folderNotes = all.filter((path) => isFolderNote(readFileSync(path, "utf8")));
  const concepts = all.filter((path) => !folderNotes.includes(path));
  const errors = [];
  if (concepts.length !== 91) errors.push(`inventory: expected 91 concept notes, found ${concepts.length}`);
  if (folderNotes.length !== 14) errors.push(`inventory: expected 14 FolderNotes, found ${folderNotes.length}`);

  const tabsdownPaths = concepts.filter((path) => readFileSync(path, "utf8").includes("tabsdown"));
  const algorithmCount = tabsdownPaths.filter((path) => path.includes("/Algorithms/")).length;
  const dataStructureCount = tabsdownPaths.filter((path) => path.includes("/Data Structures/")).length;
  if (tabsdownPaths.length !== 88) {
    errors.push(`inventory: expected 88 Tabsdown notes, found ${tabsdownPaths.length}`);
  }
  if (algorithmCount !== 56 || dataStructureCount !== 32) {
    errors.push(`inventory: expected Tabsdown split 56 algorithms/32 data structures, found ${algorithmCount}/${dataStructureCount}`);
  }
  return { concepts, errors };
}

function runSelfTests() {
  const complexity = '```complexity\n{"version":2}\n```';
  const ordinary = (support = "") => `~~~~~tabsdown\ntab: Visualization\n\n\`\`\`steptrace\n{}\n\`\`\`\n${support}\ntab: Complexity\n\n${complexity}\n~~~~~\n`;
  const backtick = (support = "") => ordinary(support)
    .replace("~~~~~tabsdown", "````tabsdown")
    .replace("~~~~~\n", "````\n");
  const multi = (variantSupport = "", sharedSupport = "") => `~~~~~tabsdown\ntab: Visualization\n\n~~~~tabsdown\ntab: One\n\n\`\`\`steptrace\n{}\n\`\`\`\n${variantSupport}\ntab: Two\n\n\`\`\`steptrace\n{}\n\`\`\`\n~~~~\n${sharedSupport}\ntab: Complexity\n\n${complexity}\n~~~~~\n`;
  const pass = [
    ["ordinary-no-heading.md", ordinary()],
    ["backtick-outer.md", backtick()],
    ["ordinary-one-heading.md", ordinary("#### Invariant\n\nSupport.\n")],
    ["multi-shared.md", multi("", "#### Shared invariant\n\nSupport.\n")],
    ["multi-per-variant.md", multi("#### Variant invariant\n\nSupport.\n", "")],
    ["Quadtree.md", ordinary().replace("```steptrace\n{}\n```", "![[quadtree.png]]")],
    ["questions-recall.md", `${ordinary()}\n# Questions\n\nWhy is the operation O(log n) amortized?\n\n# References\n`],
  ];
  for (const [path, text] of pass) {
    const errors = validateText(text, path);
    if (errors.length) throw new Error(`${path} should pass:\n${errors.join("\n")}`);
  }

  const fail = [
    ["lead-heading.md", ordinary().replace("```steptrace", "#### Lead\n\n```steptrace"), "must begin with a StepTrace"],
    ["backtick-broken-tabs.md", backtick().replace("tab: Complexity", "tab: Broken"), "Outer tabs must be exactly"],
    ["wrong-heading.md", ordinary("### Wrong\n"), "exactly level 4"],
    ["two-headings.md", ordinary("#### One\n\n#### Two\n"), "at most one heading"],
    ["mixed-headings.md", multi("#### Variant\n", "#### Shared\n"), "may not coexist"],
    ["complexity-table.md", ordinary().replace(complexity, `${complexity}\n\n| A | B |\n| --- | --- |\n| 1 | 2 |`), "may not contain Markdown tables"],
    ["outside-heading.md", `${ordinary()}\n# Complexity analysis\n`, "heading exists outside"],
    ["outside-table.md", `${ordinary()}\n| Case | Time |\n| --- | --- |\n| Worst | O(n) |\n`, "Complexity table exists outside"],
    ["outside-bound.md", `${ordinary()}\nThe scan costs O(n).\n`, "Asymptotic complexity claim exists outside"],
    ["outside-text.md", `${ordinary()}\nAverage runtime is linear.\n`, "Textual complexity candidate exists outside"],
    ["outside-amortized.md", `${ordinary()}\nThe operation is amortized.\n`, "Textual complexity candidate exists outside"],
    ["outside-storage.md", `${ordinary()}\nIt is in-place and uses only extra storage for one flag.\n`, "Textual complexity candidate exists outside"],
    [
      "longer-fence-closer.md",
      "```text\nexample\n````\nRuntime is O(n).\n",
      "Asymptotic complexity claim exists outside",
    ],
    ["not-quadtree.md", ordinary().replace("```steptrace\n{}\n```", "![[image.png]]"), "must begin with a StepTrace"],
  ];
  for (const [path, text, expected] of fail) {
    const errors = validateText(text, path);
    if (!errors.some((error) => error.includes(expected))) {
      throw new Error(`${path} should report ${expected}:\n${errors.join("\n")}`);
    }
  }
  console.log(`PASS self-test (${pass.length} positive, ${fail.length} negative fixtures)`);
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--self-test") {
  runSelfTests();
  process.exit(0);
}
if (args.includes("--self-test") || args.some((arg) => arg.startsWith("--"))) {
  console.error("usage: node .scripts/check-dsa-tab-content.mjs [--self-test|<markdown paths...>]");
  process.exit(2);
}

let paths;
let inventoryErrors = [];
if (args.length === 0) {
  const inventory = fullInventory();
  paths = inventory.concepts;
  inventoryErrors = inventory.errors;
} else {
  paths = args.map((path) => resolve(repoRoot, path));
}

const errors = [...inventoryErrors];
for (const path of paths) {
  const text = readFileSync(path, "utf8");
  const requireTabs = findOuter(normalize(text).split("\n")).length > 0 || args.length > 0;
  errors.push(...validateText(text, displayPath(path), { requireTabs }));
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  console.error(`FAIL ${errors.length} violation(s) across ${paths.length} note(s)`);
  process.exit(1);
}

console.log(`PASS ${paths.length} note(s)`);

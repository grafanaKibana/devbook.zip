import { createHash } from "node:crypto"
import { globSync, readFileSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { buildSync } from "esbuild"

const here = dirname(fileURLToPath(import.meta.url))
export const repoRoot = join(here, "..", "..", "..")
export const evidenceRoot = join(repoRoot, ".omx", "evidence", "steptrace-design-system-refactor")

const supplements = {
  "merge-sort": { algorithm: "merge-sort", array: [38, 27, 43, 3, 9, 82, 10] },
  lcs: { algorithm: "lcs", a: "ABCBDAB", b: "BDCABA" },
  "coin-change-bottom-up": { algorithm: "coin-change-bottom-up" },
  "grid-path-bottom-up": { algorithm: "grid-path-bottom-up" },
}

export function catalogOwnership(definition) {
  const family = "family" in definition ? definition.family : null
  const familyId = typeof family === "string" ? family : family?.id
  const legacyRenderer = "legacyRenderer" in definition ? definition.legacyRenderer : null
  if (familyId) return `family:${familyId}`
  if (legacyRenderer) return `legacy:${legacyRenderer}`
  return undefined
}

export function runtimeOwnership(built) {
  if (built.family?.id) return `family:${built.family.id}`
  if (built.legacyRenderer) return `legacy:${built.legacyRenderer}`
  return undefined
}

const op = (controls, action, status, mutation = action === "Reset" ? "outcome" : "change") => ({
  required: true,
  controls,
  action,
  expected: { status, mutation },
})
const unsupported = (reason) => ({ required: false, reason })

export const interactiveOperations = {
  arrays: {
    valid: op(
      { "Array index": "0", "Value to write": "97" },
      "Write",
      "^Replaced array\\[0\\] value",
    ),
    invalid: op(
      { "Array index": "99", "Value to write": "1" },
      "Write",
      "^Enter an index from",
      "same",
    ),
    removal: unsupported("Fixed-size arrays replace values but do not remove slots."),
    reset: op({}, "Reset", "^Array reset"),
  },
  "avl-tree": treeOperations("AVL"),
  "binary-search-tree": treeOperations("Binary search tree"),
  "red-black-tree": treeOperations("Red-black tree"),
  "splay-tree": treeOperations("Splay tree"),
  "b-plus-tree": orderedTreeOperations("B+ tree", "B+ tree"),
  "b-tree": orderedTreeOperations("B-tree", "B-tree"),
  "binomial-queue": {
    valid: op({}, "Meld", "links into|carrying"),
    invalid: unsupported("The fixed binomial-queue demo exposes no invalid input boundary."),
    removal: unsupported("The demo teaches meld only and exposes no extract operation."),
    reset: op({}, "Reset", "^Reset to two forests"),
  },
  "bloom-filter": {
    valid: op({ "Bloom filter value": "proof" }, "Add", "^Added proof"),
    invalid: unsupported("Every bounded text value is a valid Bloom-filter input."),
    removal: unsupported("Bloom filters do not support deletion in this fixture."),
    reset: op({}, "Reset", "^Bloom filter reset"),
  },
  "circular-buffer": {
    valid: op({ "Value to write": "97" }, "Write", "^Wrote 97"),
    invalid: unsupported("Every bounded text value is valid circular-buffer data."),
    removal: op({}, "Read oldest", "^Read oldest value 97 from slot"),
    reset: op({}, "Reset", "^Circular buffer reset"),
  },
  deque: {
    valid: op({ "Value to push": "97" }, "Push back", "^Pushed 97 at the back"),
    invalid: unsupported("Every bounded text value is valid deque data."),
    removal: op({}, "Pop back", "^Popped 97 from the back"),
    reset: op({}, "Reset", "^Deque reset"),
  },
  "dynamic-array": {
    valid: op({ "Value to append": "97" }, "Append", "^Appended 97"),
    invalid: unsupported("Every bounded text value is valid dynamic-array data."),
    removal: op({}, "Remove last", "^Removed last value 97"),
    reset: op({}, "Reset", "^Dynamic array reset"),
  },
  "fenwick-tree": {
    valid: op(
      { "Point update index": "5", "Delta to add": "7" },
      "Add delta",
      "^Added 7 at value\\[5\\]",
    ),
    invalid: op(
      { "Point update index": "5", "Delta to add": "3.5" },
      "Add delta",
      "^Delta must be a finite integer",
      "same",
    ),
    removal: unsupported("Fenwick trees update values but expose no removal operation."),
    reset: op({}, "Reset", "^Reset source values"),
  },
  "fibonacci-heap": {
    valid: op({ "Value to insert": "97" }, "Insert", "^Inserted 97"),
    invalid: op(
      { "Current key": "999", "Decreased key": "1" },
      "Decrease key",
      "^Enter an existing current key",
      "same",
    ),
    removal: op({}, "Extract min", "^Extracted minimum"),
    reset: op({}, "Reset", "^Reset by replaying"),
  },
  graph: {
    valid: op({ "From vertex": "3", "To vertex": "0" }, "Add edge", "^Added 3 → 0"),
    invalid: op(
      { "From vertex": "0", "To vertex": "0" },
      "Add edge",
      "^Self-edges are not stored",
      "same",
    ),
    removal: op({ "From vertex": "3", "To vertex": "0" }, "Remove edge", "^Removed 3 → 0"),
    reset: op({}, "Reset", "^Graph reset"),
  },
  heap: {
    valid: op({ "Value to insert": "97" }, "Insert", "^Inserted 97"),
    invalid: op({ "Value to insert": "3.5" }, "Insert", "^Value must be a finite integer", "same"),
    removal: op({}, "Extract min", "^Extracted minimum"),
    reset: op({}, "Reset", "^Reset the heap"),
  },
  "hash-map": {
    valid: op({ "Hash map key": "97", "Hash map value": "proof" }, "Put", "^Put 97:proof"),
    invalid: op(
      { "Hash map key": "3.5", "Hash map value": "1" },
      "Put",
      "^Key must be a safe integer",
      "same",
    ),
    removal: op({ "Hash map key": "97" }, "Remove", "Removed key 97|Removed 97"),
    reset: op({}, "Reset", "table reset"),
  },
  "hash-set": {
    valid: op({ "Hash set key": "97" }, "Add", "^Added key 97"),
    invalid: op({ "Hash set key": "97" }, "Add", "already exists|already present", "same"),
    removal: op({ "Hash set key": "97" }, "Remove", "^Removed key 97"),
    reset: op({}, "Reset", "^Hash set reset"),
  },
  "leftist-heap": meldOperations("conditional child swaps"),
  "linked-list": {
    valid: op({ "Value to append": "97" }, "Append", "^Appended 97"),
    invalid: op({ "Value to append": "3.5" }, "Append", "finite integer", "same"),
    removal: op({}, "Remove tail", "^Removed tail 97"),
    reset: op({}, "Reset", "^Reset the linked list"),
  },
  "lru-cache": {
    valid: op({ "Cache key": "D", "Cache value": "40" }, "Put", "^Put D:40"),
    invalid: op({ "Cache key": "TOOLONG", "Cache value": "1" }, "Put", "^Key must be 1–4", "same"),
    removal: op({ "Cache key": "E", "Cache value": "50" }, "Put", "evicted LRU"),
    reset: op({}, "Reset", "^Reset the LRU cache"),
  },
  queue: {
    valid: op({ "Value to enqueue": "97" }, "Enqueue", "^Enqueued 97"),
    invalid: unsupported("Every bounded text value is valid queue data."),
    removal: op({}, "Dequeue", "^Dequeued 97"),
    reset: op({}, "Reset", "^Queue reset"),
  },
  "segment-tree": {
    valid: op({ "Point update index": "4", "New value": "7" }, "Set value", "^Set value\\[4\\]"),
    invalid: op(
      { "Point update index": "4", "New value": "3.5" },
      "Set value",
      "^Value must be a finite integer",
      "same",
    ),
    removal: unsupported("Segment trees assign source values but expose no removal operation."),
    reset: op({}, "Reset", "^Reset source values"),
  },
  "skew-heap": meldOperations("swapped children unconditionally"),
  span: {
    valid: op({ "Span start index": "0", "Span length": "2" }, "Slice", "^Created span view"),
    invalid: op(
      { "Span start index": "5", "Span length": "3" },
      "Slice",
      "^Choose a start and length",
      "same",
    ),
    removal: unsupported("Span views change range and values but do not remove backing cells."),
    reset: op({}, "Reset", "^Backing array and span view reset"),
  },
  stack: {
    valid: op({ "Value to push": "97" }, "Push", "^Pushed 97"),
    invalid: unsupported("Every bounded text value is valid stack data."),
    removal: op({}, "Pop", "^Popped 97"),
    reset: op({}, "Reset", "^Stack reset"),
  },
  "union-find": {
    valid: op(
      { "First element": "0", "Second element": "1" },
      "Union",
      "^Union\\(0, 1\\) linked root",
    ),
    invalid: op(
      { "First element": "0", "Second element": "0" },
      "Union",
      "already share root",
      "same",
    ),
    removal: unsupported("Disjoint-set union has no split/removal operation."),
    reset: op({}, "Reset", "^Reset to singleton sets"),
  },
}

function treeOperations(label) {
  return {
    valid: op({ [`${label} key`]: "97" }, "Insert", "^Inserted 97"),
    invalid: op({ [`${label} key`]: "97" }, "Insert", "already exists|already present", "same"),
    removal: op({ [`${label} key`]: "97" }, "Remove", "^Removed 97"),
    reset: op({}, "Reset", "^Reset to the initial"),
  }
}

function orderedTreeOperations(label, name) {
  return {
    valid: op({ [`${label} key`]: "97" }, "Insert", "^Inserted 97"),
    invalid: op({ [`${label} key`]: "97" }, "Insert", "already exists|already present", "same"),
    removal: unsupported(`${name} fixture exposes insert/search/range operations but no removal.`),
    reset: op({}, "Reset", "^Reset to the initial order"),
  }
}

function meldOperations(status) {
  return {
    valid: op({}, "Merge", status),
    invalid: unsupported("The fixed merge demonstration exposes no invalid input boundary."),
    removal: unsupported("The merge demonstration exposes no extract/remove operation."),
    reset: op({}, "Reset", "^Reset to the same two canonical min-heaps"),
  }
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

export function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (!value || typeof value !== "object") {
    return typeof value === "number" && !Number.isFinite(value) ? String(value) : value
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stable(value[key])]),
  )
}

export function stableJson(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`
}

function loadCatalogModule() {
  const result = buildSync({
    entryPoints: [join(here, "src", "algorithms", "index.ts")],
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
  })
  const module = { exports: {} }
  new Function("module", "exports", result.outputFiles[0].text)(module, module.exports)
  return module.exports
}

function vaultFixtures() {
  const byId = new Map()
  const occurrences = []
  for (const path of globSync(join(repoRoot, "Vault", "Home", "**", "*.md"))) {
    const source = readFileSync(path, "utf8")
    for (const match of source.matchAll(/```steptrace\s*\n([\s\S]*?)\n```/g)) {
      const config = JSON.parse(match[1])
      const sourcePath = relative(repoRoot, path).split(sep).join("/")
      const line = source.slice(0, match.index).split("\n").length
      const occurrence = { id: config.algorithm, source: `${sourcePath}:${line}`, config }
      occurrences.push(occurrence)
      if (!byId.has(config.algorithm)) byId.set(config.algorithm, occurrence)
    }
  }
  return { byId, occurrences }
}

function riskFlags(definition, config, interactive) {
  const text = JSON.stringify(config)
  const family = "family" in definition ? definition.family : null
  const familyId = typeof family === "string" ? family : family?.id
  return {
    longLabels: /"[^"\n]{24,}"/.test(text),
    multiDigitValues: /-?\d{2,}/.test(text),
    denseGeometry: /graph|tree|heap|dp|matrix|queens|trie|flow|component|path/.test(
      `${definition.id} ${familyId ?? ""}`,
    ),
    pointerEdgeOverlap: /graph|tree|heap|pointer|linked|trie|queue/.test(
      `${definition.id} ${familyId ?? ""}`,
    ),
    directManipulation: interactive,
    meaningfulMotion: !interactive || /array|linked|heap|tree|queue|stack/.test(definition.id),
    hostLifecycle: true,
  }
}

const cellEndpointRules = {
  "array-sort": [[".steptrace__stage", ".steptrace__bar", "x"]],
  "contiguous-storage": [[".steptrace__contiguous-array", ".steptrace__contiguous-cell", "x"]],
  "distribution-sort": [
    [".steptrace__distribution-bars", ".steptrace__bar", "x"],
    [".steptrace__distribution-bucket-board", ".steptrace__distribution-lane", "x"],
  ],
  "dp-story": [[".steptrace__amount-board", ".steptrace__amount-cell", "x"]],
  "graph-representation": [[".steptrace__contiguous-array", ".steptrace__contiguous-cell", "x"]],
  "hash-index": [[".steptrace__hash-buckets", ".steptrace__hash-cell", "x"]],
  "indexed-array-search": [[".steptrace__stage", ".steptrace__bar", "x"]],
  "indexed-pointer-window": [[".steptrace__pcells", ".steptrace__pcell", "x"]],
  "linked-topology": [[".steptrace__contiguous-array", ".steptrace__contiguous-cell", "x"]],
  "matrix-grid": [[".steptrace__dp tr", ":scope > th,:scope > td", "x"]],
  "prefix-sum": [[".steptrace__prefix-sum-strip", ".steptrace__pcell", "x"]],
  "range-aggregate": [
    [".steptrace__fenwick-values,.steptrace__segment-values", ".steptrace__contiguous-cell", "x"],
  ],
  "run-stack": [[".steptrace__stage", ".steptrace__bar", "x"]],
  "stack-sequence": [
    [".steptrace__stack-board", ".steptrace__stack-cell", "x"],
    [".steptrace__stack-sequence-stack", ".steptrace__stack-sequence-stack-cell", "y", "start"],
  ],
  "string-match": [[".steptrace__cells", ".steptrace__cell", "x"]],
  "legacy:backtrack-board": [[".steptrace__btboard", ".steptrace__btcell", "x"]],
  "legacy:bit-grid": [[".steptrace__bcells", ".steptrace__bcell", "x"]],
}

const renderedCarrierOwners = new Set([
  "family:array-sort",
  "family:binary-tree",
  "family:contiguous-storage",
  "family:distribution-sort",
  "family:dp-story",
  "family:execution-tree",
  "family:graph-representation",
  "family:graph-state",
  "family:hash-index",
  "family:heap-selection",
  "family:indexed-array-search",
  "family:indexed-pointer-window",
  "family:interval-track",
  "family:linked-topology",
  "family:matrix-grid",
  "family:monotone-boundary",
  "family:multiway-tree",
  "family:prefix-character",
  "family:prefix-sum",
  "family:range-aggregate",
  "family:run-stack",
  "family:stack-sequence",
  "family:string-match",
  "family:union-find",
  "legacy:backtrack-board",
  "legacy:bit-grid",
])

const roleCarrier = (roles) => ({
  selector: roles
    .flatMap((role) => [
      `[data-state='${role}']`,
      `[data-role='${role}']`,
      `[data-roles~='${role}']`,
    ])
    .join(","),
  cueKinds: ["text", "shape", "marker", "pseudo-content", "border", "text-decoration"],
})

function frameCarrierModel(ownership) {
  if (!renderedCarrierOwners.has(ownership))
    throw new Error(`missing rendered carrier model for ${ownership}`)
  const activeAlternatives = [
    roleCarrier(["active", "candidate", "accepted", "rejected", "goal"]),
    { selector: ".steptrace__phase-copy", cueKinds: ["text"] },
  ]
  if (ownership === "family:string-match")
    activeAlternatives.push({
      selector: ".steptrace__cells--pat",
      cueKinds: ["border"],
    })
  return [
    {
      state: "active",
      role: "active-state",
      alternatives: activeAlternatives,
    },
    {
      state: "terminal",
      role: "terminal-result",
      alternatives: [
        roleCarrier(["final", "accepted", "rejected", "goal"]),
        {
          selector: ".steptrace__insight-marker,.steptrace__insight-text",
          cueKinds: ["text", "marker", "shape"],
        },
        { selector: ".steptrace__phase-copy", cueKinds: ["text"] },
      ],
    },
  ]
}

function visualOracle(id, ownership, interactive) {
  const owner = ownership.replace(/^family:/, "")
  const nodeEdge = /graph|tree|heap|linked|prefix-character|union-find/.test(owner)
  const pointer = /pointer|linked|contiguous|stack|interval/.test(owner)
  const roleCues = interactive
    ? ["active", "terminal"].map((state) => ({
        descriptorId: id,
        state,
        role: "status",
        alternatives: [
          {
            selector: `:scope[data-structure='${id}'] [role='status']`,
            cueKinds: ["text"],
          },
        ],
      }))
    : frameCarrierModel(ownership).map((cue) => ({ descriptorId: id, ...cue }))
  return {
    scrollAxes: /matrix|dp|range|graph-representation/.test(owner) ? ["x"] : [],
    geometry: {
      nodeEdgeClearance: nodeEdge,
      arrowBounds: /graph|union-find/.test(owner),
      pointerClearance: pointer,
      cellEndpoints: (cellEndpointRules[owner] ?? []).map(
        ([containerSelector, cellSelector, axis, occupied = "both"]) => ({
          family: owner,
          containerSelector,
          cellSelector,
          axis,
          occupied,
        }),
      ),
      labelFit: true,
    },
    essentialGraphics: [],
    nonColorCues: roleCues,
  }
}

export function loadCatalogFixtures() {
  const { builtInAlgorithms, interactiveStructures } = loadCatalogModule()
  const { byId, occurrences } = vaultFixtures()
  const definitions = [...builtInAlgorithms, ...interactiveStructures]
  const knownIds = new Set(definitions.map(({ id }) => id))
  const duplicates = definitions
    .map(({ id }) => id)
    .filter((id, index, ids) => ids.indexOf(id) !== index)
  const unknownFenceIds = [...byId.keys()].filter((id) => !knownIds.has(id))
  const missing = definitions.map(({ id }) => id).filter((id) => !byId.has(id) && !supplements[id])
  if (duplicates.length || unknownFenceIds.length || missing.length) {
    throw new Error(
      `steptrace fixture mismatch: duplicates=${duplicates.join(",") || "none"}; unknown=${unknownFenceIds.join(",") || "none"}; missing=${missing.join(",") || "none"}`,
    )
  }
  const fixtures = definitions.map((definition) => {
    const interactive = interactiveStructures.includes(definition)
    const occurrence = byId.get(definition.id)
    const config = occurrence?.config ?? supplements[definition.id]
    const ownership = catalogOwnership(definition)
    if (!ownership) {
      throw new Error(
        `steptrace fixture ${definition.id} has invalid ownership ${ownership ?? "missing"}`,
      )
    }
    const operations = interactive ? interactiveOperations[definition.id] : undefined
    if (interactive && !operations)
      throw new Error(`missing interactive operations for ${definition.id}`)
    return {
      id: definition.id,
      kind: interactive ? "interactive" : definition.kind,
      descriptorType: interactive ? "interactive" : "frame",
      source:
        occurrence?.source ??
        `.omx/evidence/steptrace-design-system-refactor/fixtures-v2/supplemental/${definition.id}.json`,
      config,
      ownership,
      visualEvidenceKey: ownership,
      widths: { compact: 680, wide: 1100 },
      stateRecipe: interactive
        ? { initial: "mounted", active: "valid-operation", terminal: "reset-after-removal" }
        : { initial: 0, active: "first-semantic-or-midpoint", terminal: "last" },
      operations,
      oracle: visualOracle(definition.id, ownership, interactive),
      riskFlags: riskFlags(definition, config, interactive),
    }
  })
  return {
    fixtures,
    counts: {
      frame: builtInAlgorithms.length,
      interactive: interactiveStructures.length,
      total: fixtures.length,
      vaultFences: occurrences.length,
      uniqueVaultIds: byId.size,
      supplemental: Object.keys(supplements).length,
    },
    supplements,
  }
}

export function activeFrame(frames) {
  const roles = new Set([
    "active",
    "candidate",
    "frontier",
    "accepted",
    "visited",
    "current",
    "rejected",
    "invalid",
    "goal",
    "target",
    "final",
    "sorted",
    "success",
  ])
  function find(value) {
    if (typeof value === "string" && roles.has(value.toLowerCase())) return value.toLowerCase()
    if (Array.isArray(value)) {
      for (const child of value) {
        const role = find(child)
        if (role) return role
      }
    } else if (value && typeof value === "object") {
      for (const child of Object.values(value)) {
        const role = find(child)
        if (role) return role
      }
    }
    return null
  }
  for (let index = 1; index < frames.length; index++) {
    const role = find(frames[index])
    if (role) return { index, role }
  }
  return { index: Math.floor((frames.length - 1) / 2), role: "midpoint" }
}

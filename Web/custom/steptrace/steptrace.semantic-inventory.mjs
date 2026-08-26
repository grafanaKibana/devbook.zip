const source = (name) => `Web/custom/steptrace/src/${name}`
const familyOwners = (name, style = name) => [
  source(`families/${name}.ts`),
  source(`styles/${style}.scss`),
]

const roleTokens = {
  "active-current": "var(--_blue)",
  "candidate-frontier": "var(--_amber)",
  "accepted-visited": "var(--_green)",
  "final-success": "var(--_green)",
  "goal-target": "var(--_violet)",
  "rejected-invalid": "var(--_red)",
  "range-match": "semantic-owner-token",
  "neutral-context": "var(--_neutral)",
}

const carrier = (
  owner,
  primitive,
  signal,
  value,
  secondaryCue,
  classification = "compliant",
  notes = "",
  ambiguousTermRationale = "",
) => ({
  carrierKey: `${owner}::${primitive}::${signal}`,
  carrierKind: secondaryCue === "range underline" ? "semantic underline" : "token-bearing selector",
  role: {
    kind: value === "goal-target" || value === "range-match" ? "overlay" : "primary",
    value,
  },
  primaryToken: roleTokens[value],
  secondaryCue,
  cueOwner: primitive,
  compositionRule:
    "Primary process state remains visible; independent overlays keep their own cue.",
  ambiguousTermRationale,
  classification,
  visualEvidenceKey: `${owner}:${value}:${secondaryCue}`,
  notes,
})

const caseFor = (algorithm, detail = {}) => ({
  config: { algorithm },
  representativeStates: ["initial", "active", "final"],
  ...detail,
})

const cohort = (cohortName, catalogIds, executionPath, sourceOwners, carriers, evidenceCase) => ({
  cohort: cohortName,
  catalogIds,
  executionPath,
  sourceOwners,
  carriers,
  evidenceCase,
})

const render = source("render.ts")
const bars = source("styles/bars.scss")
const string = source("styles/string.scss")

export const visualContractInventory = {
  legendLabelForbiddenPattern: String.raw`(^|[\s/()–-])(?!(?:a|an|and|as|at|by|for|from|in|of|on|or|the|to|with)(?=$|[\s/()–-]))[a-z]`,
  legendCallers: [
    source("families/bucket-distribution.ts"),
    source("families/graph-state.ts"),
    source("families/heap-selection.ts"),
    source("families/interval-track.ts"),
    source("families/linked-topology.ts"),
    source("families/prefix-character.ts"),
    source("families/prefix-sum.ts"),
    source("families/stack-sequence.ts"),
    render,
  ],
  stylesheets: [
    "backtrack",
    "bars",
    "binary-tree",
    "bits",
    "boundary",
    "contiguous-storage",
    "distribution",
    "dp-story",
    "dp",
    "graph-node",
    "graph-representation",
    "graph-state",
    "graph",
    "hash-index",
    "heap-selection",
    "index",
    "interactive-structure",
    "interval-track",
    "linked-topology",
    "multiway-tree",
    "pointers",
    "prefix-character",
    "prefix-sum",
    "range-aggregate",
    "rectree",
    "run-stack",
    "shared",
    "stack-sequence",
    "status-toolbar",
    "string",
    "unionfind",
  ].map((name) => source(`styles/${name}.scss`)),
}

export const semanticInventory = [
  cohort(
    "array-sort",
    [
      "cocktail-shaker-sort",
      "gnome-sort",
      "bogo-sort",
      "pancake-sort",
      "cycle-sort",
      "odd-even-sort",
      "stooge-sort",
      "shell-sort",
      "comb-sort",
      "cyclic-sort",
      "introsort",
    ],
    "family:array-sort",
    [...familyOwners("array-sort", "bars"), render],
    [
      carrier(
        bars,
        '.steptrace__bar[data-state="sorted"] .steptrace__fill',
        "sorted",
        "final-success",
        "shared checkmark",
      ),
    ],
    caseFor("cocktail-shaker-sort", {
      config: { algorithm: "cocktail-shaker-sort", array: [4, 1, 3, 2] },
      frameIndices: [0, 2, -1],
    }),
  ),
  cohort(
    "distribution-sort",
    ["counting-sort", "radix-sort", "bucket-sort"],
    "family:distribution-sort",
    [
      ...familyOwners("distribution-sort", "distribution"),
      ...familyOwners("bucket-distribution", "distribution"),
    ],
    [
      carrier(
        source("styles/distribution.scss"),
        '.steptrace__distribution-bars--output .steptrace__bar[data-target="1"]',
        "target output",
        "accepted-visited",
        "outline",
      ),
    ],
    caseFor("counting-sort", {
      config: { algorithm: "counting-sort", array: [2, 1, 2, 0] },
      frameIndices: [0, 2, -1],
    }),
  ),
  cohort(
    "dp-story",
    [
      "coin-change-greedy",
      "coin-change-naive",
      "coin-change-memoization",
      "coin-change-tabulation",
      "grid-path-greedy",
      "grid-path-naive",
      "grid-path-memoization",
      "grid-path-tabulation",
    ],
    "family:dp-story",
    [source("families/dp-problems.ts"), source("styles/dp-story.scss"), render],
    [
      carrier(
        source("styles/dp-story.scss"),
        '.steptrace__coin[data-state="active"]',
        "active",
        "active-current",
        "outline",
      ),
    ],
    caseFor("coin-change-greedy", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "execution-tree",
    [
      "merge-sort-tree",
      "coin-change-top-down",
      "grid-path-top-down",
      "memoization",
      "divide-and-conquer",
      "branch-and-bound",
    ],
    "family:execution-tree",
    [...familyOwners("execution-tree", "rectree"), render],
    [
      carrier(
        source("styles/rectree.scss"),
        '.steptrace__rtnode[data-state="split"] .steptrace__rtcirc',
        "split",
        "active-current",
        "node state label",
      ),
    ],
    caseFor("memoization", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "graph-state",
    [
      "a-star",
      "articulation-points-and-bridges",
      "bellman-ford",
      "bidirectional-search",
      "boruvka",
      "connected-components",
      "greedy-best-first-search",
      "hamiltonian-cycle",
      "kruskal",
      "maximum-flow",
      "strongly-connected-components",
      "dijkstra",
    ],
    "family:graph-state",
    familyOwners("graph-state"),
    [
      carrier(
        source("styles/graph-state.scss"),
        '.steptrace__gs-node[data-state="current"] .steptrace__gs-node-circle',
        "current",
        "active-current",
        "stroke",
      ),
      carrier(
        source("styles/graph-state.scss"),
        ".steptrace__gs-target",
        "target",
        "goal-target",
        "dashed target ring",
      ),
    ],
    caseFor("dijkstra", { frameIndices: [0, 2, -1] }),
  ),
  cohort(
    "heap-selection",
    ["top-k-elements", "two-heaps"],
    "family:heap-selection",
    familyOwners("heap-selection"),
    [
      carrier(
        source("styles/heap-selection.scss"),
        '.steptrace__heap-node[data-state="current"] .steptrace__ncirc',
        "current",
        "active-current",
        "stroke",
      ),
    ],
    caseFor("top-k-elements", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "indexed-array-search",
    [
      "exponential-search",
      "fibonacci-search",
      "interpolation-search",
      "jump-search",
      "ternary-search",
    ],
    "family:indexed-array-search",
    [...familyOwners("indexed-array-search", "bars"), source("styles/boundary.scss"), render],
    [
      carrier(
        bars,
        '.steptrace__bar[data-state="compare"] .steptrace__fill',
        "compare",
        "active-current",
        "compare cue",
      ),
    ],
    caseFor("interpolation-search", {
      config: { algorithm: "interpolation-search", array: [1, 4, 7, 10], target: 7 },
      frameIndices: [0, 1, -1],
    }),
  ),
  cohort(
    "interval-track",
    ["activity-selection", "merge-intervals"],
    "family:interval-track",
    familyOwners("interval-track"),
    [
      carrier(
        source("styles/interval-track.scss"),
        '.steptrace__interval-band[data-state="accepted"]',
        "accepted",
        "accepted-visited",
        "persistent band position",
      ),
    ],
    caseFor("activity-selection", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "linked-topology",
    ["fast-and-slow-pointers"],
    "family:linked-topology",
    familyOwners("linked-topology"),
    [
      carrier(
        source("styles/linked-topology.scss"),
        '.steptrace__linked-node[data-state="current"]',
        "current",
        "active-current",
        "pointer label",
      ),
    ],
    caseFor("fast-and-slow-pointers", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "matrix-grid",
    ["coin-change-bottom-up", "grid-path-bottom-up", "floyd-warshall"],
    "family:matrix-grid",
    [...familyOwners("matrix-grid", "dp"), render],
    [
      carrier(
        source("styles/dp.scss"),
        '.steptrace__dp td[data-roles~="target"]',
        "target",
        "active-current",
        "target badge",
      ),
      carrier(
        source("styles/dp.scss"),
        '.steptrace__dp td[data-roles~="stored"]',
        "stored",
        "accepted-visited",
        "stored badge",
        "ambiguous",
        "",
        "Stored is durable computed progress, not terminal completion.",
      ),
    ],
    caseFor("floyd-warshall", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "monotone-boundary",
    ["binary-search-on-answer"],
    "family:monotone-boundary",
    [...familyOwners("monotone-boundary", "boundary"), render],
    [
      carrier(
        source("styles/boundary.scss"),
        '.steptrace__boundary-tick[data-current="true"]:not([data-state="answer"])::after',
        "current",
        "active-current",
        "outline",
      ),
    ],
    caseFor("binary-search-on-answer", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "prefix-character",
    ["trie", "aho-corasick", "ternary-search-tree"],
    "family:prefix-character",
    familyOwners("prefix-character"),
    [
      carrier(
        source("styles/prefix-character.scss"),
        '.steptrace__prefix-node[data-state="terminal"] circle',
        "terminal",
        "final-success",
        "shared checkmark",
      ),
    ],
    caseFor("trie", { frameIndices: [0, 2, -1] }),
  ),
  cohort(
    "prefix-sum",
    ["prefix-sum"],
    "family:prefix-sum",
    familyOwners("prefix-sum"),
    [
      carrier(
        source("styles/prefix-sum.scss"),
        '.steptrace__prefix-sum-strip .steptrace__pcell[data-state="range"]',
        "range",
        "range-match",
        "range underline",
        "compliant",
        "The highlighted cells span the selected prefix/range extent.",
      ),
    ],
    caseFor("prefix-sum", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "run-stack",
    ["tim-sort"],
    "family:run-stack",
    [...familyOwners("run-stack", "run-stack"), render],
    [
      carrier(
        source("styles/run-stack.scss"),
        '.steptrace__run-stack-card[data-active="1"]',
        "active",
        "active-current",
        "card outline",
      ),
    ],
    caseFor("tim-sort", { frameIndices: [0, 2, -1] }),
  ),
  cohort(
    "stack-sequence",
    ["monotonic-stack-and-queue"],
    "family:stack-sequence",
    familyOwners("stack-sequence"),
    [
      carrier(
        source("styles/stack-sequence.scss"),
        '.steptrace__stack-sequence-scan .steptrace__pcell[data-state="scan"]',
        "scan",
        "active-current",
        "scan icon",
      ),
    ],
    caseFor("monotonic-stack-and-queue", { frameIndices: [0, 1, -1] }),
  ),

  cohort(
    "legacy-backtrack",
    ["n-queens"],
    "legacy:backtrack",
    [render, source("styles/backtrack.scss")],
    [
      carrier(
        source("styles/backtrack.scss"),
        '.steptrace__qcell[data-state="current"]',
        "current",
        "active-current",
        "queen position",
      ),
    ],
    caseFor("n-queens", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "legacy-bits",
    ["kernighan-popcount"],
    "legacy:bits",
    [render, source("styles/bits.scss")],
    [
      carrier(
        source("styles/bits.scss"),
        '.steptrace__bit[data-state="current"]',
        "current",
        "active-current",
        "bit outline",
      ),
    ],
    caseFor("kernighan-popcount", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "legacy-dp",
    ["lcs"],
    "legacy:dp",
    [render, source("styles/dp.scss")],
    [
      carrier(
        source("styles/dp.scss"),
        '.steptrace__dp:not(.steptrace__dp--guided) td[data-state="cur"]',
        "cur",
        "active-current",
        "cell state",
      ),
    ],
    caseFor("lcs", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "legacy-graph",
    ["bfs", "dfs", "prim", "topological-sort"],
    "legacy:graph",
    [render, source("styles/graph.scss")],
    [
      carrier(
        render,
        "legacy graph visited node",
        "visited",
        "accepted-visited",
        "visited label",
        "compliant",
        "",
        "Visited is durable traversal progress and is not terminal completion.",
      ),
    ],
    caseFor("bfs", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "legacy-pointers",
    ["two-pointers", "sliding-window"],
    "legacy:pointers",
    [render, source("styles/pointers.scss")],
    [
      carrier(
        source("styles/pointers.scss"),
        '.steptrace__pcell[data-state="match"]',
        "match",
        "range-match",
        "range underline",
        "compliant",
        "The cue spans the matched window extent.",
        "Match is classified by spatial extent, not by the word alone.",
      ),
    ],
    caseFor("sliding-window", { frameIndices: [0, 1, -1] }),
  ),
  cohort(
    "legacy-search",
    ["binary-search", "linear-search"],
    "legacy:search",
    [render, bars],
    [
      carrier(
        bars,
        '.steptrace__bar[data-state="compare"] .steptrace__fill',
        "search compare",
        "active-current",
        "compare cue",
      ),
    ],
    caseFor("binary-search", {
      config: { algorithm: "binary-search", array: [1, 3, 5, 7], target: 5 },
      frameIndices: [0, 1, -1],
    }),
  ),
  cohort(
    "legacy-sort",
    ["bubble-sort", "insertion-sort", "selection-sort", "quick-sort", "heap-sort", "merge-sort"],
    "legacy:sort",
    [render, bars],
    [
      carrier(
        bars,
        '.steptrace__bar[data-state="sorted"] .steptrace__fill',
        "legacy sorted",
        "final-success",
        "shared checkmark",
      ),
    ],
    caseFor("bubble-sort", {
      config: { algorithm: "bubble-sort", array: [3, 1, 2] },
      frameIndices: [0, 1, -1],
    }),
  ),
  cohort(
    "legacy-string",
    ["kmp", "rabin-karp", "z-algorithm", "boyer-moore"],
    "legacy:string",
    [render, string],
    [
      carrier(
        string,
        '.steptrace__cell[data-state="match"]',
        "match",
        "range-match",
        "range underline",
        "compliant",
        "The underline identifies the matched-text extent.",
        "Match is an extent overlay, not terminal success.",
      ),
      carrier(
        string,
        '.steptrace__cell[data-state="found"]',
        "found",
        "range-match",
        "range underline",
        "ambiguous",
        "The underline identifies the final matched-text extent.",
        "Found names a completed search, while this carrier owns only the matched range extent.",
      ),
    ],
    caseFor("kmp", {
      config: { algorithm: "kmp", text: "ABABACABA", pattern: "ABAC" },
      frameIndices: [0, 2, -1],
    }),
  ),

  cohort(
    "direct-binary-tree",
    ["avl-tree", "binary-search-tree", "red-black-tree", "splay-tree"],
    "direct:binary-tree",
    familyOwners("binary-tree"),
    [
      carrier(
        source("styles/binary-tree.scss"),
        '.steptrace__binary-tree-node[data-state="active"]',
        "active",
        "active-current",
        "node outline",
      ),
    ],
    caseFor("binary-search-tree", { operations: [["search", 30]] }),
  ),
  cohort(
    "direct-contiguous-storage",
    ["arrays", "circular-buffer", "deque", "dynamic-array", "queue", "span"],
    "direct:contiguous-storage",
    [
      ...familyOwners("contiguous-storage"),
      source("families/interactive-structure.ts"),
      source("styles/interactive-structure.scss"),
    ],
    [
      carrier(
        source("styles/contiguous-storage.scss"),
        '.steptrace__contiguous-cell[data-active="1"]',
        "active",
        "active-current",
        "index label",
      ),
    ],
    caseFor("arrays", { operations: [["read", 1]] }),
  ),
  cohort(
    "direct-graph-representation",
    ["graph"],
    "direct:graph-representation",
    familyOwners("graph-representation"),
    [
      carrier(
        source("styles/graph-representation.scss"),
        '.steptrace__graph-representation-node[data-state="selected"]',
        "selected",
        "accepted-visited",
        "selected label",
      ),
    ],
    caseFor("graph", { operations: [["add-edge", "A", "B"]] }),
  ),
  cohort(
    "direct-hash-index",
    ["bloom-filter", "hash-map", "hash-set"],
    "direct:hash-index",
    familyOwners("hash-index"),
    [
      carrier(
        source("styles/hash-index.scss"),
        '[data-result="success"]',
        "success",
        "active-current",
        "transient operation status",
        "ambiguous",
        "The pulse clears on the next operation and is not terminal finality.",
        "Success here is transient operation feedback, so the decision tree classifies it as current operation state.",
      ),
    ],
    caseFor("hash-map", {
      operations: [
        ["set", "a", 1],
        ["get", "a"],
      ],
    }),
  ),
  cohort(
    "direct-heap-selection",
    ["binomial-queue", "fibonacci-heap", "heap", "leftist-heap", "skew-heap"],
    "direct:heap-selection",
    [source("families/heap-structure.ts"), source("styles/heap-selection.scss")],
    [
      carrier(
        source("styles/heap-selection.scss"),
        '.steptrace__heap-variant .steptrace__heap-node[data-state="current"] .steptrace__ncirc',
        "current",
        "active-current",
        "node stroke",
      ),
    ],
    caseFor("heap", { operations: [["insert", 2]] }),
  ),
  cohort(
    "direct-linked-topology",
    ["linked-list", "lru-cache"],
    "direct:linked-topology",
    familyOwners("linked-topology"),
    [
      carrier(
        source("styles/linked-topology.scss"),
        '.steptrace__linked-node[data-state="current"]',
        "direct current",
        "active-current",
        "pointer label",
      ),
    ],
    caseFor("linked-list", { operations: [["append", 61]] }),
  ),
  cohort(
    "direct-multiway-tree",
    ["b-plus-tree", "b-tree"],
    "direct:multiway-tree",
    familyOwners("multiway-tree"),
    [
      carrier(
        source("styles/multiway-tree.scss"),
        '.steptrace__multiway-tree-node .steptrace__multiway-tree-cell[data-state="found"]',
        "found",
        "final-success",
        "shared result marker",
        "ambiguous",
        "",
        "Found is the completed search result for the represented operation.",
      ),
    ],
    caseFor("b-tree", { operations: [["search", 20]] }),
  ),
  cohort(
    "direct-range-aggregate",
    ["fenwick-tree", "segment-tree"],
    "direct:range-aggregate",
    familyOwners("range-aggregate"),
    [
      carrier(
        source("styles/range-aggregate.scss"),
        '.steptrace__range-block[data-role="query"]',
        "query",
        "active-current",
        "range label",
      ),
    ],
    caseFor("fenwick-tree", { operations: [["query", 4]] }),
  ),
  cohort(
    "direct-stack-sequence",
    ["stack"],
    "direct:stack-sequence",
    familyOwners("stack-sequence"),
    [
      carrier(
        source("styles/stack-sequence.scss"),
        '.steptrace__stack-sequence-stack-cell[data-top="1"]',
        "top",
        "candidate-frontier",
        "stack position",
      ),
    ],
    caseFor("stack", { operations: [["push", "D"]] }),
  ),
  cohort(
    "direct-union-find",
    ["union-find"],
    "direct:union-find",
    familyOwners("union-find", "unionfind"),
    [
      carrier(
        source("styles/unionfind.scss"),
        '.steptrace__union-find-edge[data-active="true"]',
        "active",
        "active-current",
        "edge stroke",
      ),
    ],
    caseFor("union-find", { operations: [["union", 0, 1]] }),
  ),
]

export const semanticSourceSentinels = [
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/families/binary-tree.ts::const badge = successMarker()::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/binary-tree.ts::group.dataset.state#1::changed",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/binary-tree.ts::group.dataset.state#1::neutral",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/binary-tree.ts::group.dataset.state#1::path",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/binary-tree.ts::group.dataset.state#1::rotation",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/binary-tree.ts::line.dataset.state#1::neutral",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/binary-tree.ts::line.dataset.state#1::path",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/binary-tree.ts::line.dataset.state#1::rotation",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.state#1::scatter",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.state#2::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.state#2::sorted",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.target#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.target#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/bucket-distribution.ts::chip.dataset.active#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/bucket-distribution.ts::chip.dataset.active#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/bucket-distribution.ts::lane.dataset.active#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/bucket-distribution.ts::lane.dataset.active#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#1::compare",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#1::increment",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#2::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#2::sorted",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.target#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.target#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/distribution-sort.ts::bucket.dataset.active#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/distribution-sort.ts::bucket.dataset.active#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::closed",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::current",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::open",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::path",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::rejected",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.target#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.target#1::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.active#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.active#1::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.selected#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.selected#1::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::accepted",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::active",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::candidate",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::cut",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::neutral",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::rejected",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::residual",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/graph-state.ts::swatchClass:steptrace__gs-swatch steptrace__gs-swatch--${state}::legend",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/hash-index.ts::cell.dataset.result#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/hash-index.ts::cell.dataset.result#1::remove",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/hash-index.ts::cell.dataset.result#1::success",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/hash-index.ts::chainLane.dataset.active#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/hash-index.ts::chainLane.dataset.active#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/hash-index.ts::slot.dataset.result#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/hash-index.ts::slot.dataset.result#1::remove",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/hash-index.ts::slot.dataset.result#1::success",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/hash-index.ts::slot.dataset.selected#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/hash-index.ts::slot.dataset.selected#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#1::current",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#2::seen",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#3::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#4::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#4::current",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#4::rejected",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#4::seen",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#4::winner",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#1::empty",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#2::weakest",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#3::winner",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#4::compare",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#4::empty",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#4::swap",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#4::weakest",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#4::winner",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::swatchClass:steptrace__heap-swatch steptrace__heap-swatch--current::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::swatchClass:steptrace__heap-swatch steptrace__heap-swatch--rejected::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::swatchClass:steptrace__heap-swatch steptrace__heap-swatch--weakest::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-selection.ts::swatchClass:steptrace__heap-swatch steptrace__heap-swatch--winner::legend",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#1::compare",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#1::neutral",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#1::settled",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#2::compare",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#2::neutral",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#2::settled",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/interactive-structure.ts::cell.dataset.active#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/interactive-structure.ts::cell.dataset.active#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::accepted",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::candidate",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::conflict",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::gap",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::processed",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::rejected",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/interval-track.ts::swatchClass:steptrace__interval-swatch steptrace__interval-swatch--${state}::legend",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/families/linked-topology.ts::result.append(successMarker())::final-success",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/linked-topology.ts::swatchClass:steptrace__linked-swatch steptrace__linked-swatch--cycle::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/linked-topology.ts::swatchClass:steptrace__linked-swatch steptrace__linked-swatch--entry::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/linked-topology.ts::swatchClass:steptrace__linked-swatch steptrace__linked-swatch--fast::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/linked-topology.ts::swatchClass:steptrace__linked-swatch steptrace__linked-swatch--slow::legend",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/multiway-tree.ts::cell.dataset.state#1::found",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/multiway-tree.ts::cell.dataset.state#1::neutral",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/multiway-tree.ts::cell.dataset.state#1::special",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/families/multiway-tree.ts::const marker = successMarker()::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/multiway-tree.ts::group.dataset.role#1::internal",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/multiway-tree.ts::group.dataset.role#1::leaf",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/multiway-tree.ts::line.dataset.state#1::neutral",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/multiway-tree.ts::line.dataset.state#1::path",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/multiway-tree.ts::marker.dataset.state#1::found",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/multiway-tree.ts::marker.dataset.state#1::neutral",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/multiway-tree.ts::path.dataset.state#1::active",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/multiway-tree.ts::path.dataset.state#1::neutral",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-character.ts::cell.dataset.active#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-character.ts::cell.dataset.active#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-character.ts::cell.dataset.matched#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-character.ts::cell.dataset.matched#1::1",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::const terminal = successMarker()::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state#1::active",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state#1::created",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state#1::fallback",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state#1::reused",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state#1::settled",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::active",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::created",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::reused",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::settled",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::terminal",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::marker: successMarker(),::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::role.dataset.state#1::active",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::role.dataset.state#1::created",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::role.dataset.state#1::reused",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::role.dataset.state#1::settled",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::swatchClass:steptrace__swatch steptrace__prefix-swatch [occurrence 2]::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::swatchClass:steptrace__swatch steptrace__prefix-swatch [occurrence 3]::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::swatchClass:steptrace__swatch steptrace__prefix-swatch [occurrence 4]::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-character.ts::swatchClass:steptrace__swatch steptrace__prefix-swatch::legend",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#1::build",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#1::cancel",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#1::range",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#2::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#2::build",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#2::cancel",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#2::range",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-sum.ts::swatchClass:steptrace__prefix-sum-swatch steptrace__prefix-sum-swatch--build::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-sum.ts::swatchClass:steptrace__prefix-sum-swatch steptrace__prefix-sum-swatch--cancel::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/prefix-sum.ts::swatchClass:steptrace__prefix-sum-swatch steptrace__prefix-sum-swatch--range::legend",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::cancelled",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::idle",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::prefix-left",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::prefix-right",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::query",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::update",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.current#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.current#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.state#1::candidate",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.state#1::compare",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.state#1::sorted",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/run-stack.ts::card.dataset.active#1::0",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/run-stack.ts::card.dataset.active#1::1",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/run-stack.ts::invariant.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/run-stack.ts::invariant.dataset.state#1::merge",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/stack-sequence.ts::cell.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/stack-sequence.ts::cell.dataset.state#1::popped",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/stack-sequence.ts::cell.dataset.state#1::resolved",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/families/stack-sequence.ts::cell.dataset.state#1::retained",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/stack-sequence.ts::cell.dataset.state#1::scan",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/stack-sequence.ts::swatchClass:steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--popped::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/stack-sequence.ts::swatchClass:steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--retained::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/families/stack-sequence.ts::swatchClass:steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--scan::legend",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/union-find.ts::edge.dataset.active#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/union-find.ts::edge.dataset.active#1::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/union-find.ts::group.dataset.active#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/union-find.ts::group.dataset.active#1::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/union-find.ts::group.dataset.selected#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/families/union-find.ts::group.dataset.selected#1::true",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/mount.ts::insight.append(successMarker(), insightLabel, insightText)::final-success",
  },
  {
    category: "success-marker-site",
    carrierKey: "Web/custom/steptrace/src/render.ts::? successMarker()::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::arc.dataset.active#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::arc.dataset.active#1::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::candidate",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::compare",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::sorted",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::swap",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::eliminated",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::found",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::probe",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::range",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::unseen",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::c.append(value, successMarker())::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::c.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::c.dataset.state#1::duplicate",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::c.dataset.state#1::entering",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::c.dataset.state#1::match",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::c.dataset.state#1::window",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::c.dataset.state#2::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::c.dataset.state#2::borrow",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::c.dataset.state#2::die",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::c.dataset.state#2::gone",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::cell.append(glyph, successMarker())::final-success",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::cell.append(label, value, successMarker())::final-success",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::cell.append(place, cost, stored, successMarker())::final-success",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::cell.append(value, cue, successMarker())::final-success",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::cell.append(value, successMarker())::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#2::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#3::found",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::best",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::current",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::dependency",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::stored",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::best",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::current",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::dependency",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::path",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::repeated",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::stored",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::attacked",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::queen",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::reject",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::remove",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::solved",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::try",
  },
  {
    category: "success-marker-site",
    carrierKey: "Web/custom/steptrace/src/render.ts::check.append(successMarker())::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::columnHeaders[c].dataset.role#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::columnHeaders[c].dataset.role#1::stage-column",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::el.dataset.active#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::el.dataset.active#1::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::el.dataset.selected#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::el.dataset.selected#1::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::element.dataset.role#1::keep",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::element.dataset.role#1::operand-a",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::element.dataset.role#1::operand-b",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::element.dataset.role#1::target",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::element.dataset.role#1::write",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::element.dataset.state#1::selected",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::element.dataset.state#2::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::element.dataset.state#2::active",
  },
  {
    category: "success-marker-site",
    carrierKey:
      'Web/custom/steptrace/src/render.ts::element.replaceChildren(descriptor.badge === "success" ? successMarker() : descriptor.badge)::final-success',
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::g.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::g.dataset.state#1::current",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::g.dataset.state#1::frontier",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::g.dataset.state#1::visited",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.active#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.active#1::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.active#2::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.active#2::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#1::combine",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#1::compute",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#1::prune",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#1::return",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#1::split",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::base",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::cache",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::call",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::combine",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::incumbent",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::infeasible",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::prune",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::return",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::split",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::group.dataset.state#2::store",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::lane.dataset.state#1::empty",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::lane.dataset.state#1::used",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::mark.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::mark.dataset.state#1::current",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::mark.dataset.state#1::frontier",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::mark.dataset.state#1::visited",
  },
  {
    category: "success-marker-site",
    carrierKey:
      'Web/custom/steptrace/src/render.ts::marker: state === "best" ? successMarker() : undefined, [occurrence 2]::final-success',
  },
  {
    category: "success-marker-site",
    carrierKey:
      'Web/custom/steptrace/src/render.ts::marker: state === "best" ? successMarker() : undefined,::final-success',
  },
  {
    category: "success-marker-site",
    carrierKey: "Web/custom/steptrace/src/render.ts::marker: successMarker(),::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::overflow.dataset.state#1::empty",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::overflow.dataset.state#1::overflow",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::pathMarker.append(successMarker())::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::patternCells[frame.cmpP].dataset.state#1::match",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::patternCells[frame.cmpP].dataset.state#1::mismatch",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::patternCells[j].dataset.state#1::suffix",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::pcells[frame.cmpP].dataset.state#1::match",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::pcells[frame.cmpP].dataset.state#1::mismatch",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::pcells[k].dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::prefixCells[frame.compare.prefix].dataset.state#1::match",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::prefixCells[frame.compare.prefix].dataset.state#1::mismatch",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::prefixCells[k].dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::row.dataset.state#1::empty",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::row.dataset.state#1::overflow",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::row.dataset.state#2::active",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::row.dataset.state#2::best",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::row.dataset.state#2::dead",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::row.dataset.state#2::repeated",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::row.dataset.state#3::hit",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::row.dataset.state#3::stored",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::rowHeaders[r].dataset.role#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::rowHeaders[r].dataset.role#1::stage-row",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::slot.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::slot.dataset.state#1::on",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::slot.dataset.state#1::reject",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::slot.dataset.state#1::remove",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::slot.dataset.state#1::try",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::stringCells[frame.compare.candidate].dataset.state#1::match",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::stringCells[frame.compare.candidate].dataset.state#1::mismatch",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::stringCells[frame.i].dataset.state#1::probe",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::stringCells[k].dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::keep",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::operand-a",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::operand-b",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::path",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::stage-axis",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::target",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::write",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::active",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::base",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::best",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::cache",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::combine",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::created",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::current",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::dependency",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::feasible",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::hit",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::incumbent",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::infeasible",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::path",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::probe",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::prune",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::range",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::repeated",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::return",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::reused",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::selected",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::split",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::store",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::stored",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::terminal",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__boundary-legend-swatch::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__matrix-role-badge::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__dp-story-swatch [occurrence 2]::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__dp-story-swatch::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__rtswatch [occurrence 2]::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__rtswatch [occurrence 3]::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__rtswatch [occurrence 4]::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__rtswatch [occurrence 5]::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__rtswatch::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__swatch--current::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__swatch--frontier::legend",
  },
  {
    category: "legend-marker",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__swatch--visited::legend",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::t.dataset.state#1::window",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::tcells[frame.cmpT].dataset.state#1::match",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::tcells[frame.cmpT].dataset.state#1::mismatch",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::tcells[k].dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::tcells[s + k].dataset.state#1::found",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.decision#1::improve",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.decision#1::keep",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis operand-a",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis operand-a operand-b target",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis operand-a target",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis operand-b",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis operand-b target",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stored",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stored operand-a",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stored operand-b",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stored path",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stored target",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::target",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.state#1::<empty>",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.state#1::cur",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.state#1::dep",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::td.dataset.state#1::path",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::textCell.dataset.state#1::suffix",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::textCells[found + j].dataset.state#1::found",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::textCells[frame.cmpT].dataset.state#1::match",
  },
  {
    category: "dynamic-assignment",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::textCells[frame.cmpT].dataset.state#1::mismatch",
  },
  {
    category: "success-marker-site",
    carrierKey:
      "Web/custom/steptrace/src/render.ts::tick.append(label, successMarker())::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::tick.dataset.current#1::false",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::tick.dataset.current#1::true",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::tick.dataset.state#1::answer",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::tick.dataset.state#1::feasible",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::tick.dataset.state#1::infeasible",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::tick.dataset.state#1::range",
  },
  {
    category: "success-marker-site",
    carrierKey: "Web/custom/steptrace/src/render.ts::value.append(successMarker())::final-success",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::verdict.dataset.state#1::feasible",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::verdict.dataset.state#1::infeasible",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::verdict.dataset.state#1::pending",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::zCells[frame.i].dataset.state#1::copy-target",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::zCells[frame.i].dataset.state#2::found",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::zCells[frame.k].dataset.state#1::copy-source",
  },
  {
    category: "dynamic-assignment",
    carrierKey: "Web/custom/steptrace/src/render.ts::zCells[k].dataset.state#1::<empty>",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace .steptrace__bt-tree .steptrace__rtedge[data-return="true"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace .steptrace__bt-tree .steptrace__rtedge[data-solution="true"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__bt-tree-return-arrow::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-conflict="1"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="queen"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="reject"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="remove"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="solved"] .steptrace__btqueen, .steptrace__btcell[data-state="queen"] .steptrace__btqueen::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="solved"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="try"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="on"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="reject"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="remove"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="try"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-hole="1"] .steptrace__fill::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-hole="1"] .steptrace__num::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-pivot="1"] .steptrace__fill::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="candidate"] .steptrace__fill::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="compare"] .steptrace__fill::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="found"] .steptrace__fill::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="increment"] .steptrace__fill::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="probe"] .steptrace__fill::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="range"] .steptrace__fill::neutral',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="scatter"] .steptrace__fill::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="sorted"] .steptrace__fill::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="swap"] .steptrace__fill::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="unseen"] .steptrace__fill::neutral',
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/bars.scss::.steptrace__fill::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/bars.scss::.steptrace__marker--a::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/bars.scss::.steptrace__marker--b::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__marker[data-placing="1"] .steptrace__marker-body::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-edge[data-state="path"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-edge[data-state="rotation"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-node[data-state="changed"] .steptrace__ncirc::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-node[data-state="path"] .steptrace__ncirc::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-node[data-state="rotation"] .steptrace__ncirc::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bits.scss::.steptrace__bcell[data-state="borrow"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bits.scss::.steptrace__bcell[data-state="die"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/bits.scss::.steptrace__bcell[data-state="gone"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-lane--overflow::amber",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-legend-swatch[data-state="feasible"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-legend-swatch[data-state="infeasible"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-legend-swatch[data-state="probe"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-meter-fill::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-package::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-tick[data-current="true"]:not([data-state="answer"])::after::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-tick[data-state="answer"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-tick[data-state="feasible"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-tick[data-state="infeasible"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-verdict[data-state="feasible"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-verdict[data-state="infeasible"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/contiguous-storage.scss::.steptrace__contiguous-cell[data-active="1"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/contiguous-storage.scss::.steptrace__contiguous-cell[data-changed="1"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/contiguous-storage.scss::.steptrace__contiguous-cell[data-view="1"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bars--output .steptrace__bar[data-target="1"] .steptrace__fill::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bucket[data-active="1"]::after::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bucket[data-placement="1"] .steptrace__distribution-details::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bucket[data-previous="1"] .steptrace__distribution-details::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-lane[data-active="1"]::after::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-token[data-active="1"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-token[data-compare="1"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-token[data-gather="1"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="best"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="current"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="dependency"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="stored"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-attempt[data-state="active"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-attempt[data-state="best"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-attempt[data-state="repeated"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-memo-row[data-state="hit"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-memo-row[data-state="stored"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin[data-state="active"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin[data-state="selected"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="active"], .steptrace .steptrace__dp-story-swatch[data-state="current"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="dependency"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="hit"], .steptrace .steptrace__dp-story-swatch[data-state="best"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="repeated"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="selected"], .steptrace .steptrace__dp-story-swatch[data-state="path"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="stored"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-cell-stored::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="best"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="current"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="dependency"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="path"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="repeated"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="stored"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="negative-cycle"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="operand-a"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="operand-b"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="path"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="stage-axis"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="stored"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="target"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="target"][data-decision="improve"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp--guided th[data-role="stage-row"], .steptrace .steptrace__dp--guided th[data-role="stage-column"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp:not(.steptrace__dp--guided) td[data-state="cur"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp:not(.steptrace__dp--guided) td[data-state="dep"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp:not(.steptrace__dp--guided) td[data-state="path"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge:is([data-role="stored"], [data-role="path"])::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge[data-role="operand-a"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge[data-role="operand-b"], .steptrace .steptrace__matrix-role-badge[data-role="stage-axis"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge[data-role="target"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge[data-role="write"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/graph-node.scss::.steptrace::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-edge::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-edge[data-changed="1"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-list-row[data-changed="1"], .steptrace .steptrace__graph-rep-edge-row[data-changed="1"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-matrix-cell[data-changed="1"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-matrix-cell[data-value="1"] .steptrace__dp-value::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="accepted"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="active"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="candidate"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="cut"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="rejected"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-closure::amber",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-state="accepted"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-state="active"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-state="candidate"], .steptrace .steptrace__gs-edge[data-state="residual"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-state="cut"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-state="rejected"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="1"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="2"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="3"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="4"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-state="closed"] .steptrace__gs-node-circle, .steptrace .steptrace__gs-node[data-state="path"] .steptrace__gs-node-circle::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-state="current"] .steptrace__gs-node-circle::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-state="open"] .steptrace__gs-node-circle::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-state="rejected"] .steptrace__gs-node-circle::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-swatch--closed::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-swatch--current::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-swatch--goal::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-swatch--open::amber",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-swatch--rejected::red",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-target::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/graph.scss::.steptrace__arrow::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/graph.scss::.steptrace__edge::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph.scss::.steptrace__edge[data-active="true"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph.scss::.steptrace__edge[data-selected="true"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph.scss::.steptrace__node .steptrace__nmark[data-state="current"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph.scss::.steptrace__node .steptrace__nmark[data-state="frontier"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph.scss::.steptrace__node[data-state="current"] .steptrace__ncirc::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph.scss::.steptrace__node[data-state="frontier"] .steptrace__ncirc::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/graph.scss::.steptrace__node[data-state="visited"] .steptrace__ncirc::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/graph.scss::.steptrace__ntarget::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/graph.scss::.steptrace__swatch--current::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/graph.scss::.steptrace__swatch--frontier::amber",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/graph.scss::.steptrace__swatch--visited::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-probe="collision"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-probe="current"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-probe="visited"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-result="remove"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-result="success"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-path="1"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-result="remove"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-result="success"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-selected="1"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-token[data-motion="success"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-edge[data-path="1"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-mark::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="compare"] .steptrace__ncirc::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="settled"] .steptrace__ncirc::neutral',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="swap"] .steptrace__ncirc::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="weakest"] .steptrace__ncirc::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="winner"] .steptrace__ncirc::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-selection:not(.steptrace__two-heaps) .steptrace__heap-root-label::amber",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-stream .steptrace__pcell[data-state="current"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-stream .steptrace__pcell[data-state="rejected"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-stream .steptrace__pcell[data-state="winner"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--current::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--rejected::red",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--weakest::amber",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--winner::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-variant .steptrace__heap-edge[data-path="1"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__merge-heap .steptrace__heap-node[data-state="settled"] .steptrace__ncirc::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace[data-structure="fibonacci-heap"] .steptrace__heap-node[data-state="settled"] .steptrace__ncirc::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace[data-structure="heap"] .steptrace__heap-node[data-state="settled"] .steptrace__ncirc, .steptrace[data-structure="binomial-queue"] .steptrace__heap-node[data-state="settled"] .steptrace__ncirc::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/interactive-structure.scss::.steptrace .steptrace__structure-controls .steptrace__structure-input:focus-visible, .steptrace .steptrace__structure-controls .steptrace__structure-action:focus-visible, .steptrace .steptrace__structure-controls .steptrace__select:focus-visible::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band--current::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band--output::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="accepted"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="candidate"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="conflict"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="gap"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="rejected"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-swatch--candidate::amber",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-swatch--current::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-swatch--output::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-swatch--rejected::red",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-arrow::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-arrow[data-role="cycle"]::neutral',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-arrow[data-role="cycle"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-edge::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-edge[data-cycle="1"]::neutral',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-edge[data-cycle="1"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-link::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-appended="1"] > .steptrace__contiguous-array::after::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-moved="1"] > .steptrace__contiguous-array::after::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-relinked="1"] .steptrace__linked-list-link[data-pointer="next"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-relinked="1"] .steptrace__linked-list-pointer[data-pointer="next"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-entry="true"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-fast="true"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-meeting="true"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-slow="true"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-pointer--fast::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-pointer--slow::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--cycle::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--entry::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--fast::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--slow::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__lru-map .steptrace__contiguous-cell[data-active="1"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-edge[data-state="path"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-link[data-state="active"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node .steptrace__multiway-tree-cell[data-state="found"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node .steptrace__multiway-tree-cell[data-state="special"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node[data-affected="1"] .steptrace__multiway-tree-cell::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node[data-path="1"] .steptrace__multiway-tree-cell::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pbr--l::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pbr--r::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pbrackets[data-match="1"] .steptrace__pbr::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-end="l"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-end="r"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="duplicate"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="duplicate"][data-end]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="entering"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="entering"][data-end]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="match"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="match"][data-end]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-character:focus-visible::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge--failure::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge--failure::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge-role[data-state="active"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge[data-state="active"], .steptrace__prefix-node[data-state="active"] circle::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge[data-state="created"], .steptrace__prefix-node[data-state="created"] circle::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge[data-state="fallback"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge[data-state="reused"], .steptrace__prefix-node[data-state="reused"] circle::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-node circle::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-node[data-state="terminal"] circle::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="active"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="created"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="reused"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="terminal"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-text-cell[data-active="1"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-text-cell[data-matched="1"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-strip .steptrace__pcell[data-state="build"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-strip .steptrace__pcell[data-state="cancel"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-strip .steptrace__pcell[data-state="range"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-swatch--build::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-swatch--cancel::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-swatch--range::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/range-aggregate.scss::.steptrace__range-block:is([data-role="query"], [data-role="prefix-right"])::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/range-aggregate.scss::.steptrace__range-block[data-role="cancelled"]::neutral',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/range-aggregate.scss::.steptrace__range-block[data-role="prefix-left"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/range-aggregate.scss::.steptrace__range-block[data-role="update"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rectree:focus-visible::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rectree[data-profile="merge-sort"] .steptrace__rtedge[data-related="true"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rectree[data-profile="merge-sort"] .steptrace__rtnode[data-related="true"] .steptrace__rtcirc::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtedge::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtedge[data-path="true"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode .steptrace__rtcirc::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode .steptrace__rtring::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="base"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="miss"] .steptrace__rtcirc::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="cache"] .steptrace__rtcirc::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="call"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="compute"] .steptrace__rtcirc::neutral',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="combine"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="store"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="hit"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="incumbent"] .steptrace__rtcirc::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="infeasible"] .steptrace__rtcirc::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="return"] .steptrace__rtcirc::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="split"] .steptrace__rtcirc::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="base"], .steptrace .steptrace__rtswatch[data-state="miss"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="cache"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="combine"], .steptrace .steptrace__rtswatch[data-state="store"], .steptrace .steptrace__rtswatch[data-state="hit"], .steptrace .steptrace__rtswatch[data-state="incumbent"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="infeasible"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="return"], .steptrace .steptrace__rtswatch[data-state="compute"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="split"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-invariant::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-invariant[data-state="holds"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-invariant[data-state="merge"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-active="1"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-merged="1"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="0"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="1"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="2"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="3"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="0"][data-state=""] .steptrace__fill::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="1"][data-state=""] .steptrace__fill::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="2"][data-state=""] .steptrace__fill::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="3"][data-state=""] .steptrace__fill::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/run-stack.scss::50%::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/run-stack.scss::from::amber",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace .steptrace__success-marker circle::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace input.steptrace__range:focus-visible::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/shared.scss::.steptrace__btn:focus-visible::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/shared.scss::.steptrace__insight::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/shared.scss::.steptrace__legend-swatch::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace__scrub:focus-visible::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace__select:focus-visible::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace__watch-row:focus-visible::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace--narrow .steptrace__detail-button:focus-visible::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-icon::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="popped"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="resolved"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="retained"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="scan"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-stack-cell[data-top="1"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-stack-cell[data-visible="1"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-swatch--popped::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-swatch--retained::amber",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-swatch--scan::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/stack-sequence.scss::50%::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/status-toolbar.scss::.steptrace__key::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/status-toolbar.scss::.steptrace__toolbar :focus-visible::blue",
  },
  {
    category: "semantic-underline",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__bm .steptrace__cell[data-state="suffix"]::underline',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__bm .steptrace__cell[data-state="suffix"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="found"]::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="match"]::green',
  },
  {
    category: "semantic-underline",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="match"]::underline',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="mismatch"]::red',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="probe"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__match:not(.steptrace__z) .steptrace__cell[data-state="found"]::green',
  },
  {
    category: "semantic-underline",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__match:not(.steptrace__z) .steptrace__cell[data-state="found"]::underline',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z .steptrace__cell[data-state="match"]::green',
  },
  {
    category: "semantic-underline",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z .steptrace__cell[data-state="match"]::underline',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket::before, .steptrace__z-bracket::after::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket::violet",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket[data-edge-end="1"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket[data-edge-start="1"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cell[data-box="1"]:not([data-state="probe"]):not([data-state="match"]):not( [data-state="mismatch"] )::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cell[data-state="copy-source"]::amber',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cell[data-state="copy-target"]::violet',
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cursor::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__uf .steptrace__ufnode .steptrace__ncirc::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__ufarc::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__ufarc[data-active="true"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find-edge::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find-edge[data-active="true"]::blue',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      'Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find-node[data-representative="true"] .steptrace__union-find-root-label::green',
  },
  {
    category: "semantic-token-selector",
    carrierKey:
      "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find-svg marker path::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::amber",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::blue",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::green",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::neutral",
  },
  {
    category: "semantic-token-selector",
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::violet",
  },
]
export const structuralExclusions = [
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode .steptrace__rtring::violet",
    category: "hidden-active-geometry",
    rationale:
      "The ring is hidden base geometry; data-active controls its visibility, so its dormant stroke is not a reader-visible semantic state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin::neutral",
    category: "structural-neutral",
    rationale: "Neutral structural paint provides base geometry and carries no algorithm state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/graph-node.scss::.steptrace::neutral",
    category: "structural-neutral",
    rationale: "Neutral structural paint provides base geometry and carries no algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/interactive-structure.scss::.steptrace .steptrace__structure-controls .steptrace__structure-input:focus-visible, .steptrace .steptrace__structure-controls .steptrace__structure-action:focus-visible, .steptrace .steptrace__structure-controls .steptrace__select:focus-visible::blue",
    category: "focus-chrome",
    rationale: "The focus-visible selector is accessibility chrome, not algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band::neutral",
    category: "structural-neutral",
    rationale: "Neutral structural paint provides base geometry and carries no algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-link::neutral",
    category: "structural-neutral",
    rationale: "Neutral structural paint provides base geometry and carries no algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-character:focus-visible::blue",
    category: "focus-chrome",
    rationale: "The focus-visible selector is accessibility chrome, not algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rectree:focus-visible::blue",
    category: "focus-chrome",
    rationale: "The focus-visible selector is accessibility chrome, not algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-invariant::neutral",
    category: "structural-neutral",
    rationale: "Neutral structural paint provides base geometry and carries no algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card::neutral",
    category: "structural-neutral",
    rationale: "Neutral structural paint provides base geometry and carries no algorithm state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/run-stack.scss::50%::blue",
    category: "structural-neutral",
    rationale: "Neutral structural paint provides base geometry and carries no algorithm state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/run-stack.scss::from::amber",
    category: "motion-keyframe",
    rationale: "The keyframe percentage controls motion interpolation rather than semantic state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace input.steptrace__range:focus-visible::blue",
    category: "focus-chrome",
    rationale: "The focus-visible selector is accessibility chrome, not algorithm state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/shared.scss::.steptrace__btn:focus-visible::blue",
    category: "focus-chrome",
    rationale: "The focus-visible selector is accessibility chrome, not algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace__scrub:focus-visible::blue",
    category: "focus-chrome",
    rationale: "The focus-visible selector is accessibility chrome, not algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace__select:focus-visible::blue",
    category: "focus-chrome",
    rationale: "The focus-visible selector is accessibility chrome, not algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace__watch-row:focus-visible::blue",
    category: "focus-chrome",
    rationale: "The focus-visible selector is accessibility chrome, not algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/shared.scss::.steptrace--narrow .steptrace__detail-button:focus-visible::blue",
    category: "focus-chrome",
    rationale: "The focus-visible selector is accessibility chrome, not algorithm state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/stack-sequence.scss::50%::blue",
    category: "structural-neutral",
    rationale: "Neutral structural paint provides base geometry and carries no algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/status-toolbar.scss::.steptrace__toolbar :focus-visible::blue",
    category: "focus-chrome",
    rationale: "The focus-visible selector is accessibility chrome, not algorithm state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::neutral",
    category: "structural-neutral",
    rationale: "Neutral structural paint provides base geometry and carries no algorithm state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/bars.scss::.steptrace__marker--a::blue",
    category: "set-identity-palette",
    rationale:
      "The A marker color distinguishes one set identity; it does not declare a reusable algorithm state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/bars.scss::.steptrace__marker--b::violet",
    category: "set-identity-palette",
    rationale:
      "The B marker color distinguishes one set identity; it does not declare a reusable algorithm state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/contiguous-storage.scss::.steptrace__contiguous-cell[data-changed="1"]::amber',
    category: "changed-animation",
    rationale:
      "This short-lived paint identifies a structural mutation animation, not a durable semantic role.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-edge[data-changed="1"]::green',
    category: "changed-animation",
    rationale:
      "This short-lived paint identifies a representation mutation animation, not a durable semantic role.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-list-row[data-changed="1"], .steptrace .steptrace__graph-rep-edge-row[data-changed="1"]::green',
    category: "changed-animation",
    rationale:
      "This short-lived paint identifies a representation mutation animation, not a durable semantic role.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-matrix-cell[data-changed="1"]::green',
    category: "changed-animation",
    rationale:
      "This short-lived paint identifies a representation mutation animation, not a durable semantic role.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-matrix-cell[data-value="1"] .steptrace__dp-value::green',
    category: "representation-value",
    rationale:
      "The value-one paint distinguishes a representation value, not an algorithm process/result role.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rectree[data-profile="merge-sort"] .steptrace__rtedge[data-related="true"]::green',
    category: "profile-relationship",
    rationale:
      "This profile-specific paint connects related merge-sort geometry; it is not a canonical state carrier.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rectree[data-profile="merge-sort"] .steptrace__rtnode[data-related="true"] .steptrace__rtcirc::green',
    category: "profile-relationship",
    rationale:
      "This profile-specific paint connects related merge-sort geometry; it is not a canonical state carrier.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="0"]::blue',
    category: "run-identity-palette",
    rationale: "The color distinguishes run identity zero, independently of semantic state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="1"]::violet',
    category: "run-identity-palette",
    rationale: "The color distinguishes run identity one, independently of semantic state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="2"]::amber',
    category: "run-identity-palette",
    rationale: "The color distinguishes run identity two, independently of semantic state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="3"]::green',
    category: "run-identity-palette",
    rationale: "The color distinguishes run identity three, independently of semantic state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="0"][data-state=""] .steptrace__fill::blue',
    category: "run-identity-palette",
    rationale:
      "The empty-state bar color distinguishes run identity zero, not a semantic process state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="1"][data-state=""] .steptrace__fill::violet',
    category: "run-identity-palette",
    rationale:
      "The empty-state bar color distinguishes run identity one, not a semantic process state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="2"][data-state=""] .steptrace__fill::amber',
    category: "run-identity-palette",
    rationale:
      "The empty-state bar color distinguishes run identity two, not a semantic process state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="3"][data-state=""] .steptrace__fill::green',
    category: "run-identity-palette",
    rationale:
      "The empty-state bar color distinguishes run identity three, not a semantic process state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::amber",
    category: "family-palette-declaration",
    rationale:
      "The family root declares a local palette variable and does not itself paint reader-visible state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::blue",
    category: "family-palette-declaration",
    rationale:
      "The family root declares a local palette variable and does not itself paint reader-visible state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::green",
    category: "family-palette-declaration",
    rationale:
      "The family root declares a local palette variable and does not itself paint reader-visible state.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::violet",
    category: "family-palette-declaration",
    rationale:
      "The family root declares a local palette variable and does not itself paint reader-visible state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="1"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::green',
    category: "group-identity-palette",
    rationale:
      "The color distinguishes connected-component identity after excluding all process-state selectors.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="2"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::violet',
    category: "group-identity-palette",
    rationale:
      "The color distinguishes connected-component identity after excluding all process-state selectors.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="3"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::amber',
    category: "group-identity-palette",
    rationale:
      "The color distinguishes connected-component identity after excluding all process-state selectors.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="4"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::blue',
    category: "group-identity-palette",
    rationale:
      "The color distinguishes connected-component identity after excluding all process-state selectors.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find-svg marker path::neutral",
    category: "structural-marker-stroke",
    rationale: "The SVG arrowhead stroke is structural edge geometry and carries no state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="operand-b"]::violet',
    category: "operand-identity-palette",
    rationale: "The color distinguishes operand B from operand A; state is carried separately.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="stage-axis"]::violet',
    category: "axis-identity-palette",
    rationale:
      "The color identifies the active matrix axis geometry rather than a lifecycle state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp--guided th[data-role="stage-row"], .steptrace .steptrace__dp--guided th[data-role="stage-column"]::violet',
    category: "axis-identity-palette",
    rationale:
      "The header paint identifies row/column stage geometry rather than a lifecycle state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge[data-role="operand-b"], .steptrace .steptrace__matrix-role-badge[data-role="stage-axis"]::violet',
    category: "operand-axis-identity-palette",
    rationale: "The badges name operand and axis identities; their labels provide the meaning.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pbr--l::blue",
    category: "endpoint-identity-palette",
    rationale: "The color distinguishes the left endpoint from the right endpoint.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pbr--r::violet",
    category: "endpoint-identity-palette",
    rationale: "The color distinguishes the right endpoint from the left endpoint.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-end="l"]::blue',
    category: "endpoint-identity-palette",
    rationale: "The cell paint identifies the left endpoint geometry.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-end="r"]::violet',
    category: "endpoint-identity-palette",
    rationale: "The cell paint identifies the right endpoint geometry.",
  },
  {
    carrierKey: "Web/custom/steptrace/src/styles/status-toolbar.scss::.steptrace__key::blue",
    category: "toolbar-chrome",
    rationale: "The keyboard-help key is interface chrome, not algorithm state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-lane--overflow::amber",
    category: "capacity-geometry",
    rationale:
      "The overflow lane is fixed capacity geometry; verdict state is carried by ticks and status.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-meter-fill::blue",
    category: "capacity-geometry",
    rationale: "The fill visualizes numeric package load rather than lifecycle state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-package::blue",
    category: "capacity-geometry",
    rationale: "The package glyph is capacity geometry rather than lifecycle state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-closure::amber",
    category: "closure-geometry",
    rationale: "The closure region is a concept-specific set boundary, not a node lifecycle state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-arrow[data-role="cycle"]::violet',
    category: "cycle-geometry",
    rationale: "The arrow identifies cycle topology rather than a lifecycle state.",
  },
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-edge[data-cycle="1"]::violet',
    category: "cycle-geometry",
    rationale: "The edge identifies cycle topology rather than a lifecycle state.",
  },
]

structuralExclusions.push(
  ...[
    [
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-hole="1"] .steptrace__fill::amber',
      "sort-geometry",
      "The empty slot is insertion geometry, not lifecycle state.",
    ],
    [
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-hole="1"] .steptrace__num::amber',
      "sort-geometry",
      "The empty-slot label is insertion geometry, not lifecycle state.",
    ],
    [
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-pivot="1"] .steptrace__fill::amber',
      "sort-role-identity",
      "The paint identifies the pivot role independently of process state.",
    ],
    [
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="increment"] .steptrace__fill::blue',
      "distribution-action",
      "The paint identifies the increment operation.",
    ],
    [
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="scatter"] .steptrace__fill::blue',
      "distribution-action",
      "The paint identifies the scatter operation.",
    ],
    [
      'Web/custom/steptrace/src/styles/bars.scss::.steptrace__marker[data-placing="1"] .steptrace__marker-body::amber',
      "sort-action",
      "The marker identifies a held value being placed.",
    ],
    [
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="operand-a"]::amber',
      "operand-identity-palette",
      "The color identifies operand A; lifecycle state is carried separately.",
    ],
    [
      'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge[data-role="operand-a"]::amber',
      "operand-identity-palette",
      "The badge names operand A rather than lifecycle state.",
    ],
    [
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace .steptrace__bt-tree .steptrace__rtedge[data-return="true"]::violet',
      "backtrack-path-geometry",
      "The edge identifies return-path geometry.",
    ],
    [
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace .steptrace__bt-tree .steptrace__rtedge[data-solution="true"]::green',
      "backtrack-path-geometry",
      "The edge identifies solution-path geometry.",
    ],
    [
      "Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__bt-tree-return-arrow::violet",
      "backtrack-path-geometry",
      "The arrow identifies return direction.",
    ],
    [
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-conflict="1"]::amber',
      "backtrack-board-annotation",
      "The outline annotates a board conflict independently of rejection state.",
    ],
    [
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="queen"]::green',
      "backtrack-piece-state",
      "The paint identifies an existing placed queen.",
    ],
    [
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="remove"]::amber',
      "backtrack-action",
      "The paint identifies the removal action.",
    ],
    [
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="solved"] .steptrace__btqueen, .steptrace__btcell[data-state="queen"] .steptrace__btqueen::green',
      "backtrack-piece-state",
      "The glyph color identifies placed queen geometry.",
    ],
    [
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="try"]::blue',
      "backtrack-action",
      "The paint identifies the trial action.",
    ],
    [
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="on"]::green',
      "backtrack-slot-state",
      "The slot shows a currently placed decision.",
    ],
    [
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="remove"]::amber',
      "backtrack-action",
      "The slot shows a removal action.",
    ],
    [
      'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="try"]::blue',
      "backtrack-action",
      "The slot shows a trial action.",
    ],
    [
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-legend-swatch[data-state="feasible"]::green',
      "feasibility-classification",
      "Feasible is a domain verdict class, not terminal completion.",
    ],
    [
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-tick[data-state="feasible"]::green',
      "feasibility-classification",
      "The tick marks a feasible probe, not terminal completion.",
    ],
    [
      'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-verdict[data-state="feasible"]::green',
      "feasibility-classification",
      "The label reports the feasibility verdict.",
    ],
    [
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtedge[data-path="true"]::violet',
      "recursion-path-geometry",
      "The edge identifies the active recursion path.",
    ],
    [
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="base"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="miss"] .steptrace__rtcirc::amber',
      "recursion-phase",
      "The paint identifies base/miss phase.",
    ],
    [
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="cache"] .steptrace__rtcirc::violet',
      "recursion-phase",
      "The paint identifies cache phase.",
    ],
    [
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="return"] .steptrace__rtcirc::violet',
      "recursion-phase",
      "The paint identifies return phase.",
    ],
    [
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="split"] .steptrace__rtcirc::blue',
      "recursion-phase",
      "The paint identifies split phase.",
    ],
    [
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="base"], .steptrace .steptrace__rtswatch[data-state="miss"]::amber',
      "recursion-phase-legend",
      "The swatch names base/miss phase.",
    ],
    [
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="cache"]::violet',
      "recursion-phase-legend",
      "The swatch names cache phase.",
    ],
    [
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="return"], .steptrace .steptrace__rtswatch[data-state="compute"]::violet',
      "recursion-phase-legend",
      "The swatch names return/compute phase.",
    ],
    [
      'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="split"]::blue',
      "recursion-phase-legend",
      "The swatch names split phase.",
    ],
    [
      'Web/custom/steptrace/src/styles/bits.scss::.steptrace__bcell[data-state="gone"]::amber',
      "bit-deletion-geometry",
      "The struck cell shows the region removed by the bit operation.",
    ],
    [
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="entering"]::green',
      "pointer-window-transition",
      "The paint marks a value entering the window.",
    ],
    [
      'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="entering"][data-end]::green',
      "pointer-window-transition",
      "The paint composes entering with endpoint identity.",
    ],
    [
      'Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find-node[data-representative="true"] .steptrace__union-find-root-label::green',
      "representative-identity",
      "The label identifies the set representative.",
    ],
    [
      "Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket::before, .steptrace__z-bracket::after::violet",
      "z-box-geometry",
      "The pseudo-elements draw Z-box brackets.",
    ],
    [
      "Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket::violet",
      "z-box-geometry",
      "The bracket identifies Z-box extent.",
    ],
    [
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket[data-edge-end="1"]::violet',
      "z-box-geometry",
      "The bracket cap identifies the Z-box end.",
    ],
    [
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket[data-edge-start="1"]::violet',
      "z-box-geometry",
      "The bracket cap identifies the Z-box start.",
    ],
    [
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cell[data-box="1"]:not([data-state="probe"]):not([data-state="match"]):not( [data-state="mismatch"] )::violet',
      "z-box-geometry",
      "The selector paints Z-box membership while excluding process states.",
    ],
    [
      'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cell[data-state="copy-source"]::amber',
      "z-copy-identity",
      "The paint identifies the source of a Z copy.",
    ],
    [
      "Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cursor::blue",
      "z-cursor-geometry",
      "The cursor identifies the current Z index.",
    ],
  ].map(([carrierKey, category, rationale]) => ({ carrierKey, category, rationale })),
)

export const expectedRoleBySentinel = {
  "Web/custom/steptrace/src/render.ts::bar.dataset.state::dynamic:state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/mount.ts::insight.append(successMarker(), insightLabel, insightText)::final-success":
    {
      kind: "primary",
      value: "final-success",
    },
  'Web/custom/steptrace/src/render.ts::c.dataset.state::dynamic:data.state[bi] || ""': {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::c.dataset.state::dynamic:state": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/render.ts::cell.dataset.state [occurrence 2]::dynamic:""': {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/render.ts::cell.dataset.state::dynamic:""': {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state::dynamic:state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::c.append(value, successMarker())::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::cell.append(glyph, successMarker())::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::cell.append(value, cue, successMarker())::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::cell.append(value, successMarker())::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::check.append(successMarker())::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::el.dataset.active::false|true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::el.dataset.selected::false|true": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.role::dynamic:descriptor.role": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.state::active": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.state::selected": {
    kind: "primary",
    value: "accepted-visited",
  },
  'Web/custom/steptrace/src/render.ts::element.replaceChildren(descriptor.badge === "success" ? successMarker() : descriptor.badge)::final-success':
    {
      kind: "primary",
      value: "final-success",
    },
  "Web/custom/steptrace/src/render.ts::g.dataset.state::dynamic:state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.active [occurrence 2]::false|true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.active::false|true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state::dynamic:state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::lane.dataset.state::empty|used": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::mark.dataset.state::dynamic:state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::marker: successMarker(),::final-success": {
    kind: "primary",
    value: "final-success",
  },
  'Web/custom/steptrace/src/render.ts::marker: state === "best" ? successMarker() : undefined, [occurrence 2]::final-success':
    {
      kind: "primary",
      value: "final-success",
    },
  'Web/custom/steptrace/src/render.ts::marker: state === "best" ? successMarker() : undefined,::final-success':
    {
      kind: "primary",
      value: "final-success",
    },
  "Web/custom/steptrace/src/render.ts::overflow.dataset.state::empty|overflow": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::pathMarker.append(successMarker())::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::patternCells[frame.cmpP].dataset.state::dynamic:frame.cmpResult":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/render.ts::patternCells[j].dataset.state::suffix": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::pcells[frame.cmpP].dataset.state::probe": {
    kind: "primary",
    value: "active-current",
  },
  'Web/custom/steptrace/src/render.ts::pcells[k].dataset.state::dynamic:""': {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::prefixCells[frame.compare.prefix].dataset.state::dynamic:state":
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/render.ts::prefixCells[k].dataset.state::dynamic:""': {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state::dynamic:attempt.state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state::dynamic:entry.state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state::empty|overflow": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::slot.dataset.state::dynamic:sstate": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::stringCells[frame.compare.candidate].dataset.state::dynamic:state":
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  "Web/custom/steptrace/src/render.ts::stringCells[frame.i].dataset.state::probe": {
    kind: "primary",
    value: "active-current",
  },
  'Web/custom/steptrace/src/render.ts::stringCells[k].dataset.state::dynamic:""': {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.role::dynamic:item.role": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state::dynamic:item.state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__boundary-legend-swatch::legend": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__matrix-role-badge::legend": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__dp-story-swatch [occurrence 2]::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__dp-story-swatch::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__rtswatch [occurrence 2]::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__rtswatch [occurrence 3]::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__rtswatch [occurrence 4]::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__rtswatch [occurrence 5]::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__rtswatch::legend": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__swatch--current::legend":
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__swatch--frontier::legend":
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  "Web/custom/steptrace/src/render.ts::swatchClass:steptrace__swatch steptrace__swatch--visited::legend":
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/render.ts::t.dataset.state::window": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::tcells[frame.cmpT].dataset.state::probe": {
    kind: "primary",
    value: "active-current",
  },
  'Web/custom/steptrace/src/render.ts::tcells[k].dataset.state::dynamic:""': {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::tcells[s + k].dataset.state::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.decision::dynamic:decision": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.state::dynamic:state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::textCell.dataset.state::suffix": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::textCells[found + j].dataset.state::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::textCells[frame.cmpT].dataset.state::dynamic:frame.cmpResult":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/render.ts::tick.dataset.current::false|true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::tick.dataset.state::dynamic:state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::tick.append(label, successMarker())::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::value.append(successMarker())::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::verdict.dataset.state::feasible|infeasible|pending": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::zCells[frame.i].dataset.state::copy-target": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/render.ts::zCells[frame.i].dataset.state::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::zCells[frame.k].dataset.state::copy-source": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/render.ts::zCells[k].dataset.state::dynamic:""': {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-hole="1"] .steptrace__fill::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-hole="1"] .steptrace__num::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-pivot="1"] .steptrace__fill::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="candidate"] .steptrace__fill::amber':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="compare"] .steptrace__fill::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="found"] .steptrace__fill::green':
    {
      kind: "primary",
      value: "final-success",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="increment"] .steptrace__fill::blue':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="probe"] .steptrace__fill::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="range"] .steptrace__fill::neutral':
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="scatter"] .steptrace__fill::blue':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="sorted"] .steptrace__fill::green':
    {
      kind: "primary",
      value: "final-success",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="swap"] .steptrace__fill::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="unseen"] .steptrace__fill::neutral':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/bars.scss::.steptrace__fill::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/styles/bars.scss::.steptrace__marker--a::blue": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/styles/bars.scss::.steptrace__marker--b::violet": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__marker[data-placing="1"] .steptrace__marker-body::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.state:::": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::chip.dataset.active::0|1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::lane.dataset.active::0|1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state:::": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.target::0|1|place": {
    kind: "overlay",
    value: "goal-target",
  },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bars--output .steptrace__bar[data-target="1"] .steptrace__fill::green':
    {
      kind: "overlay",
      value: "goal-target",
    },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bucket[data-active="1"]::after::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bucket[data-placement="1"] .steptrace__distribution-details::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bucket[data-previous="1"] .steptrace__distribution-details::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-lane[data-active="1"]::after::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-token[data-active="1"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-token[data-compare="1"]::amber':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-token[data-gather="1"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="best"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="current"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="dependency"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="stored"]::violet':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-attempt[data-state="active"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-attempt[data-state="best"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-attempt[data-state="repeated"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-memo-row[data-state="hit"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-memo-row[data-state="stored"]::violet':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin[data-state="active"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin[data-state="selected"]::amber':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="active"], .steptrace .steptrace__dp-story-swatch[data-state="current"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="dependency"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="hit"], .steptrace .steptrace__dp-story-swatch[data-state="best"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="repeated"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="selected"], .steptrace .steptrace__dp-story-swatch[data-state="path"]::amber':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="stored"]::violet':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-cell-stored::violet":
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="best"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="current"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="dependency"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="path"]::amber':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="repeated"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="stored"]::violet':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rectree[data-profile="merge-sort"] .steptrace__rtedge[data-related="true"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rectree[data-profile="merge-sort"] .steptrace__rtnode[data-related="true"] .steptrace__rtcirc::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtedge::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtedge[data-path="true"]::violet':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode .steptrace__rtcirc::neutral":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode .steptrace__rtring::violet":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="base"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="miss"] .steptrace__rtcirc::amber':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="cache"] .steptrace__rtcirc::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="call"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="compute"] .steptrace__rtcirc::neutral':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="combine"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="store"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="hit"] .steptrace__rtcirc, .steptrace .steptrace__rtnode[data-state="incumbent"] .steptrace__rtcirc::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="infeasible"] .steptrace__rtcirc::red':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="return"] .steptrace__rtcirc::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtnode[data-state="split"] .steptrace__rtcirc::blue':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="base"], .steptrace .steptrace__rtswatch[data-state="miss"]::amber':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="cache"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="combine"], .steptrace .steptrace__rtswatch[data-state="store"], .steptrace .steptrace__rtswatch[data-state="hit"], .steptrace .steptrace__rtswatch[data-state="incumbent"]::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="infeasible"]::red':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="return"], .steptrace .steptrace__rtswatch[data-state="compute"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/rectree.scss::.steptrace .steptrace__rtswatch[data-state="split"]::blue':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.target::dynamic:String(id === frame.target)":
    {
      kind: "overlay",
      value: "goal-target",
    },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.active::active|candidate|residual":
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.selected::accepted": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::swatchClass:steptrace__gs-swatch steptrace__gs-swatch--${state}::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="active"], .steptrace .steptrace__gs-arrow[data-role="cut"]::violet':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="selected"]::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-closure::amber": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-active="true"]::violet':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-cut="true"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-selected="true"]::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="1"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::green':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="2"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::violet':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="3"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::amber':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-group="4"]:not([data-state="open"]):not([data-state="current"]):not( [data-state="rejected"] ) .steptrace__gs-node-circle::blue':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-state="closed"] .steptrace__gs-node-circle, .steptrace .steptrace__gs-node[data-state="path"] .steptrace__gs-node-circle::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-state="current"] .steptrace__gs-node-circle::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-state="open"] .steptrace__gs-node-circle::amber':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-state="rejected"] .steptrace__gs-node-circle::violet':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-swatch--closed::green":
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-swatch--current::blue":
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-swatch--goal::violet":
    {
      kind: "overlay",
      value: "goal-target",
    },
  "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-swatch--open::amber":
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-target::violet": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state::current": {
    kind: "primary",
    value: "active-current",
  },
  'Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state::dynamic:""': {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state::dynamic:state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state::seen": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state::dynamic:compared.has(index)":
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state::empty": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state::weakest": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state::winner": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::marker: successMarker(),::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::swatchClass:steptrace__heap-swatch steptrace__heap-swatch--current::legend":
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/families/heap-selection.ts::swatchClass:steptrace__heap-swatch steptrace__heap-swatch--rejected::legend":
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  "Web/custom/steptrace/src/families/heap-selection.ts::swatchClass:steptrace__heap-swatch steptrace__heap-swatch--weakest::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/heap-selection.ts::swatchClass:steptrace__heap-swatch steptrace__heap-swatch--winner::legend":
    {
      kind: "primary",
      value: "final-success",
    },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-edge[data-path="1"]::blue':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-mark::violet": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="compare"] .steptrace__ncirc::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="settled"] .steptrace__ncirc::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="swap"] .steptrace__ncirc::violet':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="weakest"] .steptrace__ncirc::amber':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="winner"] .steptrace__ncirc::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-root-label::amber":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-stream .steptrace__pcell[data-state="current"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-stream .steptrace__pcell[data-state="rejected"]::violet':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-stream .steptrace__pcell[data-state="winner"]::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--current::blue":
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--rejected::violet":
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--weakest::amber":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--winner::green":
    {
      kind: "primary",
      value: "final-success",
    },
  "Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-lane--overflow::amber":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-legend-swatch[data-state="feasible"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-legend-swatch[data-state="infeasible"]::red':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-legend-swatch[data-state="probe"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-meter-fill::blue":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-package::blue": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-tick[data-current="true"]:not([data-state="answer"])::after::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-tick[data-state="answer"]::green':
    {
      kind: "primary",
      value: "final-success",
    },
  'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-tick[data-state="feasible"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-tick[data-state="infeasible"]::red':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-verdict[data-state="feasible"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-verdict[data-state="infeasible"]::red':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state::dynamic:frame.selected.includes(interval.id)":
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/families/interval-track.ts::swatchClass:steptrace__interval-swatch steptrace__interval-swatch--${state}::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band--current::blue":
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band--output::green":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="accepted"]::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="candidate"]::amber':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="conflict"]::violet':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="gap"]::violet':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="rejected"]::violet':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-swatch--candidate::amber":
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-swatch--current::blue":
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-swatch--output::green":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-swatch--rejected::violet":
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  "Web/custom/steptrace/src/families/linked-topology.ts::swatchClass:steptrace__linked-swatch steptrace__linked-swatch--cycle::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/linked-topology.ts::swatchClass:steptrace__linked-swatch steptrace__linked-swatch--entry::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/linked-topology.ts::swatchClass:steptrace__linked-swatch steptrace__linked-swatch--fast::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/linked-topology.ts::swatchClass:steptrace__linked-swatch steptrace__linked-swatch--slow::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-arrow::neutral":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-arrow[data-role="cycle"]::neutral':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-arrow[data-role="cycle"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-edge::neutral":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-edge[data-cycle="1"]::neutral':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-edge[data-cycle="1"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-appended="1"] > .steptrace__contiguous-array::after::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-moved="1"] > .steptrace__contiguous-array::after::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-relinked="1"] .steptrace__linked-list-link[data-pointer="next"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-relinked="1"] .steptrace__linked-list-pointer[data-pointer="next"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-entry="true"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-fast="true"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-meeting="true"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-slow="true"]::blue':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-pointer--fast::violet":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-pointer--slow::blue":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--cycle::violet":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--entry::green":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--fast::violet":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--slow::blue":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__lru-map .steptrace__contiguous-cell[data-active="1"]::green':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="negative-cycle"]::red':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="operand-a"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="operand-b"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="path"]::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="stage-axis"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="stored"]::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="target"]::violet':
    {
      kind: "overlay",
      value: "goal-target",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp td[data-roles~="target"][data-decision="improve"]::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp--guided th[data-role="stage-row"], .steptrace .steptrace__dp--guided th[data-role="stage-column"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp:not(.steptrace__dp--guided) td[data-state="cur"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp:not(.steptrace__dp--guided) td[data-state="dep"]::amber':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__dp:not(.steptrace__dp--guided) td[data-state="path"]::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge:is([data-role="stored"], [data-role="path"])::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge[data-role="operand-a"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge[data-role="operand-b"], .steptrace .steptrace__matrix-role-badge[data-role="stage-axis"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge[data-role="target"]::violet':
    {
      kind: "overlay",
      value: "goal-target",
    },
  'Web/custom/steptrace/src/styles/dp.scss::.steptrace .steptrace__matrix-role-badge[data-role="write"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/render.ts::? successMarker()::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::cell.dataset.active::0|1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::cell.dataset.matched::dynamic:frame.matches.some(":
    {
      kind: "overlay",
      value: "range-match",
    },
  "Web/custom/steptrace/src/families/prefix-character.ts::const terminal = successMarker()::final-success":
    {
      kind: "primary",
      value: "final-success",
    },
  "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state::fallback|fallback":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/prefix-character.ts::role.dataset.state::dynamic:state": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::swatchClass:steptrace__swatch steptrace__prefix-swatch [occurrence 2]::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/prefix-character.ts::swatchClass:steptrace__swatch steptrace__prefix-swatch [occurrence 3]::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/prefix-character.ts::swatchClass:steptrace__swatch steptrace__prefix-swatch [occurrence 4]::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/prefix-character.ts::swatchClass:steptrace__swatch steptrace__prefix-swatch::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge--failure::neutral":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge--failure::violet":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge-role[data-state="active"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge[data-state="active"], .steptrace__prefix-node[data-state="active"] circle::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge[data-state="created"], .steptrace__prefix-node[data-state="created"] circle::amber':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge[data-state="fallback"]::violet':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge[data-state="reused"], .steptrace__prefix-node[data-state="reused"] circle::violet':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-node circle::neutral":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-node[data-state="terminal"] circle::green':
    {
      kind: "primary",
      value: "final-success",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="active"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="created"]::amber':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="reused"]::violet':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="terminal"]::green':
    {
      kind: "primary",
      value: "final-success",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-text-cell[data-active="1"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-text-cell[data-matched="1"]::green':
    {
      kind: "overlay",
      value: "range-match",
    },
  "Web/custom/steptrace/src/families/prefix-sum.ts::swatchClass:steptrace__prefix-sum-swatch steptrace__prefix-sum-swatch--build::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/prefix-sum.ts::swatchClass:steptrace__prefix-sum-swatch steptrace__prefix-sum-swatch--cancel::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/prefix-sum.ts::swatchClass:steptrace__prefix-sum-swatch steptrace__prefix-sum-swatch--range::legend":
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-strip .steptrace__pcell[data-state="build"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-strip .steptrace__pcell[data-state="cancel"]::violet':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-strip .steptrace__pcell[data-state="range"]::green':
    {
      kind: "overlay",
      value: "range-match",
    },
  "Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-swatch--build::blue":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-swatch--cancel::violet":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-swatch--range::green":
    {
      kind: "overlay",
      value: "range-match",
    },
  "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.state::candidate|compare|sorted": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::card.dataset.active::0|1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::invariant.dataset.state::holds|merge": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-invariant[data-state="holds"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-invariant[data-state="merge"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-active="1"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-merged="1"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="0"]::blue':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="1"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="2"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-run="3"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="0"][data-state=""] .steptrace__fill::blue':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="1"][data-state=""] .steptrace__fill::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="2"][data-state=""] .steptrace__fill::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace[data-visual-family="run-stack"] .steptrace__bar[data-run="3"][data-state=""] .steptrace__fill::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/stack-sequence.ts::swatchClass:steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--retained::legend":
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  "Web/custom/steptrace/src/families/stack-sequence.ts::swatchClass:steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--scan::legend":
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-icon::blue":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="popped"], .steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="resolved"]::violet':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="popped"]::violet':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="retained"]::amber':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="scan"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-stack-cell[data-top="1"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-stack-cell[data-visible="1"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-swatch--popped::violet":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-swatch--retained::amber":
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  "Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-swatch--scan::blue":
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace .steptrace__bt-tree .steptrace__rtedge[data-return="true"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace .steptrace__bt-tree .steptrace__rtedge[data-solution="true"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__bt-tree-return-arrow::violet": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-conflict="1"]::amber': {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="queen"]::green': {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="reject"]::red': {
    kind: "primary",
    value: "rejected-invalid",
  },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="remove"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="solved"] .steptrace__btqueen, .steptrace__btcell[data-state="queen"] .steptrace__btqueen::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="solved"]::green':
    {
      kind: "primary",
      value: "final-success",
    },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="try"]::blue': {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="on"]::green': {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="reject"]::red': {
    kind: "primary",
    value: "rejected-invalid",
  },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="remove"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btslot[data-state="try"]::blue': {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/bits.scss::.steptrace__bcell[data-state="borrow"]::blue': {
    kind: "primary",
    value: "active-current",
  },
  'Web/custom/steptrace/src/styles/bits.scss::.steptrace__bcell[data-state="die"]::blue': {
    kind: "primary",
    value: "active-current",
  },
  'Web/custom/steptrace/src/styles/bits.scss::.steptrace__bcell[data-state="gone"]::amber': {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::arc.dataset.active::false|true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/styles/graph.scss::.steptrace__arrow::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/styles/graph.scss::.steptrace__edge::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/graph.scss::.steptrace__edge[data-active="true"]::blue': {
    kind: "primary",
    value: "active-current",
  },
  'Web/custom/steptrace/src/styles/graph.scss::.steptrace__edge[data-selected="true"]::green': {
    kind: "primary",
    value: "accepted-visited",
  },
  'Web/custom/steptrace/src/styles/graph.scss::.steptrace__node .steptrace__nmark[data-state="current"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/graph.scss::.steptrace__node .steptrace__nmark[data-state="frontier"]::amber':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/graph.scss::.steptrace__node[data-state="current"] .steptrace__ncirc::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/graph.scss::.steptrace__node[data-state="frontier"] .steptrace__ncirc::amber':
    {
      kind: "primary",
      value: "candidate-frontier",
    },
  'Web/custom/steptrace/src/styles/graph.scss::.steptrace__node[data-state="visited"] .steptrace__ncirc::green':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/graph.scss::.steptrace__ntarget::violet": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/styles/graph.scss::.steptrace__swatch--current::blue": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/styles/graph.scss::.steptrace__swatch--frontier::amber": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/styles/graph.scss::.steptrace__swatch--visited::green": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pbr--l::blue": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pbr--r::violet": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pbrackets[data-match="1"] .steptrace__pbr::green':
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-end="l"]::blue': {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-end="r"]::violet': {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="duplicate"]::red': {
    kind: "primary",
    value: "rejected-invalid",
  },
  'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="duplicate"][data-end]::red':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="entering"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="entering"][data-end]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="match"]::green': {
    kind: "overlay",
    value: "range-match",
  },
  'Web/custom/steptrace/src/styles/pointers.scss::.steptrace__pcell[data-state="match"][data-end]::green':
    {
      kind: "overlay",
      value: "range-match",
    },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state::dynamic:semantics.stateForIndex(frame, k)":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/shared.scss::.steptrace .steptrace__success-marker circle::green":
    {
      kind: "primary",
      value: "final-success",
    },
  "Web/custom/steptrace/src/styles/shared.scss::.steptrace__insight::green": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/styles/shared.scss::.steptrace__legend-swatch::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/styles/status-toolbar.scss::.steptrace__key::blue": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__bm .steptrace__cell[data-state="suffix"]::underline':
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__bm .steptrace__cell[data-state="suffix"]::violet':
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="found"]::green': {
    kind: "primary",
    value: "final-success",
  },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="match"]::green': {
    kind: "primary",
    value: "accepted-visited",
  },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="match"]::underline': {
    kind: "overlay",
    value: "range-match",
  },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="mismatch"]::red': {
    kind: "primary",
    value: "rejected-invalid",
  },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="probe"]::blue': {
    kind: "primary",
    value: "active-current",
  },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="probe"]::underline': {
    kind: "primary",
    value: "active-current",
  },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__match:not(.steptrace__z) .steptrace__cell[data-state="found"]::green':
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__match:not(.steptrace__z) .steptrace__cell[data-state="found"]::underline':
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__z .steptrace__cell[data-state="match"]::green':
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__z .steptrace__cell[data-state="match"]::underline':
    {
      kind: "overlay",
      value: "range-match",
    },
  "Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket::before, .steptrace__z-bracket::after::violet":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket::violet": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket[data-edge-end="1"]::violet': {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-bracket[data-edge-start="1"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cell[data-box="1"]:not([data-state="probe"]):not([data-state="match"]):not( [data-state="mismatch"] )::violet':
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cell[data-state="copy-source"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cell[data-state="copy-target"]::violet':
    {
      kind: "overlay",
      value: "goal-target",
    },
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cell[data-state="copy-target"]::underline':
    {
      kind: "overlay",
      value: "goal-target",
    },
  "Web/custom/steptrace/src/styles/string.scss::.steptrace__z-cursor::blue": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/binary-tree.ts::const badge = successMarker()::final-success":
    {
      kind: "primary",
      value: "final-success",
    },
  "Web/custom/steptrace/src/families/binary-tree.ts::group.dataset.state::dynamic:state.repairing.has(entry.node.key)":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-edge[data-state="path"]::blue':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-edge[data-state="rotation"]::violet':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-node[data-state="changed"] .steptrace__ncirc::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-node[data-state="path"] .steptrace__ncirc::blue':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-node[data-state="rotation"] .steptrace__ncirc::violet':
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/families/interactive-structure.ts::cell.dataset.active::0|1": {
    kind: "primary",
    value: "active-current",
  },
  'Web/custom/steptrace/src/styles/contiguous-storage.scss::.steptrace__contiguous-cell[data-active="1"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/contiguous-storage.scss::.steptrace__contiguous-cell[data-changed="1"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/contiguous-storage.scss::.steptrace__contiguous-cell[data-view="1"]::violet':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-edge::neutral":
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-edge[data-changed="1"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-list-row[data-changed="1"], .steptrace .steptrace__graph-rep-edge-row[data-changed="1"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-matrix-cell[data-changed="1"]::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/graph-representation.scss::.steptrace .steptrace__graph-rep-matrix-cell[data-value="1"] .steptrace__dp-value::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/hash-index.ts::cell.dataset.result::) :": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::chainLane.dataset.active::0|1|closed-addressing":
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-probe="collision"]::amber':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-probe="current"]::amber':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-probe="visited"]::blue':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-result="remove"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-result="success"]::green':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-path="1"]::blue':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-result="remove"]::amber':
    {
      kind: "primary",
      value: "neutral-context",
    },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-result="success"]::green':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-selected="1"]::amber':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-token[data-motion="success"]::green':
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state::dynamic:options.settled?.has(node.id)":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/linked-topology.ts::result.append(successMarker())::final-success":
    {
      kind: "primary",
      value: "final-success",
    },
  "Web/custom/steptrace/src/families/multiway-tree.ts::group.dataset.role::internal|leaf": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::path.dataset.state::${leaf.id}->${next.id}|active|neutral":
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-edge[data-state="path"]::blue':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-link[data-state="active"]::green':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node .steptrace__multiway-tree-cell[data-state="found"]::green':
    {
      kind: "primary",
      value: "final-success",
    },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node .steptrace__multiway-tree-cell[data-state="special"]::amber':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node[data-affected="1"] .steptrace__multiway-tree-cell::violet':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node[data-path="1"] .steptrace__multiway-tree-cell::blue':
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role::dynamic:role": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/range-aggregate.scss::.steptrace__range-block:is([data-role="query"], [data-role="prefix-right"])::blue':
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/range-aggregate.scss::.steptrace__range-block[data-role="cancelled"]::neutral':
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/range-aggregate.scss::.steptrace__range-block[data-role="prefix-left"]::violet':
    {
      kind: "overlay",
      value: "range-match",
    },
  'Web/custom/steptrace/src/styles/range-aggregate.scss::.steptrace__range-block[data-role="update"]::amber':
    {
      kind: "overlay",
      value: "range-match",
    },
  "Web/custom/steptrace/src/families/stack-sequence.ts::swatchClass:steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--popped::legend":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/families/union-find.ts::edge.dataset.active::dynamic:String(highlighted.has(index))":
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/families/union-find.ts::group.dataset.active::dynamic:String(highlighted.has(index))":
    {
      kind: "primary",
      value: "active-current",
    },
  "Web/custom/steptrace/src/families/union-find.ts::group.dataset.selected::dynamic:String(selected.has(index))":
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__uf .steptrace__ufnode .steptrace__ncirc::neutral":
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__ufarc::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__ufarc[data-active="true"]::blue': {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find-edge::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  'Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find-edge[data-active="true"]::blue':
    {
      kind: "primary",
      value: "active-current",
    },
  'Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find-node[data-representative="true"] .steptrace__union-find-root-label::green':
    {
      kind: "primary",
      value: "neutral-context",
    },
  "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find-svg marker path::neutral":
    {
      kind: "primary",
      value: "accepted-visited",
    },
  "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::amber": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::blue": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::green": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/styles/unionfind.scss::.steptrace__union-find::violet": {
    kind: "primary",
    value: "neutral-context",
  },
}

structuralExclusions.push(
  {
    carrierKey:
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="cut"]::violet',
    category: "graph-cut-identity",
    rationale: "The arrow color identifies the cut overlay; it is not a lifecycle state.",
  },
  {
    carrierKey:
      "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-selection:not(.steptrace__two-heaps) .steptrace__heap-root-label::amber",
    category: "heap-frontier-identity",
    rationale:
      "The label identifies the weakest/root frontier position rather than lifecycle state.",
  },
  ...[
    [
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-attempt[data-state="repeated"]::violet',
      "dp-reused-answer",
    ],
    [
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="hit"], .steptrace .steptrace__dp-story-swatch[data-state="best"]::green',
      "dp-combined-legend",
    ],
    [
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="repeated"]::violet',
      "dp-reused-legend",
    ],
    [
      'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="repeated"]::violet',
      "dp-reused-path",
    ],
    [
      "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-mark::violet",
      "heap-mark-identity",
    ],
    [
      "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--weakest::amber",
      "heap-frontier-identity",
    ],
    [
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-fast="true"]::violet',
      "linked-pointer-identity",
    ],
    [
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-meeting="true"]::amber',
      "linked-pointer-overlap",
    ],
    [
      'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-slow="true"]::blue',
      "linked-pointer-identity",
    ],
    [
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-pointer--fast::violet",
      "linked-pointer-identity",
    ],
    [
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-pointer--slow::blue",
      "linked-pointer-identity",
    ],
    [
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--cycle::violet",
      "linked-cycle-identity",
    ],
    [
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--fast::violet",
      "linked-pointer-identity",
    ],
    [
      "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--slow::blue",
      "linked-pointer-identity",
    ],
    [
      "Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge--failure::violet",
      "prefix-failure-link-identity",
    ],
    [
      'Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-strip .steptrace__pcell[data-state="cancel"]::violet',
      "prefix-sum-algebra-operand",
    ],
    [
      "Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-swatch--cancel::violet",
      "prefix-sum-algebra-legend",
    ],
    [
      "Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-icon::blue",
      "stack-scan-icon",
    ],
    [
      'Web/custom/steptrace/src/styles/contiguous-storage.scss::.steptrace__contiguous-cell[data-view="1"]::violet',
      "span-view-extent",
    ],
    [
      'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-state="cut"]::violet',
      "graph-cut-identity",
    ],
  ].map(([carrierKey, category]) => ({
    carrierKey,
    category,
    rationale:
      "This source-proven cue identifies concept geometry, identity, or algebra rather than shared lifecycle state.",
  })),
)

Object.assign(expectedRoleBySentinel, {
  "Web/custom/steptrace/src/families/heap-selection.ts::swatchClass:steptrace__heap-swatch steptrace__heap-swatch--winner::legend":
    { kind: "primary", value: "accepted-visited" },
  "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--winner::green":
    { kind: "primary", value: "accepted-visited" },
  "Web/custom/steptrace/src/families/multiway-tree.ts::const marker = successMarker()::final-success":
    { kind: "primary", value: "final-success" },
  "Web/custom/steptrace/src/families/prefix-character.ts::marker: successMarker(),::final-success":
    { kind: "primary", value: "final-success" },
  "Web/custom/steptrace/src/render.ts::cell.append(label, value, successMarker())::final-success": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::cell.append(place, cost, stored, successMarker())::final-success":
    { kind: "primary", value: "final-success" },
  'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-edge[data-state="path"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-edge[data-state="rotation"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-node[data-state="path"] .steptrace__ncirc::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-node[data-state="rotation"] .steptrace__ncirc::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bars--output .steptrace__bar[data-target="1"] .steptrace__fill::violet':
    { kind: "overlay", value: "goal-target" },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-token[data-compare="1"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="stored"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-memo-row[data-state="stored"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin[data-state="selected"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="selected"], .steptrace .steptrace__dp-story-swatch[data-state="path"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="stored"]::green':
    { kind: "primary", value: "accepted-visited" },
  "Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-cell-stored::green":
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="path"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="stored"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="active"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="accepted"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="candidate"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-arrow[data-role="rejected"]::red':
    { kind: "primary", value: "rejected-invalid" },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-state="accepted"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-state="active"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-state="candidate"], .steptrace .steptrace__gs-edge[data-state="residual"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-edge[data-state="rejected"]::red':
    { kind: "primary", value: "rejected-invalid" },
  'Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-node[data-state="rejected"] .steptrace__gs-node-circle::red':
    { kind: "primary", value: "rejected-invalid" },
  "Web/custom/steptrace/src/styles/graph-state.scss::.steptrace .steptrace__gs-swatch--rejected::red":
    { kind: "primary", value: "rejected-invalid" },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-probe="current"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-probe="visited"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-result="success"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-path="1"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-result="success"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-selected="1"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-token[data-motion="success"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-edge[data-path="1"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="settled"] .steptrace__ncirc::neutral':
    { kind: "primary", value: "neutral-context" },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-node[data-state="swap"] .steptrace__ncirc::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-stream .steptrace__pcell[data-state="rejected"]::red':
    { kind: "primary", value: "rejected-invalid" },
  "Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-swatch--rejected::red":
    { kind: "primary", value: "rejected-invalid" },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__heap-variant .steptrace__heap-edge[data-path="1"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace .steptrace__merge-heap .steptrace__heap-node[data-state="settled"] .steptrace__ncirc::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace[data-structure="fibonacci-heap"] .steptrace__heap-node[data-state="settled"] .steptrace__ncirc::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/heap-selection.scss::.steptrace[data-structure="heap"] .steptrace__heap-node[data-state="settled"] .steptrace__ncirc, .steptrace[data-structure="binomial-queue"] .steptrace__heap-node[data-state="settled"] .steptrace__ncirc::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="conflict"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="gap"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band[data-state="rejected"]::red':
    { kind: "primary", value: "rejected-invalid" },
  "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-swatch--rejected::red":
    { kind: "primary", value: "rejected-invalid" },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__lru-map .steptrace__contiguous-cell[data-active="1"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-edge[data-state="path"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node .steptrace__multiway-tree-cell[data-state="special"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node[data-affected="1"] .steptrace__multiway-tree-cell::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node[data-path="1"] .steptrace__multiway-tree-cell::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge[data-state="fallback"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-edge[data-state="reused"], .steptrace__prefix-node[data-state="reused"] circle::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="reused"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="popped"]::blue':
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-scan .steptrace__pcell[data-state="resolved"]::green':
    { kind: "primary", value: "accepted-visited" },
  "Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-swatch--popped::green":
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bucket[data-placement="1"] .steptrace__distribution-details::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-bucket[data-previous="1"] .steptrace__distribution-details::violet':
    { kind: "overlay", value: "goal-target" },
  'Web/custom/steptrace/src/styles/distribution.scss::.steptrace__distribution-token[data-gather="1"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="best"]::green':
    { kind: "primary", value: "final-success" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="dependency"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-attempt[data-state="best"]::green':
    { kind: "primary", value: "final-success" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-memo-row[data-state="hit"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__dp-story-swatch[data-state="dependency"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="best"]::green':
    { kind: "primary", value: "final-success" },
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="dependency"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::best": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::best": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::path": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-band--output::green":
    { kind: "primary", value: "accepted-visited" },
  "Web/custom/steptrace/src/styles/interval-track.scss::.steptrace .steptrace__interval-swatch--output::green":
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-appended="1"] > .steptrace__contiguous-array::after::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-moved="1"] > .steptrace__contiguous-array::after::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-relinked="1"] .steptrace__linked-list-link[data-pointer="next"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-list-node-card[data-relinked="1"] .steptrace__linked-list-pointer[data-pointer="next"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-entry="true"]::green':
    { kind: "primary", value: "final-success" },
  "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--entry::green":
    { kind: "primary", value: "final-success" },
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="terminal"]::green':
    { kind: "primary", value: "final-success" },
  "Web/custom/steptrace/src/styles/prefix-sum.scss::.steptrace .steptrace__prefix-sum-swatch--build::blue":
    { kind: "primary", value: "active-current" },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-invariant[data-state="holds"]::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-invariant[data-state="merge"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/run-stack.scss::.steptrace__run-stack-card[data-merged="1"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-stack-cell[data-top="1"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/stack-sequence.scss::.steptrace .steptrace__stack-sequence-stack-cell[data-visible="1"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/binary-tree.scss::.steptrace .steptrace__binary-tree-node[data-state="changed"] .steptrace__ncirc::green':
    { kind: "primary", value: "accepted-visited" },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-probe="collision"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-cell[data-result="remove"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/hash-index.scss::.steptrace__hash-chain-slot[data-result="remove"]::amber':
    { kind: "primary", value: "candidate-frontier" },
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-link[data-state="active"]::green':
    { kind: "primary", value: "accepted-visited" },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::accepted": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::active": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::candidate": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::cut": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::rejected": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.state#1::residual": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::marker.dataset.state#1::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::marker.dataset.state#1::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
})

const structuralExclusionKeys = new Set(structuralExclusions.map(({ carrierKey }) => carrierKey))

const actualTokenFor = (carrierKey) => {
  const signal = carrierKey.split("::").at(-1)
  return ["blue", "amber", "green", "violet", "red", "neutral"].includes(signal)
    ? `var(--_${signal})`
    : null
}

const signalFor = (carrierKey) => carrierKey.split("::").at(-1)

// Semantic meaning is declared per discovered assignment signal. Current token,
// spelling, and color never determine the expected lifecycle role.
const dynamicExpectedRoleBySentinel = {
  "Web/custom/steptrace/src/families/binary-tree.ts::group.dataset.state#1::changed": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/binary-tree.ts::group.dataset.state#1::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/binary-tree.ts::group.dataset.state#1::path": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/binary-tree.ts::group.dataset.state#1::rotation": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/binary-tree.ts::line.dataset.state#1::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/binary-tree.ts::line.dataset.state#1::path": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/binary-tree.ts::line.dataset.state#1::rotation": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.state#1::scatter": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.state#2::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.state#2::sorted": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.target#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.target#1::1": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::chip.dataset.active#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::chip.dataset.active#1::1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::lane.dataset.active#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/bucket-distribution.ts::lane.dataset.active#1::1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#1::compare": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#1::increment": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#2::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#2::sorted": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.target#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.target#1::1": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bucket.dataset.active#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/distribution-sort.ts::bucket.dataset.active#1::1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::closed": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::current": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::open": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::path": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.state#1::rejected": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.target#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::group.dataset.target#1::true": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.active#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.active#1::true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.selected#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/graph-state.ts::line.dataset.selected#1::true": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::cell.dataset.result#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::cell.dataset.result#1::remove": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::cell.dataset.result#1::success": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::chainLane.dataset.active#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::chainLane.dataset.active#1::1": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::slot.dataset.result#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::slot.dataset.result#1::remove": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::slot.dataset.result#1::success": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::slot.dataset.selected#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/hash-index.ts::slot.dataset.selected#1::1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#1::current": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#2::seen": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#3::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#4::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#4::current": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#4::rejected": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#4::seen": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::cell.dataset.state#4::winner": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#1::empty": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#2::weakest": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#3::winner": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#4::compare": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#4::empty": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#4::swap": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#4::weakest": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/heap-selection.ts::group.dataset.state#4::winner": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#1::compare": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#1::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#1::settled": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#2::compare": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#2::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/heap-structure.ts::group.dataset.state#2::settled": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/interactive-structure.ts::cell.dataset.active#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/interactive-structure.ts::cell.dataset.active#1::1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::accepted": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::candidate": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::conflict": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::gap": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::processed": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/interval-track.ts::band.dataset.state#1::rejected": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::cell.dataset.state#1::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::cell.dataset.state#1::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::cell.dataset.state#1::special": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::group.dataset.role#1::internal": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::group.dataset.role#1::leaf": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::line.dataset.state#1::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::line.dataset.state#1::path": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::path.dataset.state#1::active": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/multiway-tree.ts::path.dataset.state#1::neutral": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::cell.dataset.active#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::cell.dataset.active#1::1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::cell.dataset.matched#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::cell.dataset.matched#1::1": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state#1::active": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state#1::created": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state#1::fallback": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state#1::reused": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::element.dataset.state#1::settled": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::active": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::created": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::reused": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::settled": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::terminal": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::role.dataset.state#1::active": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::role.dataset.state#1::created": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::role.dataset.state#1::reused": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/families/prefix-character.ts::role.dataset.state#1::settled": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#1::build": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#1::cancel": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#1::range": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#2::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#2::build": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#2::cancel": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/families/prefix-sum.ts::cell.dataset.state#2::range": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::cancelled": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::idle": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::prefix-left": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::prefix-right": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::query": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/families/range-aggregate.ts::block.dataset.role#1::update": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.current#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.current#1::1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.state#1::candidate": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.state#1::compare": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.state#1::sorted": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::card.dataset.active#1::0": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::card.dataset.active#1::1": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::invariant.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/run-stack.ts::invariant.dataset.state#1::merge": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/stack-sequence.ts::cell.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/stack-sequence.ts::cell.dataset.state#1::popped": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/stack-sequence.ts::cell.dataset.state#1::resolved": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/stack-sequence.ts::cell.dataset.state#1::retained": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/families/stack-sequence.ts::cell.dataset.state#1::scan": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/union-find.ts::edge.dataset.active#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/union-find.ts::edge.dataset.active#1::true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/union-find.ts::group.dataset.active#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/union-find.ts::group.dataset.active#1::true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/families/union-find.ts::group.dataset.selected#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/families/union-find.ts::group.dataset.selected#1::true": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::arc.dataset.active#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::arc.dataset.active#1::true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::candidate": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::compare": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::sorted": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::swap": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::eliminated": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::probe": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::range": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::unseen": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::c.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::c.dataset.state#1::duplicate": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::c.dataset.state#1::entering": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::c.dataset.state#1::match": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::c.dataset.state#1::window": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::c.dataset.state#2::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::c.dataset.state#2::borrow": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::c.dataset.state#2::die": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::c.dataset.state#2::gone": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#2::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#3::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::best": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::current": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::dependency": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::stored": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::best": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::current": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::dependency": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::path": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::repeated": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::stored": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::attacked": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::queen": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::reject": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::remove": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::solved": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::try": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::columnHeaders[c].dataset.role#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::columnHeaders[c].dataset.role#1::stage-column": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::el.dataset.active#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::el.dataset.active#1::true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::el.dataset.selected#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::el.dataset.selected#1::true": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.role#1::keep": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.role#1::operand-a": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.role#1::operand-b": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.role#1::target": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.role#1::write": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.state#1::selected": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.state#2::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::element.dataset.state#2::active": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::g.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::g.dataset.state#1::current": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::g.dataset.state#1::frontier": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::g.dataset.state#1::visited": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.active#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.active#1::true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.active#2::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.active#2::true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#1::combine": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#1::compute": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#1::prune": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#1::return": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#1::split": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::base": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::cache": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::call": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::combine": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::incumbent": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::infeasible": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::prune": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::return": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::split": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::group.dataset.state#2::store": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::lane.dataset.state#1::empty": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::lane.dataset.state#1::used": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::mark.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::mark.dataset.state#1::current": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::mark.dataset.state#1::frontier": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::mark.dataset.state#1::visited": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::overflow.dataset.state#1::empty": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::overflow.dataset.state#1::overflow": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::patternCells[frame.cmpP].dataset.state#1::match": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::patternCells[frame.cmpP].dataset.state#1::mismatch": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::patternCells[j].dataset.state#1::suffix": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::pcells[frame.cmpP].dataset.state#1::match": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::pcells[frame.cmpP].dataset.state#1::mismatch": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::pcells[k].dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::prefixCells[frame.compare.prefix].dataset.state#1::match": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::prefixCells[frame.compare.prefix].dataset.state#1::mismatch":
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  "Web/custom/steptrace/src/render.ts::prefixCells[k].dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state#1::empty": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state#1::overflow": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state#2::active": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state#2::best": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state#2::dead": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state#2::repeated": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state#3::hit": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::row.dataset.state#3::stored": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::rowHeaders[r].dataset.role#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::rowHeaders[r].dataset.role#1::stage-row": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::slot.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::slot.dataset.state#1::on": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::slot.dataset.state#1::reject": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::slot.dataset.state#1::remove": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::slot.dataset.state#1::try": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::stringCells[frame.compare.candidate].dataset.state#1::match":
    {
      kind: "overlay",
      value: "range-match",
    },
  "Web/custom/steptrace/src/render.ts::stringCells[frame.compare.candidate].dataset.state#1::mismatch":
    {
      kind: "primary",
      value: "rejected-invalid",
    },
  "Web/custom/steptrace/src/render.ts::stringCells[frame.i].dataset.state#1::probe": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::stringCells[k].dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::keep": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::operand-a": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::operand-b": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::path": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::stage-axis": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::target": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.role#1::write": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::active": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::base": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::best": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::cache": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::combine": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::created": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::current": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::dependency": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::feasible": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::hit": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::incumbent": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::infeasible": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::path": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::probe": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::prune": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::range": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::repeated": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::return": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::reused": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::selected": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::split": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::store": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::stored": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::terminal": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::t.dataset.state#1::window": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::tcells[frame.cmpT].dataset.state#1::match": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::tcells[frame.cmpT].dataset.state#1::mismatch": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::tcells[k].dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::tcells[s + k].dataset.state#1::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.decision#1::improve": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.decision#1::keep": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis operand-a": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis operand-a operand-b target": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis operand-a target": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis operand-b": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stage-axis operand-b target": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stored": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stored operand-a": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stored operand-b": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stored path": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::stored target": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.roles#1::target": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.state#1::cur": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.state#1::dep": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::td.dataset.state#1::path": {
    kind: "primary",
    value: "accepted-visited",
  },
  "Web/custom/steptrace/src/render.ts::textCell.dataset.state#1::suffix": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::textCells[found + j].dataset.state#1::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::textCells[frame.cmpT].dataset.state#1::match": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::textCells[frame.cmpT].dataset.state#1::mismatch": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::tick.dataset.current#1::false": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::tick.dataset.current#1::true": {
    kind: "primary",
    value: "active-current",
  },
  "Web/custom/steptrace/src/render.ts::tick.dataset.state#1::answer": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::tick.dataset.state#1::feasible": {
    kind: "primary",
    value: "neutral-context",
  },
  "Web/custom/steptrace/src/render.ts::tick.dataset.state#1::infeasible": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::tick.dataset.state#1::range": {
    kind: "overlay",
    value: "range-match",
  },
  "Web/custom/steptrace/src/render.ts::verdict.dataset.state#1::feasible": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::verdict.dataset.state#1::infeasible": {
    kind: "primary",
    value: "rejected-invalid",
  },
  "Web/custom/steptrace/src/render.ts::verdict.dataset.state#1::pending": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::zCells[frame.i].dataset.state#1::copy-target": {
    kind: "overlay",
    value: "goal-target",
  },
  "Web/custom/steptrace/src/render.ts::zCells[frame.i].dataset.state#2::found": {
    kind: "primary",
    value: "final-success",
  },
  "Web/custom/steptrace/src/render.ts::zCells[frame.k].dataset.state#1::copy-source": {
    kind: "primary",
    value: "candidate-frontier",
  },
  "Web/custom/steptrace/src/render.ts::zCells[k].dataset.state#1::<empty>": {
    kind: "primary",
    value: "neutral-context",
  },
}

const expectedRoleForExpandedSentinel = (carrierKey) =>
  dynamicExpectedRoleBySentinel[carrierKey] ?? expectedRoleBySentinel[carrierKey]

const dynamicEvidenceFor = (carrierKey, allowedSignal) => {
  const sourceOwner = carrierKey.split("::")[0]
  const assignmentPrimitive = carrierKey.split("::")[1].replace(/ \[occurrence \d+\]$/, "")
  if (
    carrierKey.includes("String(id === frame.target)") ||
    carrierKey.includes("String(highlighted.has(index))") ||
    carrierKey.includes("String(selected.has(index))")
  )
    return {
      evidenceKind: "boolean-string-expression",
      sourceOwner,
      sourcePattern: "String(",
      expectedRuntimeValue: allowedSignal,
    }
  const domainOwner =
    carrierKey.includes("row.dataset.state::dynamic:attempt.state") ||
    carrierKey.includes("row.dataset.state::dynamic:entry.state")
      ? source("families/dp-problems.ts")
      : ["borrow", "die", "gone"].includes(allowedSignal)
        ? source("recorders.ts")
        : ["match", "mismatch"].includes(allowedSignal)
          ? source("recorders.ts")
          : allowedSignal === "stage-axis"
            ? source("families/matrix-grid.ts")
            : ["closed", "open"].includes(allowedSignal)
              ? source("types.ts")
              : ["created", "reused", "terminal"].includes(allowedSignal)
                ? source("families/prefix-character.ts")
                : sourceOwner
  return {
    evidenceKind: "source-literal",
    sourceOwner: domainOwner,
    sourcePattern:
      allowedSignal === ""
        ? `${assignmentPrimitive} =`
        : allowedSignal === "open"
          ? "open: readonly GraphStateScore[]"
          : `"${allowedSignal}"`,
    expectedRuntimeValue: allowedSignal,
  }
}

const markerSites = {
  bars: "Web/custom/steptrace/src/render.ts::check.append(successMarker())::final-success",
  boundary:
    "Web/custom/steptrace/src/render.ts::tick.append(label, successMarker())::final-success",
  string: "Web/custom/steptrace/src/render.ts::c.append(value, successMarker())::final-success",
  boyerMooreCell:
    "Web/custom/steptrace/src/render.ts::cell.append(value, cue, successMarker())::final-success",
  zCell: "Web/custom/steptrace/src/render.ts::cell.append(value, successMarker())::final-success",
  backtrack:
    "Web/custom/steptrace/src/render.ts::cell.append(glyph, successMarker())::final-success",
  backtrackLegend: "Web/custom/steptrace/src/render.ts::marker: successMarker(),::final-success",
  storyRow: "Web/custom/steptrace/src/render.ts::value.append(successMarker())::final-success",
  storyLegend:
    'Web/custom/steptrace/src/render.ts::marker: state === "best" ? successMarker() : undefined,::final-success',
  storyLegend2:
    'Web/custom/steptrace/src/render.ts::marker: state === "best" ? successMarker() : undefined, [occurrence 2]::final-success',
  insight:
    "Web/custom/steptrace/src/mount.ts::insight.append(successMarker(), insightLabel, insightText)::final-success",
  matrixBadge:
    'Web/custom/steptrace/src/render.ts::element.replaceChildren(descriptor.badge === "success" ? successMarker() : descriptor.badge)::final-success',
  matrixLegend: "Web/custom/steptrace/src/render.ts::? successMarker()::final-success",
  matrixPath:
    "Web/custom/steptrace/src/render.ts::pathMarker.append(successMarker())::final-success",
  prefix:
    "Web/custom/steptrace/src/families/prefix-character.ts::const terminal = successMarker()::final-success",
  binary:
    "Web/custom/steptrace/src/families/binary-tree.ts::const badge = successMarker()::final-success",
  linked:
    "Web/custom/steptrace/src/families/linked-topology.ts::result.append(successMarker())::final-success",
  amountBest:
    "Web/custom/steptrace/src/render.ts::cell.append(label, value, successMarker())::final-success",
  warehouseBest:
    "Web/custom/steptrace/src/render.ts::cell.append(place, cost, stored, successMarker())::final-success",
  multiway:
    "Web/custom/steptrace/src/families/multiway-tree.ts::const marker = successMarker()::final-success",
  prefixLegend:
    "Web/custom/steptrace/src/families/prefix-character.ts::marker: successMarker(),::final-success",
}

const finalSuccessMarkerByCarrier = {
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#2::found": markerSites.bars,
  "Web/custom/steptrace/src/render.ts::bar.dataset.state#1::sorted": markerSites.bars,
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="found"] .steptrace__fill::green':
    markerSites.bars,
  'Web/custom/steptrace/src/styles/bars.scss::.steptrace__bar[data-state="sorted"] .steptrace__fill::green':
    markerSites.bars,
  "Web/custom/steptrace/src/families/run-stack.ts::bar.dataset.state#1::sorted": markerSites.bars,
  "Web/custom/steptrace/src/render.ts::tcells[s + k].dataset.state#1::found":
    markerSites.boyerMooreCell,
  "Web/custom/steptrace/src/render.ts::textCells[found + j].dataset.state#1::found":
    markerSites.string,
  "Web/custom/steptrace/src/render.ts::zCells[frame.i].dataset.state#2::found": markerSites.zCell,
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#3::found": markerSites.string,
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#6::solved": markerSites.backtrack,
  "Web/custom/steptrace/src/render.ts::row.dataset.state#2::best": markerSites.storyRow,
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::best": markerSites.storyLegend,
  "Web/custom/steptrace/src/render.ts::swatch.dataset.state#1::terminal": markerSites.prefix,
  "Web/custom/steptrace/src/render.ts::tick.dataset.state#1::answer": markerSites.boundary,
  "Web/custom/steptrace/src/families/bucket-distribution.ts::bar.dataset.state#2::sorted":
    markerSites.bars,
  "Web/custom/steptrace/src/families/distribution-sort.ts::bar.dataset.state#2::sorted":
    markerSites.bars,
  "Web/custom/steptrace/src/families/prefix-character.ts::group.dataset.state#1::terminal":
    markerSites.prefix,
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-node[data-state="terminal"] circle::green':
    markerSites.prefix,
  'Web/custom/steptrace/src/styles/prefix-character.scss::.steptrace__prefix-swatch[data-state="terminal"]::green':
    markerSites.prefixLegend,
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#4::best": markerSites.amountBest,
  "Web/custom/steptrace/src/render.ts::cell.dataset.state#5::best": markerSites.warehouseBest,
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__amount-cell[data-state="best"]::green':
    markerSites.amountBest,
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__coin-attempt[data-state="best"]::green':
    markerSites.storyRow,
  'Web/custom/steptrace/src/styles/dp-story.scss::.steptrace .steptrace__warehouse-matrix td[data-state="best"]::green':
    markerSites.warehouseBest,
  "Web/custom/steptrace/src/families/multiway-tree.ts::cell.dataset.state#1::found":
    markerSites.multiway,
  "Web/custom/steptrace/src/families/multiway-tree.ts::marker.dataset.state#1::found":
    markerSites.multiway,
  'Web/custom/steptrace/src/styles/multiway-tree.scss::.steptrace .steptrace__multiway-tree-node .steptrace__multiway-tree-cell[data-state="found"]::green':
    markerSites.multiway,
  'Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-node[data-entry="true"]::green':
    markerSites.linked,
  "Web/custom/steptrace/src/styles/linked-topology.scss::.steptrace .steptrace__linked-swatch--entry::green":
    markerSites.linked,
  'Web/custom/steptrace/src/styles/backtrack.scss::.steptrace__btcell[data-state="solved"]::green':
    markerSites.backtrack,
  'Web/custom/steptrace/src/styles/boundary.scss::.steptrace .steptrace__boundary-tick[data-state="answer"]::green':
    markerSites.boundary,
  'Web/custom/steptrace/src/styles/string.scss::.steptrace__cell[data-state="found"]::green':
    markerSites.string,
  "Web/custom/steptrace/src/styles/shared.scss::.steptrace__insight::green": markerSites.insight,
  "Web/custom/steptrace/src/styles/shared.scss::.steptrace .steptrace__success-marker circle::green":
    markerSites.bars,
  [markerSites.bars]: markerSites.bars,
  [markerSites.matrixBadge]: markerSites.matrixBadge,
  [markerSites.matrixLegend]: markerSites.matrixLegend,
  [markerSites.matrixPath]: markerSites.matrixPath,
  [markerSites.prefix]: markerSites.prefix,
  [markerSites.binary]: markerSites.binary,
  [markerSites.linked]: markerSites.linked,
}

for (const markerSite of Object.values(markerSites))
  finalSuccessMarkerByCarrier[markerSite] = markerSite

const successAssociationFor = (carrierKey, role) => {
  if (role.value !== "final-success") return undefined
  const markerSite = finalSuccessMarkerByCarrier[carrierKey]
  return markerSite
    ? {
        status: "present",
        markerSite,
        placement: markerSite === carrierKey ? "final-primitive" : "associated-terminal-cue",
        rationale:
          "The source creates this shared success marker for the same terminal carrier path.",
      }
    : {
        status: "missing",
        markerSite: null,
        placement: "unimplemented",
        rationale:
          "No source-owned successMarker() site is associated with this terminal carrier yet.",
      }
}

for (const entry of semanticInventory) {
  entry.semanticProfiles = entry.carriers
  entry.carriers = []
}

for (const sentinel of semanticSourceSentinels) {
  if (structuralExclusionKeys.has(sentinel.carrierKey)) continue
  const sourceSiteKey = sentinel.carrierKey
  const role = expectedRoleForExpandedSentinel(sentinel.carrierKey, sourceSiteKey)
  expectedRoleBySentinel[sentinel.carrierKey] = role
  if (!role) throw new Error(`Missing explicit expected role: ${sentinel.carrierKey}`)
  const owner = sentinel.carrierKey.split("::")[0]
  let entry = semanticInventory.find(({ sourceOwners }) => sourceOwners.includes(owner))
  if (!entry) {
    entry = semanticInventory.find(({ executionPath }) => executionPath === "legacy:sort")
    if (!entry.sourceOwners.includes(owner)) entry.sourceOwners.push(owner)
  }
  const actualToken = actualTokenFor(sentinel.carrierKey)
  const primaryToken = roleTokens[role.value]
  const isVisitedMarker = sentinel.carrierKey.includes("visitedMark")
  const isSingleCellUnderline =
    sentinel.category === "semantic-underline" &&
    (sentinel.carrierKey.includes('[data-state="probe"]') ||
      sentinel.carrierKey.includes('[data-state="copy-target"]'))
  const tokenMismatch =
    actualToken && primaryToken !== "semantic-owner-token" && actualToken !== primaryToken
  const successAssociation = successAssociationFor(sentinel.carrierKey, role)
  const missingFinalMarker = successAssociation?.status === "missing"
  const classification =
    isVisitedMarker || isSingleCellUnderline || missingFinalMarker
      ? "mismatch"
      : tokenMismatch
        ? "mismatch"
        : "compliant"
  const signal = signalFor(sentinel.carrierKey)
  const isDynamic = sentinel.category === "dynamic-assignment"
  const allowedSignals = isDynamic ? [signal === "<empty>" ? "" : signal] : undefined
  const trueExtent = sentinel.category === "semantic-underline" && role.value === "range-match"
  entry.carriers.push({
    carrierKey: sentinel.carrierKey,
    sourceSentinels: [sentinel.carrierKey],
    carrierKind: sentinel.category,
    role,
    primaryToken,
    actualToken,
    successAssociation,
    allowedSignals,
    signalEvidenceCases: isDynamic
      ? allowedSignals.map((allowedSignal) => ({
          allowedSignal,
          sourceSentinel: sentinel.carrierKey,
          assignmentExpression: `exact source assignment for ${sentinel.carrierKey.split("::")[1]}`,
          evidenceCase: entry.evidenceCase,
          ...dynamicEvidenceFor(sourceSiteKey, allowedSignal),
        }))
      : undefined,
    secondaryCue:
      sentinel.category === "success-marker-site"
        ? "shared checkmark"
        : sentinel.category === "semantic-underline"
          ? "range underline"
          : sentinel.category === "legend-marker"
            ? "legend label/swatch"
            : sentinel.category === "dynamic-assignment"
              ? "reader-visible state signal"
              : "selector-owned cue",
    cueOwner: sentinel.carrierKey.split("::")[1],
    compositionRule:
      "Primary process state remains visible; overlays retain an independent cue owner and take outline/badge precedence without erasing the primary fill.",
    ambiguousTermRationale: sentinel.carrierKey.includes("hash-index.ts::cell.dataset.result")
      ? "Success is transient operation feedback that clears on the next operation, so it is active-current rather than terminal finality."
      : /(?:success|found|best|path|stored|visited)/i.test(sentinel.carrierKey)
        ? `The decision tree resolves this local term to ${role.value}; classification follows lifecycle and spatial extent rather than the label or current color.`
        : "",
    classification,
    visualEvidenceKey: `${owner}:${role.value}:${sentinel.category}`,
    extentEvidence: trueExtent
      ? {
          start: "first painted cell carrying the selector",
          end: "last contiguous painted cell carrying the selector",
          paintAssertionId: "ST-INV-008",
        }
      : undefined,
    notes: isVisitedMarker
      ? "Visited is durable accepted progress; the existing success marker is contradictory."
      : isSingleCellUnderline
        ? "A one-cell probe/copy target is active-current; its underline duplicates the active cue and is not an extent."
        : tokenMismatch
          ? `Actual ${actualToken} contradicts expected ${primaryToken}.`
          : missingFinalMarker
            ? "Terminal success is missing the canonical shared marker."
            : "",
  })
}

for (const entry of semanticInventory.filter(({ carriers }) => !carriers.length)) {
  const donor = semanticInventory.find(
    ({ carriers }) =>
      carriers.length > 1 &&
      carriers.some(({ carrierKey }) => entry.sourceOwners.includes(carrierKey.split("::")[0])),
  )
  const index = donor?.carriers.findIndex(({ carrierKey }) =>
    entry.sourceOwners.includes(carrierKey.split("::")[0]),
  )
  if (donor && index >= 0) entry.carriers.push(donor.carriers.splice(index, 1)[0])
}

function compose(carrierA, carrierB) {
  carrierA.composesWith = [...new Set([...(carrierA.composesWith ?? []), carrierB.carrierKey])]
  carrierB.composesWith = [...new Set([...(carrierB.composesWith ?? []), carrierA.carrierKey])]
}

const allMappedCarriers = semanticInventory.flatMap(({ carriers }) => carriers)
const findCarrier = (fragment) => {
  const found = allMappedCarriers.find(({ carrierKey }) => carrierKey.includes(fragment))
  if (!found) throw new Error(`Missing StepTrace composition carrier: ${fragment}`)
  return found
}

compose(
  findCarrier('.steptrace__gs-node[data-state="current"] .steptrace__gs-node-circle::blue'),
  findCarrier("graph-state.ts::group.dataset.target#1::true"),
)
compose(
  findCarrier('.steptrace__dp td[data-roles~="target"]::violet'),
  findCarrier('.steptrace__dp td[data-roles~="target"][data-decision="improve"]::green'),
)
const stringFoundFill = findCarrier('.steptrace__cell[data-state="found"]::green')
const stringFoundUnderline = findCarrier(
  '.steptrace__match:not(.steptrace__z) .steptrace__cell[data-state="found"]::underline',
)
stringFoundFill.cueOwner = "found cell fill and success-marker association"
compose(stringFoundFill, stringFoundUnderline)
compose(
  findCarrier('.steptrace__cell[data-state="match"]::green'),
  findCarrier('.steptrace__cell[data-state="match"]::underline'),
)
for (const entry of semanticInventory)
  if (!entry.carriers.length)
    throw new Error(`StepTrace cohort has no mapped semantic sentinels: ${entry.cohort}`)

export const semanticSentinelSnapshot = {
  total: 739,
  counts: {
    "dynamic-assignment": 339,
    "legend-marker": 32,
    "semantic-token-selector": 343,
    "semantic-underline": 4,
    "success-marker-site": 21,
  },
  sha256: "73b53895afbcd25cf4435400a97e11f12f585e373d82a327585479b6ee120666",
}

export const characterizedMismatches = allMappedCarriers
  .filter(({ classification }) => classification === "mismatch")
  .map(({ carrierKey, role, primaryToken, actualToken, notes }) => ({
    carrierKey,
    expectedRole: role,
    expectedToken: primaryToken,
    actualToken,
    disposition: "mismatch",
    rationale: notes,
  }))

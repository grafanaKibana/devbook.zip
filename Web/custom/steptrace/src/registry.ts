import { normalizeGraph, type GraphConfig } from "./graph"
import {
  BacktrackRecorder,
  BitsRecorder,
  DPRecorder,
  GraphRecorder,
  PointerRecorder,
  RecTreeRecorder,
  SearchRecorder,
  SortRecorder,
  StringRecorder,
  UnionFindRecorder,
} from "./recorders"
import type {
  AlgorithmInput,
  AlgorithmKind,
  AlgorithmMeta,
  BacktrackAlgorithmDefinition,
  BitsAlgorithmDefinition,
  BuiltFrames,
  BuiltInAlgorithm,
  DPAlgorithmDefinition,
  FamilyAlgorithmDefinition,
  GraphAlgorithmDefinition,
  PointerAlgorithmDefinition,
  RecTreeAlgorithmDefinition,
  SearchAlgorithmDefinition,
  SortAlgorithmDefinition,
  StepTraceConfig,
  StringAlgorithmDefinition,
  UnionFindAlgorithmDefinition,
} from "./types"

export interface RegistryApi {
  registerSort(id: string, meta: AlgorithmMeta, run: SortAlgorithmDefinition["run"]): void
  registerGraph(id: string, meta: AlgorithmMeta, run: GraphAlgorithmDefinition["run"]): void
  registerSearch(id: string, meta: AlgorithmMeta, run: SearchAlgorithmDefinition["run"]): void
  registerString(id: string, meta: AlgorithmMeta, run: StringAlgorithmDefinition["run"]): void
  registerPointer(id: string, meta: AlgorithmMeta, run: PointerAlgorithmDefinition["run"]): void
  registerDP(id: string, meta: AlgorithmMeta, run: DPAlgorithmDefinition["run"]): void
  registerUnionFind(id: string, meta: AlgorithmMeta, run: UnionFindAlgorithmDefinition["run"]): void
  registerBits(id: string, meta: AlgorithmMeta, run: BitsAlgorithmDefinition["run"]): void
  registerBacktrack(id: string, meta: AlgorithmMeta, run: BacktrackAlgorithmDefinition["run"]): void
  registerRecTree(id: string, meta: AlgorithmMeta, run: RecTreeAlgorithmDefinition["run"]): void
  listAlgorithms(kind: AlgorithmKind): Array<{ id: string; label: string }>
  kindOf(id: string): AlgorithmKind | null
  buildFrames(config: StepTraceConfig): BuiltFrames
}

interface RegisteredAlgorithm<TRun> {
  meta: AlgorithmMeta
  run: TRun
}

type FamilyDefinition = FamilyAlgorithmDefinition<AlgorithmKind, unknown, unknown, unknown>

export function createRegistry(builtIns: readonly BuiltInAlgorithm[]): RegistryApi {
  const familyRegistry = new Map<string, FamilyDefinition>()
  const sortRegistry = new Map<string, RegisteredAlgorithm<SortAlgorithmDefinition["run"]>>()
  const graphRegistry = new Map<string, RegisteredAlgorithm<GraphAlgorithmDefinition["run"]>>()
  const searchRegistry = new Map<string, RegisteredAlgorithm<SearchAlgorithmDefinition["run"]>>()
  const stringRegistry = new Map<string, RegisteredAlgorithm<StringAlgorithmDefinition["run"]>>()
  const pointerRegistry = new Map<string, RegisteredAlgorithm<PointerAlgorithmDefinition["run"]>>()
  const dpRegistry = new Map<string, RegisteredAlgorithm<DPAlgorithmDefinition["run"]>>()
  const unionFindRegistry = new Map<
    string,
    RegisteredAlgorithm<UnionFindAlgorithmDefinition["run"]>
  >()
  const bitsRegistry = new Map<string, RegisteredAlgorithm<BitsAlgorithmDefinition["run"]>>()
  const backtrackRegistry = new Map<
    string,
    RegisteredAlgorithm<BacktrackAlgorithmDefinition["run"]>
  >()
  const recTreeRegistry = new Map<string, RegisteredAlgorithm<RecTreeAlgorithmDefinition["run"]>>()

  const api: RegistryApi = {
    registerSort(id, meta, run) {
      sortRegistry.set(id, { meta, run })
    },
    registerGraph(id, meta, run) {
      graphRegistry.set(id, { meta, run })
    },
    registerSearch(id, meta, run) {
      searchRegistry.set(id, { meta, run })
    },
    registerString(id, meta, run) {
      stringRegistry.set(id, { meta, run })
    },
    registerPointer(id, meta, run) {
      pointerRegistry.set(id, { meta, run })
    },
    registerDP(id, meta, run) {
      dpRegistry.set(id, { meta, run })
    },
    registerUnionFind(id, meta, run) {
      unionFindRegistry.set(id, { meta, run })
    },
    registerBits(id, meta, run) {
      bitsRegistry.set(id, { meta, run })
    },
    registerBacktrack(id, meta, run) {
      backtrackRegistry.set(id, { meta, run })
    },
    registerRecTree(id, meta, run) {
      recTreeRegistry.set(id, { meta, run })
    },
    listAlgorithms(kind) {
      // Preserve the current toolbar contract: only sort and graph expose an
      // in-card algorithm chooser. Other kinds keep their configured algorithm.
      const registry = kind === "graph" ? graphRegistry : sortRegistry
      const legacy = [...registry].map(([id, value]) => ({ id, label: value.meta.label }))
      const families = [...familyRegistry]
        .filter(([, definition]) => definition.kind === kind)
        .map(([id, definition]) => ({ id, label: definition.meta.label }))
      return [...legacy, ...families]
    },
    kindOf(id) {
      const family = familyRegistry.get(id)
      if (family) return family.kind
      if (sortRegistry.has(id)) return "sort"
      if (graphRegistry.has(id)) return "graph"
      if (searchRegistry.has(id)) return "search"
      if (stringRegistry.has(id)) return "string"
      if (pointerRegistry.has(id)) return "pointers"
      if (dpRegistry.has(id)) return "dp"
      if (unionFindRegistry.has(id)) return "unionfind"
      if (bitsRegistry.has(id)) return "bits"
      if (backtrackRegistry.has(id)) return "backtrack"
      if (recTreeRegistry.has(id)) return "rectree"
      return null
    },
    buildFrames(config) {
      const familyAlgorithm = familyRegistry.get(config.algorithm)
      if (familyAlgorithm) {
        const input = familyAlgorithm.parse(config)
        const recorder = familyAlgorithm.family.createRecorder(input) as { frames: any[] }
        familyAlgorithm.run(input, recorder)
        return {
          kind: familyAlgorithm.kind,
          family: familyAlgorithm.family,
          frames: recorder.frames,
        }
      }

      const input = config as AlgorithmInput
      const sort = sortRegistry.get(config.algorithm)
      if (sort) {
        const recorder = new SortRecorder(config.array)
        sort.run(input, recorder)
        return { kind: "sort", frames: recorder.frames }
      }

      const graphAlgorithm = graphRegistry.get(config.algorithm)
      if (graphAlgorithm) {
        const graph = normalizeGraph(config as GraphConfig)
        const recorder = new GraphRecorder(graph)
        graphAlgorithm.run({ ...input, start: graph.start }, recorder, graph)
        return {
          kind: "graph",
          frames: recorder.frames,
          graph,
          frontierLabel: graphAlgorithm.meta.frontierLabel,
        }
      }

      const search = searchRegistry.get(config.algorithm)
      if (search) {
        const recorder = new SearchRecorder(config.array, config.target)
        search.run(input, recorder)
        return { kind: "search", frames: recorder.frames }
      }

      const string = stringRegistry.get(config.algorithm)
      if (string) {
        const recorder = new StringRecorder(config.text, config.pattern)
        string.run(input, recorder)
        return { kind: "string", frames: recorder.frames }
      }

      const pointer = pointerRegistry.get(config.algorithm)
      if (pointer) {
        const recorder = new PointerRecorder(config.array)
        pointer.run(input, recorder)
        return { kind: "pointers", frames: recorder.frames }
      }

      const dp = dpRegistry.get(config.algorithm)
      if (dp) {
        const recorder = new DPRecorder()
        dp.run(input, recorder)
        return { kind: "dp", frames: recorder.frames }
      }

      const unionFind = unionFindRegistry.get(config.algorithm)
      if (unionFind) {
        const recorder = new UnionFindRecorder(config.n || 7)
        unionFind.run(input, recorder)
        return { kind: "unionfind", frames: recorder.frames }
      }

      const bits = bitsRegistry.get(config.algorithm)
      if (bits) {
        const recorder = new BitsRecorder(config.width || 8)
        bits.run(input, recorder)
        return { kind: "bits", frames: recorder.frames }
      }

      const backtrack = backtrackRegistry.get(config.algorithm)
      if (backtrack) {
        const recorder = new BacktrackRecorder()
        backtrack.run(input, recorder)
        return { kind: "backtrack", frames: recorder.frames }
      }

      const recTree = recTreeRegistry.get(config.algorithm)
      if (recTree) {
        const recorder = new RecTreeRecorder()
        recTree.run(input, recorder)
        return { kind: "rectree", frames: recorder.frames }
      }

      throw new Error(`steptrace: unknown algorithm "${config.algorithm}".`)
    },
  }

  for (const definition of builtIns) {
    if ("family" in definition) {
      familyRegistry.set(definition.id, definition)
      continue
    }
    switch (definition.kind) {
      case "sort":
        api.registerSort(definition.id, definition.meta, definition.run)
        break
      case "graph":
        api.registerGraph(definition.id, definition.meta, definition.run)
        break
      case "search":
        api.registerSearch(definition.id, definition.meta, definition.run)
        break
      case "string":
        api.registerString(definition.id, definition.meta, definition.run)
        break
      case "pointers":
        api.registerPointer(definition.id, definition.meta, definition.run)
        break
      case "dp":
        api.registerDP(definition.id, definition.meta, definition.run)
        break
      case "unionfind":
        api.registerUnionFind(definition.id, definition.meta, definition.run)
        break
      case "bits":
        api.registerBits(definition.id, definition.meta, definition.run)
        break
      case "backtrack":
        api.registerBacktrack(definition.id, definition.meta, definition.run)
        break
      case "rectree":
        api.registerRecTree(definition.id, definition.meta, definition.run)
        break
    }
  }

  return api
}

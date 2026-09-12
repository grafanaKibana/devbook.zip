import { indexedPointerWindowFamily } from "../families/indexed-pointer-window"
import {
  lcsMatrixGridFamily,
  legacyArraySortFamily,
  legacyGraphStateFamily,
  legacyIndexedArraySearchFamily,
} from "../families/legacy-adapters"
import { stringMatchFamily } from "../families/string-match"
import type {
  BuiltInAlgorithm,
  DPAlgorithmDefinition,
  FamilyAdapterAlgorithmDefinition,
  FamilyAdapterDefinition,
  FamilyAdapterVisualFamily,
  GraphAlgorithmDefinition,
  PointerAlgorithmDefinition,
  SearchAlgorithmDefinition,
  SortAlgorithmDefinition,
  StringAlgorithmDefinition,
} from "../types"
import { activitySelection } from "./activity-selection"
import { avlTree } from "./avl-tree"
import { aStar } from "./a-star"
import { ahoCorasick } from "./aho-corasick"
import { articulationPointsAndBridges } from "./articulation-points-and-bridges"
import { bfs } from "./bfs"
import { bellmanFord } from "./bellman-ford"
import { binarySearchOnAnswer } from "./binary-search-on-answer"
import { binarySearch } from "./binary-search"
import { binarySearchTree } from "./binary-search-tree"
import { bPlusTree } from "./b-plus-tree"
import { bTree } from "./b-tree"
import { bloomFilter } from "./bloom-filter"
import { binomialQueue } from "./binomial-queue"
import { bidirectionalSearch } from "./bidirectional-search"
import { boyerMoore } from "./boyer-moore"
import { boruvka } from "./boruvka"
import { branchAndBound } from "./branch-and-bound"
import { bubbleSort } from "./bubble-sort"
import { bogoSort } from "./bogo-sort"
import { bucketSort } from "./bucket-sort"
import { arrays } from "./arrays"
import { circularBuffer } from "./circular-buffer"
import { combSort } from "./comb-sort"
import { cocktailShakerSort } from "./cocktail-shaker-sort"
import { connectedComponents } from "./connected-components"
import { countingSort } from "./counting-sort"
import { cyclicSort } from "./cyclic-sort"
import { cycleSort } from "./cycle-sort"
import { dfs } from "./dfs"
import { dijkstra } from "./dijkstra"
import { divideAndConquer } from "./divide-and-conquer"
import { deque } from "./deque"
import { dynamicProgrammingAlgorithms } from "./dynamic-programming"
import { dynamicArray } from "./dynamic-array"
import { exponentialSearch } from "./exponential-search"
import { fibonacciSearch } from "./fibonacci-search"
import { interpolationSearch } from "./interpolation-search"
import { floydWarshall } from "./floyd-warshall"
import { fastAndSlowPointers } from "./fast-and-slow-pointers"
import { fenwickTree } from "./fenwick-tree"
import { fibonacciHeap } from "./fibonacci-heap"
import { greedyBestFirstSearch } from "./greedy-best-first-search"
import { graphStructure } from "./graph"
import { gnomeSort } from "./gnome-sort"
import { heap } from "./heap"
import { heapSort } from "./heap-sort"
import { hamiltonianCycle } from "./hamiltonian-cycle"
import { hashMap } from "./hash-map"
import { hashSet } from "./hash-set"
import { insertionSort } from "./insertion-sort"
import { introsort } from "./introsort"
import { jumpSearch } from "./jump-search"
import { kernighanPopcount } from "./kernighan-popcount"
import { kmp } from "./kmp"
import { kruskal } from "./kruskal"
import { lcs } from "./lcs"
import { linearSearch } from "./linear-search"
import { linkedList } from "./linked-list"
import { lruCache } from "./lru-cache"
import { leftistHeap } from "./leftist-heap"
import { mergeSort } from "./merge-sort"
import { mergeSortTree } from "./merge-sort-tree"
import { mergeIntervals } from "./merge-intervals"
import { maximumFlow } from "./maximum-flow"
import { memoization } from "./memoization"
import { monotonicStackAndQueue } from "./monotonic-stack-and-queue"
import { nQueens } from "./n-queens"
import { oddEvenSort } from "./odd-even-sort"
import { prim } from "./prim"
import { pancakeSort } from "./pancake-sort"
import { prefixSum } from "./prefix-sum"
import { queue } from "./queue"
import { quickSort } from "./quick-sort"
import { radixSort } from "./radix-sort"
import { rabinKarp } from "./rabin-karp"
import { redBlackTree } from "./red-black-tree"
import { selectionSort } from "./selection-sort"
import { segmentTree } from "./segment-tree"
import { shellSort } from "./shell-sort"
import { slidingWindow } from "./sliding-window"
import { span } from "./span"
import { splayTree } from "./splay-tree"
import { stack } from "./stack"
import { stoogeSort } from "./stooge-sort"
import { skewHeap } from "./skew-heap"
import { topologicalSort } from "./topological-sort"
import { topKElements } from "./top-k-elements"
import { stronglyConnectedComponents } from "./strongly-connected-components"
import { trie } from "./trie"
import { twoPointers } from "./two-pointers"
import { twoHeaps } from "./two-heaps"
import { unionFind } from "./union-find"
import { ternarySearch } from "./ternary-search"
import { ternarySearchTree } from "./ternary-search-tree"
import { timSort } from "./tim-sort"
import { zAlgorithm } from "./z-algorithm"

function familyAdapter(
  definition: SortAlgorithmDefinition,
  family: FamilyAdapterVisualFamily<"sort">,
): FamilyAdapterAlgorithmDefinition<"sort">
function familyAdapter(
  definition: GraphAlgorithmDefinition,
  family: FamilyAdapterVisualFamily<"graph">,
): FamilyAdapterAlgorithmDefinition<"graph">
function familyAdapter(
  definition: SearchAlgorithmDefinition,
  family: FamilyAdapterVisualFamily<"search">,
): FamilyAdapterAlgorithmDefinition<"search">
function familyAdapter(
  definition: StringAlgorithmDefinition,
  family: FamilyAdapterVisualFamily<"string">,
): FamilyAdapterAlgorithmDefinition<"string">
function familyAdapter(
  definition: PointerAlgorithmDefinition,
  family: FamilyAdapterVisualFamily<"pointers">,
): FamilyAdapterAlgorithmDefinition<"pointers">
function familyAdapter(
  definition: DPAlgorithmDefinition,
  family: FamilyAdapterVisualFamily<"dp">,
): FamilyAdapterAlgorithmDefinition<"dp">
function familyAdapter(
  definition: FamilyAdapterDefinition,
  family: FamilyAdapterVisualFamily<FamilyAdapterDefinition["kind"]>,
) {
  return {
    ...definition,
    adapter: true,
    family,
  }
}

export const builtInAlgorithms = [
  activitySelection,
  aStar,
  articulationPointsAndBridges,
  bellmanFord,
  bidirectionalSearch,
  boruvka,
  connectedComponents,
  greedyBestFirstSearch,
  hamiltonianCycle,
  kruskal,
  maximumFlow,
  stronglyConnectedComponents,
  familyAdapter(bubbleSort, legacyArraySortFamily),
  cocktailShakerSort,
  gnomeSort,
  bogoSort,
  pancakeSort,
  cycleSort,
  oddEvenSort,
  stoogeSort,
  familyAdapter(insertionSort, legacyArraySortFamily),
  familyAdapter(selectionSort, legacyArraySortFamily),
  familyAdapter(quickSort, legacyArraySortFamily),
  familyAdapter(heapSort, legacyArraySortFamily),
  familyAdapter(mergeSort, legacyArraySortFamily),
  mergeSortTree,
  mergeIntervals,
  shellSort,
  combSort,
  countingSort,
  radixSort,
  bucketSort,
  cyclicSort,
  introsort,
  timSort,
  exponentialSearch,
  fibonacciSearch,
  interpolationSearch,
  jumpSearch,
  ternarySearch,
  binarySearchOnAnswer,
  familyAdapter(bfs, legacyGraphStateFamily),
  familyAdapter(dfs, legacyGraphStateFamily),
  dijkstra,
  familyAdapter(prim, legacyGraphStateFamily),
  prefixSum,
  familyAdapter(topologicalSort, legacyGraphStateFamily),
  topKElements,
  twoHeaps,
  familyAdapter(binarySearch, legacyIndexedArraySearchFamily),
  familyAdapter(linearSearch, legacyIndexedArraySearchFamily),
  familyAdapter(kmp, stringMatchFamily),
  familyAdapter(rabinKarp, stringMatchFamily),
  familyAdapter(zAlgorithm, stringMatchFamily),
  familyAdapter(boyerMoore, stringMatchFamily),
  familyAdapter(twoPointers, indexedPointerWindowFamily),
  familyAdapter(slidingWindow, indexedPointerWindowFamily),
  familyAdapter(lcs, lcsMatrixGridFamily),
  ...dynamicProgrammingAlgorithms,
  floydWarshall,
  fastAndSlowPointers,
  kernighanPopcount,
  nQueens,
  memoization,
  monotonicStackAndQueue,
  divideAndConquer,
  branchAndBound,
  trie,
  ahoCorasick,
  ternarySearchTree,
] satisfies readonly BuiltInAlgorithm[]

export const interactiveStructures = [
  arrays,
  avlTree,
  binarySearchTree,
  bPlusTree,
  bTree,
  binomialQueue,
  bloomFilter,
  circularBuffer,
  deque,
  dynamicArray,
  fenwickTree,
  fibonacciHeap,
  graphStructure,
  heap,
  hashMap,
  hashSet,
  leftistHeap,
  linkedList,
  lruCache,
  queue,
  redBlackTree,
  segmentTree,
  skewHeap,
  span,
  splayTree,
  stack,
  unionFind,
] as const

import type { BuiltInAlgorithm } from "../types"
import { bfs } from "./bfs"
import { binarySearch } from "./binary-search"
import { bubbleSort } from "./bubble-sort"
import { dfs } from "./dfs"
import { dijkstra } from "./dijkstra"
import { fibonacci } from "./fibonacci"
import { heapSort } from "./heap-sort"
import { insertionSort } from "./insertion-sort"
import { kernighanPopcount } from "./kernighan-popcount"
import { kmp } from "./kmp"
import { lcs } from "./lcs"
import { linearSearch } from "./linear-search"
import { mergeSort } from "./merge-sort"
import { nQueens } from "./n-queens"
import { prim } from "./prim"
import { quickSort } from "./quick-sort"
import { rabinKarp } from "./rabin-karp"
import { selectionSort } from "./selection-sort"
import { slidingWindow } from "./sliding-window"
import { topologicalSort } from "./topological-sort"
import { twoPointers } from "./two-pointers"
import { unionFind } from "./union-find"

export const builtInAlgorithms = [
  bubbleSort,
  insertionSort,
  selectionSort,
  quickSort,
  heapSort,
  mergeSort,
  bfs,
  dfs,
  dijkstra,
  prim,
  topologicalSort,
  binarySearch,
  linearSearch,
  kmp,
  rabinKarp,
  twoPointers,
  slidingWindow,
  lcs,
  unionFind,
  kernighanPopcount,
  nQueens,
  fibonacci,
] satisfies readonly BuiltInAlgorithm[]

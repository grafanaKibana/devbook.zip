import type { BuiltInAlgorithm } from "../types"
import { bfs } from "./bfs"
import { binarySearch } from "./binary-search"
import { bubbleSort } from "./bubble-sort"
import { combSort } from "./comb-sort"
import { cyclicSort } from "./cyclic-sort"
import { dfs } from "./dfs"
import { dijkstra } from "./dijkstra"
import { divideAndConquer } from "./divide-and-conquer"
import { exponentialSearch } from "./exponential-search"
import { fibonacci } from "./fibonacci"
import { floydWarshall } from "./floyd-warshall"
import { heapSort } from "./heap-sort"
import { insertionSort } from "./insertion-sort"
import { introsort } from "./introsort"
import { jumpSearch } from "./jump-search"
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
import { shellSort } from "./shell-sort"
import { slidingWindow } from "./sliding-window"
import { topologicalSort } from "./topological-sort"
import { twoPointers } from "./two-pointers"
import { unionFind } from "./union-find"
import { ternarySearch } from "./ternary-search"

export const builtInAlgorithms = [
  bubbleSort,
  insertionSort,
  selectionSort,
  quickSort,
  heapSort,
  mergeSort,
  shellSort,
  combSort,
  cyclicSort,
  introsort,
  exponentialSearch,
  jumpSearch,
  ternarySearch,
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
  floydWarshall,
  unionFind,
  kernighanPopcount,
  nQueens,
  fibonacci,
  divideAndConquer,
] satisfies readonly BuiltInAlgorithm[]

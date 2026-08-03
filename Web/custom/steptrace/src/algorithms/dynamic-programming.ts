import {
  dpProblemTableFamily,
  dpStoryConfig,
  dpStoryFamily,
  dpTableConfig,
  type DPStoryConfig,
  type DPStoryFrame,
  type DPStoryOperations,
  type DPStoryRecorder,
  type DPTableConfig,
  type DPTableFrame,
} from "../families/dp-problems"
import {
  executionTreeFamily,
  type ExecutionTreeConfig,
  type ExecutionTreeFrame,
  type ExecutionTreeNode,
  type ExecutionTreeOperations,
} from "../families/execution-tree"
import { coinChangeProblem, gridPathProblem, type GridCell } from "../dp-problem-data"
import type { DPRecorder, ExecutionTreeRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

type StoryAlgorithm = FamilyAlgorithmDefinition<
  "dp",
  DPStoryConfig,
  DPStoryRecorder & DPStoryOperations,
  DPStoryFrame
>
type TreeAlgorithm = FamilyAlgorithmDefinition<
  "rectree",
  ExecutionTreeConfig,
  ExecutionTreeRecorder & ExecutionTreeOperations,
  ExecutionTreeFrame
>
type TableAlgorithm = FamilyAlgorithmDefinition<"dp", DPTableConfig, DPRecorder, DPTableFrame>

const greedyWarehousePath = gridPathProblem.greedyPath.map((cell) => cell.slice() as GridCell)
const optimalWarehousePath = gridPathProblem.optimalPath.map((cell) => cell.slice() as GridCell)
const coinAmounts: readonly number[] = coinChangeProblem.amounts
const availableCoins: readonly number[] = coinChangeProblem.coins

function storyAlgorithm(
  id: string,
  label: string,
  parse: StoryAlgorithm["parse"],
  run: StoryAlgorithm["run"],
): StoryAlgorithm {
  return { id, kind: "dp", family: dpStoryFamily, meta: { label }, parse, run }
}

function treeAlgorithm(
  id: string,
  label: string,
  profile: ExecutionTreeConfig["profile"],
  run: TreeAlgorithm["run"],
): TreeAlgorithm {
  return {
    id,
    kind: "rectree",
    family: executionTreeFamily,
    meta: { label },
    parse(config: StepTraceConfig) {
      if (config.variant !== undefined) throw new Error(`steptrace: ${id} does not take a variant.`)
      return { profile }
    },
    run,
  }
}

function tableAlgorithm(
  id: string,
  label: string,
  profile: DPTableConfig["profile"],
  run: TableAlgorithm["run"],
): TableAlgorithm {
  return {
    id,
    kind: "dp",
    family: dpProblemTableFamily,
    meta: { label },
    parse: dpTableConfig(profile),
    run,
  }
}

export const coinChangeGreedy = storyAlgorithm(
  "coin-change-greedy",
  "Coin change — greedy",
  dpStoryConfig("coin-change", "greedy"),
  (_input, ops) => {
    ops.intro("Return 30¢ using the real coins available in this drawer.")
    ops.chooseCoin(25, 5, [25], "Greedy takes the largest usable coin: 25¢.")
    ops.chooseCoin(1, 4, [25, 1], "The next available denomination is 1¢.")
    ops.chooseCoin(1, 3, [25, 1, 1], "Another 1¢ coin leaves 3¢.")
    ops.chooseCoin(1, 2, [25, 1, 1, 1], "Another 1¢ coin leaves 2¢.")
    ops.chooseCoin(1, 1, [25, 1, 1, 1, 1], "Another 1¢ coin leaves 1¢.")
    ops.chooseCoin(1, 0, [25, 1, 1, 1, 1, 1], "The fifth 1¢ coin completes the change.")
    ops.coinAttempt(
      { label: "greedy counter", value: "25¢ + 1¢ × 5 · 6 coins", state: "active" },
      "The greedy plan is exact, but it uses six coins.",
    )
    ops.coinAttempt(
      { label: "better counter", value: "10¢ + 10¢ + 10¢ · 3 coins", state: "best" },
      "Three 10¢ coins prove that the largest-first plan is not optimal.",
    )
    ops.coinResult(
      "3 coins (10¢ + 10¢ + 10¢)",
      [25, 1, 1, 1, 1, 1],
      "Greedy returns exact change, but uses twice as many coins as the optimum.",
    )
    ops.done("Largest usable coin first gives 6 coins; the optimum uses 3.")
  },
)

export const coinChangeNaive = storyAlgorithm(
  "coin-change-naive",
  "Coin change — naive recursion",
  dpStoryConfig("coin-change", "naive"),
  (_input, ops) => {
    ops.intro("Naive recursion tries every usable coin and rebuilds repeated remainder questions.")
    ops.chooseCoin(10, 20, [10], "Try a 10¢ coin, leaving change(20¢).")
    ops.chooseCoin(1, 19, [10, 1], "That branch takes 1¢ and reaches change(19¢).")
    ops.coinAttempt(
      { label: "change(19¢)", value: "reached after 10¢ + 1¢", state: "active" },
      "The first change(19¢) subtree is solved from scratch.",
    )
    ops.backtrackCoins(30, [], "Backtrack to 30¢ and try a different first coin.")
    ops.chooseCoin(1, 29, [1], "Try 1¢ first, leaving change(29¢).")
    ops.chooseCoin(10, 19, [1, 10], "Then take 10¢ and reach change(19¢) again.")
    ops.coinAttempt(
      { label: "change(19¢)", value: "reached again after 1¢ + 10¢", state: "repeated" },
      "Without a memo, the full change(19¢) subtree runs again.",
    )
    ops.backtrackCoins(30, [], "Backtrack to compare complete exact-change branches.")
    ops.chooseCoin(25, 5, [25], "The 25¢ branch leaves 5¢, so it must continue with pennies.")
    ops.chooseCoin(1, 4, [25, 1], "Take the first of five 1¢ coins.")
    ops.chooseCoin(1, 3, [25, 1, 1], "Take the second 1¢ coin.")
    ops.chooseCoin(1, 2, [25, 1, 1, 1], "Take the third 1¢ coin.")
    ops.chooseCoin(1, 1, [25, 1, 1, 1, 1], "Take the fourth 1¢ coin.")
    ops.chooseCoin(1, 0, [25, 1, 1, 1, 1, 1], "The fifth 1¢ coin completes this branch.")
    ops.coinAttempt(
      { label: "25¢ branch", value: "25¢ + 1¢ × 5 · 6 coins", state: "dead" },
      "The first complete branch returns six coins.",
    )
    ops.backtrackCoins(30, [], "Backtrack once more and try the 10¢ branch.")
    ops.chooseCoin(10, 20, [10], "The first 10¢ coin leaves 20¢.")
    ops.chooseCoin(10, 10, [10, 10], "The second 10¢ coin leaves 10¢.")
    ops.chooseCoin(10, 0, [10, 10, 10], "The third 10¢ coin completes the payment.")
    ops.coinAttempt(
      { label: "10¢ branch", value: "10¢ + 10¢ + 10¢ · 3 coins", state: "best" },
      "Comparing completed branches finds the three-coin optimum.",
    )
    ops.coinResult(
      "3 coins (10¢ + 10¢ + 10¢)",
      [10, 10, 10],
      "Naive recursion is correct, but repeated remainders make it needlessly expensive.",
    )
    ops.done("All valid branches agree that three 10¢ coins are the shortest exact change.")
  },
)

export const coinChangeMemoization = storyAlgorithm(
  "coin-change-memoization",
  "Coin change — memoization",
  dpStoryConfig("coin-change", "memoization"),
  (_input, ops) => {
    ops.intro("Solve change recursively, but keep each answered remainder beside the till.")
    ops.coinMemo("change(0¢)", "0 coins", "stored", "Seed the exact-change base answer.")
    ops.chooseCoin(10, 20, [10], "A 10¢ coin leaves change(20¢) to solve.")
    ops.chooseCoin(1, 19, [10, 1], "The first child branch reaches change(19¢).")
    ops.coinMemo(
      "change(19¢)",
      "10 coins",
      "stored",
      "Resolve the penny tail once and store change(19¢) = 10 coins.",
    )
    ops.backtrackCoins(20, [10], "Return to change(20¢) and try its 10¢ child.")
    ops.chooseCoin(10, 10, [10, 10], "The second 10¢ coin leaves change(10¢).")
    ops.chooseCoin(10, 0, [10, 10, 10], "The third 10¢ coin reaches the exact-change base.")
    ops.backtrackCoins(10, [10, 10], "Return the base answer to change(10¢).")
    ops.coinMemo("change(10¢)", "1 coin", "stored", "Store change(10¢) = 1 coin.")
    ops.backtrackCoins(20, [10], "Return the saved one-coin answer to change(20¢).")
    ops.coinMemo("change(20¢)", "2 coins", "stored", "Store change(20¢) = 2 coins.")
    ops.backtrackCoins(30, [], "Backtrack to change(30¢) and try the 1¢ branch.")
    ops.chooseCoin(1, 29, [1], "A 1¢ coin leaves change(29¢).")
    ops.chooseCoin(10, 19, [1, 10], "The next 10¢ coin reaches change(19¢) again.")
    ops.coinMemo(
      "change(19¢)",
      "10 coins",
      "hit",
      "Read the saved change(19¢) answer instead of rebuilding its subtree.",
    )
    ops.backtrackCoins(29, [1], "Return the cache hit to change(29¢).")
    ops.coinMemo("change(29¢)", "5 coins", "stored", "Store the best answer for change(29¢).")
    ops.backtrackCoins(30, [], "Return all branch answers to the requested change(30¢) state.")
    ops.coinMemo("change(30¢)", "3 coins", "stored", "Store the requested three-coin answer.")
    ops.coinResult(
      "3 coins (10¢ + 10¢ + 10¢)",
      [10, 10, 10],
      "Memoization keeps recursion but answers repeated remainders from the saved slips.",
    )
    ops.done("change(19¢) is solved once and reused when another branch asks for it.")
  },
)

export const coinChangeTabulation = storyAlgorithm(
  "coin-change-tabulation",
  "Coin change — tabulation",
  dpStoryConfig("coin-change", "tabulation"),
  (_input, ops) => {
    ops.intro("Start from 0¢, then build the shortest exact change for every larger amount.")
    for (let index = 0; index < coinChangeProblem.amounts.length; index++) {
      const amount = coinChangeProblem.amounts[index]
      const dependencies = availableCoins
        .filter((coin) => coin <= amount)
        .map((coin) => amount - coin)
        .filter((predecessor) => coinAmounts.includes(predecessor))
      ops.fillAmount(
        amount,
        coinChangeProblem.bestCoins[index],
        dependencies,
        amount === 0
          ? "Write the base: 0¢ needs 0 coins."
          : `Read the solved smaller amounts, add one coin, and write ${amount}¢.`,
      )
    }
    ops.amountResult(
      [0, 10, 20, 30],
      "3 coins (10¢ + 10¢ + 10¢)",
      [10, 10, 10],
      "Follow 0¢ → 10¢ → 20¢ → 30¢ to reconstruct three 10¢ coins.",
    )
    ops.done("The amount board reaches 30¢ with three coins and no recursive calls.")
  },
)

export const coinChangeTopDown = treeAlgorithm(
  "coin-change-top-down",
  "Coin change — top-down DP",
  "coin-change-top-down",
  (_input, ops) => {
    const nodes: ExecutionTreeNode[] = [
      { id: "c30", label: "change(30¢)", detail: "target", values: [], x: 300, y: 24, depth: 0 },
      { id: "c5", label: "change(5¢)", detail: "after 25¢", values: [], x: 55, y: 88, depth: 1 },
      { id: "c20", label: "change(20¢)", detail: "after 10¢", values: [], x: 215, y: 88, depth: 1 },
      { id: "c29", label: "change(29¢)", detail: "after 1¢", values: [], x: 455, y: 88, depth: 1 },
      {
        id: "c10",
        label: "change(10¢)",
        detail: "after 10¢",
        values: [],
        x: 85,
        y: 152,
        depth: 2,
      },
      {
        id: "c19a",
        label: "change(19¢)",
        detail: "first visit",
        values: [],
        x: 215,
        y: 152,
        depth: 2,
      },
      {
        id: "c4",
        label: "change(4¢)",
        detail: "after 25¢",
        values: [],
        x: 340,
        y: 152,
        depth: 2,
      },
      {
        id: "c19b",
        label: "change(19¢)",
        detail: "same cache key",
        values: [],
        x: 465,
        y: 152,
        depth: 2,
      },
      {
        id: "c28",
        label: "change(28¢)",
        detail: "after 1¢",
        values: [],
        x: 585,
        y: 152,
        depth: 2,
      },
      {
        id: "c0",
        label: "change(0¢)",
        detail: "exact change",
        values: [],
        x: 85,
        y: 216,
        depth: 3,
      },
      {
        id: "c9",
        label: "change(9¢)",
        detail: "would repeat",
        values: [],
        x: 425,
        y: 216,
        depth: 3,
      },
      {
        id: "c18",
        label: "change(18¢)",
        detail: "would repeat",
        values: [],
        x: 520,
        y: 216,
        depth: 3,
      },
    ]
    const edges = [
      { from: "c30", to: "c5" },
      { from: "c30", to: "c20" },
      { from: "c30", to: "c29" },
      { from: "c20", to: "c10" },
      { from: "c20", to: "c19a" },
      { from: "c10", to: "c0" },
      { from: "c29", to: "c4" },
      { from: "c29", to: "c19b" },
      { from: "c29", to: "c28" },
      { from: "c19b", to: "c9" },
      { from: "c19b", to: "c18" },
    ]
    ops.tree(nodes, edges, "c30", "Start with change(30¢) and an empty memo.")
    ops.split(
      "c30",
      ["c30"],
      ["c5", "c20", "c29"],
      "The usable 25¢, 10¢, and 1¢ coins create three remainder states.",
    )
    ops.returnResult(
      "c5",
      ["c30", "c5"],
      "5 coins",
      "The available denominations make change(5¢) return five pennies.",
    )
    ops.store("c5", ["c30", "c5"], "5¢", "5 coins", "Store change(5¢) = 5 coins.")
    ops.split("c20", ["c30", "c20"], ["c10", "c19a"], "Expand change(20¢) through 10¢ and 1¢.")
    ops.split("c10", ["c30", "c20", "c10"], ["c0"], "A 10¢ coin reaches exact change.")
    ops.base("c0", ["c30", "c20", "c10", "c0"], "0 coins", "change(0¢) needs no more coins.")
    ops.combine("c10", ["c30", "c20", "c10"], "1 coin", "One 10¢ coin solves change(10¢).")
    ops.store("c10", ["c30", "c20", "c10"], "10¢", "1 coin", "Store change(10¢) = 1 coin.")
    ops.returnResult(
      "c19a",
      ["c30", "c20", "c19a"],
      "10 coins",
      "The compact penny tail returns 10 coins for change(19¢).",
    )
    ops.store("c19a", ["c30", "c20", "c19a"], "19¢", "10 coins", "Store change(19¢) = 10 coins.")
    ops.combine("c20", ["c30", "c20"], "2 coins", "change(20¢) prefers two 10¢ coins.")
    ops.store("c20", ["c30", "c20"], "20¢", "2 coins", "Store change(20¢) = 2 coins.")
    ops.split(
      "c29",
      ["c30", "c29"],
      ["c4", "c19b", "c28"],
      "change(29¢) reaches the saved change(19¢) state.",
    )
    ops.returnResult("c4", ["c30", "c29", "c4"], "4 coins", "Four pennies solve change(4¢).")
    ops.store("c4", ["c30", "c29", "c4"], "4¢", "4 coins", "Store change(4¢) = 4 coins.")
    ops.cacheHit(
      "c19b",
      ["c30", "c29", "c19b"],
      "19¢",
      "10 coins",
      ["c9", "c18"],
      "The memo returns change(19¢) and skips both child branches.",
    )
    ops.returnResult(
      "c28",
      ["c30", "c29", "c28"],
      "4 coins",
      "The 25¢ branch plus three pennies solves change(28¢).",
    )
    ops.store("c28", ["c30", "c29", "c28"], "28¢", "4 coins", "Store change(28¢) = 4 coins.")
    ops.combine("c29", ["c30", "c29"], "5 coins", "change(29¢) prefers 25¢ plus four pennies.")
    ops.store("c29", ["c30", "c29"], "29¢", "5 coins", "Store change(29¢) = 5 coins.")
    ops.combine("c30", ["c30"], "3 coins", "Compare 6, 3, and 6 coins: the 10¢ branch wins.")
    ops.store("c30", ["c30"], "30¢", "3 coins", "Store the requested answer.")
    ops.done(
      "c30",
      "3 coins",
      "Top-down DP returns three 10¢ coins and solves each remainder at most once.",
    )
  },
)

export const coinChangeBottomUp = tableAlgorithm(
  "coin-change-bottom-up",
  "Coin change — bottom-up DP",
  "coin-change-bottom-up",
  (_input, ops) => {
    const amounts = coinAmounts
    const best = coinChangeProblem.bestCoins
    ops.board(
      ["fewest coins"],
      amounts.map((amount) => `${amount}¢`),
      "Build exact change from 0¢ upward.",
    )
    ops.set(0, 0, "0", [], "The base amount 0¢ needs no coins.", "dp[0¢] = 0")
    for (let column = 1; column < amounts.length; column++) {
      const amount = amounts[column]
      const dependencies = availableCoins
        .filter((coin) => coin <= amount)
        .map((coin) => [0, amounts.indexOf(amount - coin)] as [number, number])
        .filter(([, dependency]) => dependency >= 0)
      const predecessorValues = dependencies.map(([, dependency]) => best[dependency])
      ops.set(
        0,
        column,
        String(best[column]),
        dependencies,
        `Try one allowed coin after each solved predecessor amount for ${amount}¢.`,
        `1 + min(${predecessorValues.join(", ")}) = ${best[column]}`,
      )
    }
    ops.markPath(
      [
        [0, 0],
        [0, 6],
        [0, 8],
        [0, 10],
      ],
      "Trace 30¢ → 20¢ → 10¢ → 0¢: three 10¢ coins produce the stored optimum.",
    )
    ops.done("The bottom-up table stores 3 coins for 30¢.")
  },
)

export const gridPathGreedy = storyAlgorithm(
  "grid-path-greedy",
  "Grid path — greedy",
  dpStoryConfig("grid-path", "greedy"),
  (_input, ops) => {
    ops.intro("Move only right or down from the loading bay to the dispatch door.")
    let cost = 0
    for (let index = 0; index < greedyWarehousePath.length; index++) {
      const [row, column] = greedyWarehousePath[index]
      cost += gridPathProblem.costs[row][column]
      ops.visitTile(
        [row, column],
        greedyWarehousePath.slice(0, index + 1),
        cost,
        [],
        index < 4
          ? "Choose the cheaper immediate neighbour without looking beyond it."
          : "The early cheap tiles now force the route through expensive shelves.",
      )
    }
    ops.routeResult(
      10,
      optimalWarehousePath,
      "R1C1 → R2C1 → R3C1 → R3C2 → R4C2 → R4C3 → R4C4",
      "A route costing 10 proves the greedy route costing 21 is not optimal.",
    )
    ops.done("Greedy pays 21; the best route pays 10.")
  },
)

export const gridPathNaive = storyAlgorithm(
  "grid-path-naive",
  "Grid path — naive recursion",
  dpStoryConfig("grid-path", "naive"),
  (_input, ops) => {
    ops.intro("Naive recursion explores every right/down route from the loading bay.")
    ops.visitTile(
      [0, 1],
      [
        [0, 0],
        [0, 1],
      ],
      1,
      [],
      "The first branch moves right.",
    )
    ops.visitTile(
      [1, 1],
      [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
      10,
      [],
      "This branch reaches R2C2 after moving right then down.",
    )
    ops.visitTile(
      [2, 1],
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      12,
      [],
      "The same branch continues to R3C2 before recursion backtracks.",
    )
    ops.visitTile(
      [0, 0],
      [[0, 0]],
      0,
      [],
      "Backtrack to the loading bay before exploring the downward branch.",
    )
    ops.visitTile(
      [1, 0],
      [
        [0, 0],
        [1, 0],
      ],
      2,
      [],
      "A second branch restarts from the loading bay and moves down.",
    )
    ops.visitTile(
      [1, 1],
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      11,
      [[1, 1]],
      "R2C2 is reached again; its entire remaining-route search repeats.",
    )
    ops.visitTile(
      [2, 0],
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      4,
      [[1, 1]],
      "Continue down to R3C1 before the branch turns right.",
    )
    ops.visitTile(
      [2, 1],
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
      ],
      6,
      [
        [1, 1],
        [2, 1],
      ],
      "Different prefixes keep converging on the same warehouse coordinates.",
    )
    ops.routeResult(
      10,
      optimalWarehousePath,
      "R1C1 → R2C1 → R3C1 → R3C2 → R4C2 → R4C3 → R4C4",
      "After comparing all routes, recursion finds the cost-10 route.",
    )
    ops.done("Naive recursion is correct, but recomputes the best route from repeated tiles.")
  },
)

export const gridPathMemoization = storyAlgorithm(
  "grid-path-memoization",
  "Grid path — memoization",
  dpStoryConfig("grid-path", "memoization"),
  (_input, ops) => {
    ops.intro("Explore routes recursively and write each solved tile directly into the map.")
    ops.visitTile([0, 0], [[0, 0]], 0, [], "Start the recursive route at the loading bay.")
    ops.visitTile(
      [0, 1],
      [
        [0, 0],
        [0, 1],
      ],
      1,
      [],
      "The first branch moves right.",
    )
    ops.visitTile(
      [0, 2],
      [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
      2,
      [],
      "Continue to R1C3 before solving the remaining routes below it.",
    )
    ops.storeTile(
      [0, 2],
      gridPathProblem.bestRemaining[0][2],
      [
        [0, 3],
        [1, 2],
      ],
      "Store the best remaining cost from R1C3.",
    )
    ops.visitTile(
      [1, 1],
      [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
      10,
      [],
      "Backtrack to R1C2, then enter R2C2 through its second child branch.",
    )
    ops.storeTile(
      [1, 1],
      gridPathProblem.bestRemaining[1][1],
      [
        [1, 2],
        [2, 1],
      ],
      "Store best(R2C2) = 15 after comparing its two exits.",
    )
    ops.storeTile(
      [0, 1],
      gridPathProblem.bestRemaining[0][1],
      [
        [0, 2],
        [1, 1],
      ],
      "The right branch returns 14 from R1C2.",
    )
    ops.visitTile(
      [1, 0],
      [
        [0, 0],
        [1, 0],
      ],
      2,
      [],
      "The second branch restarts from the loading bay and moves down.",
    )
    ops.visitTile(
      [1, 1],
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      11,
      [[1, 1]],
      "R2C2 is already written, so return 15 without opening another route subtree.",
    )
    ops.visitTile(
      [2, 0],
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      4,
      [[1, 1]],
      "After the cache hit, continue down to solve R3C1.",
    )
    ops.visitTile(
      [2, 1],
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
      ],
      6,
      [[1, 1]],
      "R3C1 first asks for the saved remaining cost from R3C2.",
    )
    ops.storeTile(
      [2, 1],
      gridPathProblem.bestRemaining[2][1],
      [
        [2, 2],
        [3, 1],
      ],
      "Store best(R3C2) = 6 after comparing right with down.",
    )
    ops.storeTile(
      [2, 0],
      gridPathProblem.bestRemaining[2][0],
      [
        [2, 1],
        [3, 0],
      ],
      "Store best(R3C1) = 8.",
    )
    ops.storeTile(
      [1, 0],
      gridPathProblem.bestRemaining[1][0],
      [
        [1, 1],
        [2, 0],
      ],
      "R2C1 prefers the stored route through R3C1 and returns 10.",
    )
    ops.storeTile(
      [0, 0],
      gridPathProblem.bestRemaining[0][0],
      [
        [0, 1],
        [1, 0],
      ],
      "The loading bay compares the two saved branch totals and stores 10.",
    )
    ops.routeResult(
      gridPathProblem.optimalCost,
      optimalWarehousePath,
      "R1C1 → R2C1 → R3C1 → R3C2 → R4C2 → R4C3 → R4C4",
      "The saved map reconstructs the cost-10 route.",
    )
    ops.done("R2C2 is evaluated once; its saved answer stops the repeated branch.")
  },
)

export const gridPathTabulation = storyAlgorithm(
  "grid-path-tabulation",
  "Grid path — tabulation",
  dpStoryConfig("grid-path", "tabulation"),
  (_input, ops) => {
    ops.intro("Start at the dispatch door and write the cheapest remaining cost into every tile.")
    for (let row = gridPathProblem.costs.length - 1; row >= 0; row--) {
      for (let column = gridPathProblem.costs[row].length - 1; column >= 0; column--) {
        const dependencies: GridCell[] = []
        if (column < gridPathProblem.costs[row].length - 1) dependencies.push([row, column + 1])
        if (row < gridPathProblem.costs.length - 1) dependencies.push([row + 1, column])
        ops.storeTile(
          [row, column],
          gridPathProblem.bestRemaining[row][column],
          dependencies,
          dependencies.length
            ? "Read the written right and down tiles, then write the cheaper remaining cost."
            : "Write 0 at the dispatch door: no travel remains.",
        )
      }
    }
    ops.routeResult(
      gridPathProblem.optimalCost,
      optimalWarehousePath,
      "R1C1 → R2C1 → R3C1 → R3C2 → R4C2 → R4C3 → R4C4",
      "Follow the cheapest written neighbour from the loading bay to the dispatch door.",
    )
    ops.done("The completed warehouse map stores route cost 10 at the loading bay.")
  },
)

export const gridPathTopDown = treeAlgorithm(
  "grid-path-top-down",
  "Grid path — top-down DP",
  "grid-path-top-down",
  (_input, ops) => {
    const nodes: ExecutionTreeNode[] = [
      {
        id: "r1c1",
        label: "best(R1C1)",
        detail: "loading bay",
        values: [],
        x: 300,
        y: 24,
        depth: 0,
      },
      {
        id: "r1c2",
        label: "best(R1C2)",
        detail: "move right",
        values: [],
        x: 155,
        y: 88,
        depth: 1,
      },
      { id: "r2c1", label: "best(R2C1)", detail: "move down", values: [], x: 445, y: 88, depth: 1 },
      {
        id: "r1c3",
        label: "best(R1C3)",
        detail: "right child",
        values: [],
        x: 65,
        y: 152,
        depth: 2,
      },
      {
        id: "r2c2a",
        label: "best(R2C2)",
        detail: "first visit",
        values: [],
        x: 235,
        y: 152,
        depth: 2,
      },
      {
        id: "r2c2b",
        label: "best(R2C2)",
        detail: "same cache key",
        values: [],
        x: 375,
        y: 152,
        depth: 2,
      },
      {
        id: "r3c1",
        label: "best(R3C1)",
        detail: "down child",
        values: [],
        x: 535,
        y: 152,
        depth: 2,
      },
      {
        id: "r2c3a",
        label: "best(R2C3)",
        detail: "would repeat",
        values: [],
        x: 325,
        y: 216,
        depth: 3,
      },
      {
        id: "r3c2a",
        label: "best(R3C2)",
        detail: "would repeat",
        values: [],
        x: 425,
        y: 216,
        depth: 3,
      },
    ]
    const edges = [
      { from: "r1c1", to: "r1c2" },
      { from: "r1c1", to: "r2c1" },
      { from: "r1c2", to: "r1c3" },
      { from: "r1c2", to: "r2c2a" },
      { from: "r2c1", to: "r2c2b" },
      { from: "r2c1", to: "r3c1" },
      { from: "r2c2b", to: "r2c3a" },
      { from: "r2c2b", to: "r3c2a" },
    ]
    ops.tree(nodes, edges, "r1c1", "Ask for the cheapest route from the loading bay.")
    ops.split(
      "r1c1",
      ["r1c1"],
      ["r1c2", "r2c1"],
      "The state compares moving right with moving down.",
    )
    ops.split(
      "r1c2",
      ["r1c1", "r1c2"],
      ["r1c3", "r2c2a"],
      "Expand the two routes available from R1C2.",
    )
    ops.returnResult(
      "r1c3",
      ["r1c1", "r1c2", "r1c3"],
      "13",
      "The compact branch returns the remaining cost from R1C3.",
    )
    ops.store("r1c3", ["r1c1", "r1c2", "r1c3"], "R1C3", "13", "Store the best cost from R1C3.")
    ops.combine(
      "r2c2a",
      ["r1c1", "r1c2", "r2c2a"],
      "15",
      "The best remaining cost from R2C2 is 15.",
    )
    ops.store("r2c2a", ["r1c1", "r1c2", "r2c2a"], "R2C2", "15", "Store best(R2C2) = 15.")
    ops.combine("r1c2", ["r1c1", "r1c2"], "14", "R1C2 stores its tile cost plus the cheaper child.")
    ops.store("r1c2", ["r1c1", "r1c2"], "R1C2", "14", "Store best(R1C2) = 14.")
    ops.split(
      "r2c1",
      ["r1c1", "r2c1"],
      ["r2c2b", "r3c1"],
      "The downward branch reaches R2C2 again.",
    )
    ops.cacheHit(
      "r2c2b",
      ["r1c1", "r2c1", "r2c2b"],
      "R2C2",
      "15",
      ["r2c3a", "r3c2a"],
      "Reuse best(R2C2) = 15 and skip both of its child routes.",
    )
    ops.returnResult(
      "r3c1",
      ["r1c1", "r2c1", "r3c1"],
      "8",
      "The compact branch returns best(R3C1) = 8.",
    )
    ops.store("r3c1", ["r1c1", "r2c1", "r3c1"], "R3C1", "8", "Store best(R3C1) = 8.")
    ops.combine("r2c1", ["r1c1", "r2c1"], "10", "R2C1 prefers the route through R3C1.")
    ops.store("r2c1", ["r1c1", "r2c1"], "R2C1", "10", "Store best(R2C1) = 10.")
    ops.combine("r1c1", ["r1c1"], "10", "The loading bay prefers down: min(14, 10) = 10.")
    ops.store("r1c1", ["r1c1"], "R1C1", "10", "Store the requested route cost.")
    ops.done(
      "r1c1",
      "10",
      "Top-down DP returns cost 10 and avoids recomputing repeated coordinates.",
    )
  },
)

export const gridPathBottomUp = tableAlgorithm(
  "grid-path-bottom-up",
  "Grid path — bottom-up DP",
  "grid-path-bottom-up",
  (_input, ops) => {
    const best = gridPathProblem.bestRemaining
    ops.board(
      ["R1", "R2", "R3", "R4"],
      ["C1", "C2", "C3", "C4"],
      "Fill the warehouse from the dispatch door back to the loading bay.",
    )
    for (let row = 3; row >= 0; row--) {
      for (let column = 3; column >= 0; column--) {
        const dependencies: Array<[number, number]> = []
        if (column < 3) dependencies.push([row, column + 1])
        if (row < 3) dependencies.push([row + 1, column])
        const dependencyValues = dependencies.map(([depRow, depColumn]) => best[depRow][depColumn])
        const tileCost = gridPathProblem.costs[row][column]
        const formula = dependencies.length
          ? `${tileCost} + min(${dependencyValues.join(", ")}) = ${best[row][column]}`
          : "goal = 0"
        ops.set(
          row,
          column,
          String(best[row][column]),
          dependencies,
          dependencies.length
            ? "Read the already-solved right and down neighbours, then store the cheaper route."
            : "The dispatch door is the base tile with no remaining travel cost.",
          formula,
        )
      }
    }
    ops.markPath(optimalWarehousePath, "Follow the cheaper stored neighbour from R1C1 to R4C4.")
    ops.done("The bottom-up matrix stores the minimum route cost 10 at R1C1.")
  },
)

export const dynamicProgrammingAlgorithms = [
  coinChangeGreedy,
  coinChangeNaive,
  coinChangeMemoization,
  coinChangeTabulation,
  coinChangeTopDown,
  coinChangeBottomUp,
  gridPathGreedy,
  gridPathNaive,
  gridPathMemoization,
  gridPathTabulation,
  gridPathTopDown,
  gridPathBottomUp,
] as const

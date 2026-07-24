import { DPRecorder } from "../recorders"
import { coinChangeProblem, gridPathProblem } from "../dp-problem-data"
import {
  makeDPStoryView,
  makeDPView,
  type MatrixGridRoleDescriptor,
  type MatrixGridViewSemantics,
} from "../render"
import type { StepTraceConfig, StepTraceView, VisualFamily } from "../types"

export type DPProblem = "coin-change" | "grid-path"
export type DPStoryApproach = "greedy" | "naive" | "memoization" | "tabulation"
export type DPTableProfile = "coin-change-bottom-up" | "grid-path-bottom-up"

export interface DPStoryConfig {
  profile: "dp-story"
  problem: DPProblem
  approach: DPStoryApproach
}

export interface CoinAttempt {
  label: string
  value: string
  state: "active" | "repeated" | "best" | "dead"
}

export interface CoinMemoEntry {
  key: string
  value: string
  state: "stored" | "hit"
}

export interface DPStoryFrame {
  type: "init" | "step" | "done"
  profile: "dp-story"
  problem: DPProblem
  approach: DPStoryApproach
  remaining: number
  selected: number[]
  activeCoin: number | null
  coins: number[]
  target: number
  attempts: CoinAttempt[]
  memo: CoinMemoEntry[]
  best: string | null
  amounts: number[]
  amountValues: Array<number | null>
  amountCurrent: number | null
  amountDependencies: number[]
  amountPath: number[]
  costs: number[][]
  gridValues: Array<Array<number | null>>
  gridDependencies: Array<[number, number]>
  current: [number, number] | null
  path: Array<[number, number]>
  repeated: Array<[number, number]>
  bestPath: Array<[number, number]>
  routeCost: number
  routeLabel: string
  bestCost: number | null
  message: string
}

export interface DPStoryOperations {
  intro(message: string): void
  chooseCoin(coin: number, remaining: number, selected: number[], message: string): void
  backtrackCoins(remaining: number, selected: number[], message: string): void
  coinAttempt(attempt: CoinAttempt, message: string): void
  coinMemo(key: string, value: string, state: CoinMemoEntry["state"], message: string): void
  fillAmount(amount: number, value: number, dependencies: number[], message: string): void
  amountResult(path: number[], best: string, selected: number[], message: string): void
  coinResult(best: string, selected: number[], message: string): void
  visitTile(
    current: [number, number],
    path: Array<[number, number]>,
    routeCost: number,
    repeated: Array<[number, number]>,
    message: string,
  ): void
  storeTile(
    current: [number, number],
    value: number,
    dependencies: Array<[number, number]>,
    message: string,
  ): void
  routeResult(
    bestCost: number,
    bestPath: Array<[number, number]>,
    routeLabel: string,
    message: string,
  ): void
  done(message: string): void
}

export interface DPTableConfig {
  profile: DPTableProfile
}

export interface DPTableFrame {
  type: "init" | "compute" | "trace" | "done"
  profile: DPTableProfile
  variant: null
  rowLabels: string[]
  colLabels: string[]
  grid: Array<Array<string | null>>
  cur: [number, number] | null
  deps: Array<[number, number]>
  path: Array<[number, number]>
  formula: string | null
  message: string
}

export class DPStoryRecorder implements DPStoryOperations {
  frames: DPStoryFrame[] = []
  private readonly config: DPStoryConfig
  private remaining: number = coinChangeProblem.target
  private selected: number[] = []
  private activeCoin: number | null = null
  private attempts: CoinAttempt[] = []
  private memo: CoinMemoEntry[] = []
  private best: string | null = null
  private readonly amounts: number[] = coinChangeProblem.amounts.slice()
  private amountValues: Array<number | null> = this.amounts.map(() => null)
  private amountCurrent: number | null = null
  private amountDependencies: number[] = []
  private amountPath: number[] = []
  private readonly costs = gridPathProblem.costs
  private gridValues: Array<Array<number | null>> = this.costs.map((row) => row.map(() => null))
  private gridDependencies: Array<[number, number]> = []
  private current: [number, number] | null = null
  private path: Array<[number, number]> = []
  private repeated: Array<[number, number]> = []
  private bestPath: Array<[number, number]> = []
  private routeCost = 0
  private routeLabel = "—"
  private bestCost: number | null = null

  constructor(config: DPStoryConfig) {
    this.config = config
  }

  intro(message: string) {
    this.push("init", message)
  }

  chooseCoin(coin: number, remaining: number, selected: number[], message: string) {
    this.activeCoin = coin
    this.remaining = remaining
    this.selected = selected.slice()
    this.push("step", message)
  }

  backtrackCoins(remaining: number, selected: number[], message: string) {
    this.activeCoin = null
    this.remaining = remaining
    this.selected = selected.slice()
    this.push("step", message)
  }

  coinAttempt(attempt: CoinAttempt, message: string) {
    this.attempts.push({ ...attempt })
    this.push("step", message)
  }

  coinMemo(key: string, value: string, state: CoinMemoEntry["state"], message: string) {
    const existing = this.memo.findIndex((entry) => entry.key === key)
    const entry = { key, value, state }
    if (existing === -1) this.memo.push(entry)
    else this.memo[existing] = entry
    this.push("step", message)
  }

  fillAmount(amount: number, value: number, dependencies: number[], message: string) {
    const index = this.amounts.indexOf(amount)
    if (index === -1) throw new Error(`steptrace: unsupported coin-change amount ${amount}.`)
    this.amountValues[index] = value
    this.amountCurrent = amount
    this.amountDependencies = dependencies.slice()
    this.push("step", message)
  }

  amountResult(path: number[], best: string, selected: number[], message: string) {
    this.amountPath = path.slice()
    this.best = best
    this.selected = selected.slice()
    this.remaining = 0
    this.amountCurrent = null
    this.amountDependencies = []
    this.push("step", message)
  }

  coinResult(best: string, selected: number[], message: string) {
    this.best = best
    this.selected = selected.slice()
    this.remaining = 0
    this.activeCoin = null
    this.push("step", message)
  }

  visitTile(
    current: [number, number],
    path: Array<[number, number]>,
    routeCost: number,
    repeated: Array<[number, number]>,
    message: string,
  ) {
    this.current = current.slice() as [number, number]
    this.gridDependencies = []
    this.path = path.map((cell) => cell.slice() as [number, number])
    this.repeated = repeated.map((cell) => cell.slice() as [number, number])
    this.routeCost = routeCost
    this.routeLabel = this.path.map(([row, column]) => `R${row + 1}C${column + 1}`).join(" → ")
    this.push("step", message)
  }

  storeTile(
    current: [number, number],
    value: number,
    dependencies: Array<[number, number]>,
    message: string,
  ) {
    this.current = current.slice() as [number, number]
    this.gridValues[current[0]][current[1]] = value
    this.gridDependencies = dependencies.map((cell) => cell.slice() as [number, number])
    this.push("step", message)
  }

  routeResult(
    bestCost: number,
    bestPath: Array<[number, number]>,
    routeLabel: string,
    message: string,
  ) {
    this.bestCost = bestCost
    this.bestPath = bestPath.map((cell) => cell.slice() as [number, number])
    this.path = this.bestPath.map((cell) => cell.slice() as [number, number])
    this.current = null
    this.gridDependencies = []
    this.routeCost = bestCost
    this.routeLabel = routeLabel
    this.push("step", message)
  }

  done(message: string) {
    this.activeCoin = null
    this.current = null
    this.amountCurrent = null
    this.amountDependencies = []
    this.gridDependencies = []
    this.push("done", message)
  }

  private push(type: DPStoryFrame["type"], message: string) {
    this.frames.push(
      Object.freeze({
        type,
        profile: this.config.profile,
        problem: this.config.problem,
        approach: this.config.approach,
        remaining: this.remaining,
        selected: this.selected.slice(),
        activeCoin: this.activeCoin,
        coins: coinChangeProblem.coins.slice(),
        target: coinChangeProblem.target,
        attempts: this.attempts.map((attempt) => ({ ...attempt })),
        memo: this.memo.map((entry) => ({ ...entry })),
        best: this.best,
        amounts: this.amounts.slice(),
        amountValues: this.amountValues.slice(),
        amountCurrent: this.amountCurrent,
        amountDependencies: this.amountDependencies.slice(),
        amountPath: this.amountPath.slice(),
        costs: this.costs.map((row) => row.slice()),
        gridValues: this.gridValues.map((row) => row.slice()),
        gridDependencies: this.gridDependencies.map((cell) => cell.slice() as [number, number]),
        current: this.current ? (this.current.slice() as [number, number]) : null,
        path: this.path.map((cell) => cell.slice() as [number, number]),
        repeated: this.repeated.map((cell) => cell.slice() as [number, number]),
        bestPath: this.bestPath.map((cell) => cell.slice() as [number, number]),
        routeCost: this.routeCost,
        routeLabel: this.routeLabel,
        bestCost: this.bestCost,
        message,
      }),
    )
  }
}

export function dpStoryConfig(problem: DPProblem, approach: DPStoryApproach) {
  return (config: StepTraceConfig): DPStoryConfig => {
    if (config.variant !== undefined)
      throw new Error(`steptrace: ${problem}-${approach} does not take a variant.`)
    return { profile: "dp-story", problem, approach }
  }
}

export function dpTableConfig(profile: DPTableProfile) {
  return (config: StepTraceConfig): DPTableConfig => {
    if (config.variant !== undefined)
      throw new Error(`steptrace: ${profile} does not take a variant.`)
    return { profile }
  }
}

export const dpStoryFamily = {
  id: "dp-story",
  createRecorder(config) {
    return new DPStoryRecorder(config)
  },
  createView(frames) {
    return makeDPStoryView(frames) as StepTraceView<DPStoryFrame>
  },
} satisfies VisualFamily<DPStoryConfig, DPStoryRecorder, DPStoryFrame>

const coinRoles = [
  { role: "operand-a", badge: "A", label: "predecessor amount" },
  { role: "operand-b", badge: "B", label: "another predecessor" },
  { role: "target", badge: "T", label: "amount being solved" },
  { role: "path", badge: "✓", label: "optimal amount chain" },
] satisfies readonly MatrixGridRoleDescriptor[]

const gridRoles = [
  { role: "operand-a", badge: "R", label: "right neighbour" },
  { role: "operand-b", badge: "D", label: "down neighbour" },
  { role: "target", badge: "T", label: "tile being solved" },
  { role: "path", badge: "✓", label: "optimal route" },
] satisfies readonly MatrixGridRoleDescriptor[]

function rolesForCell(frame: DPTableFrame, row: number, column: number) {
  const roles: string[] = []
  if (frame.grid[row][column] != null) roles.push("stored")
  if (frame.deps.some(([depRow, depColumn]) => depRow === row && depColumn === column)) {
    const depIndex = frame.deps.findIndex(
      ([depRow, depColumn]) => depRow === row && depColumn === column,
    )
    roles.push(depIndex === 1 ? "operand-b" : "operand-a")
  }
  if (frame.path.some(([pathRow, pathColumn]) => pathRow === row && pathColumn === column))
    roles.push("path")
  if (frame.cur?.[0] === row && frame.cur?.[1] === column) roles.push("target")
  return roles
}

const coinTableSemantics: MatrixGridViewSemantics = {
  tableLabel: `Bottom-up coin-change table for a ${coinChangeProblem.target}-cent payment`,
  axisDescription: "Each column stores the fewest coins needed for that amount.",
  cornerLabel: "amount →",
  stageLayout: "fill",
  formatValue(value) {
    return value == null ? "—" : String(value)
  },
  cellLabel(frame: DPTableFrame, row, column) {
    const value = frame.grid[row][column]
    return `${frame.colLabels[column]} needs ${value ?? "an unsolved number of"} coins`
  },
  stateForCell(frame: DPTableFrame, row, column) {
    if (frame.cur?.[0] === row && frame.cur?.[1] === column) return "cur"
    return frame.deps.some(([depRow, depColumn]) => depRow === row && depColumn === column)
      ? "dep"
      : ""
  },
  rolesForCell,
  footerModel(frame: DPTableFrame) {
    const column = frame.cur?.[1]
    if (column != null)
      return {
        context: `Solve ${frame.colLabels[column]}`,
        summary: { text: frame.formula || `Store ${frame.grid[0][column]}` },
      }
    return frame.type === "init"
      ? { context: "Prepare amount table", summary: { text: "start at 0¢" } }
      : { context: "Exact change ready", summary: { text: "30¢ = 10¢ + 10¢ + 10¢" } }
  },
  roleLegend: coinRoles,
  watchRows(frame: DPTableFrame) {
    const column = frame.cur?.[1]
    return [
      {
        k: "amount",
        v: column == null ? "—" : frame.colLabels[column],
        sw: "var(--_blue)",
        hint: "Amount whose best exact change is being stored.",
      },
      {
        k: "predecessors",
        v: frame.deps.length
          ? frame.deps.map(([, dependency]) => frame.colLabels[dependency]).join(", ")
          : "base",
        sw: "var(--_amber)",
        hint: "Smaller amounts reached after placing one allowed coin.",
      },
      {
        k: "transition",
        v: frame.formula || "—",
        sw: "var(--_violet)",
        hint: "Fewest predecessor coins plus the new coin placed now.",
      },
      {
        k: "answer",
        v: frame.grid[0].at(-1) || "—",
        sw: "var(--_green)",
        hint: `Fewest coins stored for the full ${coinChangeProblem.target}-cent payment.`,
      },
    ]
  },
}

const gridTableSemantics: MatrixGridViewSemantics = {
  tableLabel: "Bottom-up minimum-cost warehouse path matrix",
  axisDescription: "Each tile stores its cost plus the cheaper right or down neighbour.",
  cornerLabel: "warehouse",
  stageLayout: "fill",
  formatValue(value) {
    return value == null ? "—" : String(value)
  },
  cellLabel(frame: DPTableFrame, row, column) {
    return `R${row + 1}C${column + 1}: ${frame.grid[row][column] ?? "not solved"}`
  },
  stateForCell(frame: DPTableFrame, row, column) {
    if (frame.cur?.[0] === row && frame.cur?.[1] === column) return "cur"
    if (frame.path.some(([pathRow, pathColumn]) => pathRow === row && pathColumn === column))
      return "path"
    return frame.deps.some(([depRow, depColumn]) => depRow === row && depColumn === column)
      ? "dep"
      : ""
  },
  rolesForCell,
  footerModel(frame: DPTableFrame) {
    if (frame.type === "trace") return { context: "Optimal route", summary: { text: "cost 10" } }
    if (frame.cur) {
      const [row, column] = frame.cur
      return {
        context: `Solve R${row + 1}C${column + 1}`,
        summary: { text: frame.formula || `Store ${frame.grid[row][column]}` },
      }
    }
    return frame.type === "init"
      ? { context: "Prepare warehouse matrix", summary: { text: "start at the goal" } }
      : { context: "Loading bay ready", summary: { text: "minimum cost 10" } }
  },
  roleLegend: gridRoles,
  watchRows(frame: DPTableFrame) {
    const tile = frame.cur ? `R${frame.cur[0] + 1}C${frame.cur[1] + 1}` : "—"
    return [
      {
        k: "tile",
        v: tile,
        sw: "var(--_blue)",
        hint: "Warehouse tile whose minimum remaining cost is being stored.",
      },
      {
        k: "reads",
        v: frame.deps.length
          ? frame.deps.map(([row, column]) => `R${row + 1}C${column + 1}`).join(" or ")
          : "goal",
        sw: "var(--_amber)",
        hint: "Already-solved right and down neighbours available from this tile.",
      },
      {
        k: "transition",
        v: frame.formula || "—",
        sw: "var(--_violet)",
        hint: "Current tile cost plus the cheaper reachable neighbour.",
      },
      {
        k: "best cost",
        v: frame.grid[0]?.[0] || "—",
        sw: "var(--_green)",
        hint: "Minimum travel cost stored for the loading bay.",
      },
    ]
  },
}

export const dpProblemTableFamily = {
  id: "matrix-grid",
  createRecorder(config) {
    return new DPRecorder(config.profile) as DPRecorder
  },
  createView(frames) {
    const semantics =
      frames[0]?.profile === "coin-change-bottom-up" ? coinTableSemantics : gridTableSemantics
    return makeDPView(frames, semantics) as StepTraceView<DPTableFrame>
  },
} satisfies VisualFamily<DPTableConfig, DPRecorder, DPTableFrame>

export const dpProblemTableSemantics = {
  coin: coinTableSemantics,
  grid: gridTableSemantics,
}

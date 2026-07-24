import { BoundarySearchRecorder } from "../recorders"
import {
  makeBoundarySearchView,
  type BoundarySearchViewDescriptor,
} from "../render"
import type { StepTraceView, VisualFamily } from "../types"

export interface BoundaryLane {
  label: string
  items: number[]
  total: number
}

export interface BoundaryEvaluation {
  lanes: BoundaryLane[]
  required: number
  allowed: number
  feasible: boolean
}

export interface MonotoneBoundaryConfig {
  profile: "shipping-capacity"
  lower: number
  upper: number
  weights: number[]
  days: number
  goal: string
}

export interface BoundarySearchFrame {
  type: "range" | "evaluate" | "narrow" | "found" | "done"
  profile: MonotoneBoundaryConfig["profile"]
  lower: number
  upper: number
  lo: number
  hi: number
  candidate: number | null
  evaluation: BoundaryEvaluation | null
  answer: number | null
  probes: number
  allowed: number
  maxInfeasible: number
  minFeasible: number
  message: string
}

export interface BoundarySearchOperations {
  begin(message: string): void
  evaluate(
    lo: number,
    hi: number,
    candidate: number,
    evaluation: BoundaryEvaluation,
    message: string,
  ): void
  narrow(lo: number, hi: number, message: string): void
  hit(answer: number, evaluation: BoundaryEvaluation, message: string): void
  done(message: string): void
}

export const shippingCapacityDescriptor: BoundarySearchViewDescriptor = {
  ariaLabel: "Binary search over shipping capacity",
  rangeLabel: "Candidate capacity",
  evaluationLabel: "Greedy shipping check",
  unitLabel: "load",
  watchRows(frame) {
    const evaluation = frame.evaluation
    return [
      {
        k: "goal",
        v: "smallest feasible capacity",
        sw: "var(--_accent)",
      },
      {
        k: "range",
        v: `[${frame.lo}, ${frame.hi}]`,
        sw: "var(--_neutral)",
        hint: "Capacities that can still contain the first feasible answer.",
      },
      {
        k: "capacity",
        v: frame.candidate ?? "—",
        sw: "var(--_blue)",
        hint: "Candidate capacity currently passed to the feasibility check.",
      },
      {
        k: "days used",
        v: evaluation ? `${evaluation.required} / ${evaluation.allowed}` : "—",
        sw: "var(--_amber)",
      },
      {
        k: "verdict",
        v: evaluation ? (evaluation.feasible ? "feasible" : "too small") : "—",
        sw: evaluation?.feasible ? "var(--_green)" : "var(--_amber)",
        hint: "Whether this candidate satisfies the day limit.",
      },
    ]
  },
}

export const monotoneBoundaryFamily = {
  id: "monotone-boundary",
  createRecorder(config) {
    return new BoundarySearchRecorder(config) as BoundarySearchRecorder & BoundarySearchOperations
  },
  createView(frames) {
    return makeBoundarySearchView(
      frames,
      shippingCapacityDescriptor,
    ) as StepTraceView<BoundarySearchFrame>
  },
} satisfies VisualFamily<MonotoneBoundaryConfig, BoundarySearchRecorder, BoundarySearchFrame>

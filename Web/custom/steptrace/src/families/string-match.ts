import { makeMatchView } from "../render"
import type { FamilyAdapterVisualFamily } from "../types"

export const stringMatchFamily = {
  id: "string-match",
  createView: makeMatchView,
} satisfies FamilyAdapterVisualFamily<"string">

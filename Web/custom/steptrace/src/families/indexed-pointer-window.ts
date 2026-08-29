import { makePointerView } from "../render"
import type { FamilyAdapterVisualFamily } from "../types"

export const indexedPointerWindowFamily = {
  id: "indexed-pointer-window",
  createView: makePointerView,
} satisfies FamilyAdapterVisualFamily<"pointers">

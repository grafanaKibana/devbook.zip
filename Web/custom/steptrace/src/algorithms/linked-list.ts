import {
  LINKED_LIST_MAX_NODES,
  mountLinkedList,
  type LinkedListConfig,
} from "../families/linked-topology"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [12, 27, 39, 54]

export function parseLinkedListConfig(config: StepTraceConfig): LinkedListConfig {
  const values = Array.isArray(config.array) && config.array.length ? config.array : DEFAULT_VALUES
  const variant = config.variant ?? "singly"
  if (variant !== "singly" && variant !== "doubly" && variant !== "reverse")
    throw new Error(`steptrace: linked-list "variant" must be "singly", "doubly", or "reverse".`)
  if (
    values.length < 2 ||
    values.length > LINKED_LIST_MAX_NODES ||
    values.some(
      (value) => typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value),
    )
  )
    throw new Error(
      `steptrace: linked-list requires 2 to ${LINKED_LIST_MAX_NODES} finite integer values.`,
    )
  return { values: values as number[], variant }
}

export const linkedList = {
  id: "linked-list",
  family: "linked-topology",
  meta: { label: "Linked List" },
  parse: parseLinkedListConfig,
  mount: mountLinkedList,
} satisfies InteractiveStructureDefinition<LinkedListConfig>

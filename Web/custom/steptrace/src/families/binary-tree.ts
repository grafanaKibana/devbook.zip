import { GRAPH_NODE_RADIUS_PX, observeFixedSvgNodes, trimGraphEdge } from "../graph-node"
import { el, successMarker } from "../render"
import type { MountHandle, StepTraceConfig } from "../types"
import { createStructureShell, onEnter } from "./interactive-structure"

export interface BinaryTreeConfig {
  values: number[]
  value?: number
}

type TreeKind = "avl-tree" | "binary-search-tree" | "red-black-tree" | "splay-tree"
type NodeColor = "red" | "black"

interface TreeNode {
  key: number
  height: number
  color: NodeColor
  left: TreeNode | null
  right: TreeNode | null
  parent: TreeNode | null
}

interface OperationState {
  path: number[]
  changed: Set<number>
  repairing: Set<number>
  success: number | null
}

interface TreeModel {
  root: TreeNode | null
  insert(key: number, state: OperationState): { changed: boolean; detail: string }
  search(key: number, state: OperationState): { found: boolean; detail: string }
  remove(key: number, state: OperationState): { changed: boolean; detail: string }
  meta(node: TreeNode): string
  invariant(): string
}

const SVG_NS = "http://www.w3.org/2000/svg"
const VIEW_WIDTH = 580
const VIEW_HEIGHT = 250
const MAX_VALUES = 9

export function parseBinaryTreeConfig(
  config: StepTraceConfig,
  algorithm: TreeKind,
  defaults: readonly number[],
  maxValues = MAX_VALUES,
): BinaryTreeConfig {
  const values = Array.isArray(config.values) && config.values.length ? config.values : defaults
  if (
    values.some(
      (value) => typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value),
    )
  )
    throw new Error(`steptrace: ${algorithm} requires finite integer values.`)
  if (new Set(values).size !== values.length)
    throw new Error(`steptrace: ${algorithm} requires unique values.`)
  if (values.length > maxValues)
    throw new Error(`steptrace: ${algorithm} supports at most ${maxValues} values.`)
  const value = config.value
  if (
    value != null &&
    (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value))
  )
    throw new Error(`steptrace: ${algorithm} value must be a finite integer.`)
  return { values: values as number[], value: value as number | undefined }
}

function svgEl(tag: string, className: string) {
  const node = document.createElementNS(SVG_NS, tag)
  node.setAttribute("class", className)
  return node
}

function operationState(): OperationState {
  return { path: [], changed: new Set(), repairing: new Set(), success: null }
}

function node(key: number, color: NodeColor = "black"): TreeNode {
  return { key, height: 1, color, left: null, right: null, parent: null }
}

function height(current: TreeNode | null) {
  return current?.height ?? 0
}

function updateHeight(current: TreeNode) {
  current.height = 1 + Math.max(height(current.left), height(current.right))
}

function balanceFactor(current: TreeNode) {
  return height(current.left) - height(current.right)
}

function orderedKeys(root: TreeNode | null) {
  const keys: number[] = []
  const visit = (current: TreeNode | null) => {
    if (!current) return
    visit(current.left)
    keys.push(current.key)
    visit(current.right)
  }
  visit(root)
  return keys
}

function treeHeight(root: TreeNode | null) {
  return root ? 1 + Math.max(treeHeight(root.left), treeHeight(root.right)) : 0
}

function plainInsert(root: TreeNode | null, key: number) {
  if (!root) return node(key)
  let current = root
  while (true) {
    if (key < current.key) {
      if (current.left) current = current.left
      else {
        current.left = node(key)
        current.left.parent = current
        break
      }
    } else {
      if (current.right) current = current.right
      else {
        current.right = node(key)
        current.right.parent = current
        break
      }
    }
  }
  return root
}

function createBstModel(values: readonly number[]): TreeModel {
  let root: TreeNode | null = null
  for (const value of values) root = plainInsert(root, value)

  const model: TreeModel = {
    root,
    insert(key, state) {
      const before = treeHeight(model.root)
      if (!model.root) {
        model.root = node(key)
        state.changed.add(key)
        state.success = key
        return { changed: true, detail: `Inserted ${key} as the root; height is 1.` }
      }
      let current = model.root
      while (true) {
        state.path.push(current.key)
        if (key === current.key)
          return {
            changed: false,
            detail: `Compared ${state.path.join(" → ")}; ${key} already exists, so the tree did not change.`,
          }
        const side = key < current.key ? "left" : "right"
        const child = current[side]
        if (child) {
          current = child
          continue
        }
        current[side] = node(key)
        current[side]!.parent = current
        state.changed.add(key)
        state.success = key
        const after = treeHeight(model.root)
        return {
          changed: true,
          detail: `Inserted ${key} via ${state.path.join(" → ")}; height ${before} → ${after}. Sorted inserts keep extending one side instead of restoring balance.`,
        }
      }
    },
    search(key, state) {
      let current = model.root
      while (current) {
        state.path.push(current.key)
        if (key === current.key) {
          state.success = key
          return { found: true, detail: `Search path ${state.path.join(" → ")} found ${key}.` }
        }
        current = key < current.key ? current.left : current.right
      }
      return {
        found: false,
        detail: `Search path ${state.path.join(" → ")} reached an empty child; ${key} is absent.`,
      }
    },
    remove(key, state) {
      let parent: TreeNode | null = null
      let current = model.root
      while (current && current.key !== key) {
        state.path.push(current.key)
        parent = current
        current = key < current.key ? current.left : current.right
      }
      if (!current)
        return {
          changed: false,
          detail: `Compared ${state.path.join(" → ")}; ${key} is absent, so the tree did not change.`,
        }
      state.path.push(current.key)
      state.changed.add(current.key)
      if (current.left && current.right) {
        let successorParent = current
        let successor = current.right
        while (successor.left) {
          state.path.push(successor.key)
          successorParent = successor
          successor = successor.left
        }
        current.key = successor.key
        state.changed.add(successor.key)
        const child = successor.right
        if (successorParent.left === successor) successorParent.left = child
        else successorParent.right = child
        if (child) child.parent = successorParent
      } else {
        const child = current.left ?? current.right
        if (!parent) model.root = child
        else if (parent.left === current) parent.left = child
        else parent.right = child
        if (child) child.parent = parent
      }
      return {
        changed: true,
        detail: `Removed ${key} via ${state.path.join(" → ")}; BST order is preserved at height ${treeHeight(model.root)}.`,
      }
    },
    meta: () => "",
    invariant: () => `BST order valid · height ${treeHeight(model.root)}`,
  }
  return model
}

function createAvlModel(values: readonly number[]): TreeModel {
  const rotateRight = (current: TreeNode, state: OperationState) => {
    const next = current.left!
    state.repairing.add(current.key).add(next.key)
    current.left = next.right
    if (current.left) current.left.parent = current
    next.right = current
    next.parent = current.parent
    current.parent = next
    updateHeight(current)
    updateHeight(next)
    return next
  }
  const rotateLeft = (current: TreeNode, state: OperationState) => {
    const next = current.right!
    state.repairing.add(current.key).add(next.key)
    current.right = next.left
    if (current.right) current.right.parent = current
    next.left = current
    next.parent = current.parent
    current.parent = next
    updateHeight(current)
    updateHeight(next)
    return next
  }
  const rebalance = (current: TreeNode, state: OperationState, repairs: string[]) => {
    updateHeight(current)
    const factor = balanceFactor(current)
    if (factor > 1) {
      if (balanceFactor(current.left!) < 0) {
        repairs.push(`LR at ${current.key}`)
        current.left = rotateLeft(current.left!, state)
        current.left.parent = current
      } else repairs.push(`LL at ${current.key}`)
      return rotateRight(current, state)
    }
    if (factor < -1) {
      if (balanceFactor(current.right!) > 0) {
        repairs.push(`RL at ${current.key}`)
        current.right = rotateRight(current.right!, state)
        current.right.parent = current
      } else repairs.push(`RR at ${current.key}`)
      return rotateLeft(current, state)
    }
    return current
  }
  const insert = (
    current: TreeNode | null,
    key: number,
    state: OperationState,
    repairs: string[],
  ): [TreeNode, boolean] => {
    if (!current) {
      state.changed.add(key)
      return [node(key), true]
    }
    state.path.push(current.key)
    if (key === current.key) return [current, false]
    let inserted: boolean
    if (key < current.key) {
      ;[current.left, inserted] = insert(current.left, key, state, repairs)
      current.left.parent = current
    } else {
      ;[current.right, inserted] = insert(current.right, key, state, repairs)
      current.right.parent = current
    }
    return [inserted ? rebalance(current, state, repairs) : current, inserted]
  }
  const minimum = (current: TreeNode) => {
    while (current.left) current = current.left
    return current
  }
  const remove = (
    current: TreeNode | null,
    key: number,
    state: OperationState,
    repairs: string[],
  ): [TreeNode | null, boolean] => {
    if (!current) return [null, false]
    state.path.push(current.key)
    let removed: boolean
    if (key < current.key) {
      ;[current.left, removed] = remove(current.left, key, state, repairs)
      if (current.left) current.left.parent = current
    } else if (key > current.key) {
      ;[current.right, removed] = remove(current.right, key, state, repairs)
      if (current.right) current.right.parent = current
    } else {
      removed = true
      state.changed.add(current.key)
      if (!current.left || !current.right) {
        const child = current.left ?? current.right
        if (child) child.parent = current.parent
        return [child, true]
      }
      const successor = minimum(current.right)
      current.key = successor.key
      state.changed.add(successor.key)
      ;[current.right] = remove(current.right, successor.key, state, repairs)
      if (current.right) current.right.parent = current
    }
    return [removed ? rebalance(current, state, repairs) : current, removed]
  }

  const model: TreeModel = {
    root: null,
    insert(key, state) {
      const repairs: string[] = []
      let inserted: boolean
      ;[model.root, inserted] = insert(model.root, key, state, repairs)
      if (model.root) model.root.parent = null
      if (inserted) state.success = key
      return {
        changed: inserted,
        detail: inserted
          ? `Inserted ${key} via ${state.path.join(" → ") || "the root"}; ${
              repairs.length
                ? `${repairs.join(", ")} restored |balance| ≤ 1.`
                : "no rotation was needed."
            }`
          : `Compared ${state.path.join(" → ")}; ${key} already exists, so the tree did not change.`,
      }
    },
    search(key, state) {
      let current = model.root
      while (current) {
        state.path.push(current.key)
        if (key === current.key) {
          state.success = key
          return { found: true, detail: `Search path ${state.path.join(" → ")} found ${key}.` }
        }
        current = key < current.key ? current.left : current.right
      }
      return {
        found: false,
        detail: `Search path ${state.path.join(" → ")} reached an empty child; ${key} is absent.`,
      }
    },
    remove(key, state) {
      const repairs: string[] = []
      let removed: boolean
      ;[model.root, removed] = remove(model.root, key, state, repairs)
      if (model.root) model.root.parent = null
      return {
        changed: removed,
        detail: removed
          ? `Removed ${key} via ${state.path.join(" → ")}; ${
              repairs.length
                ? `${repairs.join(", ")} rebalanced the shortened path.`
                : "all ancestors stayed within |balance| ≤ 1."
            }`
          : `Compared ${state.path.join(" → ")}; ${key} is absent, so the tree did not change.`,
      }
    },
    meta: (current) => `h${current.height} bf${balanceFactor(current)}`,
    invariant: () => "AVL balance valid · |balance| ≤ 1",
  }
  for (const value of values) model.insert(value, operationState())
  return model
}

function createRedBlackModel(values: readonly number[]): TreeModel {
  const isRed = (current: TreeNode | null) => current?.color === "red"
  const repair = (state: OperationState, ...nodes: Array<TreeNode | null>) => {
    for (const current of nodes) if (current) state.repairing.add(current.key)
  }
  const rotateLeft = (current: TreeNode, state: OperationState, events: string[]) => {
    const next = current.right!
    repair(state, current, next)
    events.push(`rotate left at ${current.key}`)
    current.right = next.left
    next.left = current
    next.color = current.color
    current.color = "red"
    return next
  }
  const rotateRight = (current: TreeNode, state: OperationState, events: string[]) => {
    const next = current.left!
    repair(state, current, next)
    events.push(`rotate right at ${current.key}`)
    current.left = next.right
    next.right = current
    next.color = current.color
    current.color = "red"
    return next
  }
  const flipColors = (current: TreeNode, state: OperationState, events: string[]) => {
    repair(state, current, current.left, current.right)
    events.push(`recolor at ${current.key}`)
    current.color = current.color === "red" ? "black" : "red"
    if (current.left) current.left.color = current.left.color === "red" ? "black" : "red"
    if (current.right) current.right.color = current.right.color === "red" ? "black" : "red"
  }
  const balance = (current: TreeNode, state: OperationState, events: string[]) => {
    if (isRed(current.right) && !isRed(current.left)) current = rotateLeft(current, state, events)
    if (isRed(current.left) && isRed(current.left!.left))
      current = rotateRight(current, state, events)
    if (isRed(current.left) && isRed(current.right)) flipColors(current, state, events)
    return current
  }
  const insert = (
    current: TreeNode | null,
    key: number,
    state: OperationState,
    events: string[],
  ): [TreeNode, boolean] => {
    if (!current) {
      state.changed.add(key)
      return [node(key, "red"), true]
    }
    state.path.push(current.key)
    if (key === current.key) return [current, false]
    let inserted: boolean
    if (key < current.key) [current.left, inserted] = insert(current.left, key, state, events)
    else [current.right, inserted] = insert(current.right, key, state, events)
    return [inserted ? balance(current, state, events) : current, inserted]
  }
  const moveRedLeft = (current: TreeNode, state: OperationState, events: string[]) => {
    flipColors(current, state, events)
    if (isRed(current.right?.left ?? null)) {
      current.right = rotateRight(current.right!, state, events)
      current = rotateLeft(current, state, events)
      flipColors(current, state, events)
    }
    return current
  }
  const moveRedRight = (current: TreeNode, state: OperationState, events: string[]) => {
    flipColors(current, state, events)
    if (isRed(current.left?.left ?? null)) {
      current = rotateRight(current, state, events)
      flipColors(current, state, events)
    }
    return current
  }
  const minimum = (current: TreeNode) => {
    while (current.left) current = current.left
    return current
  }
  const deleteMin = (
    current: TreeNode,
    state: OperationState,
    events: string[],
  ): TreeNode | null => {
    if (!current.left) return null
    if (!isRed(current.left) && !isRed(current.left.left))
      current = moveRedLeft(current, state, events)
    current.left = deleteMin(current.left!, state, events)
    return balance(current, state, events)
  }
  const remove = (
    current: TreeNode,
    key: number,
    state: OperationState,
    events: string[],
  ): TreeNode | null => {
    state.path.push(current.key)
    if (key < current.key) {
      if (current.left) {
        if (!isRed(current.left) && !isRed(current.left.left))
          current = moveRedLeft(current, state, events)
        current.left = remove(current.left!, key, state, events)
      }
    } else {
      if (isRed(current.left)) current = rotateRight(current, state, events)
      if (key === current.key && !current.right) return null
      if (current.right) {
        if (!isRed(current.right) && !isRed(current.right.left))
          current = moveRedRight(current, state, events)
        if (key === current.key) {
          const successor = minimum(current.right)
          state.changed.add(current.key).add(successor.key)
          current.key = successor.key
          current.right = deleteMin(current.right, state, events)
        } else current.right = remove(current.right, key, state, events)
      }
    }
    return balance(current, state, events)
  }
  const blackHeight = (root: TreeNode | null) => {
    let count = 1
    while (root) {
      if (root.color === "black") count++
      root = root.left
    }
    return count
  }

  const model: TreeModel = {
    root: null,
    insert(key, state) {
      const events: string[] = []
      let inserted: boolean
      ;[model.root, inserted] = insert(model.root, key, state, events)
      if (model.root) model.root.color = "black"
      if (inserted) state.success = key
      return {
        changed: inserted,
        detail: inserted
          ? `Inserted ${key}; ${events.join(", ") || "no fixup needed"}. Black-height ${blackHeight(model.root)} is equal on every path.`
          : `Compared ${state.path.join(" → ")}; ${key} already exists, so the tree did not change.`,
      }
    },
    search(key, state) {
      let current = model.root
      while (current) {
        state.path.push(current.key)
        if (key === current.key) {
          state.success = key
          return { found: true, detail: `Search path ${state.path.join(" → ")} found ${key}.` }
        }
        current = key < current.key ? current.left : current.right
      }
      return {
        found: false,
        detail: `Search path ${state.path.join(" → ")} reached an empty child; ${key} is absent.`,
      }
    },
    remove(key, state) {
      const probe = model.search(key, operationState())
      if (!probe.found)
        return {
          changed: false,
          detail: `${key} is absent, so the red-black tree did not change.`,
        }
      const events: string[] = []
      state.changed.add(key)
      if (model.root && !isRed(model.root.left) && !isRed(model.root.right))
        model.root.color = "red"
      model.root = model.root ? remove(model.root, key, state, events) : null
      if (model.root) model.root.color = "black"
      return {
        changed: true,
        detail: `Removed ${key}; ${events.join(", ") || "no fixup needed"}. Black-height ${blackHeight(model.root)} is equal on every path.`,
      }
    },
    meta: (current) => (current.color === "red" ? "R" : "B"),
    invariant: () => `RB invariants valid · black-height ${blackHeight(model.root)}`,
  }
  for (const value of values) model.insert(value, operationState())
  return model
}

function createSplayModel(values: readonly number[]): TreeModel {
  const model: TreeModel = {
    root: null,
    insert: () => ({ changed: false, detail: "" }),
    search: () => ({ found: false, detail: "" }),
    remove: () => ({ changed: false, detail: "" }),
    meta: () => "",
    invariant: () => "BST order valid · accessed node becomes root",
  }
  for (const value of values) model.root = plainInsert(model.root, value)

  const rotateLeft = (current: TreeNode, state: OperationState) => {
    const next = current.right!
    state.repairing.add(current.key).add(next.key)
    current.right = next.left
    if (next.left) next.left.parent = current
    next.parent = current.parent
    if (!current.parent) model.root = next
    else if (current === current.parent.left) current.parent.left = next
    else current.parent.right = next
    next.left = current
    current.parent = next
  }
  const rotateRight = (current: TreeNode, state: OperationState) => {
    const next = current.left!
    state.repairing.add(current.key).add(next.key)
    current.left = next.right
    if (next.right) next.right.parent = current
    next.parent = current.parent
    if (!current.parent) model.root = next
    else if (current === current.parent.left) current.parent.left = next
    else current.parent.right = next
    next.right = current
    current.parent = next
  }
  const splay = (current: TreeNode, state: OperationState) => {
    const cases: string[] = []
    while (current.parent) {
      const parent = current.parent
      const grandparent = parent.parent
      if (!grandparent) {
        cases.push("zig")
        if (current === parent.left) rotateRight(parent, state)
        else rotateLeft(parent, state)
      } else if (
        (current === parent.left && parent === grandparent.left) ||
        (current === parent.right && parent === grandparent.right)
      ) {
        cases.push("zig-zig")
        if (current === parent.left) {
          rotateRight(grandparent, state)
          rotateRight(parent, state)
        } else {
          rotateLeft(grandparent, state)
          rotateLeft(parent, state)
        }
      } else {
        cases.push("zig-zag")
        if (current === parent.left) {
          rotateRight(parent, state)
          rotateLeft(grandparent, state)
        } else {
          rotateLeft(parent, state)
          rotateRight(grandparent, state)
        }
      }
    }
    return cases
  }
  const find = (key: number, state: OperationState) => {
    let current = model.root
    let last: TreeNode | null = null
    while (current) {
      state.path.push(current.key)
      last = current
      if (key === current.key) break
      current = key < current.key ? current.left : current.right
    }
    return { found: current, last }
  }

  model.insert = (key, state) => {
    if (!model.root) {
      model.root = node(key)
      state.changed.add(key)
      state.success = key
      return { changed: true, detail: `Inserted ${key} as the root.` }
    }
    const result = find(key, state)
    if (result.found)
      return {
        changed: false,
        detail: `${key} already exists; the tree did not change.`,
      }
    const parent = result.last!
    const added = node(key)
    added.parent = parent
    if (key < parent.key) parent.left = added
    else parent.right = added
    state.changed.add(key)
    const cases = splay(added, state)
    state.success = key
    return {
      changed: true,
      detail: `Inserted ${key}, then ${cases.join(" → ")} moved it to the root.`,
    }
  }
  model.search = (key, state) => {
    const result = find(key, state)
    const accessed = result.found ?? result.last
    const cases = accessed ? splay(accessed, state) : []
    if (result.found) state.success = key
    return {
      found: !!result.found,
      detail: result.found
        ? `Search path ${state.path.join(" → ")} found ${key}; ${cases.join(" → ") || "already root"} moved it to the root.`
        : `Search path ${state.path.join(" → ")} missed ${key}; canonical splay moves last accessed ${accessed?.key ?? "node"} to the root via ${cases.join(" → ") || "no rotation"}.`,
    }
  }
  model.remove = (key, state) => {
    const result = find(key, state)
    const accessed = result.found ?? result.last
    if (!result.found) {
      const cases = accessed ? splay(accessed, state) : []
      return {
        changed: false,
        detail: `${key} is absent; last accessed ${accessed?.key ?? "node"} was splayed via ${cases.join(" → ") || "no rotation"}.`,
      }
    }
    splay(result.found, state)
    state.changed.add(key)
    const left = result.found.left
    const right = result.found.right
    if (left) left.parent = null
    if (right) right.parent = null
    if (!left) model.root = right
    else {
      model.root = left
      let maximum = left
      while (maximum.right) maximum = maximum.right
      splay(maximum, state)
      model.root!.right = right
      if (right) right.parent = model.root
    }
    return {
      changed: true,
      detail: `Removed ${key}; splayed the left maximum and joined both ordered halves.`,
    }
  }
  return model
}

const MODELS: Record<TreeKind, (values: readonly number[]) => TreeModel> = {
  "avl-tree": createAvlModel,
  "binary-search-tree": createBstModel,
  "red-black-tree": createRedBlackModel,
  "splay-tree": createSplayModel,
}

const LABELS: Record<TreeKind, string> = {
  "avl-tree": "AVL tree",
  "binary-search-tree": "Binary search tree",
  "red-black-tree": "Red-black tree",
  "splay-tree": "Splay tree",
}

const INPUT_LABELS: Record<TreeKind, string> = {
  "avl-tree": "AVL key",
  "binary-search-tree": "Binary search tree key",
  "red-black-tree": "Red-black tree key",
  "splay-tree": "Splay tree key",
}

const DESCRIPTIONS: Record<TreeKind, string> = {
  "avl-tree": "Interactive AVL tree",
  "binary-search-tree": "Interactive binary search tree",
  "red-black-tree": "Interactive red-black tree",
  "splay-tree": "Interactive splay tree",
}

export function mountBinaryTree(
  rootElement: HTMLElement,
  config: BinaryTreeConfig,
  kind: TreeKind,
): MountHandle {
  const label = LABELS[kind]
  const shell = createStructureShell(
    rootElement,
    kind,
    label,
    DESCRIPTIONS[kind],
    "binary-tree",
    "steptrace__binary-tree",
  )
  const initial = [...config.values]
  let model = MODELS[kind](initial)
  let state = operationState()
  let geometry: { destroy(): void } | null = null
  const exitTimers = new Set<ReturnType<typeof setTimeout>>()

  const surface = el("div", "steptrace__binary-tree-surface")
  const svg = svgEl("svg", "steptrace__binary-tree-svg") as SVGSVGElement
  svg.setAttribute("viewBox", `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`)
  svg.setAttribute("role", "img")
  const edgeLayer = svgEl("g", "steptrace__binary-tree-edges")
  const nodeLayer = svgEl("g", "steptrace__binary-tree-nodes")
  svg.append(edgeLayer, nodeLayer)
  surface.append(svg)
  shell.stage.append(surface)
  const nodeViews = new Map<
    number,
    { group: SVGGElement; value: SVGTextElement; meta: SVGTextElement; badge: SVGSVGElement }
  >()
  const edgeViews = new Map<string, SVGLineElement>()
  const input = shell.input(INPUT_LABELS[kind], "Value", 8)
  input.type = "number"
  input.step = "1"
  input.value = config.value == null ? "" : String(config.value)
  const insert = shell.button("Insert", true)
  const search = shell.button("Search")
  const remove = shell.button("Remove")
  const reset = shell.button("Reset")
  shell.controls.append(input, insert, search, remove, reset)

  function positions() {
    const entries: Array<{ node: TreeNode; x: number; y: number }> = []
    const keys = orderedKeys(model.root)
    const xByKey = new Map(
      keys.map((key, index) => [key, ((index + 1) / (keys.length + 1)) * VIEW_WIDTH]),
    )
    const maxDepth = Math.max(treeHeight(model.root) - 1, 0)
    const visit = (current: TreeNode | null, depth: number) => {
      if (!current) return
      entries.push({
        node: current,
        x: xByKey.get(current.key)!,
        y: 28 + (maxDepth ? (depth * 182) / maxDepth : 0),
      })
      visit(current.left, depth + 1)
      visit(current.right, depth + 1)
    }
    visit(model.root, 0)
    return entries
  }

  function paintTree() {
    geometry?.destroy()
    if (!model.root) {
      geometry = null
      svg.setAttribute("aria-label", `Empty ${label}`)
      for (const view of nodeViews.values()) view.group.remove()
      for (const line of edgeViews.values()) line.remove()
      nodeViews.clear()
      edgeViews.clear()
      return
    }

    const entries = positions()
    const byNode = new Map(entries.map((entry) => [entry.node, entry]))
    svg.setAttribute("aria-label", `${label} with ${entries.length} unique keys`)
    const edges: Array<{
      line: SVGLineElement
      from: (typeof entries)[number]
      to: (typeof entries)[number]
    }> = []
    const nextEdges = new Set<string>()

    for (const parent of entries) {
      for (const childNode of [parent.node.left, parent.node.right]) {
        if (!childNode) continue
        const child = byNode.get(childNode)!
        const key = `${parent.node.key}:${child.node.key}`
        nextEdges.add(key)
        let line = edgeViews.get(key)
        if (!line) {
          line = svgEl("line", "steptrace__edge steptrace__binary-tree-edge") as SVGLineElement
          line.dataset.entering = shell.reducedMotion() ? "0" : "1"
          edgeLayer.append(line)
          edgeViews.set(key, line)
          globalThis.requestAnimationFrame?.(() => {
            line!.dataset.entering = "0"
          })
        }
        line.dataset.from = String(parent.node.key)
        line.dataset.to = String(child.node.key)
        line.dataset.side = child.node === parent.node.left ? "left" : "right"
        const pathIndex = state.path.indexOf(parent.node.key)
        line.dataset.state =
          state.repairing.has(parent.node.key) && state.repairing.has(child.node.key)
            ? "rotation"
            : pathIndex >= 0 && state.path[pathIndex + 1] === child.node.key
              ? "path"
              : "neutral"
        edges.push({ line, from: parent, to: child })
      }
    }

    for (const [key, line] of edgeViews) {
      if (nextEdges.has(key)) continue
      edgeViews.delete(key)
      if (shell.reducedMotion()) line.remove()
      else {
        line.dataset.exiting = "1"
        const timer = setTimeout(() => {
          exitTimers.delete(timer)
          line.remove()
        }, 180)
        exitTimers.add(timer)
      }
    }

    const nextNodes = new Set(entries.map((entry) => entry.node.key))
    const nodes = entries.map((entry) => {
      let view = nodeViews.get(entry.node.key)
      if (!view) {
        const group = svgEl("g", "steptrace__node steptrace__binary-tree-node") as SVGGElement
        group.dataset.entering = shell.reducedMotion() ? "0" : "1"
        const circle = svgEl("circle", "steptrace__ncirc")
        circle.setAttribute("r", String(GRAPH_NODE_RADIUS_PX))
        const value = svgEl("text", "steptrace__id") as SVGTextElement
        value.setAttribute("text-anchor", "middle")
        value.setAttribute("dominant-baseline", "central")
        const meta = svgEl("text", "steptrace__binary-tree-meta") as SVGTextElement
        meta.setAttribute("text-anchor", "middle")
        meta.setAttribute("y", "22")
        const badge = successMarker("steptrace__binary-tree-success")
        badge.setAttribute("x", "7")
        badge.setAttribute("y", "-22")
        badge.setAttribute("width", "12")
        badge.setAttribute("height", "12")
        group.append(circle, value, meta, badge)
        nodeLayer.append(group)
        view = { group, value, meta, badge }
        nodeViews.set(entry.node.key, view)
        globalThis.requestAnimationFrame?.(() => {
          group.dataset.entering = "0"
        })
      }
      const { group, value, meta, badge } = view
      group.dataset.state = state.repairing.has(entry.node.key)
        ? "rotation"
        : state.changed.has(entry.node.key)
          ? "changed"
          : state.path.includes(entry.node.key)
            ? "path"
            : "neutral"
      group.dataset.color = kind === "red-black-tree" ? entry.node.color : ""
      group.dataset.key = String(entry.node.key)
      const metadata = model.meta(entry.node)
      group.setAttribute(
        "aria-label",
        kind === "avl-tree"
          ? `Key ${entry.node.key}, height ${entry.node.height}, balance factor ${balanceFactor(entry.node)}`
          : `Key ${entry.node.key}${metadata ? `, ${metadata}` : ""}`,
      )
      value.textContent = String(entry.node.key)
      meta.textContent = metadata
      badge.dataset.visible = state.success === entry.node.key ? "1" : "0"
      return { element: group, point: { x: entry.x, y: entry.y } }
    })

    for (const [key, view] of nodeViews) {
      if (nextNodes.has(key)) continue
      nodeViews.delete(key)
      if (shell.reducedMotion()) view.group.remove()
      else {
        view.group.dataset.exiting = "1"
        const timer = setTimeout(() => {
          exitTimers.delete(timer)
          view.group.remove()
        }, 180)
        exitTimers.add(timer)
      }
    }

    geometry = observeFixedSvgNodes(svg, nodes, (unitsPerCssPixel) => {
      const radius = GRAPH_NODE_RADIUS_PX * unitsPerCssPixel
      for (const { line, from, to } of edges) {
        const edge = trimGraphEdge(from, to, radius)
        line.setAttribute("x1", String(edge.x1))
        line.setAttribute("y1", String(edge.y1))
        line.setAttribute("x2", String(edge.x2))
        line.setAttribute("y2", String(edge.y2))
        line.style.setProperty("x1", `${edge.x1}px`)
        line.style.setProperty("y1", `${edge.y1}px`)
        line.style.setProperty("x2", `${edge.x2}px`)
        line.style.setProperty("y2", `${edge.y2}px`)
      }
    })
  }

  function paint(message: string) {
    paintTree()
    const count = orderedKeys(model.root).length
    shell.setCounter(String(count), count === 1 ? " key" : " keys")
    shell.status.textContent = message
    remove.disabled = count === 0
    search.disabled = count === 0
    insert.disabled = count >= (kind === "avl-tree" ? 11 : MAX_VALUES)
  }

  function valueFromInput(operation: "insert" | "search" | "remove") {
    const raw = input.value.trim()
    if (raw !== "") {
      const value = Number(raw)
      if (Number.isFinite(value) && Number.isInteger(value)) return value
      paint("Value must be a finite integer.")
      return null
    }
    const keys = orderedKeys(model.root)
    if (operation === "search") return model.root?.key ?? null
    if (operation === "remove") return keys.at(-1) ?? null
    const maxValues = kind === "avl-tree" ? 11 : MAX_VALUES
    if (keys.length >= maxValues) {
      paint(`The review tree is capped at ${maxValues} keys.`)
      return null
    }
    let value = Math.floor(Math.random() * 90) + 10
    while (keys.includes(value)) value = value === 99 ? 10 : value + 1
    return value
  }

  function onInsert() {
    const value = valueFromInput("insert")
    if (value == null) return
    state = operationState()
    const result = model.insert(value, state)
    input.value = ""
    paint(result.detail)
  }

  function onSearch() {
    const value = valueFromInput("search")
    if (value == null) return
    state = operationState()
    const result = model.search(value, state)
    input.value = ""
    paint(result.detail)
  }

  function onRemove() {
    const value = valueFromInput("remove")
    if (value == null) return
    state = operationState()
    const result = model.remove(value, state)
    input.value = ""
    paint(result.detail)
  }

  function onReset() {
    model = MODELS[kind](initial)
    state = operationState()
    input.value = config.value == null ? "" : String(config.value)
    paint(`Reset to the initial ${label}. ${model.invariant()}.`)
  }

  shell.listen(insert, "click", onInsert)
  shell.listen(search, "click", onSearch)
  shell.listen(remove, "click", onRemove)
  shell.listen(reset, "click", onReset)
  onEnter(shell, input, onInsert)
  paint(`Insert, search, or remove a key. ${model.invariant()}.`)
  const handle = shell.finish()
  return {
    destroy() {
      for (const timer of exitTimers) clearTimeout(timer)
      geometry?.destroy()
      handle.destroy()
    },
  }
}

export const mountAvlTree = (root: HTMLElement, config: BinaryTreeConfig) =>
  mountBinaryTree(root, config, "avl-tree")
export const mountBinarySearchTree = (root: HTMLElement, config: BinaryTreeConfig) =>
  mountBinaryTree(root, config, "binary-search-tree")
export const mountRedBlackTree = (root: HTMLElement, config: BinaryTreeConfig) =>
  mountBinaryTree(root, config, "red-black-tree")
export const mountSplayTree = (root: HTMLElement, config: BinaryTreeConfig) =>
  mountBinaryTree(root, config, "splay-tree")

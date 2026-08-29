import { el } from "../render"
import type { MountHandle } from "../types"
import { createStructureShell, onEnter } from "./interactive-structure"

export type HashMapStrategy = "closed-addressing" | "open-addressing" | "buckets"

export interface HashMapConfig {
  strategy: HashMapStrategy
}

export interface HashSetConfig {
  strategy: "open-addressing"
}

export interface BloomFilterConfig {
  capacity: 10
}

interface HashEntry {
  key: number
  value: string
  home: number
  next: number | null
}

interface OperationPlan {
  finish: "put" | "search-hit" | "remove-hit" | "return"
  key: number
  value: string
  calculation: string
  path: number[]
  target: number | null
  chainBucket?: number
  chainTarget?: { bucket: number; index: number }
  chainPath?: number[]
  removesChainTarget?: boolean
  message: string
  commit?(): void
}

const SIZE = 12
const BUCKET_SIZE = 3
const CHAIN_CAPACITY = 3
const HOP_MS = 320
const FINISH_MS = 180
const RETURN_MS = 180

function indexFor(key: number, size: number) {
  return ((key % size) + size) % size
}

function randomKey() {
  return Math.floor(Math.random() * 90) + 10
}

function randomValue() {
  return String.fromCharCode(65 + Math.floor(Math.random() * 26))
}

interface HashIndexSurfaceOptions {
  id: "hash-map" | "hash-set" | "bloom-filter"
  label: string
  ariaLabel: string
  strategy: HashMapStrategy | "bits"
  size: number
  chainCapacity?: number
  tokenText: string
  calculation: string
}

function createHashIndexSurface(root: HTMLElement, options: HashIndexSurfaceOptions) {
  const shell = createStructureShell(
    root,
    options.id,
    options.label,
    options.ariaLabel,
    "hash-index",
    "steptrace__hash-index",
  )
  const operation = el("div", "steptrace__hash-operation steptrace__hash-probe-lane")
  operation.setAttribute("aria-label", "Current hash operation")
  const token = el("div", "steptrace__hash-token")
  token.setAttribute("aria-hidden", "true")
  const tokenInline = el("span", "steptrace__hash-token-inline")
  const tokenStored = el("span", "steptrace__hash-token-stored")
  const tokenStoredKey = el("span", "steptrace__hash-token-key")
  const tokenStoredValue = el("span", "steptrace__hash-token-value")
  tokenInline.textContent = options.tokenText
  tokenStoredKey.textContent = options.tokenText
  tokenStoredValue.textContent = ""
  tokenStored.append(tokenStoredKey, tokenStoredValue)
  token.append(tokenInline, tokenStored)
  const calculation = el("div", "steptrace__hash-calculation")
  calculation.textContent = options.calculation
  operation.append(token, calculation)

  const boardWrap = el("div", "steptrace__hash-board-wrap steptrace__hash-canvas")
  boardWrap.dataset.strategy = options.strategy
  const chainLane = el("div", "steptrace__hash-chain-lane")
  chainLane.setAttribute("aria-label", "Separate-chaining entries")
  chainLane.dataset.active = options.strategy === "closed-addressing" ? "1" : "0"
  const chainSlots: HTMLElement[][] = []
  const chainColumns = Array.from({ length: options.size }, (_, index) => {
    const column = el("div", "steptrace__hash-chain")
    const slots = Array.from({ length: options.chainCapacity ?? 0 }, (_, slotIndex) => {
      const slot = el("div", "steptrace__hash-chain-slot")
      slot.dataset.slot = String(slotIndex)
      column.append(slot)
      return slot
    })
    chainSlots.push(slots)
    chainLane.append(column)
    return column
  })

  const board = el("div", "steptrace__hash-buckets")
  board.dataset.strategy = options.strategy
  board.setAttribute("role", "list")
  board.setAttribute("aria-label", `${options.label}, ${options.size} indexed cells`)
  boardWrap.append(chainLane, board)
  shell.stage.append(operation, boardWrap)

  const cells = Array.from({ length: options.size }, (_, index) => {
    const cell = el("div", "steptrace__hash-cell")
    cell.setAttribute("role", "listitem")
    const value = el("div", "steptrace__hash-cell-value")
    const indexLabel = el("div", "steptrace__hash-index-label")
    indexLabel.textContent = String(index)
    cell.append(value, indexLabel)
    board.append(cell)
    return { cell, value }
  })

  return {
    shell,
    operation,
    token,
    tokenInline,
    tokenStored,
    tokenStoredKey,
    tokenStoredValue,
    calculation,
    chainSlots,
    chainColumns,
    cells,
  }
}

export function mountHashMap(root: HTMLElement, config: HashMapConfig): MountHandle {
  return mountHashTable(root, config, "map")
}

export function mountHashSet(root: HTMLElement, config: HashSetConfig): MountHandle {
  return mountHashTable(root, config, "set")
}

function mountHashTable(
  root: HTMLElement,
  config: HashMapConfig | HashSetConfig,
  content: "map" | "set",
): MountHandle {
  const slots: Array<HashEntry | null> = Array(SIZE).fill(null)
  const chains: HashEntry[][] = Array.from({ length: SIZE }, () => [])
  const tombstones = Array(SIZE).fill(false)
  let activePath: number[] = []
  let activeChain: { bucket: number; path: number[] } | null = null
  let selected: number | null = null
  let selectedChain: { bucket: number; index: number } | null = null
  let previousGeneratedPutKey: number | null = null
  let previousGeneratedPutValue: string | null = null
  let motionTimer: ReturnType<typeof setTimeout> | null = null
  let activeAnimations: Animation[] = []
  let activeKey: number | null = null
  let activeResult: "success" | "remove" | null = null
  let tokenX = 0
  let tokenY = 0
  let tokenWidth = 0
  let tokenHeight = 0
  let destroyed = false

  const label =
    content === "set"
      ? "open-addressed hash set"
      : config.strategy === "closed-addressing"
        ? "closed addressing"
        : config.strategy === "open-addressing"
          ? "open addressing"
          : "bucket hashing"
  const initialCalculation =
    config.strategy === "buckets"
      ? "key % 4 selects one 3-cell bucket"
      : "key % 12 selects the home cell"
  const {
    shell,
    operation,
    token,
    tokenInline,
    tokenStored,
    tokenStoredKey,
    tokenStoredValue,
    calculation,
    chainSlots,
    chainColumns,
    cells,
  } = createHashIndexSurface(root, {
    id: content === "map" ? "hash-map" : "hash-set",
    label,
    ariaLabel:
      content === "map" ? `Interactive hash map using ${label}` : "Interactive key-only hash set",
    strategy: config.strategy,
    size: SIZE,
    chainCapacity: CHAIN_CAPACITY,
    tokenText: content === "map" ? "k:v" : "key",
    calculation: initialCalculation,
  })

  const keyInput = shell.input(content === "map" ? "Hash map key" : "Hash set key", "Key", 12)
  keyInput.type = "number"
  keyInput.setAttribute("inputmode", "numeric")
  const valueInput = content === "map" ? shell.input("Hash map value", "Value", 8) : null
  const put = shell.button(content === "map" ? "Put" : "Add", true)
  const search = shell.button(content === "map" ? "Search" : "Contains")
  const remove = shell.button("Remove")
  const reset = shell.button("Reset")
  const fields = el("div", "steptrace__hash-fields")
  const actions = el("div", "steptrace__hash-actions")
  fields.append(keyInput)
  if (valueInput) fields.append(valueInput)
  actions.append(put, search, remove, reset)
  shell.controls.classList.add("steptrace__hash-controls")
  shell.controls.dataset.mode = content
  shell.controls.append(fields, actions)
  const interactive = [keyInput, ...(valueInput ? [valueInput] : []), put, search, remove, reset]

  function entries() {
    if (config.strategy === "closed-addressing") return chains.flat()
    return slots.filter((entry): entry is HashEntry => entry != null)
  }

  function calculationFor(key: number) {
    if (config.strategy !== "buckets") return `${key} % 12 = ${indexFor(key, SIZE)}`
    const bucket = indexFor(key, SIZE / BUCKET_SIZE)
    const start = bucket * BUCKET_SIZE
    return `${key} % 4 = bucket ${bucket} → cells ${start}–${start + BUCKET_SIZE - 1}`
  }

  function paintChains() {
    if (config.strategy !== "closed-addressing") return
    chains.forEach((chain, bucket) => {
      const count = chain.length
      chainColumns[bucket].dataset.count = String(count)
      chainSlots[bucket].forEach((slot, index) => {
        const entry = chain[index]
        slot.replaceChildren()
        slot.dataset.filled = entry ? "1" : "0"
        slot.dataset.path =
          entry && activeChain?.bucket === bucket && activeChain.path.includes(index) ? "1" : "0"
        slot.dataset.selected =
          entry && selectedChain?.bucket === bucket && selectedChain.index === index ? "1" : "0"
        slot.dataset.result =
          entry && selectedChain?.bucket === bucket && selectedChain.index === index
            ? (activeResult ?? "")
            : ""
        if (!entry) {
          slot.removeAttribute("role")
          slot.removeAttribute("aria-label")
          return
        }
        slot.setAttribute("role", "listitem")
        slot.setAttribute(
          "aria-label",
          `bucket ${bucket} chain entry ${index}, key ${entry.key}, value ${entry.value}`,
        )
        const key = el("span", "steptrace__hash-key")
        key.textContent = String(entry.key)
        const value = el("span", "steptrace__hash-value")
        value.textContent = entry.value
        slot.append(key, value)
      })
      if (count) {
        chainColumns[bucket].setAttribute("role", "list")
        chainColumns[bucket].setAttribute(
          "aria-label",
          `Bucket ${bucket} chain, ${count} ${count === 1 ? "entry" : "entries"}`,
        )
      } else {
        chainColumns[bucket].removeAttribute("role")
        chainColumns[bucket].removeAttribute("aria-label")
      }
    })
  }

  function paint() {
    paintChains()
    cells.forEach(({ cell, value }, index) => {
      const entry = config.strategy === "closed-addressing" ? null : slots[index]
      value.replaceChildren()
      if (entry) {
        const key = el("span", "steptrace__hash-key")
        key.textContent = String(entry.key)
        value.append(key)
        if (content === "map") {
          const itemValue = el("span", "steptrace__hash-value")
          itemValue.textContent = entry.value
          value.append(itemValue)
        }
      } else {
        if (config.strategy !== "closed-addressing") {
          const empty = el("span", "steptrace__hash-empty")
          empty.textContent = tombstones[index] ? "†" : "·"
          value.append(empty)
        }
      }
      cell.dataset.empty =
        entry || (config.strategy === "closed-addressing" && chains[index].length) ? "0" : "1"
      cell.dataset.tombstone = tombstones[index] ? "1" : "0"
      const onPath = activePath.includes(index)
      const current = selected === index
      const collision = current && entry != null && activeKey != null && entry.key !== activeKey
      cell.dataset.probe = collision ? "collision" : current ? "current" : onPath ? "visited" : ""
      cell.dataset.result = current ? (activeResult ?? "") : ""
      cell.setAttribute(
        "aria-label",
        config.strategy === "closed-addressing"
          ? `bucket index ${index}, ${
              chains[index].length
                ? `points to key ${chains[index][0].key}, chain length ${chains[index].length}`
                : "empty"
            }`
          : entry
            ? content === "map"
              ? `cell ${index}, key ${entry.key}, value ${entry.value}${
                  entry.next == null ? "" : `, next cell ${entry.next}`
                }`
              : `cell ${index}, key ${entry.key}`
            : tombstones[index]
              ? `cell ${index}, tombstone`
              : `cell ${index}, empty`,
      )
    })
  }

  function lock(value: boolean) {
    operation.dataset.busy = value ? "1" : "0"
    for (const control of interactive) control.disabled = value
  }

  function tokenFrame(target: HTMLElement | null, tokenOrigin: DOMRect) {
    if (!target) return { x: 0, y: 0, width: tokenOrigin.width, height: tokenOrigin.height }
    const targetRect = target.getBoundingClientRect()
    return {
      x: targetRect.left - tokenOrigin.left,
      y: targetRect.top - tokenOrigin.top,
      width: targetRect.width,
      height: targetRect.height,
    }
  }

  function centeredTokenFrame(target: HTMLElement, tokenOrigin: DOMRect) {
    const targetRect = target.getBoundingClientRect()
    const width = tokenWidth || tokenOrigin.width
    const height = tokenHeight || tokenOrigin.height
    return {
      x: targetRect.left + targetRect.width / 2 - tokenOrigin.left - width / 2,
      y: targetRect.top + targetRect.height / 2 - tokenOrigin.top - height / 2,
      width,
      height,
    }
  }

  function setTokenPosition(x: number, y: number) {
    token.style.setProperty("--steptrace-token-x", `${x}px`)
    token.style.setProperty("--steptrace-token-y", `${y}px`)
  }

  function clearTokenMotionStyles() {
    for (const property of [
      "--steptrace-token-x",
      "--steptrace-token-y",
      "--steptrace-token-width",
      "--steptrace-token-height",
    ])
      token.style.removeProperty(property)
  }

  function nativeAnimation(
    node: HTMLElement,
    keyframes: Keyframe[],
    duration: number,
  ): Animation | null {
    return typeof node.animate === "function"
      ? node.animate(keyframes, { duration, easing: "cubic-bezier(.2,.8,.2,1)" })
      : null
  }

  function waitForMotion(animations: Array<Animation | null>, duration: number, done: () => void) {
    const running = animations.filter((animation): animation is Animation => animation != null)
    const complete = () => {
      activeAnimations = []
      motionTimer = null
      if (!destroyed) done()
    }
    if (running.length) {
      activeAnimations = running
      running[0].onfinish = complete
      return
    }
    motionTimer = setTimeout(complete, duration)
  }

  function moveToken(
    target: HTMLElement | null,
    motion: "travel" | "return",
    duration: number,
    tokenOrigin: DOMRect,
    done: () => void,
  ) {
    const next =
      motion === "travel" && target
        ? centeredTokenFrame(target, tokenOrigin)
        : tokenFrame(target, tokenOrigin)
    const fromWidth = tokenWidth || tokenOrigin.width
    const fromHeight = tokenHeight || tokenOrigin.height
    const nextWidth = motion === "return" ? tokenOrigin.width : tokenWidth || tokenOrigin.width
    const nextHeight = motion === "return" ? tokenOrigin.height : tokenHeight || tokenOrigin.height
    setTokenPosition(next.x, next.y)
    if (motion === "return") {
      token.style.setProperty("--steptrace-token-width", `${nextWidth}px`)
      token.style.setProperty("--steptrace-token-height", `${nextHeight}px`)
    }
    token.dataset.motion = motion

    const animation = nativeAnimation(
      token,
      motion === "return"
        ? [
            {
              transform: `translate3d(${tokenX}px, ${tokenY}px, 0)`,
              width: `${fromWidth}px`,
              height: `${fromHeight}px`,
              opacity: 0.78,
            },
            {
              transform: `translate3d(${next.x}px, ${next.y}px, 0)`,
              width: `${nextWidth}px`,
              height: `${nextHeight}px`,
              opacity: 0,
            },
          ]
        : [
            {
              transform: `translate3d(${tokenX}px, ${tokenY}px, 0)`,
              opacity: 0.92,
            },
            {
              transform: `translate3d(${next.x}px, ${next.y}px, 0)`,
              opacity: 0.92,
            },
          ],
      duration,
    )
    waitForMotion([animation], duration, () => {
      tokenX = next.x
      tokenY = next.y
      tokenWidth = nextWidth
      tokenHeight = nextHeight
      setTokenPosition(next.x, next.y)
      done()
    })
  }

  function arriveToken(target: HTMLElement, tokenOrigin: DOMRect, done: () => void) {
    const next = tokenFrame(target, tokenOrigin)
    const fromWidth = tokenWidth || tokenOrigin.width
    const fromHeight = tokenHeight || tokenOrigin.height
    setTokenPosition(next.x, next.y)
    token.style.setProperty("--steptrace-token-width", `${next.width}px`)
    token.style.setProperty("--steptrace-token-height", `${next.height}px`)
    token.dataset.motion = "arrival"
    const geometry = nativeAnimation(
      token,
      [
        {
          transform: `translate3d(${tokenX}px, ${tokenY}px, 0)`,
          width: `${fromWidth}px`,
          height: `${fromHeight}px`,
          opacity: 0.92,
        },
        {
          transform: `translate3d(${next.x}px, ${next.y}px, 0)`,
          width: `${next.width}px`,
          height: `${next.height}px`,
          opacity: 0.78,
        },
      ],
      FINISH_MS,
    )
    const inlineFade = nativeAnimation(tokenInline, [{ opacity: 1 }, { opacity: 0 }], FINISH_MS)
    const storedFade = nativeAnimation(tokenStored, [{ opacity: 0 }, { opacity: 1 }], FINISH_MS)
    waitForMotion([geometry, inlineFade, storedFade], FINISH_MS, () => {
      tokenX = next.x
      tokenY = next.y
      tokenWidth = next.width
      tokenHeight = next.height
      done()
    })
  }

  function finishEffect(
    target: HTMLElement,
    motion: "success" | "extract",
    tokenOrigin: DOMRect,
    done: () => void,
  ) {
    const next = centeredTokenFrame(target, tokenOrigin)
    setTokenPosition(next.x, next.y)
    token.dataset.motion = motion
    const animation = nativeAnimation(
      token,
      motion === "success"
        ? [
            { transform: `translate3d(${next.x}px, ${next.y}px, 0) scale(1)` },
            { transform: `translate3d(${next.x}px, ${next.y}px, 0) scale(1.08)` },
            { transform: `translate3d(${next.x}px, ${next.y}px, 0) scale(1)` },
          ]
        : [
            { transform: `translate3d(${next.x}px, ${next.y}px, 0) scale(1)`, opacity: 0.92 },
            { transform: `translate3d(${next.x}px, ${next.y}px, 0) scale(0.72)`, opacity: 0 },
          ],
      FINISH_MS,
    )
    waitForMotion([animation], FINISH_MS, () => {
      tokenX = next.x
      tokenY = next.y
      done()
    })
  }

  function settleToken(hidden = false) {
    tokenX = 0
    tokenY = 0
    tokenWidth = 0
    tokenHeight = 0
    clearTokenMotionStyles()
    token.dataset.motion = hidden ? "handoff" : "idle"
  }

  function restoreGenericToken() {
    tokenInline.textContent = content === "map" ? "k:v" : "key"
    tokenStoredKey.textContent = content === "map" ? "k" : "key"
    tokenStoredValue.textContent = content === "map" ? "v" : ""
    delete token.dataset.key
    delete token.dataset.value
  }

  function cancelMotion() {
    if (motionTimer != null) clearTimeout(motionTimer)
    motionTimer = null
    for (const animation of activeAnimations) animation.cancel()
    activeAnimations = []
    settleToken()
  }

  function applyPlanState(plan: OperationPlan) {
    if (plan.finish === "put") {
      activeChain = null
      selectedChain = null
      activeResult = null
      return
    }
    const chainBucket = plan.chainBucket ?? plan.chainTarget?.bucket
    activeChain = chainBucket == null ? null : { bucket: chainBucket, path: plan.chainPath ?? [] }
    selectedChain = plan.chainTarget ?? null
    activeResult = null
  }

  function clearTransientState() {
    activePath = []
    activeChain = null
    selected = null
    selectedChain = null
    activeResult = null
    activeKey = null
  }

  function finishPlan(
    plan: OperationPlan,
    tokenOrigin: DOMRect,
    returnToken = true,
    restoreChip = false,
  ) {
    plan.commit?.()
    clearTransientState()
    shell.status.textContent = plan.message
    paint()
    if (!returnToken) {
      if (restoreChip) restoreGenericToken()
      settleToken(!restoreChip)
      lock(false)
      return
    }
    moveToken(null, "return", RETURN_MS, tokenOrigin, () => {
      settleToken()
      lock(false)
    })
  }

  function run(plan: OperationPlan) {
    if (motionTimer != null || activeAnimations.length) return
    calculation.textContent = plan.calculation
    tokenInline.textContent =
      content === "map" ? `${plan.key}:${plan.value || "?"}` : String(plan.key)
    tokenStoredKey.textContent = String(plan.key)
    tokenStoredValue.textContent = content === "map" ? plan.value || "?" : ""
    token.dataset.key = String(plan.key)
    if (content === "map") token.dataset.value = plan.value || "?"
    else delete token.dataset.value
    settleToken()
    delete token.dataset.motion
    void token.offsetWidth
    const tokenOrigin = token.getBoundingClientRect()
    tokenWidth = tokenOrigin.width
    tokenHeight = tokenOrigin.height
    lock(true)
    applyPlanState(plan)
    activeKey = plan.key

    if (shell.reducedMotion()) {
      activePath = plan.path
      selected = plan.target
      plan.commit?.()
      clearTransientState()
      shell.status.textContent = plan.message
      paint()
      if (plan.finish === "put") restoreGenericToken()
      settleToken()
      lock(false)
      return
    }

    let hop = 0
    const destination = () =>
      plan.chainTarget
        ? chainSlots[plan.chainTarget.bucket][plan.chainTarget.index]
        : plan.target != null
          ? cells[plan.target].value
          : null
    const finish = () => {
      const target = destination()
      if (plan.finish === "put" && target) {
        arriveToken(target, tokenOrigin, () => finishPlan(plan, tokenOrigin, false, true))
        return
      }
      if (plan.finish === "search-hit" && target) {
        const pulse = () => {
          activeResult = "success"
          paint()
          finishEffect(target, "success", tokenOrigin, () => finishPlan(plan, tokenOrigin))
        }
        if (plan.chainTarget) {
          moveToken(target, "travel", HOP_MS, tokenOrigin, pulse)
          return
        }
        pulse()
        return
      }
      if (plan.finish === "remove-hit" && target) {
        const extract = () => {
          activeResult = "remove"
          paint()
          finishEffect(target, "extract", tokenOrigin, () => finishPlan(plan, tokenOrigin, false))
        }
        if (plan.chainTarget) {
          moveToken(target, "travel", HOP_MS, tokenOrigin, extract)
          return
        }
        extract()
        return
      }
      finishPlan(plan, tokenOrigin)
    }
    const probePath = plan.finish === "put" ? plan.path.slice(0, -1) : plan.path
    const advance = () => {
      activePath = probePath.slice(0, hop + 1)
      selected = probePath[hop] ?? plan.target
      paint()
      moveToken(
        selected == null ? null : cells[selected].cell,
        "travel",
        HOP_MS,
        tokenOrigin,
        () => {
          hop++
          if (hop < probePath.length) advance()
          else finish()
        },
      )
    }
    if (probePath.length) advance()
    else {
      activePath = []
      selected = null
      paint()
      finish()
    }
  }

  function enteredKey(): number | null | undefined {
    const raw = (keyInput.value || "").trim()
    if (!raw) return undefined
    const parsed = Number(raw)
    if (Number.isSafeInteger(parsed)) return parsed
    shell.status.textContent = "Key must be a safe integer."
    keyInput.focus()
    return null
  }

  function freshPutKey() {
    const sampled = randomKey()
    const used = new Set(entries().map((entry) => entry.key))
    let generated = sampled
    for (let offset = 0; offset < 90; offset++) {
      const candidate = 10 + ((sampled - 10 + offset) % 90)
      if (!used.has(candidate) && candidate !== previousGeneratedPutKey) {
        generated = candidate
        break
      }
    }
    if (generated === previousGeneratedPutKey) generated = generated === 99 ? 10 : generated + 1
    previousGeneratedPutKey = generated
    return generated
  }

  function freshPutValue() {
    const sampled = randomValue()
    const generated =
      sampled === previousGeneratedPutValue
        ? sampled === "Z"
          ? "A"
          : String.fromCharCode(sampled.charCodeAt(0) + 1)
        : sampled
    previousGeneratedPutValue = generated
    return generated
  }

  function suppliedKey(preferExisting = false): number | null {
    const entered = enteredKey()
    if (entered !== undefined) return entered
    const existing = preferExisting ? entries()[0]?.key : undefined
    const generated = existing ?? randomKey()
    keyInput.value = String(generated)
    return generated
  }

  function suppliedPutKey() {
    const entered = enteredKey()
    return entered === undefined ? freshPutKey() : entered
  }

  function suppliedPutValue() {
    const entered = (valueInput?.value || "").trim()
    return entered || freshPutValue()
  }

  function closedPath(key: number) {
    const home = indexFor(key, SIZE)
    const chain = chains[home]
    const found = chain.findIndex((entry) => entry.key === key)
    const path = Array.from({ length: found < 0 ? chain.length : found + 1 }, (_, index) => index)
    return { home, path, found: null }
  }

  function closedPut(key: number, value: string): OperationPlan {
    const lookup = closedPath(key)
    const chain = chains[lookup.home]
    const found = chain.findIndex((entry) => entry.key === key)
    if (found >= 0) {
      return {
        finish: "put",
        key,
        value,
        calculation: calculationFor(key),
        path: [lookup.home],
        target: lookup.home,
        chainBucket: lookup.home,
        chainTarget: { bucket: lookup.home, index: found },
        chainPath: Array.from({ length: found + 1 }, (_, index) => index),
        message: `Updated key ${key} in bucket ${lookup.home}, chain node ${found}.`,
        commit: () => {
          chain[found].value = value
        },
      }
    }

    if (chain.length >= CHAIN_CAPACITY) {
      return {
        finish: "return",
        key,
        value,
        calculation: calculationFor(key),
        path: [lookup.home],
        target: lookup.home,
        chainBucket: lookup.home,
        chainTarget: { bucket: lookup.home, index: CHAIN_CAPACITY - 1 },
        chainPath: Array.from({ length: CHAIN_CAPACITY }, (_, index) => index),
        message: `Bucket ${lookup.home} chain is full (${CHAIN_CAPACITY}); key ${key} was not added.`,
      }
    }

    const index = chain.length
    return {
      finish: "put",
      key,
      value,
      calculation: calculationFor(key),
      path: [lookup.home],
      target: lookup.home,
      chainBucket: lookup.home,
      chainTarget: { bucket: lookup.home, index },
      chainPath: Array.from({ length: index + 1 }, (_, position) => position),
      message:
        index === 0
          ? `Put ${key}:${value} in bucket ${lookup.home}'s first chain node.`
          : `Collision at bucket ${lookup.home}; appended chain node ${index}.`,
      commit: () => {
        chain.push({ key, value, home: lookup.home, next: null })
      },
    }
  }

  function closedSearch(key: number, removeEntry: boolean): OperationPlan {
    const lookup = closedPath(key)
    const chain = chains[lookup.home]
    const found = chain.findIndex((entry) => entry.key === key)
    if (found < 0) {
      return {
        finish: "return",
        key,
        value: "",
        calculation: calculationFor(key),
        path: [lookup.home],
        target: lookup.home,
        chainBucket: lookup.home,
        chainPath: lookup.path,
        message: `${removeEntry ? "Remove" : "Search"} ${key} missed in bucket ${lookup.home}'s chain.`,
      }
    }
    const value = chain[found].value
    return {
      finish: removeEntry ? "remove-hit" : "search-hit",
      key,
      value,
      calculation: calculationFor(key),
      path: [lookup.home],
      target: lookup.home,
      chainBucket: lookup.home,
      chainTarget: { bucket: lookup.home, index: found },
      chainPath: Array.from({ length: found + 1 }, (_, index) => index),
      removesChainTarget: removeEntry,
      message: removeEntry
        ? `Removed key ${key} from bucket ${lookup.home} and repaired its external chain.`
        : `Search ${key} found ${value} in bucket ${lookup.home}, chain node ${found}.`,
      commit: removeEntry
        ? () => {
            chain.splice(found, 1)
          }
        : undefined,
    }
  }

  function openProbe(key: number) {
    const home = indexFor(key, SIZE)
    const path: number[] = []
    let firstTombstone: number | null = null
    for (let offset = 0; offset < SIZE; offset++) {
      const index = (home + offset) % SIZE
      path.push(index)
      if (tombstones[index] && firstTombstone == null) firstTombstone = index
      if (slots[index]?.key === key) return { home, path, found: index, insert: index, full: false }
      if (!slots[index] && !tombstones[index])
        return { home, path, found: null, insert: firstTombstone ?? index, full: false }
    }
    return { home, path, found: null, insert: firstTombstone, full: firstTombstone == null }
  }

  function openPut(key: number, value: string): OperationPlan {
    const probe = openProbe(key)
    if (content === "set" && probe.found != null) {
      return {
        finish: "return",
        key,
        value: "",
        calculation: calculationFor(key),
        path: probe.path,
        target: probe.found,
        message: `Add ${key} rejected; the key already exists in cell ${probe.found}.`,
      }
    }
    const target = probe.insert
    const path =
      target != null && probe.found == null && tombstones[target]
        ? probe.path.slice(0, probe.path.indexOf(target) + 1)
        : probe.path
    return {
      finish: target == null ? "return" : "put",
      key,
      value,
      calculation: calculationFor(key),
      path,
      target: target ?? path.at(-1) ?? probe.home,
      message:
        target == null
          ? "Open-addressing table is full."
          : probe.found != null
            ? `Updated key ${key} in cell ${target}.`
            : tombstones[target]
              ? content === "set"
                ? `Added key ${key} in reused tombstone cell ${target}.`
                : `Put ${key}:${value} in reused tombstone cell ${target}.`
              : target === probe.home
                ? content === "set"
                  ? `Added key ${key} in home cell ${target}.`
                  : `Put ${key}:${value} in home cell ${target}.`
                : content === "set"
                  ? `Collision at ${probe.home}; linear probe added key ${key} in cell ${target}.`
                  : `Collision at ${probe.home}; linear probe placed ${key}:${value} in cell ${target}.`,
      commit:
        target == null
          ? undefined
          : () => {
              slots[target] = { key, value, home: probe.home, next: null }
              tombstones[target] = false
            },
    }
  }

  function openSearch(key: number, removeEntry: boolean): OperationPlan {
    const probe = openProbe(key)
    const target = probe.found ?? probe.path.at(-1) ?? probe.home
    const entry = probe.found == null ? null : slots[probe.found]
    return {
      finish: entry ? (removeEntry ? "remove-hit" : "search-hit") : "return",
      key,
      value: entry?.value ?? "",
      calculation: calculationFor(key),
      path: probe.path,
      target,
      message: entry
        ? removeEntry
          ? `Removed key ${key}; cell ${probe.found} is now a tombstone.`
          : content === "set"
            ? `Contains ${key}: true; found in cell ${probe.found}.`
            : `Search ${key} found ${entry.value} in cell ${probe.found}.`
        : `${removeEntry ? "Remove" : content === "set" ? "Contains" : "Search"} ${key}${
            content === "set" && !removeEntry ? ": false;" : ""
          } missed after ${probe.path.length} probe${probe.path.length === 1 ? "" : "s"}.`,
      commit:
        entry && removeEntry
          ? () => {
              slots[probe.found!] = null
              tombstones[probe.found!] = true
            }
          : undefined,
    }
  }

  function bucketPath(key: number) {
    const bucket = indexFor(key, SIZE / BUCKET_SIZE)
    const path = Array.from({ length: SIZE }, (_, offset) => {
      const groupOffset = Math.floor(offset / BUCKET_SIZE)
      const within = offset % BUCKET_SIZE
      return ((bucket + groupOffset) % (SIZE / BUCKET_SIZE)) * BUCKET_SIZE + within
    })
    return { bucket, path }
  }

  function bucketPut(key: number, value: string): OperationPlan {
    const traversal = bucketPath(key)
    const found = traversal.path.find((index) => slots[index]?.key === key)
    const target = found ?? traversal.path.find((index) => slots[index] == null) ?? null
    const targetBucket = target == null ? null : Math.floor(target / BUCKET_SIZE)
    return {
      finish: target == null ? "return" : "put",
      key,
      value,
      calculation: calculationFor(key),
      path:
        target == null
          ? traversal.path
          : traversal.path.slice(0, traversal.path.indexOf(target) + 1),
      target: target ?? traversal.path.at(-1)!,
      message:
        target == null
          ? "All four buckets are full."
          : found != null
            ? `Updated key ${key} in bucket ${targetBucket}, cell ${target}.`
            : targetBucket === traversal.bucket
              ? `Put ${key}:${value} in bucket ${targetBucket}, cell ${target}.`
              : `Bucket ${traversal.bucket} was full; overflow placed ${key}:${value} in bucket ${targetBucket}, cell ${target}.`,
      commit:
        target == null
          ? undefined
          : () => {
              slots[target] = { key, value, home: traversal.bucket, next: null }
            },
    }
  }

  function bucketSearch(key: number, removeEntry: boolean): OperationPlan {
    const traversal = bucketPath(key)
    const found = traversal.path.find((index) => slots[index]?.key === key)
    const path =
      found == null ? traversal.path : traversal.path.slice(0, traversal.path.indexOf(found) + 1)
    const entry = found == null ? null : slots[found]
    return {
      finish: entry ? (removeEntry ? "remove-hit" : "search-hit") : "return",
      key,
      value: entry?.value ?? "",
      calculation: calculationFor(key),
      path,
      target: found ?? path.at(-1)!,
      message: entry
        ? removeEntry
          ? `Removed key ${key} from bucket ${Math.floor(found! / BUCKET_SIZE)}, cell ${found}.`
          : `Search ${key} found ${entry.value} in bucket ${Math.floor(found! / BUCKET_SIZE)}, cell ${found}.`
        : `${removeEntry ? "Remove" : "Search"} ${key} missed across all four buckets.`,
      commit:
        entry && removeEntry
          ? () => {
              slots[found!] = null
            }
          : undefined,
    }
  }

  function onPut() {
    const key = suppliedPutKey()
    if (key == null) return
    const value = content === "map" ? suppliedPutValue() : ""
    run(
      config.strategy === "closed-addressing"
        ? closedPut(key, value)
        : config.strategy === "open-addressing"
          ? openPut(key, value)
          : bucketPut(key, value),
    )
  }

  function onSearch(removeEntry = false) {
    const key =
      content === "map"
        ? suppliedKey(true)
        : (() => {
            const entered = enteredKey()
            const generated = entered === undefined ? freshPutKey() : entered
            return generated
          })()
    if (key == null) return
    run(
      config.strategy === "closed-addressing"
        ? closedSearch(key, removeEntry)
        : config.strategy === "open-addressing"
          ? openSearch(key, removeEntry)
          : bucketSearch(key, removeEntry),
    )
  }

  function onReset() {
    cancelMotion()
    lock(false)
    slots.fill(null)
    for (const chain of chains) chain.splice(0)
    tombstones.fill(false)
    clearTransientState()
    keyInput.value = ""
    if (valueInput) valueInput.value = ""
    calculation.textContent = initialCalculation
    restoreGenericToken()
    settleToken()
    shell.status.textContent =
      content === "map"
        ? `${label[0].toUpperCase()}${label.slice(1)} table reset.`
        : "Hash set reset."
    paint()
  }

  shell.listen(put, "click", onPut)
  shell.listen(search, "click", () => onSearch(false))
  shell.listen(remove, "click", () => onSearch(true))
  shell.listen(reset, "click", onReset)
  onEnter(shell, valueInput ?? keyInput, onPut)
  shell.status.textContent =
    content === "map" ? `Fixed 12-cell ${label} table ready.` : "Fixed 12-cell hash set ready."
  paint()
  const base = shell.finish()
  return {
    destroy() {
      destroyed = true
      cancelMotion()
      base.destroy()
    },
  }
}

function bloomSeed(value: string) {
  if (/^-?\d+$/.test(value)) {
    const parsed = Number(value)
    if (Number.isSafeInteger(parsed)) return parsed
  }
  let seed = 0
  for (const character of value) seed = (seed * 31 + character.charCodeAt(0)) | 0
  return seed
}

export function bloomPositions(value: string) {
  const seed = bloomSeed(value)
  return [indexFor(seed, 10), indexFor(seed * 3 + 1, 10), indexFor(seed * 7 + 4, 10)] as const
}

export function mountBloomFilter(root: HTMLElement, _config: BloomFilterConfig): MountHandle {
  const bits = Array(10).fill(false)
  let selected: number | null = null
  let visited: number[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  let previousGeneratedValue: string | null = null
  let destroyed = false
  const initialCalculation = "three hashes select bits in the 10-bit array"
  const { shell, operation, token, tokenInline, calculation, cells } = createHashIndexSurface(
    root,
    {
      id: "bloom-filter",
      label: "Bloom filter",
      ariaLabel: "Interactive 10-bit Bloom filter",
      strategy: "bits",
      size: 10,
      tokenText: "item",
      calculation: initialCalculation,
    },
  )

  const valueInput = shell.input("Bloom filter value", "Value", 16)
  const add = shell.button("Add", true)
  const query = shell.button("Query")
  const reset = shell.button("Reset")
  const fields = el("div", "steptrace__hash-fields")
  const actions = el("div", "steptrace__hash-actions")
  fields.append(valueInput)
  actions.append(add, query, reset)
  shell.controls.classList.add("steptrace__hash-controls")
  shell.controls.dataset.mode = "bloom"
  shell.controls.append(fields, actions)
  const interactive = [valueInput, add, query, reset]

  function paint() {
    cells.forEach(({ cell, value }, index) => {
      value.textContent = bits[index] ? "1" : "0"
      cell.dataset.empty = bits[index] ? "0" : "1"
      cell.dataset.probe = selected === index ? "current" : visited.includes(index) ? "visited" : ""
      cell.setAttribute("aria-label", `bit ${index}, ${bits[index] ? "set to 1" : "set to 0"}`)
    })
  }

  function lock(value: boolean) {
    operation.dataset.busy = value ? "1" : "0"
    for (const control of interactive) control.disabled = value
  }

  function clearSequence() {
    if (timer != null) clearTimeout(timer)
    timer = null
    selected = null
    visited = []
  }

  function freshValue() {
    const sampled = String(Math.floor(Math.random() * 90) + 10)
    const generated =
      sampled === previousGeneratedValue
        ? sampled === "99"
          ? "10"
          : String(Number(sampled) + 1)
        : sampled
    previousGeneratedValue = generated
    return generated
  }

  function suppliedValue() {
    return valueInput.value.trim() || freshValue()
  }

  function finish(outcome: "added" | "definitely-absent" | "possibly-present", message: string) {
    timer = null
    selected = null
    visited = []
    operation.dataset.outcome = outcome
    shell.status.textContent = message
    tokenInline.textContent = "item"
    token.dataset.motion = "idle"
    paint()
    lock(false)
  }

  function run(kind: "add" | "query") {
    if (timer != null) return
    const value = suppliedValue()
    const positions = bloomPositions(value)
    calculation.textContent = `${value} → [${positions.join(", ")}]`
    tokenInline.textContent = value
    token.dataset.motion = "travel"
    delete operation.dataset.outcome
    lock(true)

    let step = 0
    const advance = () => {
      const index = positions[step]
      selected = index
      visited = [...positions.slice(0, step + 1)]
      if (kind === "add") bits[index] = true
      paint()

      const completeStep = () => {
        if (destroyed) return
        if (kind === "query" && !bits[index]) {
          finish("definitely-absent", `Query ${value}: definitely absent; bit ${index} is 0.`)
          return
        }
        step++
        if (step < positions.length) advance()
        else if (kind === "add")
          finish("added", `Added ${value}; bits ${positions.join(", ")} are 1.`)
        else finish("possibly-present", `Query ${value}: possibly present; all three bits are 1.`)
      }

      if (shell.reducedMotion()) completeStep()
      else timer = setTimeout(completeStep, HOP_MS)
    }
    advance()
  }

  function onReset() {
    clearSequence()
    bits.fill(false)
    valueInput.value = ""
    calculation.textContent = initialCalculation
    tokenInline.textContent = "item"
    token.dataset.motion = "idle"
    delete operation.dataset.outcome
    lock(false)
    shell.status.textContent = "Bloom filter reset."
    paint()
  }

  shell.listen(add, "click", () => run("add"))
  shell.listen(query, "click", () => run("query"))
  shell.listen(reset, "click", onReset)
  onEnter(shell, valueInput, () => run("add"))
  shell.status.textContent = "Fixed 10-bit Bloom filter ready."
  paint()
  const base = shell.finish()
  return {
    destroy() {
      destroyed = true
      clearSequence()
      base.destroy()
    },
  }
}

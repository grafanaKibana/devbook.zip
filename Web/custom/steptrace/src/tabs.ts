import type {
  StepTraceBlockConfig,
  StepTraceConfig,
  StepTraceTabConfig,
  StepTraceTabsConfig,
} from "./types"

export interface NormalizedStepTraceTab {
  name: string
  description: string
  config: StepTraceConfig
}

export interface NormalizedStepTraceTabs {
  selected: number
  tabs: NormalizedStepTraceTab[]
}

export function isTabsConfig(config: StepTraceBlockConfig): config is StepTraceTabsConfig {
  return typeof config === "object" && config != null && "tabs" in config
}

export function normalizeTabsConfig(config: StepTraceTabsConfig): NormalizedStepTraceTabs {
  if (!Array.isArray(config.tabs) || config.tabs.length === 0) {
    throw new Error("steptrace: tabs requires at least one tab.")
  }

  const names = new Set<string>()
  const tabs = config.tabs.map((rawTab, index) => normalizeTab(rawTab, index, names))
  const selected = config.selected ?? 0
  if (!Number.isInteger(selected) || selected < 0 || selected >= tabs.length) {
    throw new Error(`steptrace: tabs "selected" must be an index from 0 to ${tabs.length - 1}.`)
  }

  return { selected, tabs }
}

function normalizeTab(
  rawTab: StepTraceTabConfig,
  index: number,
  names: Set<string>,
): NormalizedStepTraceTab {
  if (typeof rawTab !== "object" || rawTab == null || Array.isArray(rawTab)) {
    throw new Error(`steptrace: tabs[${index}] must be an object.`)
  }

  const name = typeof rawTab.name === "string" ? rawTab.name.trim() : ""
  if (!name) throw new Error(`steptrace: tabs[${index}] requires a non-empty "name".`)
  const nameKey = name.toLocaleLowerCase()
  if (names.has(nameKey)) throw new Error(`steptrace: duplicate tab name "${name}".`)
  names.add(nameKey)

  if (rawTab.description != null && typeof rawTab.description !== "string") {
    throw new Error(`steptrace: tabs[${index}] "description" must be a string.`)
  }
  if (typeof rawTab.algorithm !== "string" || !rawTab.algorithm.trim()) {
    throw new Error(`steptrace: tabs[${index}] requires a non-empty "algorithm".`)
  }

  const { name: _name, description: _description, ...algorithmConfig } = rawTab
  return {
    name,
    description: rawTab.description?.trim() || "",
    config: algorithmConfig,
  }
}

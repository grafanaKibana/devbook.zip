export function mountComplexityFigure(figure: HTMLElement): { destroy(): void } {
  if (figure.dataset.complexityMounted) return { destroy() {} }
  figure.dataset.complexityMounted = "true"

  const tabs = Array.from(figure.querySelectorAll<HTMLButtonElement>(".complexity__tab"))
  const legendButtons = Array.from(
    figure.querySelectorAll<HTMLButtonElement>(".complexity__legend-button"),
  )
  const paths = Array.from(figure.querySelectorAll<SVGPathElement>(".complexity__curve"))
  const areas = Array.from(figure.querySelectorAll<SVGPathElement>(".complexity__area"))
  const labels = Array.from(
    figure.querySelectorAll<SVGTextElement>(".complexity__endpoint-label"),
  )
  const listeners: [EventTarget, string, EventListener][] = []
  let activeFilter = "all"
  let selectedPathId: string | null = null

  function listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener)
    listeners.push([target, type, listener])
  }

  function update(): void {
    const activeIds = new Set(
      paths
        .filter(
          (path) =>
            path.dataset.context !== "true" &&
            (activeFilter === "all" || path.dataset.category === activeFilter),
        )
        .map((path) => path.dataset.pathId ?? ""),
    )
    if (selectedPathId) {
      activeIds.clear()
      activeIds.add(selectedPathId)
    }

    for (const path of paths) {
      const active = activeIds.has(path.dataset.pathId ?? "")
      path.classList.toggle("is-highlighted", active)
      path.classList.toggle("is-subtle", !active)
    }
    for (const area of areas) {
      area.classList.toggle("is-subtle", !activeIds.has(area.dataset.pathId ?? ""))
    }
    for (const button of legendButtons) {
      const pathId = button.dataset.pathId ?? ""
      button.classList.toggle("is-selected", selectedPathId === pathId)
      button.classList.toggle("is-subtle", !activeIds.has(pathId))
      button.setAttribute("aria-pressed", selectedPathId === pathId ? "true" : "false")
    }
    for (const label of labels) {
      const ids = (label.dataset.pathIds ?? "").split(",")
      const activePath = paths.find(
        (path) => ids.includes(path.dataset.pathId ?? "") && activeIds.has(path.dataset.pathId ?? ""),
      )
      label.classList.toggle("is-active", Boolean(activePath))
      label.classList.toggle("is-subtle", !activePath)
      if (activePath) {
        label.style.setProperty("--complexity-label-color", activePath.getAttribute("stroke") ?? "")
      }
    }
    for (const tab of tabs) {
      const selected = tab.dataset.filter === activeFilter
      tab.setAttribute("aria-selected", selected ? "true" : "false")
      tab.tabIndex = selected ? 0 : -1
    }
    figure.dataset.activeFilter = activeFilter
  }

  for (const tab of tabs) {
    listen(tab, "click", () => {
      activeFilter = tab.dataset.filter ?? "all"
      selectedPathId = null
      update()
    })
    listen(tab, "keydown", (event) => {
      const key = (event as KeyboardEvent).key
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return
      event.preventDefault()
      const enabled = tabs.filter((candidate) => !candidate.disabled)
      const current = enabled.indexOf(tab)
      const next =
        key === "Home"
          ? enabled[0]
          : key === "End"
            ? enabled.at(-1)
            : enabled[(current + (key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length]
      next?.focus()
      next?.click()
    })
  }
  for (const button of legendButtons) {
    listen(button, "click", () => {
      const pathId = button.dataset.pathId ?? null
      selectedPathId = selectedPathId === pathId ? null : pathId
      if (selectedPathId) activeFilter = button.dataset.category ?? "all"
      update()
    })
  }

  update()
  return {
    destroy() {
      for (const [target, type, listener] of listeners) {
        target.removeEventListener(type, listener)
      }
      delete figure.dataset.complexityMounted
    },
  }
}

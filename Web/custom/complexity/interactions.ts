export function mountComplexityFigure(figure: HTMLElement): { destroy(): void } {
  if (figure.dataset.complexityMounted) return { destroy() {} }
  figure.dataset.complexityMounted = "true"

  const controller = new AbortController()

  function listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener, { signal: controller.signal })
  }

  const resources = Array.from(figure.querySelectorAll<HTMLElement>(".complexity__resource"))
  const tabs = Array.from(figure.querySelectorAll<HTMLButtonElement>(".complexity__tab"))
  if (tabs.length === resources.length) {
    const select = (active: number): void => {
      tabs.forEach((tab, index) => {
        tab.setAttribute("aria-selected", index === active ? "true" : "false")
        tab.tabIndex = index === active ? 0 : -1
        resources[index].hidden = index !== active
      })
    }
    tabs.forEach((tab, index) => {
      listen(tab, "click", () => select(index))
      listen(tab, "keydown", (event) => {
        const key = (event as KeyboardEvent).key
        const next =
          key === "ArrowRight"
            ? (index + 1) % tabs.length
            : key === "ArrowLeft"
              ? (index - 1 + tabs.length) % tabs.length
              : key === "Home"
                ? 0
                : key === "End"
                  ? tabs.length - 1
                  : -1
        if (next < 0) return
        event.preventDefault()
        select(next)
        tabs[next].focus()
      })
    })
  }
  for (const resource of resources.length > 0 ? resources : [figure]) {
    const legendButtons = Array.from(
      resource.querySelectorAll<HTMLButtonElement>(".complexity__legend-button"),
    )
    const groupButtons = Array.from(
      resource.querySelectorAll<HTMLButtonElement>(".complexity__legend-group-button"),
    )
    const paths = Array.from(resource.querySelectorAll<SVGPathElement>(".complexity__curve"))
    const areas = Array.from(resource.querySelectorAll<SVGPathElement>(".complexity__area"))
    const labels = Array.from(
      resource.querySelectorAll<SVGTextElement>(".complexity__endpoint-label"),
    )
    let selectedPathIds = new Set<string>()
    let previewPathIds = new Set<string>()

    function update(): void {
      const activeIds = new Set(
        paths
          .filter((path) => path.dataset.context !== "true")
          .map((path) => path.dataset.pathId ?? ""),
      )
      if (previewPathIds.size > 0) {
        activeIds.clear()
        for (const pathId of previewPathIds) activeIds.add(pathId)
      } else if (selectedPathIds.size > 0) {
        activeIds.clear()
        for (const pathId of selectedPathIds) activeIds.add(pathId)
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
        button.classList.toggle("is-selected", selectedPathIds.has(pathId))
        button.classList.toggle("is-subtle", !activeIds.has(pathId))
        button.setAttribute("aria-pressed", selectedPathIds.has(pathId) ? "true" : "false")
      }
      for (const button of groupButtons) {
        const pathIds = (button.dataset.pathIds ?? "").split(",").filter(Boolean)
        const selected =
          pathIds.length > 0 &&
          selectedPathIds.size === pathIds.length &&
          pathIds.every((pathId) => selectedPathIds.has(pathId))
        button.classList.toggle("is-selected", selected)
        button.classList.toggle("is-subtle", !pathIds.some((pathId) => activeIds.has(pathId)))
        button.setAttribute("aria-pressed", selected ? "true" : "false")
      }
      for (const label of labels) {
        const ids = (label.dataset.pathIds ?? "").split(",")
        const activePath = paths.findLast(
          (path) =>
            ids.includes(path.dataset.pathId ?? "") && activeIds.has(path.dataset.pathId ?? ""),
        )
        label.classList.toggle("is-active", Boolean(activePath))
        label.classList.toggle("is-subtle", !activePath)
        if (activePath) {
          label.style.setProperty(
            "--complexity-label-color",
            activePath.getAttribute("stroke") ?? "",
          )
        }
      }
    }
    for (const button of legendButtons) {
      listen(button, "pointerenter", () => {
        previewPathIds = new Set([button.dataset.pathId ?? ""])
        update()
      })
      listen(button, "pointerleave", () => {
        previewPathIds = new Set()
        update()
      })
      listen(button, "click", () => {
        const pathId = button.dataset.pathId ?? ""
        selectedPathIds =
          selectedPathIds.size === 1 && selectedPathIds.has(pathId) ? new Set() : new Set([pathId])
        update()
      })
    }
    for (const button of groupButtons) {
      listen(button, "pointerenter", () => {
        previewPathIds = new Set((button.dataset.pathIds ?? "").split(",").filter(Boolean))
        update()
      })
      listen(button, "pointerleave", () => {
        previewPathIds = new Set()
        update()
      })
      listen(button, "click", () => {
        const pathIds = (button.dataset.pathIds ?? "").split(",").filter(Boolean)
        const selected =
          selectedPathIds.size === pathIds.length &&
          pathIds.every((pathId) => selectedPathIds.has(pathId))
        selectedPathIds = selected ? new Set() : new Set(pathIds)
        update()
      })
    }
    update()
  }
  return {
    destroy() {
      controller.abort()
      delete figure.dataset.complexityMounted
    },
  }
}

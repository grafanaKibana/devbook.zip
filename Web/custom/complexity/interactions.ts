export function mountComplexityFigure(figure: HTMLElement): { destroy(): void } {
  if (figure.dataset.complexityMounted) return { destroy() {} }
  figure.dataset.complexityMounted = "true"

  const listeners: [EventTarget, string, EventListener][] = []

  function listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener)
    listeners.push([target, type, listener])
  }

  const resources = Array.from(figure.querySelectorAll<HTMLElement>(".complexity__resource"))
  for (const resource of resources.length > 0 ? resources : [figure]) {
    const legendButtons = Array.from(
      resource.querySelectorAll<HTMLButtonElement>(".complexity__legend-button"),
    )
    const paths = Array.from(resource.querySelectorAll<SVGPathElement>(".complexity__curve"))
    const areas = Array.from(resource.querySelectorAll<SVGPathElement>(".complexity__area"))
    const labels = Array.from(
      resource.querySelectorAll<SVGTextElement>(".complexity__endpoint-label"),
    )
    let selectedPathId: string | null = null

    function update(): void {
      const activeIds = new Set(
        paths
          .filter((path) => path.dataset.context !== "true")
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
      listen(button, "click", () => {
        const pathId = button.dataset.pathId ?? null
        selectedPathId = selectedPathId === pathId ? null : pathId
        update()
      })
    }
    update()
  }
  return {
    destroy() {
      for (const [target, type, listener] of listeners) {
        target.removeEventListener(type, listener)
      }
      delete figure.dataset.complexityMounted
    },
  }
}

import { mountComplexityFigure } from "./interactions"

const host = window as Window & { __devbookComplexity?: boolean }

if (!host.__devbookComplexity) {
  host.__devbookComplexity = true
  document.addEventListener("nav", () => {
    document
      .querySelectorAll<HTMLElement>(".complexity:not([data-complexity-mounted])")
      .forEach((figure) => {
        const handle = mountComplexityFigure(figure)
        window.addCleanup(() => handle.destroy())
      })
  })
}

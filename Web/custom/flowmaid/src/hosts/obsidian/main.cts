import { buildFlowmaidIndex, findFlowmaidRecord } from "../../authoring/index"
import { parseFlowmaidYaml } from "../../authoring/yaml"
import { compileFlowmaid } from "../../domain/compile"
import type { FlowmaidProgram, RangeSliderHandle, RangeSliderOptions } from "../../domain/types"
import { createFlowmaidEngine } from "../../engine"

const { MarkdownRenderChild, Plugin, SliderComponent } =
  require("obsidian") as typeof import("obsidian")

const createRangeSlider = (
  container: HTMLElement,
  options: RangeSliderOptions,
): RangeSliderHandle => {
  const slider = new SliderComponent(container).setLimits(options.min, options.max, options.step)
  if (typeof slider.setInstant === "function") slider.setInstant(true)
  if (typeof slider.setDisplayFormat === "function") slider.setDisplayFormat(options.format)
  else if (typeof slider.setDynamicTooltip === "function") slider.setDynamicTooltip()
  slider.setValue(options.value)
  slider.sliderEl.setAttribute("aria-label", options.label)
  slider.sliderEl.setAttribute("aria-valuetext", options.format(options.value))
  slider.onChange((value) => {
    slider.sliderEl.setAttribute("aria-valuetext", options.format(value))
    options.onInput(value)
  })
  return {
    element: slider.sliderEl,
    setValue(value) {
      slider.setValue(value)
      slider.sliderEl.setAttribute("aria-valuetext", options.format(value))
    },
    destroy() {
      container.replaceChildren()
    },
  }
}

const sourceAt = (markdown: string, lineStart: number, lineEnd: number): string | null => {
  const lines = markdown.split(/\r?\n/u)
  const slice = lines.slice(lineStart, lineEnd + 1)
  const open = slice.findIndex((line) => /^\s*`{3,}mermaid(?:\s|$)/u.test(line))
  if (open < 0) return null
  const close = slice.findIndex((line, index) => index > open && /^\s*`{3,}\s*$/u.test(line))
  return close > open ? slice.slice(open + 1, close).join("\n") : null
}

const appendDiagnostic = (pair: HTMLElement, message: string) => {
  if (pair.nextElementSibling?.classList.contains("flowmaid-diagnostic"))
    return pair.nextElementSibling as HTMLElement
  const diagnostic = pair.ownerDocument.createElement("p")
  diagnostic.className = "flowmaid-diagnostic"
  diagnostic.textContent = `Flowmaid: ${message}`
  pair.after(diagnostic)
  return diagnostic
}

class FlowmaidRenderChild extends MarkdownRenderChild {
  private handle?: ReturnType<ReturnType<typeof createFlowmaidEngine>["mount"]>
  private observer?: MutationObserver
  private mount?: HTMLElement
  private diagnostic?: HTMLElement

  constructor(
    private readonly pair: HTMLElement,
    private readonly program: FlowmaidProgram,
    private readonly onDestroy: () => void,
  ) {
    super(pair)
  }

  onload(): void {
    this.mount = this.pair.ownerDocument.createElement("div")
    this.mount.className = "flowmaid-mount"
    this.pair.after(this.mount)
    const engine = createFlowmaidEngine({ controlHost: { createRangeSlider } })
    let current: SVGSVGElement | null = null
    const refresh = () => {
      const next = this.pair.querySelector<SVGSVGElement>("svg")
      if (!next || next === current || !this.mount) return
      try {
        if (this.handle) this.handle.replaceSvg(next)
        else this.handle = engine.mount(this.mount, next, this.program)
        current = next
      } catch (error) {
        this.observer?.disconnect()
        this.handle?.destroy()
        this.mount?.remove()
        this.diagnostic = appendDiagnostic(
          this.pair,
          error instanceof Error ? error.message : String(error),
        )
      }
    }
    this.observer = new MutationObserver(refresh)
    this.observer.observe(this.pair, { childList: true, subtree: true })
    refresh()
  }

  onunload(): void {
    this.observer?.disconnect()
    this.handle?.destroy()
    this.mount?.remove()
    this.diagnostic?.remove()
    this.pair.removeAttribute("data-flowmaid-processed")
    this.onDestroy()
  }
}

class FlowmaidDiagnosticChild extends MarkdownRenderChild {
  private diagnostic?: HTMLElement

  constructor(
    private readonly pair: HTMLElement,
    private readonly message: string,
    private readonly onDestroy: () => void,
  ) {
    super(pair)
  }

  onload(): void {
    this.diagnostic = appendDiagnostic(this.pair, this.message)
  }

  onunload(): void {
    this.diagnostic?.remove()
    this.pair.removeAttribute("data-flowmaid-processed")
    this.onDestroy()
  }
}

class FlowmaidPlugin extends Plugin {
  private readonly pending = new WeakMap<HTMLElement, MutationObserver>()
  private readonly observers = new Set<MutationObserver>()
  private readonly children = new Set<FlowmaidRenderChild | FlowmaidDiagnosticChild>()

  onload(): void {
    this.registerMarkdownPostProcessor(async (el, ctx) => {
      const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath)
      if (!file) return
      const markdown = await this.app.vault.cachedRead(file)
      const selector = ".block-language-mermaid, .mermaid"
      const recordAt = (root: HTMLElement) => {
        const section = ctx.getSectionInfo(root)
        if (!section) return null
        const source = sourceAt(markdown, section.lineStart, section.lineEnd)
        if (source === null) return null
        const node = {
          type: "root",
          children: [
            {
              type: "code",
              lang: "mermaid",
              value: source,
              position: {
                start: { line: section.lineStart + 1, column: 1 },
                end: { line: section.lineEnd + 1, column: 1 },
              },
            },
          ],
        }
        const index = buildFlowmaidIndex(node, (yaml) => compileFlowmaid(parseFlowmaidYaml(yaml)))
        const record = findFlowmaidRecord(index, section.lineStart, section.lineEnd, source)
        return record ? { record, section } : null
      }
      const local = recordAt(el)
      if (!local) return

      const processRoots = () => {
        let attached = 0
        const roots = [
          ...(el.matches(selector) ? [el] : []),
          ...el.querySelectorAll<HTMLElement>(selector),
        ].filter(
          (root) =>
            root === el ||
            !root.closest(".block-language-mermaid") ||
            root.matches(".block-language-mermaid"),
        )

        for (const pair of roots) {
          if (pair.dataset.flowmaidProcessed) continue
          const resolved = recordAt(pair) ?? (roots.length === 1 ? local : null)
          if (!resolved) continue
          const { record } = resolved
          pair.dataset.flowmaidProcessed = "1"
          attached += 1
          let child: FlowmaidRenderChild | FlowmaidDiagnosticChild
          const release = () => this.children.delete(child)
          if (record.diagnostic) {
            child = new FlowmaidDiagnosticChild(pair, record.diagnostic.message, release)
          } else if (record.program) {
            child = new FlowmaidRenderChild(pair, record.program, release)
          } else continue
          this.children.add(child)
          ctx.addChild(child)
        }
        return { attached, roots: roots.length }
      }

      const initial = processRoots()
      if (initial.attached || initial.roots || this.pending.has(el)) return
      const observer = new MutationObserver(() => {
        const result = processRoots()
        if (!result.attached && !result.roots) return
        observer.disconnect()
        this.observers.delete(observer)
        this.pending.delete(el)
      })
      this.pending.set(el, observer)
      this.observers.add(observer)
      observer.observe(el, { childList: true, subtree: true })
    })
  }

  onunload(): void {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()
    this.children.forEach((child) => child.onunload())
    this.children.clear()
  }
}

module.exports = FlowmaidPlugin

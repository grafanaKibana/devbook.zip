import { parseConfig } from "../config"
import { mountMermaidFlow, type MountHandle } from "../mount"
import { findPairRecord } from "../authoring/pair-index"
import { ObsidianPairIndexCache } from "../authoring/obsidian-index"
import { observePairSvg, type PairLifecycle } from "../../pairing"
import type { RangeSliderHandle, RangeSliderOptions } from "../types"

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
    options.onChange(value)
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

const renderFailure = (el: HTMLElement, source: string, message: string): void => {
  el.replaceChildren()
  const readableSource = el.ownerDocument.createElement("pre")
  readableSource.textContent = `\`\`\`mermaid-flow\n${source}\n\`\`\``
  const diagnostic = el.ownerDocument.createElement("p")
  diagnostic.className = "mermaid-flow-diagnostic"
  diagnostic.textContent = `Mermaid Flow: ${message}`
  el.append(readableSource, diagnostic)
}

class MermaidFlowRenderChild extends MarkdownRenderChild {
  private lifecycle?: PairLifecycle
  private handle?: MountHandle
  private frame?: number
  private attempts = 0
  private readinessTimeout?: number

  constructor(
    el: HTMLElement,
    private readonly source: string,
  ) {
    super(el)
  }

  onload(): void {
    this.scheduleMount()
  }

  private scheduleMount(): void {
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined
      if (this.mountPair()) return
      this.attempts += 1
      if (this.attempts < 60) this.scheduleMount()
      else
        renderFailure(
          this.containerEl,
          this.source,
          "the local preceding rendered block is not Mermaid",
        )
    })
  }

  private mountPair(): boolean {
    const renderBlock = this.containerEl.parentElement
    const precedingBlock =
      this.containerEl.previousElementSibling ?? renderBlock?.previousElementSibling
    const pairRoot =
      precedingBlock instanceof HTMLElement
        ? precedingBlock.matches(".block-language-mermaid, .mermaid")
          ? precedingBlock
          : precedingBlock.querySelector<HTMLElement>(
              ":scope > .block-language-mermaid, :scope > .mermaid",
            )
        : null
    if (!pairRoot) return false

    let mountFailed = false
    this.lifecycle = observePairSvg(
      pairRoot,
      (svg) => {
        try {
          if (this.readinessTimeout !== undefined) {
            window.clearTimeout(this.readinessTimeout)
            this.readinessTimeout = undefined
          }
          if (this.handle) this.handle.replaceSvg(svg)
          else
            this.handle = mountMermaidFlow(pairRoot, svg, parseConfig(this.source), {
              createRangeSlider,
            })
        } catch (error) {
          mountFailed = true
          renderFailure(
            this.containerEl,
            this.source,
            error instanceof Error ? error.message : "runtime mount failed",
          )
          this.lifecycle?.destroy()
          this.handle?.destroy()
          this.handle = undefined
        }
      },
      () => {},
    )
    if (mountFailed) this.lifecycle.destroy()
    else if (!this.handle)
      this.readinessTimeout = window.setTimeout(() => {
        this.readinessTimeout = undefined
        if (this.handle) return
        renderFailure(this.containerEl, this.source, "the paired Mermaid SVG was not ready")
        this.lifecycle?.destroy()
      }, 10_000)
    return true
  }

  onunload(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    if (this.readinessTimeout !== undefined) window.clearTimeout(this.readinessTimeout)
    this.lifecycle?.destroy()
    this.handle?.destroy()
  }
}

class MermaidFlowPlugin extends Plugin {
  private readonly authoring = new ObsidianPairIndexCache()

  onload(): void {
    this.registerMarkdownCodeBlockProcessor("mermaid-flow", async (source, el, ctx) => {
      const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath)
      if (!file) {
        renderFailure(el, source, "could not prove the immediately preceding Mermaid fence")
        return
      }

      const markdown = await this.app.vault.cachedRead(file)
      const index = this.authoring.get(ctx.sourcePath, markdown)
      const section = ctx.getSectionInfo(el)
      const record = section
        ? findPairRecord(index, section.lineStart, section.lineEnd, source)
        : null
      if (!record) {
        renderFailure(el, source, "could not prove the exact Mermaid Flow source range")
        return
      }
      if (record.failure) {
        renderFailure(el, source, record.failure)
        return
      }

      ctx.addChild(new MermaidFlowRenderChild(el, source))
    })
  }

  onunload(): void {
    this.authoring.clear()
  }
}

module.exports = MermaidFlowPlugin

/* StepTrace Obsidian host entry. esbuild bundles the shared TypeScript engine
 * into CommonJS while leaving `obsidian` external. It registers the `steptrace`
 * code-block processor and tears mounted cards down with the render child.
 */

import type {
  HostControlHandle,
  MountHandle,
  SpeedSliderOptions,
  StepTraceBlockConfig,
} from "../types"

const { Plugin, MarkdownRenderChild, Notice, SliderComponent } = require("obsidian")
const { steptrace } = require("../engine") as typeof import("../engine")

interface ObsidianElement extends HTMLElement {
  createEl(tag: string, options?: { text?: string }): ObsidianElement
}

interface MarkdownContext {
  addChild(child: unknown): void
}

function createSpeedSlider(container: HTMLElement, options: SpeedSliderOptions): HostControlHandle {
  const slider = new SliderComponent(container).setLimits(options.min, options.max, options.step)

  // Preserve live dragging on Obsidian versions that expose it (since 1.6.6).
  if (typeof slider.setInstant === "function") slider.setInstant(true)

  // Current Obsidian renders the formatted value beside its native slider.
  // Older supported versions retain their native dynamic tooltip instead.
  if (typeof slider.setDisplayFormat === "function") slider.setDisplayFormat(options.format)
  else if (typeof slider.setDynamicTooltip === "function") slider.setDynamicTooltip()

  slider.setValue(options.value)
  slider.sliderEl.setAttribute("aria-label", options.label)
  slider.sliderEl.setAttribute("aria-valuetext", options.format(options.value))
  slider.onChange((value: number) => {
    slider.sliderEl.setAttribute("aria-valuetext", options.format(value))
    options.onChange(value)
  })

  return {
    destroy() {
      // SliderComponent has no unload API; clear its wrapper so the current
      // inline value sibling is removed together with the input.
      container.replaceChildren()
    },
  }
}

class SteptraceChild extends MarkdownRenderChild {
  private readonly handle: MountHandle

  constructor(el: HTMLElement, handle: MountHandle) {
    super(el)
    this.handle = handle
  }

  onunload() {
    this.handle.destroy()
  }
}

class SteptracePlugin extends Plugin {
  onload() {
    this.registerMarkdownCodeBlockProcessor(
      "steptrace",
      (source: string, el: ObsidianElement, ctx: MarkdownContext) => {
        let config: StepTraceBlockConfig
        try {
          config = JSON.parse(source)
        } catch (error) {
          el.createEl("pre", {
            text: `steptrace: invalid JSON\n${error instanceof Error ? error.message : String(error)}`,
          })
          return
        }

        const root = el.createEl("div")
        const handle = steptrace.mount(root, config, { createSpeedSlider })
        ctx.addChild(new SteptraceChild(el, handle))
      },
    )

    // Cmd/Ctrl+P -> "Steptrace: Reload plugin". Pick up a freshly-built main.js
    // without toggling the plugin manually: disable then re-enable this plugin id.
    this.addCommand({
      id: "reload",
      name: "Reload plugin",
      callback: async () => {
        const id = this.manifest.id
        await this.app.plugins.disablePlugin(id)
        await this.app.plugins.enablePlugin(id)
        new Notice("steptrace reloaded")
      },
    })
  }
}

// Obsidian loads main.js with require() and expects the class itself, not a
// transpiler-generated `{ default: SteptracePlugin }` wrapper.
module.exports = SteptracePlugin

/* steptrace — Obsidian host adapter. Concatenated after engine.js into the vault
 * plugin's main.js by sync.mjs, so it uses no import/export and reads
 * globalThis.steptrace directly (main.js loads as CommonJS via require). Registers
 * the `steptrace` code-block processor → engine.mount(), tears each card down on
 * unload, and binds --st-* to Obsidian's palette so the card looks native.
 */

const { Plugin, MarkdownRenderChild, Notice, SliderComponent } = require("obsidian")

const st = globalThis.steptrace

// The only per-host styling: bind the neutral --st-* tokens to Obsidian's palette.
// Base tokens auto-flip with the theme; the state hues get an explicit dark override.
const THEME = `
.steptrace {
  --st-page: var(--background-primary);
  --st-surface: var(--background-secondary);
  --st-text: var(--text-normal);
  --st-muted: var(--text-muted);
  --st-border: var(--background-modifier-border);
  --st-accent: var(--interactive-accent);
  --st-on-accent: var(--text-on-accent);
  --st-neutral: var(--text-faint);
  --st-state-amber: #d97706;
  --st-state-violet: #7c3aed;
  --st-state-blue: #2563eb;
  --st-state-green: #4c8000;
  --st-font-head: var(--font-interface);
  --st-font-body: var(--font-text);
  --st-font-mono: var(--font-monospace);
}
.theme-dark .steptrace {
  --st-state-amber: #f59e0b;
  --st-state-violet: #a78bfa;
  --st-state-blue: #60a5fa;
  --st-state-green: #84cc16;
}
`

function createSpeedSlider(container, options) {
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
  slider.onChange((value) => {
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
  constructor(el, handle) {
    super(el)
    this.handle = handle
  }
  onunload() {
    if (this.handle && this.handle.destroy) this.handle.destroy()
  }
}

module.exports = class SteptracePlugin extends Plugin {
  onload() {
    this.styleEl = document.createElement("style")
    this.styleEl.id = "steptrace-obsidian-theme"
    this.styleEl.textContent = THEME
    document.head.appendChild(this.styleEl)

    this.registerMarkdownCodeBlockProcessor("steptrace", (source, el, ctx) => {
      let config
      try {
        config = JSON.parse(source)
      } catch (e) {
        el.createEl("pre", { text: "steptrace: invalid JSON\n" + (e && e.message ? e.message : String(e)) })
        return
      }
      const root = el.createEl("div")
      const handle = st.mount(root, config, { createSpeedSlider })
      ctx.addChild(new SteptraceChild(el, handle))
    })

    // Cmd/Ctrl+P → "Steptrace: Reload plugin". Picks up a freshly-synced main.js
    // without toggling the plugin by hand: disable then re-enable this plugin id.
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

  onunload() {
    if (this.styleEl) this.styleEl.remove()
  }
}

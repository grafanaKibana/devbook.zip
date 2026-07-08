/* steptrace — Obsidian host adapter. Concatenated after engine.js into the vault
 * plugin's main.js by sync.mjs, so it uses no import/export and reads
 * globalThis.steptrace directly (main.js loads as CommonJS via require). Registers
 * the `steptrace` code-block processor → engine.mount(), tears each card down on
 * unload, and binds --st-* to Obsidian's palette so the card looks native.
 */

const { Plugin, MarkdownRenderChild } = require("obsidian")

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
}
.theme-dark .steptrace {
  --st-state-amber: #f59e0b;
  --st-state-violet: #a78bfa;
  --st-state-blue: #60a5fa;
  --st-state-green: #84cc16;
}
`

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
      const handle = st.mount(root, config)
      ctx.addChild(new SteptraceChild(el, handle))
    })
  }

  onunload() {
    if (this.styleEl) this.styleEl.remove()
  }
}

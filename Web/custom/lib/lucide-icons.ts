import { createRequire } from "module"
import { existsSync, readFileSync } from "fs"

// Build-time Lucide icon resolver, shared by the Explorer decorators
// (explorer-icons, nav-scope-dropdown). Instead of hard-coding raw SVG path data
// per icon — which silently breaks the moment a note's `icon:` frontmatter names
// an icon the map doesn't list — we resolve icons by name from the `lucide-static`
// package at build time and inline only the ones actually used.
//
// lucide-static ships one SVG file per icon in `icons/`, and crucially keeps
// deprecated names as alias files (e.g. `code-2.svg`, `area-chart.svg`,
// `circle-help.svg` all exist even though the current names are code-xml /
// chart-area / circle-question-mark). Obsidian's `icon:` values use exactly those
// names, so reading `icons/<name>.svg` resolves whatever the frontmatter uses —
// no alias table to maintain. Unknown names return null so callers can fall back.
//
// This runs only in the Node build (the QuartzComponent render + module scope),
// never in the browser: components inline the resolved `name -> inner-svg` map as
// inert JSON and the client script renders from it.

const require = createRequire(import.meta.url)
const ICONS_DIR = require.resolve("lucide-static/package.json").replace(/package\.json$/, "icons/")

const cache = new Map<string, string | null>()

/**
 * Inner SVG markup (the shapes only, no `<svg>` wrapper) for a Lucide icon by its
 * kebab-case name, or null when lucide-static has no such icon.
 */
export function lucideInner(name: string): string | null {
  if (cache.has(name)) return cache.get(name)!
  let inner: string | null = null
  // Guard the filesystem lookup: only well-formed icon names, never a path.
  if (name && /^[a-z0-9-]+$/.test(name)) {
    const file = `${ICONS_DIR}${name}.svg`
    if (existsSync(file)) {
      inner = readFileSync(file, "utf8")
        .replace(/^[\s\S]*?<svg[^>]*>/, "")
        .replace(/<\/svg>\s*$/, "")
        .replace(/\s+/g, " ")
        .trim()
    }
  }
  cache.set(name, inner)
  return inner
}

/**
 * A `{ name -> inner-svg }` map for the given icon names, skipping any the pack
 * doesn't have. Callers inline this so the browser can render icons by name.
 */
export function lucideMap(names: Iterable<string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const name of names) {
    if (!name || out[name]) continue
    const inner = lucideInner(name)
    if (inner) out[name] = inner
  }
  return out
}

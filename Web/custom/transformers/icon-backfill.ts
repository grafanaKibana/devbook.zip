import * as fs from "fs"
import * as path from "path"
import * as yaml from "js-yaml"
import type { Root } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// Backfill the `icon` frontmatter property from the authoritative Vault note.
//
// Same story as StatusBackfill: Quartz Syncer strips everything except
// publish/created/modified/tags when it publishes into content/, so the topic
// folder-notes' `icon` (a Lucide icon name, e.g. `code-2`) never reaches the web
// build. The Explorer file-tree icons component (issue #51) needs it to render a
// note's assigned icon instead of the default, so we read it back here from the
// Vault source note.
//
// The content tree mirrors the Vault under its "Home" root: a content file at
// <relativePath> corresponds to the Vault note at <vaultRoot>/<relativePath>.
// The build runs from Web/, so the Vault lives at ../Vault/Home.

const VAULT_ROOT_CANDIDATES = [
  path.resolve(process.cwd(), "../Vault/Home"),
  path.resolve(process.cwd(), "Vault/Home"),
]

const vaultRoot = VAULT_ROOT_CANDIDATES.find((dir) => fs.existsSync(dir))

// relativePath -> icon value. Cached so each source note is read at most once.
const iconCache = new Map<string, unknown>()

const readVaultIcon = (relativePath: string): unknown => {
  if (iconCache.has(relativePath)) return iconCache.get(relativePath)

  let icon: unknown = undefined
  if (vaultRoot) {
    try {
      const raw = fs.readFileSync(path.join(vaultRoot, relativePath), "utf8")
      const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)
      if (match) {
        const fm = yaml.load(match[1]) as Record<string, unknown> | undefined
        icon = fm?.icon
      }
    } catch {
      // Note absent from the Vault (or unreadable) — leave icon undefined.
    }
  }

  iconCache.set(relativePath, icon)
  return icon
}

export const IconBackfill: QuartzTransformerPlugin = () => ({
  name: "IconBackfill",
  htmlPlugins() {
    return [
      () => (_tree: Root, file: { data: Record<string, unknown> }) => {
        const relativePath = file.data.relativePath as string | undefined
        if (!relativePath) return
        if ((file.data.frontmatter as Record<string, unknown> | undefined)?.icon != null) {
          return // already present (e.g. Syncer starts publishing it) — don't clobber
        }

        const icon = readVaultIcon(relativePath)
        if (typeof icon !== "string" || icon.length === 0) return

        const fm = (file.data.frontmatter ?? {}) as Record<string, unknown>
        fm.icon = icon
        file.data.frontmatter = fm as typeof file.data.frontmatter
      },
    ]
  },
})

import * as fs from "fs"
import * as path from "path"
import * as yaml from "js-yaml"
import type { Root } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// Backfill the `status` frontmatter property from the authoritative Vault note.
//
// Quartz Syncer does NOT publish `status` into content/ (it strips everything
// except publish/created/modified/tags, even with `includeAllFrontmatter`
// enabled). That leaves fileData.frontmatter.status undefined on the web build,
// so status-gated components (e.g. SiteMarquee, which hides on "Done" pages)
// can never see it. We read it back here.
//
// The content tree mirrors the Vault under its "Home" root: a content file at
// <relativePath> corresponds to the Vault note at <vaultRoot>/<relativePath>.
// The build runs from Web/, so the Vault lives at ../Vault/Home.

const VAULT_ROOT_CANDIDATES = [
  path.resolve(process.cwd(), "../Vault/Home"),
  path.resolve(process.cwd(), "Vault/Home"),
]

const vaultRoot = VAULT_ROOT_CANDIDATES.find((dir) => fs.existsSync(dir))

// relativePath -> status value (whatever the note declares; the consumer
// normalizes). Cached so each source note is read at most once per build.
const statusCache = new Map<string, unknown>()

const readVaultStatus = (relativePath: string): unknown => {
  if (statusCache.has(relativePath)) return statusCache.get(relativePath)

  let status: unknown = undefined
  if (vaultRoot) {
    try {
      const raw = fs.readFileSync(path.join(vaultRoot, relativePath), "utf8")
      const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)
      if (match) {
        const fm = yaml.load(match[1]) as Record<string, unknown> | undefined
        status = fm?.status
      }
    } catch {
      // Note absent from the Vault (or unreadable) — leave status undefined.
    }
  }

  statusCache.set(relativePath, status)
  return status
}

export const StatusBackfill: QuartzTransformerPlugin = () => ({
  name: "StatusBackfill",
  htmlPlugins() {
    return [
      () => (_tree: Root, file: { data: Record<string, unknown> }) => {
        const relativePath = file.data.relativePath as string | undefined
        if (!relativePath) return
        if ((file.data.frontmatter as Record<string, unknown> | undefined)?.status != null) {
          return // already present (e.g. Syncer starts publishing it) — don't clobber
        }

        const status = readVaultStatus(relativePath)
        if (status == null) return

        const fm = (file.data.frontmatter ?? {}) as Record<string, unknown>
        fm.status = status
        file.data.frontmatter = fm as typeof file.data.frontmatter
      },
    ]
  },
})

import { existsSync } from "fs"
import path from "path"
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { simplifySlug } from "@quartz-community/utils"
import { lucideInner } from "../lib/lucide-icons"

// Per-page "Edit / Report" contribution links (issue #145). Two GitHub-native
// SSR anchors — no backend, works with JS disabled. Rendered on the article's
// content-meta row by ContentMetaRow, which owns the styling (.page-contribute).
//
// The repo identity is hard-coded: a rename silently breaks every link and is
// not derivable from cfg.baseUrl, so keep it in one place. "Edit" targets the
// Vault source (Vault/Home/…), never the generated content/ copy the Syncer
// overwrites; relativePath preserves the real filename where the slug is lossy
// (folder notes slugify to …/index, and "AI & ML" would be mangled).
const REPO = "grafanaKibana/devbook.zip"
const BRANCH = "main"
const VAULT_ROOT = "Vault/Home"

// Guard against content/Vault drift. Quartz builds from Web/content, which the
// Syncer regenerates from the vault; if that copy drifts — e.g. a folder is
// renamed in the vault but content/ isn't re-synced — the computed edit URL
// points at a Vault/Home path that no longer exists, sending contributors to
// edit the wrong (or a nonexistent) source. So only offer the Edit link when the
// vault source file is actually on disk at build. The vault sits beside Web/ at
// the repo root, so resolve it from the build cwd (Web/). When the vault tree is
// absent from the build context we can't check, so we don't guard — render as
// before (no regression); Report never needs a source path.
const VAULT_DIR = path.resolve(process.cwd(), "..", VAULT_ROOT)
const vaultVisible = existsSync(VAULT_DIR)
const sourceExistsCache = new Map<string, boolean>()
const vaultHasSource = (relPath: string): boolean => {
  if (!vaultVisible) return true
  let has = sourceExistsCache.get(relPath)
  if (has === undefined) {
    has = existsSync(path.join(VAULT_DIR, relPath))
    sourceExistsCache.set(relPath, has)
  }
  return has
}

const pencil = lucideInner("pencil") ?? ""
const messageSquare = lucideInner("message-square") ?? ""

export const PageContribute: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
    if (!fileData.filePath?.endsWith(".md")) return null
    if (fileData.slug === "index") return null
    if (fileData.slug === "404") return null
    if (fileData.slug?.startsWith("tags/")) return null

    const relPath = fileData.relativePath as string | undefined
    if (!relPath) return null

    const hasSource = vaultHasSource(relPath)
    const editPath = [...VAULT_ROOT.split("/"), ...relPath.split("/")]
      .map(encodeURIComponent)
      .join("/")
    const editUrl = `https://github.com/${REPO}/edit/${BRANCH}/${editPath}`

    const title = (fileData.frontmatter?.title as string) ?? fileData.slug
    const publishedUrl = `https://${cfg.baseUrl}/${simplifySlug(fileData.slug!)}`
    const body = `**Page:** ${title}\n**URL:** ${publishedUrl}\n\n<!-- Describe the mistake, or the page/idea you'd like to suggest. -->`
    const reportUrl = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(
      `Report/suggest: ${title}`,
    )}&body=${encodeURIComponent(body)}`

    return (
      <div class="page-contribute">
        {hasSource && (
          <a href={editUrl} target="_blank" rel="noopener noreferrer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: pencil }}
            />
            Edit this page
          </a>
        )}
        <a href={reportUrl} target="_blank" rel="noopener noreferrer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: messageSquare }}
          />
          Report / suggest
        </a>
      </div>
    )
  }

  return Component
}

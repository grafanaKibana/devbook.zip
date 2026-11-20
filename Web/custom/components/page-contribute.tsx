import { existsSync } from "fs"
import path from "path"
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { lucideInner } from "../lib/lucide-icons"
import { canonicalUrl } from "../seo"

// The repo identity is not derivable from cfg.baseUrl. "Edit" targets the Vault
// source, never the generated content/ copy; relativePath keeps the real
// filename where the slug is lossy (folder notes, "AI & ML").
const REPO = "grafanaKibana/devbook.zip"
const BRANCH = "main"
const VAULT_ROOT = "Vault/Home"

const EDIT_EXCLUDED_SLUGS = ["questions"]

// content/ can drift from the vault, so offer Edit only when the source file
// exists. A build context without the vault tree cannot check and keeps Edit.
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

    const canEdit = vaultHasSource(relPath) && !EDIT_EXCLUDED_SLUGS.includes(fileData.slug!)
    const editPath = [...VAULT_ROOT.split("/"), ...relPath.split("/")]
      .map(encodeURIComponent)
      .join("/")
    const editUrl = `https://github.com/${REPO}/edit/${BRANCH}/${editPath}`

    const title = (fileData.frontmatter?.title as string) ?? fileData.slug
    const publishedUrl = canonicalUrl(fileData.slug!, cfg.baseUrl)
    const body = `**Page:** ${title}\n**URL:** ${publishedUrl}\n\n<!-- Describe the mistake, or the page/idea you'd like to suggest. -->`
    const reportUrl = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(
      `Report/suggest: ${title}`,
    )}&body=${encodeURIComponent(body)}`

    return (
      <div class="page-contribute">
        {canEdit && (
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
            Edit
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
          Report
        </a>
      </div>
    )
  }

  return Component
}

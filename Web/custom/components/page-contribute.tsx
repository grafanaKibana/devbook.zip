import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { simplifySlug } from "@quartz-community/utils"
import { lucideInner } from "../lib/lucide-icons"
import styles from "./styles/page-contribute.scss"

// Per-page "Edit / Report" contribution footer (issue #145). Two GitHub-native
// SSR anchors — no backend, works with JS disabled.
//
// The repo identity is hard-coded: a rename silently breaks every link and is
// not derivable from cfg.baseUrl, so keep it in one place. "Edit" targets the
// Vault source (Vault/Home/…), never the generated content/ copy the Syncer
// overwrites; relativePath preserves the real filename where the slug is lossy
// (folder notes slugify to …/index, and "AI & ML" would be mangled).
const REPO = "grafanaKibana/devbook.zip"
const BRANCH = "main"
const VAULT_ROOT = "Vault/Home"

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

  Component.css = styles
  return Component
}

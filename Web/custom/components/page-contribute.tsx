import { existsSync } from "fs"
import path from "path"
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { lucideInner } from "../lib/lucide-icons"
import { canonicalUrl } from "../seo"

// Per-page share and contribution links (issues #145 and #148). Rendered on the
// article's content-meta row by ContentMetaRow, which owns the styling.
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
const link = lucideInner("link") ?? ""
const check = lucideInner("check") ?? ""
const brands = {
  x: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z",
  reddit:
    "M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z",
} as const

const script = `
(function () {
  if (window.__devbookPageContribute) return;
  window.__devbookPageContribute = true;

  var resetTimer;

  function reset(link) {
    if (!link) return;
    link.removeAttribute("data-copied");
    var label = link.querySelector(".page-contribute-copy-label");
    if (label) label.textContent = "Copy";
  }

  document.addEventListener("nav", function () {
    clearTimeout(resetTimer);
    reset(document.querySelector(".page-contribute-copy"));
  });

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var link = target.closest(".page-contribute-copy");
    if (!link || !navigator.clipboard?.writeText) return;
    var url = link.getAttribute("data-copy-url");
    if (!url) return;

    event.preventDefault();
    navigator.clipboard.writeText(url).then(function () {
      if (!link.isConnected || link.getAttribute("data-copy-url") !== url) return;
      link.setAttribute("data-copied", "true");
      var label = link.querySelector(".page-contribute-copy-label");
      if (label) label.textContent = "Copied";
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () { reset(link); }, 1600);
    }).catch(function () {});
  });
})();
`

const BrandIcon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={path} />
  </svg>
)

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
    const publishedUrl = canonicalUrl(fileData.slug!, cfg.baseUrl)
    const encodedUrl = encodeURIComponent(publishedUrl)
    const encodedTitle = encodeURIComponent(title)
    const body = `**Page:** ${title}\n**URL:** ${publishedUrl}\n\n<!-- Describe the mistake, or the page/idea you'd like to suggest. -->`
    const reportUrl = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(
      `Report/suggest: ${title}`,
    )}&body=${encodeURIComponent(body)}`

    return (
      <div class="page-contribute">
        <a class="page-contribute-copy" href={publishedUrl} data-copy-url={publishedUrl}>
          <svg
            class="page-contribute-link-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: link }}
          />
          <svg
            class="page-contribute-check-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: check }}
          />
          <span class="page-contribute-copy-label">Copy</span>
        </a>
        <a
          href={`https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <BrandIcon path={brands.x} />X
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <BrandIcon path={brands.linkedin} />
          LinkedIn
        </a>
        <a
          href={`https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <BrandIcon path={brands.reddit} />
          Reddit
        </a>
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

  Component.afterDOMLoaded = script
  return Component
}

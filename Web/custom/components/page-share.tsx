import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { canonicalUrl } from "../seo"
import { lucideInner } from "../lib/lucide-icons"
import styles from "./styles/page-share.scss"

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
  if (window.__devbookPageShare) return;
  window.__devbookPageShare = true;

  var resetTimer;

  function reset(button) {
    if (!button) return;
    button.removeAttribute("data-copied");
    var label = button.querySelector(".page-share-copy-label");
    if (label) label.textContent = "Copy link";
  }

  function setup() {
    clearTimeout(resetTimer);
    resetTimer = undefined;
    var button = document.querySelector(".page-share-copy");
    reset(button);
    if (button && navigator.clipboard && navigator.clipboard.writeText) {
      button.removeAttribute("hidden");
    }
  }

  document.addEventListener("nav", setup);
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var button = target.closest(".page-share-copy");
    if (!button || button.hasAttribute("hidden") || !navigator.clipboard?.writeText) return;
    var url = button.getAttribute("data-url");
    if (!url) return;

    navigator.clipboard.writeText(url).then(function () {
      if (!button.isConnected || button.getAttribute("data-url") !== url) return;
      button.setAttribute("data-copied", "true");
      var label = button.querySelector(".page-share-copy-label");
      if (label) label.textContent = "Copied";
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () { reset(button); }, 1600);
    }).catch(function () {});
  });
})();
`

const BrandIcon = ({ path }: { path: string }) => (
  <svg class="page-share-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={path} />
  </svg>
)

export const PageShare: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
    if (!fileData.filePath?.endsWith(".md")) return null
    if (fileData.slug === "index" || fileData.slug === "404") return null
    if (fileData.slug === "tags" || fileData.slug?.startsWith("tags/")) return null

    const title = (fileData.frontmatter?.title as string) ?? fileData.slug
    const publishedUrl = canonicalUrl(fileData.slug!, cfg.baseUrl)
    const url = encodeURIComponent(publishedUrl)
    const text = encodeURIComponent(title)

    return (
      <div class="page-share">
        <span class="page-share-label">Share this page</span>
        <button class="page-share-copy" type="button" data-url={publishedUrl} hidden>
          <svg
            class="page-share-icon page-share-icon-link"
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
            class="page-share-icon page-share-icon-check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: check }}
          />
          <span class="page-share-copy-label">Copy link</span>
        </button>
        <a
          class="page-share-link"
          href={`https://x.com/intent/post?url=${url}&text=${text}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          title="Share on X"
        >
          <BrandIcon path={brands.x} />
        </a>
        <a
          class="page-share-link"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          title="Share on LinkedIn"
        >
          <BrandIcon path={brands.linkedin} />
        </a>
        <a
          class="page-share-link"
          href={`https://www.reddit.com/submit?url=${url}&title=${text}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Reddit"
          title="Share on Reddit"
        >
          <BrandIcon path={brands.reddit} />
        </a>
      </div>
    )
  }

  Component.afterDOMLoaded = script
  Component.css = styles
  return Component
}

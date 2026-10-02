// Use the engine's own component types (not @quartz-community/types): this
// component renders other QuartzComponents as JSX children, which the engine
// types (whose components return `any`) support and the external types don't.
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../quartz/components/types"

// Office-365-style top header, as a first-class Quartz component.
//
// Previously the title + search + theme/reader toggles were configured onto the
// left sidebar (`position: left`) and merely CSS-fixed to the top of the page,
// so semantically they lived *inside* `.sidebar.left`. This component renders
// them in the page's own `<header>` slot instead (see quartz.ts), which is the
// correct place in the DOM.
//
// It reuses the existing community components (page-title, search, darkmode,
// reader-mode) verbatim — passed in from quartz.ts — so their client scripts and
// styles are unchanged. Those components are still registered, so the resource
// collector ships their CSS/JS globally; this wrapper only owns the markup.
// Positioning/layout lives in custom.scss (`.site-header*`).
interface SiteHeaderOptions {
  title: QuartzComponent
  search: QuartzComponent
  darkmode: QuartzComponent
  readerMode: QuartzComponent
}

export const SiteHeader = ((opts?: SiteHeaderOptions) => {
  if (!opts) {
    throw new Error("SiteHeader requires title/search/darkmode/readerMode components")
  }
  const { title: Title, search: Search, darkmode: Darkmode, readerMode: ReaderMode } = opts

  const Header: QuartzComponent = (props: QuartzComponentProps) => {
    return (
      <div class="site-header">
        <div class="site-header-title">
          <Title {...props} />
        </div>
        <div class="site-header-search">
          <Search {...props} />
          <kbd class="site-header-kbd" aria-hidden="true">
            <span class="site-header-kbd-mac">
              <svg
                viewBox="2 2 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
              </svg>
              K
            </span>
            <span class="site-header-kbd-other">Ctrl K</span>
          </kbd>
        </div>
        <div class="site-header-actions">
          <Darkmode {...props} />
          <ReaderMode {...props} />
        </div>
      </div>
    )
  }

  // Runs before first paint, so the shortcut hint never flips labels.
  Header.beforeDOMLoaded = `
document.documentElement.setAttribute(
  "data-kbd",
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent) ? "mac" : "other"
);
`

  return Header
}) satisfies QuartzComponentConstructor<SiteHeaderOptions>

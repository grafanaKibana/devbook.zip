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
        </div>
        <div class="site-header-actions">
          <Darkmode {...props} />
          <ReaderMode {...props} />
        </div>
      </div>
    )
  }

  return Header
}) satisfies QuartzComponentConstructor<SiteHeaderOptions>

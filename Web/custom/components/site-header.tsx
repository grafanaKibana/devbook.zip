// Use the engine's own component types (not @quartz-community/types): this
// component renders other QuartzComponents as JSX children, which the engine
// types (whose components return `any`) support and the external types don't.
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../quartz/components/types"

import { lucideInner } from "../lib/lucide-icons"
// @ts-expect-error Quartz bundles inline modules as browser scripts.
import themeScript from "./theme.inline"

const themes = [
  { value: "auto", label: "Auto (system)", icon: "monitor" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
] as const

interface SiteHeaderOptions {
  title: QuartzComponent
  search: QuartzComponent
  readerMode: QuartzComponent
}

export const SiteHeader = ((opts?: SiteHeaderOptions) => {
  if (!opts) {
    throw new Error("SiteHeader requires title/search/readerMode components")
  }
  const { title: Title, search: Search, readerMode: ReaderMode } = opts

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
          <div class="site-theme-picker">
            {themes.map(({ value, icon }) => (
              <svg
                class={`theme-icon-${value}`}
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                dangerouslySetInnerHTML={{ __html: lucideInner(icon) ?? "" }}
              />
            ))}
            <select class="site-theme-select" aria-label="Theme" title="Theme">
              {themes.map(({ value, label }) => (
                <option value={value}>{label}</option>
              ))}
            </select>
          </div>
          <ReaderMode {...props} />
        </div>
      </div>
    )
  }

  // Runs before first paint, so the shortcut hint never flips labels.
  Header.beforeDOMLoaded = [
    themeScript,
    `
document.documentElement.setAttribute(
  "data-kbd",
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent) ? "mac" : "other"
);
`,
  ]

  return Header
}) satisfies QuartzComponentConstructor<SiteHeaderOptions>

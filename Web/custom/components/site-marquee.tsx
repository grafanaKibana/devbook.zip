import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzPluginData,
} from "@quartz-community/types"

const developmentText = "This page still in development"
const separatorText = "///"
const lastUpdatePrefix = "Last update –"
const issueText = "Find something? Log"
const issueLinkText = "issue"
const issueUrl = "https://github.com/grafanaKibana/devbook.zip/issues/new"
const repeatCount = 6

const modifiedTime = (file: QuartzPluginData): number => {
  const modified = file.dates?.modified
  if (!modified) return 0

  const time = modified instanceof Date ? modified.getTime() : new Date(modified).getTime()
  return Number.isFinite(time) ? time : 0
}

const pageModifiedDate = (file: QuartzPluginData): Date => {
  const time = modifiedTime(file)
  return time > 0 ? new Date(time) : new Date()
}

const formatDate = (date: Date, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)

const frontmatterValue = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(frontmatterValue)
  return typeof value === "string" ? [value] : []
}

// Show the marquee only on in-progress content notes: a status must be present
// and must not be "done". This hides it on finished pages *and* on notes/pages
// with no status at all (auto-generated tag/folder/404 listings, statusless notes).
const showMarquee = (status: unknown): boolean => {
  const values = frontmatterValue(status)
  return values.length > 0 && !values.some((value) => value.toLowerCase() === "done")
}

export const SiteMarquee: QuartzComponentConstructor = () => {
  const Marquee: QuartzComponent = ({ cfg, fileData }) => {
    if (!showMarquee(fileData.frontmatter?.status)) return null

    const lastUpdate = formatDate(pageModifiedDate(fileData), cfg.locale ?? "en-US")
    const message = `${developmentText} ${separatorText} ${lastUpdatePrefix} ${lastUpdate} ${separatorText} ${issueText} ${issueLinkText}`

    return (
      <output class="site-marquee" aria-label={message} aria-live="polite">
        <div class="site-marquee-track" aria-hidden="true">
          {[0, 1].map((group) => (
            <p class="site-marquee-group" key={group}>
              {Array.from({ length: repeatCount }, (_, index) => (
                <span class="site-marquee-message" key={index}>
                  <span>{developmentText}</span>
                  <span>{separatorText}</span>
                  <span>
                    {lastUpdatePrefix} {lastUpdate}
                  </span>
                  <span>{separatorText}</span>
                  <span>
                    {issueText} <a href={issueUrl}>{issueLinkText}</a>
                  </span>
                  <span>{separatorText}</span>
                </span>
              ))}
            </p>
          ))}
        </div>
      </output>
    )
  }

  Marquee.css = `
.site-marquee {
  background-color: var(--lightgray);
  box-sizing: border-box;
  display: block;
  left: 50%;
  overflow: hidden;
  padding: 0.15rem 0;
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  width: 100vw;
  white-space: nowrap;
}

#quartz-root {
  position: relative;
}

.site-marquee-track {
  animation: siteMarqueeLoop 180s infinite linear;
  color: var(--tertiary);
  display: flex;
  font-family: var(--bodyFont);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  width: max-content;
}

.site-marquee-group {
  display: flex;
  margin: 0;
  padding-right: clamp(4rem, 10vw, 10rem);
}

.site-marquee-message {
  display: inline-flex;
  gap: clamp(4rem, 10vw, 10rem);
  padding-right: clamp(4rem, 10vw, 10rem);
}

.popover .site-marquee {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .site-marquee-track {
    animation: none;
    transform: none;
  }
}

@keyframes siteMarqueeLoop {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-50%);
  }
}
`

  return Marquee
}

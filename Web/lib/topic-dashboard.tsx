import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { resolveRelative, type FullSlug } from "@quartz-community/utils"

// Native replacement for the old Obsidian DataviewJS homepage dashboard.
// Renders one card per curated topic; icon + accent colour are read live from
// each topic folder-note's frontmatter, and the weighted progress bar is
// computed from every published note's `status` frontmatter at build time.
// Self-gates to the site root (slug "index").

const ROOT = "software-engineering"

interface TopicCard {
  folder: string
  title: string
  desc: string
}

const TOPICS: TopicCard[] = [
  { folder: "01-programming", title: "Programming", desc: "Languages, .NET internals, paradigms, clean code." },
  { folder: "02-computer-science", title: "Computer Science", desc: "Algorithms, data structures, the theory underneath." },
  { folder: "03-data-persistence", title: "Data Persistence", desc: "Databases, indexing, transactions, storage engines." },
  { folder: "04-networks", title: "Networks", desc: "Protocols, HTTP, TCP/IP, how packets travel." },
  { folder: "05-architecture", title: "Architecture", desc: "Distributed systems, patterns, designing for scale." },
  { folder: "06-development-practices", title: "Development Practices", desc: "Testing, version control, and the craft." },
  { folder: "07-security", title: "Security", desc: "Threats, crypto, auth, defensive design." },
  { folder: "08-sdlc", title: "SDLC", desc: "How software gets planned, built, and shipped." },
  { folder: "09-devops", title: "DevOps", desc: "CI/CD, containers, and automation." },
  { folder: "10-cloud", title: "Cloud", desc: "AWS/Azure, serverless, cloud-native design." },
  { folder: "11-ai--and--ml", title: "AI & ML", desc: "Models, training, applied machine learning." },
]

// lucide v1.23.0 inner SVG for the icons the topic folder-notes declare.
const ICONS: Record<string, string> = {
  "code-2": `<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>`,
  "flask-round": `<path d="M10 2v6.292a7 7 0 1 0 4 0V2"/><path d="M5 15h14"/><path d="M8.5 2h7"/>`,
  database: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>`,
  network: `<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>`,
  "building-2": `<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>`,
  "ruler-dimension-line": `<path d="M10 15v-3"/><path d="M14 15v-3"/><path d="M18 15v-3"/><path d="M2 8V4"/><path d="M22 6H2"/><path d="M22 8V4"/><path d="M6 15v-3"/><rect x="2" y="12" width="20" height="8" rx="2"/>`,
  lock: `<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  "area-chart": `<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 11.207a.5.5 0 0 1 .146-.353l2-2a.5.5 0 0 1 .708 0l3.292 3.292a.5.5 0 0 0 .708 0l4.292-4.292a.5.5 0 0 1 .854.353V16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/>`,
  skull: `<path d="m12.5 17-.5-1-.5 1h1z"/><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/>`,
  cloud: `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>`,
  "brain-circuit": `<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M9 13a4.5 4.5 0 0 0 3-4"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M12 13h4"/><path d="M12 18h6a2 2 0 0 1 2 2v1"/><path d="M12 8h8"/><path d="M16 8V5a2 2 0 0 1 2-2"/><circle cx="16" cy="13" r=".5"/><circle cx="18" cy="3" r=".5"/><circle cx="20" cy="21" r=".5"/><circle cx="20" cy="8" r=".5"/>`,
}
const DEFAULT_ICON = `<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>`

const wrapSvg = (inner: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`

const STATUS_PROGRESS: Record<string, number> = {
  "not-started": 0,
  creation: 33,
  "ready to repeat": 66,
  done: 100,
}
const STATUS_RAMP: { key: string; label: string; weight: number; alpha: number }[] = [
  { key: "done", label: "Done", weight: 100, alpha: 1 },
  { key: "ready to repeat", label: "Ready to Repeat", weight: 66, alpha: 0.6 },
  { key: "creation", label: "Creation", weight: 33, alpha: 0.28 },
]

const firstString = (v: unknown): string => {
  if (Array.isArray(v)) return v.length ? String(v[0]).trim() : ""
  return v == null ? "" : String(v).trim()
}
const hasTag = (fm: Record<string, any> | undefined, tag: string): boolean => {
  const tags = fm?.tags
  if (Array.isArray(tags)) return tags.map(String).includes(tag)
  if (typeof tags === "string") return tags === tag
  return false
}

export const TopicDashboard: QuartzComponentConstructor = () => {
  const Dashboard: QuartzComponent = ({ allFiles, fileData }: QuartzComponentProps) => {
    if (fileData.slug !== "index") return null

    const bySlug = new Map<string, (typeof allFiles)[number]>()
    for (const f of allFiles) if (f.slug) bySlug.set(f.slug, f)

    const statsFor = (folder: string) => {
      const prefix = `${ROOT}/${folder}/`
      const byStatus = new Map<string, number>()
      let total = 0
      let points = 0
      let done = 0
      for (const f of allFiles) {
        const slug = f.slug ?? ""
        if (!slug.startsWith(prefix)) continue
        const fm = f.frontmatter as Record<string, any> | undefined
        if (hasTag(fm, "FolderNote") || hasTag(fm, "MetricsIgnore")) continue
        const key = firstString(fm?.status).toLowerCase()
        total += 1
        points += STATUS_PROGRESS[key] ?? 0
        if (key === "done") done += 1
        byStatus.set(key, (byStatus.get(key) ?? 0) + 1)
      }
      const pct = total > 0 ? Math.round(points / total) : 0
      return { pct, done, total, byStatus }
    }

    return (
      <div class="topic-dashboard">
        <h2 class="topic-dashboard-heading">Topics</h2>
        <div class="topic-grid">
          {TOPICS.map((t) => {
            const note = bySlug.get(`${ROOT}/${t.folder}/index`)
            const fm = (note?.frontmatter ?? {}) as Record<string, any>
            const color = firstString(fm.color) || "var(--secondary)"
            const iconSvg = wrapSvg(ICONS[firstString(fm.icon)] ?? DEFAULT_ICON)
            const { pct, done, total, byStatus } = statsFor(t.folder)
            const href = note?.slug
              ? resolveRelative(fileData.slug!, note.slug as FullSlug)
              : (`${ROOT}/${t.folder}/` as string)
            return (
              <a class="topic-card" href={href} style={`--topic-color: ${color}`}>
                <div class="topic-card-head">
                  <span class="topic-icon" dangerouslySetInnerHTML={{ __html: iconSvg }} />
                  <span class="topic-title">{t.title}</span>
                  <span class="topic-pct">{pct}%</span>
                </div>
                <p class="topic-desc">{t.desc}</p>
                <div
                  class="topic-bar"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {STATUS_RAMP.map((seg) => {
                    const count = byStatus.get(seg.key) ?? 0
                    const width = total > 0 ? (count * seg.weight) / total : 0
                    if (width <= 0) return null
                    return (
                      <span
                        class="topic-seg"
                        style={`width:${width}%;opacity:${seg.alpha}`}
                        title={`${seg.label}: ${count}`}
                      />
                    )
                  })}
                </div>
                <div class="topic-meta">
                  {done}/{total} done
                </div>
              </a>
            )
          })}
        </div>
      </div>
    )
  }

  return Dashboard
}

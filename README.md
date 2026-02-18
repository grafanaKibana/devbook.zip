# Knowledge Hub

A personal software engineering knowledge base built with [Obsidian](https://obsidian.md) and published as a static website via the [Digital Garden](https://github.com/oleeskild/Obsidian-Digital-Garden) plugin + [Eleventy](https://www.11ty.dev/).

Write notes locally in Obsidian. Commit. The site rebuilds automatically.

## What It Is

A structured collection of software engineering notes covering 11 topic areas, designed for learning and interview preparation at a Senior .NET / AI engineering level. Every note follows a strict quality bar: intro in your own words, concrete examples, pitfalls, tradeoffs, interview-style questions, and curated references.

### Topic Areas

| # | Topic | Scope |
|---|-------|-------|
| 01 | Programming | Languages, paradigms, .NET ecosystem |
| 02 | Computer Science | Data structures, algorithms, fundamentals |
| 03 | Data Persistence | Databases, EF Core, caching, indexing |
| 04 | Networks | Protocols, HTTP, sockets, DNS |
| 05 | Architecture | Design patterns, system design, DDD |
| 06 | Development Practices | Testing, code quality, CI/CD practices |
| 07 | Security | Auth, encryption, OWASP, identity |
| 08 | SDLC | Software development lifecycle |
| 09 | DevOps | Containers, orchestration, IaC |
| 10 | Cloud | Azure, cloud-native patterns |
| 11 | AI & ML | LLMs, RAG, embeddings, evaluation |

## How It Works

```
Vault/Software Engineering/   ──(Obsidian Git)──>   GitHub repo
        │                                                │
        │  Obsidian plugins:                             │  Vercel/Netlify/Anything else auto-deploys
        │  Templater, Dataview,                          │  on push to main
        │  Folder Notes, Digital Garden                  │
        │                                                ▼
        ▼                                          Eleventy (SSG)
   Write & organize                                builds to dist/
   notes locally                                   and publishes site
```

### Vault → Website Pipeline

1. **Author** notes in Obsidian using templates (Concept Page or Index templates)
2. **Mark** notes for publishing with `dg-publish: true` in frontmatter
3. **Publish** via the Digital Garden plugin, which exports notes to `src/site/notes/`
4. **Commit & push** — Deployment provider picks up the change and runs the Eleventy build
5. **Live** — static site with full-text search, graph view, backlinks, and table of contents

### Two Obsidian Configs

- **`Vault/.obsidian/`** — the vault config with all plugins, themes, and settings. Open `Vault/` as your Obsidian vault.

## Repository Structure

```
Knowledge Hub/
├── Vault/                          # The Obsidian vault (open this in Obsidian)
│   ├── Software Engineering/       # All notes live here
│   │   ├── 01 Programming/        # Topic folders (numbered for ordering)
│   │   ├── 02 Computer Science/
│   │   ├── ...
│   │   ├── 11 AI & ML/
│   │   ├── Roadmap.canvas          # Auto-generated visual roadmap
│   │   ├── Topics.base             # Obsidian Bases dashboard
│   │   └── Software Engineering.md # Homepage with live dashboards
│   ├── Templates/                  # Note templates (Concept Page, Index, Mermaid, etc.)
│   └── Assets/                     # All attachments (images, files)
├── src/site/                       # Eleventy site source (Digital Garden output)
│   ├── notes/                      # Exported notes for the website
│   ├── styles/                     # SCSS styles (custom + Digital Garden base)
│   ├── _includes/                  # Nunjucks layouts and components
│   └── _data/                      # Site metadata and computed data
├── .scripts/                       # Vault maintenance automation (Python)
├── .git/hooks/pre-commit           # Git hook that runs automations
├── .eleventy.js                    # Eleventy config (markdown pipeline)
├── netlify.toml                    # Netlify deployment config
├── vercel.json                     # Vercel deployment config (alternative)
└── AGENTS.md                       # AI agent operating contract
```

## Features

### Obsidian-Side

**Structured Note Templates** — Two Templater-powered templates that auto-derive `topic`/`subtopic` from folder path, prompt for `level` and `priority`, and scaffold the note structure:

- **Concept Page** — for individual topics (intro, explanation, questions, links)
- **Index Page** — for folder hub notes (auto-tagged `FolderNote`)

**Frontmatter System** — Every note carries structured metadata:

```yaml
topic: [Programming]        # Derived from folder path
subtopic: [.NET]            # Derived from folder path
level: ["2"]                # Depth/difficulty (1-4)
priority: High              # Low | Medium | High
status: Creation            # Not-Started | Creation | Repetition | Ready To Repeat | Done
dg-publish: true            # Controls website publishing
```

**Homepage Dashboard** — `Software Engineering.md` renders live DataviewJS tables showing:
- Topic coverage with progress bars and done/total counts
- Status distribution across all notes
- Priority distribution
- Level distribution
- Focus list (notes currently in progress)
- Recently updated notes

**Obsidian Bases** — `Topics.base` provides a filterable table/card view of all folder notes, queryable by topic, subtopic, status, priority, and level.

**Visual Roadmap** — `Roadmap.canvas` is an auto-generated JSON Canvas that maps the entire knowledge structure as a node graph, color-coded by learning status (red → orange → cyan → purple → green), with a legend showing counts per status.

### Obsidian Plugins

| Plugin | Purpose |
|--------|---------|
| **Digital Garden** | Publishes selected notes to the website |
| **Templater** | Powers note templates with JavaScript logic |
| **Dataview / DataviewJS** | Drives dashboard tables and queries |
| **Folder Notes** | Auto-creates hub notes for folders |
| **Obsidian Git** | Manual git sync from within Obsidian |
| **Omnisearch** | Vault-wide full-text search |
| **Advanced Canvas** | Extended canvas features |
| **Auto Link Title** | Auto-fetches titles for pasted URLs |
| **URL into Selection** | Wraps selected text with pasted URL |
| **Custom Attachment Location** | Routes attachments to `Assets/` |
| **Icon Folder** | Custom folder icons in the file explorer |
| **Pretty Properties** | Better frontmatter property display |
| **Multi-Column Markdown** | Multi-column layouts in notes |
| **Homepage** | Sets the startup note |

### Website Features

The published site (built with Eleventy) includes:

- **Full-text search** with keyboard navigation
- **Interactive graph view** showing note connections
- **Backlinks** — pages that reference the current page
- **Table of contents** — auto-generated from headings
- **File tree navigation** — mirrors the vault folder structure
- **Wikilink resolution** — Obsidian `[[wikilinks]]` become working HTML links
- **Mermaid diagrams** — rendered inline
- **MathJax** — LaTeX math rendering
- **Callouts** — Obsidian callout syntax rendered as styled blocks
- **Canvas rendering** — `.canvas` files render as interactive pannable/zoomable maps
- **Image optimization** — automatic WebP conversion with responsive srcsets
- **HTML minification** — in production builds
- **RSS feed** — at `/feed.xml`
- **Sitemap** — at `/sitemap.xml`
- **Responsive layout** — adapts to mobile, desktop, and ultrawide displays
- **Dark theme** — matches the Obsidian vault theme

## Automations

### Git Pre-Commit Hook

Every commit triggers three automations in sequence:

#### 1. Folder Frontmatter Sync (`sync-folder-rollup-frontmatter.py`)

Derives metadata for hub (FolderNote) pages from their descendant concept pages:
- **status** — worst-first rollup (if any child is `Creation`, the hub shows `Creation`)
- **priority** — highest-first (if any child is `High`, the hub shows `High`)
- **level** — max numeric level from children

This means hub notes always reflect the aggregate state of their subtopics without manual updates.

#### 2. Whats Next Renderer (`render-whats-next.py`)

Generates navigation callouts at the bottom of every note with:
- **Parent** link — navigates up to the parent hub note
- **Topics** — links to child hub notes (sub-folders)
- **Pages** — links to sibling concept pages in the same folder

Uses HTML markers (`<!-- whats-next:start -->` / `<!-- whats-next:end -->`) so the block is idempotently replaced on each commit. Only processes staged files for performance.

#### 3. Roadmap Generator (`generate-roadmap.py`)

Regenerates `Roadmap.canvas` from the folder structure:
- Walks the `Vault/Software Engineering/` directory tree (up to 5 levels deep)
- Creates a node for each folder hub, linked to its parent
- Colors nodes by learning status using the JSON Canvas color palette
- Uses masonry layout to minimize vertical height
- Adds a legend with per-status counts and generation timestamp
- Publishes the canvas to the website via `dg-publish` frontmatter

### Other Scripts

| Script | Purpose |
|--------|---------|
| `find_broken_links.py` | Scans for broken wikilinks, broken markdown links, and unlinked mentions (terms that appear in prose but aren't linked) |
| `sync-topic-subtopic-frontmatter.py` | Batch-updates `topic`/`subtopic` fields based on folder position |
| `migrate_pages.py` | One-time migration script that moved navigation blocks from top to bottom of notes |

### Dependency Management

**Dependabot** runs weekly npm dependency checks, with pinned exceptions for `@sindresorhus/slugify` (ESM-only) and `@11ty/eleventy-plugin-rss` (breaking changes).

### Build Pipeline

```
npm run build
  ├── get-theme        # Fetches Obsidian theme CSS
  ├── build:sass       # Compiles SCSS → CSS (compressed)
  └── build:eleventy   # Processes markdown → HTML via Eleventy
```

The Eleventy pipeline handles:
- Markdown rendering with 8 markdown-it plugins (anchors, footnotes, math, attrs, tasks, PlantUML, mark, mermaid)
- Obsidian wikilink → HTML anchor resolution
- Callout blockquote → styled div transformation
- Canvas file rendering (pre-compiled HTML pass-through)
- Image optimization (WebP + JPEG at multiple breakpoints)
- Table wrapping for horizontal scroll
- DataviewJS link resolution
- HTML minification (production only)
- Favicon generation
- RSS feed generation

### Tech Stack

| Layer | Technology |
|-------|------------|
| Note editor | Obsidian |
| Static site generator | Eleventy 3.x |
| Templating | Nunjucks + Liquid |
| Styling | SCSS (Obsidian theme + custom overrides) |
| Markdown | markdown-it + 8 plugins |
| Hosting | Netlify (primary) / Vercel (alternative) |
| Automation | Python scripts + Git hooks |
| Dependencies | Dependabot (weekly) |
| Runtime | Node.js 22.x |

## Local Development

```bash
# Clone
git clone https://github.com/grafanaKibana/KnowledgeHub.git
cd KnowledgeHub

# Install dependencies
npm install

# Development server (live reload)
npm start

# Production build
npm run build
```

Open `Vault/` as an Obsidian vault for note editing. The `.env` file configures site metadata (theme, site name, base URL, feature flags).

## Customization

Override the site's appearance in `src/site/styles/custom-style.scss`. The Digital Garden base provides 100+ CSS custom properties covering layout, typography, sidebar, graph, search, navigation, and component styling. See the [Digital Garden docs](https://dg-docs.ole.dev/) for the full variable reference.

## License

ISC

# DevBook Web — Obsidian → Static Site

[← Back to DevBook](../README.md)

This is the **publishing half** of DevBook: it turns the Obsidian vault in `Vault/` into the static website at **[devbook.zip](https://devbook.zip)**, using the [Digital Garden](https://github.com/oleeskild/Obsidian-Digital-Garden) plugin + [Eleventy](https://www.11ty.dev/).

Write notes locally in Obsidian. Commit. The site rebuilds automatically.

## How It Works

```text
Vault/Software Engineering/   ──(Obsidian Git)──>   GitHub repo
        │                                                │
        │  Obsidian plugins:                             │  Vercel auto-deploys
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
3. **Publish** via the Digital Garden plugin, which exports notes to `Web/src/site/notes/`
4. **Commit & push** — Vercel picks up the change and runs the Eleventy build
5. **Live** — static site with full-text search, graph view, backlinks, and table of contents

### Obsidian Config

**`Vault/.obsidian/`** — the vault config with all plugins, themes, and settings. Open `Vault/` as your Obsidian vault.

### Web Project Structure

```text
Web/
├── src/site/                   # Eleventy site source (Digital Garden output)
│   ├── notes/                  # Exported notes for the website
│   ├── styles/                 # SCSS styles (custom + Digital Garden base)
│   │   └── user/               # Custom style overrides (survives template updates)
│   ├── _includes/              # Nunjucks layouts and components
│   │   └── components/user/    # Custom injected components
│   └── _data/                  # Site metadata and computed data
├── src/helpers/                # Eleventy helper functions (graph, filetree, utils)
├── .eleventy.js                # Eleventy config (markdown pipeline)
├── .env                        # Site metadata (theme, name, base URL, feature flags)
├── .env.local                  # Personal data (contact info, subtitle) — gitignored
└── netlify.toml                # Netlify deployment config (alternative)
```

> Vercel deployment is configured at the repo root in `vercel.json` (output `Web/dist`, build `cd Web && npm run build`).

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
- **Dark/light theme** — auto-switches based on system preference

## Website Customizations

The site extends the stock [Digital Garden](https://github.com/oleeskild/Obsidian-Digital-Garden) template through its official extension system. Custom styles live in `src/site/styles/user/` and custom components in `src/site/_includes/components/user/` — both directories survive template updates.

### Theme & Typography

**Anthropic-inspired design** (`styles/user/anthropic-theme.scss`):

- **Body text**: [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4) (serif) — like Anthropic's docs
- **UI / headings**: [Inter](https://fonts.google.com/specimen/Inter) (sans-serif) — clean navigation and titles
- **Code**: [Source Code Pro](https://fonts.google.com/specimen/Source+Code+Pro) (monospace) — VS Code-style code blocks
- **Accent color**: British Racing Green (HSL 158°, 25–45% saturation) — replaces the default blue
- **Page titles**: 2.4em with tight letter-spacing (-0.03em)
- **Mermaid diagrams**: transparent background (vs. white default)
- **Base Obsidian theme**: [Minimal](https://github.com/kepano/obsidian-minimal) by @kepano — fetched at build time

### Responsive Layout

**Adaptive widths** (`styles/user/layout.scss`):

| Breakpoint | Filetree | Content Max | Sidebar |
|------------|----------|-------------|---------|
| Base | 300px | default | 300px |
| ≥ 1980px | 400px | 900px | 400px |
| ≥ 2560px | 500px | 1000px | 500px |

- **Mobile** (≤ 1000px): full-width sidebar overlay, table horizontal scroll
- **Graph**: 300 × 300px, depth controls hidden
- **Canvas nodes**: compact spacing (6px between elements)

### Sidebar Branding

**Site title block** (`styles/user/branding.scss`, modified `filetree.njk` / `filetreeNavbar.njk`):

- Centered title + subtitle layout (or logo image if `src/site/logo.*` exists)
- Title: uppercase, 28px (`--dg-filetree-title-size`)
- Subtitle: 0.82rem, 85% opacity (driven by `SITE_NAME_SUBTITLE` in `.env.local`)
- Mobile navbar: compact variant at 1.25rem

### Quicklink Navigation

**Sidebar buttons** (`styles/user/quicklinks.scss`, `components/user/filetree/afterTitle/quicklinks.njk`):

- Three buttons below the site title: **Home**, **Questions**, **Roadmap**
- Accent-colored background with brightness hover effect
- Hidden on mobile navbar (visible only in the filetree sidebar)

### Footer Contact Links

**Contact info** (`styles/user/branding.scss`, `components/user/common/footer/contact-links.njk`):

- Email, LinkedIn, and GitHub links with Lucide icons
- Driven by `.env.local` variables: `SITE_CONTACT_EMAIL`, `SITE_CONTACT_LINKEDIN`, `SITE_CONTACT_GITHUB`
- Hidden on canvas pages

### Vercel Analytics

**Web analytics** (`components/user/common/head/001-vercel-analytics.njk`):

- Vercel Web Analytics script injected into `<head>` on every page

### Modified Stock Files

Some customizations required changes to stock Digital Garden files. These may need re-applying after template updates from the Obsidian plugin:

| File | Modification |
|------|-------------|
| `filetree.njk` | Branding block with title + subtitle (replaces plain `<h1>`) |
| `filetreeNavbar.njk` | Mobile branding block matching the desktop sidebar |
| `meta.js` | Contact info fields, `siteSubtitle`, `siteLogoPath` detection, canvas UI strings |
| `.eleventy.js` | `xmlSafe` filter, `canvas-markdown` transform, external link `target="_blank"` |
| `feed.njk` | `xmlSafe` filter for valid Atom XML output |

## Automations

### Git Pre-Commit Hook

Every commit triggers three Python automations followed by markdown linting (`.githooks/pre-commit`):

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

#### 4. Markdown Lint (`markdownlint-cli2`)

Enforces MD040 (fenced code block language) on staged Markdown files. Every fenced code block must specify a language — use `text` as a fallback when no specific language applies. Blocks the commit on violations.

### Other Scripts

| Script | Purpose |
|--------|---------|
| `audit_all_pages.py` | Full vault quality audit — scores every page against the AGENTS.md quality bar and outputs JSON for reporting |
| `sync-topic-subtopic-frontmatter.py` | Batch-updates `topic`/`subtopic` fields based on folder position |

### Dependency Management

**Dependabot** runs weekly npm dependency checks, with pinned exceptions for `@sindresorhus/slugify` (ESM-only) and `@11ty/eleventy-plugin-rss` (breaking changes).

### Build Pipeline

```text
npm run build
  ├── get-theme        # Fetches Obsidian theme CSS from GitHub
  ├── build:sass       # Compiles SCSS → CSS (compressed)
  └── build:eleventy   # Processes markdown → HTML via Eleventy
```

The Eleventy pipeline handles:

- Markdown rendering with 8 markdown-it plugins (anchors, footnotes, math, attrs, tasks, PlantUML, mark, mermaid)
- Obsidian wikilink → HTML anchor resolution
- Callout blockquote → styled div transformation
- Canvas file rendering (pre-compiled HTML pass-through with build-time markdown rendering)
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
| Hosting | Vercel (primary) / Netlify (alternative) |
| Automation | Python scripts + Git hooks |
| Dependencies | Dependabot (weekly) |
| Runtime | Node.js 24.x |

## Local Development

```bash
# From the repo root
cd Web

# Install dependencies
npm install

# Development server (live reload)
npm start

# Production build
npm run build
```

The website app lives in `Web/`; its `.env` file configures site metadata (theme, site name, base URL, feature flags). Personal data (contact info, subtitle) goes in `Web/.env.local` which is gitignored. Open `Vault/` as an Obsidian vault for note editing.
